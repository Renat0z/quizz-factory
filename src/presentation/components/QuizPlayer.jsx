import { useEffect, useRef } from 'react';
import { CheckCircle } from 'lucide-react';
import { ThemeProvider } from './ThemeProvider';
import { ProgressBar } from './ProgressBar';
import { NavButtons } from './NavButtons';
import { QuestionFactory } from './question-types/QuestionFactory';
import { useQuizSession } from '../hooks/useQuizSession';
import { resolveTheme } from '../../core/entities/Quiz';

/**
 * QuizPlayer — orquestrador do player de quiz.
 * Não conhece tipos de pergunta (OCP via QuestionFactory).
 * Não conhece detalhes de persistência (via useQuizSession).
 */
export function QuizPlayer({ quiz, isPreview = false }) {
  const {
    step,
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
    restart,
  } = useQuizSession(quiz, { isPreview });

  const theme = resolveTheme(quiz.config?.theme);
  const config = quiz.config || {};
  const autoAdvanceTimerRef = useRef(null);

  // Ref sempre aponta para o goNext mais recente, evitando stale closure no setTimeout
  const goNextRef = useRef(goNext);
  useEffect(() => { goNextRef.current = goNext; }, [goNext]);

  // Auto-avança após escolha single (typeform UX)
  const handleChange = (value) => {
    updateAnswer(currentQuestion.id, value);

    if (currentQuestion.type === 'choice' || currentQuestion.type === 'rating') {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = setTimeout(() => {
        goNextRef.current();
      }, 400);
    }
  };

  useEffect(() => () => clearTimeout(autoAdvanceTimerRef.current), []);

  // ---------------------------------------------------------------------------
  // Tela de carregamento / retomada
  // ---------------------------------------------------------------------------
  if (isResuming) {
    return (
      <ThemeProvider theme={theme} className="flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div
            className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin mx-auto"
            style={{ borderColor: `${theme.primary} transparent transparent transparent` }}
          />
          <p style={{ color: theme.muted }}>Carregando...</p>
        </div>
      </ThemeProvider>
    );
  }

  // ---------------------------------------------------------------------------
  // Tela de sucesso
  // ---------------------------------------------------------------------------
  if (isSubmitted) {
    const firstName = Object.entries(answers).find(([, v]) => typeof v === 'string' && v.length < 50)?.[1];
    const successTitle = config.successTitle || 'Tudo certo!';
    const rawMsg = config.successMessage || 'Suas respostas foram registradas com sucesso.';
    const successMessage = firstName
      ? rawMsg.replace('{nome}', firstName.split(' ')[0])
      : rawMsg;

    return (
      <ThemeProvider theme={theme} className="flex items-center justify-center font-sans px-4">
        <div
          className="max-w-md w-full rounded-3xl shadow-2xl p-8 text-center animate-scale-in"
          style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
            style={{ backgroundColor: '#00B894' }}
          >
            <CheckCircle size={40} color="#fff" />
          </div>
          <h2 className="text-3xl font-black mb-3" style={{ color: theme.text }}>{successTitle}</h2>
          <p className="text-base leading-relaxed mb-8" style={{ color: theme.muted }}>{successMessage}</p>

          <div className="flex flex-col gap-3">
            {config.successRedirectUrl && (
              <a
                href={config.successRedirectUrl}
                className="block w-full py-4 rounded-xl font-bold text-white text-center transition-all"
                style={{ backgroundColor: theme.primary }}
              >
                Continuar →
              </a>
            )}
            {config.allowRetake && (
              <button
                onClick={restart}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
                style={{ color: theme.muted, border: `1px solid ${theme.border}` }}
              >
                Responder novamente
              </button>
            )}
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // ---------------------------------------------------------------------------
  // Player principal
  // ---------------------------------------------------------------------------
  const totalSteps = quiz.questions.length;
  const showCount = config.showProgressCount !== false;

  const animClass = direction === 'forward'
    ? 'animate-slide-in-right'
    : 'animate-slide-in-left';

  return (
    <ThemeProvider theme={theme} className="flex flex-col font-sans">
      <ProgressBar progress={progress} />

      <main className="flex-1 flex items-center justify-center p-4 md:p-8 pt-8">
        <div
          className="max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            minHeight: '500px',
          }}
        >
          {/* Conteúdo da pergunta */}
          <div className="p-6 md:p-10 flex flex-col flex-1">
            {showCount && (
              <div
                className="mb-4 text-xs font-bold uppercase tracking-widest"
                style={{ color: theme.primary }}
              >
                {currentQuestion.type !== 'welcome' && `Etapa ${step + 1} de ${totalSteps}`}
              </div>
            )}

            {/* Animação de entrada por step */}
            <div key={step} className={animClass}>
              <h1
                className="text-2xl md:text-4xl font-black mb-2 leading-tight"
                style={{ color: theme.text }}
              >
                {currentQuestion.title}
                {currentQuestion.required === false && currentQuestion.type !== 'welcome' && (
                  <span className="ml-2 text-sm font-normal" style={{ color: theme.muted }}>
                    (opcional)
                  </span>
                )}
              </h1>

              {currentQuestion.description && (
                <p
                  className="text-lg mb-8 leading-relaxed"
                  style={{ color: theme.muted }}
                >
                  {currentQuestion.description}
                </p>
              )}

              <div className="space-y-4">
                <QuestionFactory
                  question={currentQuestion}
                  value={answers[currentQuestion.id]}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Erro de envio */}
          {submitError && (
            <div className="px-6 md:px-8 py-3" style={{ backgroundColor: '#E17055/10', borderTop: `1px solid #E17055/30` }}>
              <p className="text-sm" style={{ color: '#E17055' }}>{submitError}</p>
            </div>
          )}

          {/* Navegação */}
          <NavButtons
            step={step}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            canAdvance={canAdvance()}
            isSubmitting={isSubmitting}
            onBack={goBack}
            onNext={goNext}
          />
        </div>
      </main>

      {!isPreview && (
        <footer className="py-4 text-center text-xs" style={{ color: theme.muted }}>
          Criado com <span style={{ color: theme.primary }}>Quiz Factory</span>
        </footer>
      )}
    </ThemeProvider>
  );
}
