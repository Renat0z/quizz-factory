import { useState, useEffect, useRef, useCallback } from 'react';
import { isAnswerValid, serializeAnswer } from '../../core/entities/Question';
import { SessionApiRepository } from '../../infrastructure/api/SessionApiRepository';

const sessionRepo = new SessionApiRepository();

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Hook central que gerencia o estado de uma sessão de quiz.
 * Responsabilidades:
 * - Persistência de sessionId no localStorage
 * - Navegação entre steps
 * - Salvamento incremental de answers
 * - Rastreamento de eventos de analytics (tempo por step, tab_hidden)
 * - Lógica de branching
 */
export function useQuizSession(quiz, { isPreview = false } = {}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});  // { [questionId]: value }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [direction, setDirection] = useState('forward');  // para animação
  const [sessionId, setSessionId] = useState(null);
  const [isResuming, setIsResuming] = useState(false);

  const stepStartTimeRef = useRef(Date.now());
  const tabHiddenTimeRef = useRef(null);
  const idleTimeRef = useRef(0);

  const questions = quiz?.questions || [];
  const currentQuestion = questions[step];

  // ---------------------------------------------------------------------------
  // Inicializar / retomar sessão
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!quiz?.id || isPreview) {
      setIsResuming(false);
      return;
    }

    const storageKey = `qf_session_${quiz.slug}`;
    let sid = localStorage.getItem(storageKey);
    if (!sid) {
      sid = generateUUID();
      localStorage.setItem(storageKey, sid);
    }
    setSessionId(sid);
    setIsResuming(true);

    sessionRepo.createOrResume(sid, quiz.id, quiz.version).then(({ savedAnswers, current_step }) => {
      if (savedAnswers?.length > 0) {
        const restored = {};
        savedAnswers.forEach(a => {
          // Tenta parsear JSON (arrays e objetos)
          try { restored[a.question_id] = JSON.parse(a.value); }
          catch { restored[a.question_id] = a.value; }
        });
        setAnswers(restored);
      }
      if (current_step > 0 && current_step < questions.length) {
        setStep(current_step);
      }
      setIsResuming(false);
      sessionRepo.saveEvent(sid, { type: 'session_started', payload: { quiz_id: quiz.id } });
    }).catch(() => setIsResuming(false));
  }, [quiz?.id]);

  // ---------------------------------------------------------------------------
  // Rastrear tab_hidden / tab_visible para excluir idle do tempo
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!sessionId) return;

    const onHide = () => {
      tabHiddenTimeRef.current = Date.now();
      sessionRepo.saveEvent(sessionId, { type: 'tab_hidden', stepIndex: step });
    };
    const onShow = () => {
      if (tabHiddenTimeRef.current) {
        idleTimeRef.current += Date.now() - tabHiddenTimeRef.current;
        tabHiddenTimeRef.current = null;
      }
      sessionRepo.saveEvent(sessionId, { type: 'tab_visible', stepIndex: step });
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) onHide(); else onShow();
    });
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [sessionId, step]);

  // ---------------------------------------------------------------------------
  // Rastrear step_viewed ao entrar em cada step
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!sessionId || !currentQuestion) return;
    stepStartTimeRef.current = Date.now();
    idleTimeRef.current = 0;

    sessionRepo.saveEvent(sessionId, {
      type: 'step_viewed',
      questionId: currentQuestion.id,
      stepIndex: step,
    });
  }, [step, sessionId]);

  // ---------------------------------------------------------------------------
  // Aviso ao fechar browser
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isSubmitted) return;
    const handler = (e) => {
      if (step > 0 && !isSubmitted) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [step, isSubmitted]);

  // ---------------------------------------------------------------------------
  // Calcular tempo gasto no step atual (excluindo idle)
  // ---------------------------------------------------------------------------
  const getTimeSpent = useCallback(() => {
    const total = Date.now() - stepStartTimeRef.current;
    return Math.max(0, total - idleTimeRef.current);
  }, []);

  // ---------------------------------------------------------------------------
  // Salvar answer incrementalmente
  // ---------------------------------------------------------------------------
  const saveAnswer = useCallback(async (question, value) => {
    if (!sessionId || question.type === 'welcome') return;
    const timeSpentMs = getTimeSpent();
    const { value: serialized, valueNumeric, valueVector } = serializeAnswer(
      question.type, value, question.options
    );

    await sessionRepo.saveAnswer(sessionId, {
      questionId: question.id,
      questionType: question.type,
      value: serialized,
      valueNumeric,
      valueVector,
      timeSpentMs,
      stepIndex: step,
    });
  }, [sessionId, step, getTimeSpent]);

  // ---------------------------------------------------------------------------
  // Atualizar resposta local
  // ---------------------------------------------------------------------------
  const updateAnswer = useCallback((questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  // ---------------------------------------------------------------------------
  // Verificar se pode avançar
  // ---------------------------------------------------------------------------
  const canAdvance = useCallback(() => {
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;
    return isAnswerValid(currentQuestion, answers[currentQuestion.id]);
  }, [currentQuestion, answers]);

  // ---------------------------------------------------------------------------
  // Avançar step
  // ---------------------------------------------------------------------------
  const goNext = useCallback(async () => {
    if (!canAdvance()) return;

    const q = currentQuestion;
    const val = answers[q.id];

    // Salvar answer antes de avançar
    await saveAnswer(q, val);

    // Evento analytics
    sessionRepo.saveEvent(sessionId, {
      type: 'step_answered',
      questionId: q.id,
      stepIndex: step,
      payload: { timeSpentMs: getTimeSpent() },
    });

    // Branching: verificar se há regra de desvio
    let nextStep = step + 1;
    if (q.branch_rules?.length > 0 && val) {
      const rule = q.branch_rules.find(r => {
        if (Array.isArray(val)) return val.includes(r.if_value);
        return String(val) === String(r.if_value);
      });
      if (rule?.goto_question_id) {
        const targetIdx = questions.findIndex(x => x.id === rule.goto_question_id);
        if (targetIdx !== -1) nextStep = targetIdx;
      }
    }

    if (nextStep >= questions.length) {
      await handleSubmit();
    } else {
      setDirection('forward');
      setStep(nextStep);
    }
  }, [canAdvance, currentQuestion, answers, saveAnswer, sessionId, step, getTimeSpent, questions]);

  // ---------------------------------------------------------------------------
  // Voltar step
  // ---------------------------------------------------------------------------
  const goBack = useCallback(() => {
    if (step > 0) {
      sessionRepo.saveEvent(sessionId, { type: 'step_back', stepIndex: step });
      setDirection('back');
      setStep(s => s - 1);
    }
  }, [step, sessionId]);

  // ---------------------------------------------------------------------------
  // Submit final
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      // Salvar última answer se necessário
      if (currentQuestion?.type !== 'welcome') {
        await saveAnswer(currentQuestion, answers[currentQuestion?.id]);
      }
      await sessionRepo.completeSession(sessionId);
      localStorage.removeItem(`qf_session_${quiz.slug}`);
      setIsSubmitted(true);
    } catch (err) {
      setSubmitError('Não foi possível salvar suas respostas. Tente novamente.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentQuestion, answers, saveAnswer, sessionId, quiz?.slug]);

  // ---------------------------------------------------------------------------
  // Recomeçar
  // ---------------------------------------------------------------------------
  const restart = useCallback(() => {
    localStorage.removeItem(`qf_session_${quiz.slug}`);
    const newSid = generateUUID();
    localStorage.setItem(`qf_session_${quiz.slug}`, newSid);
    setSessionId(newSid);
    setStep(0);
    setAnswers({});
    setIsSubmitted(false);
    setSubmitError('');
  }, [quiz?.slug]);

  const progress = questions.length > 1
    ? Math.round((step / (questions.length - 1)) * 100)
    : 0;

  const isLastStep = step === questions.length - 1;
  const isFirstStep = step === 0;

  return {
    step,
    questions,
    currentQuestion,
    answers,
    updateAnswer,
    goNext,
    goBack,
    canAdvance,
    isSubmitting,
    isSubmitted,
    submitError,
    direction,
    progress,
    isLastStep,
    isFirstStep,
    isResuming,
    sessionId,
    restart,
  };
}
