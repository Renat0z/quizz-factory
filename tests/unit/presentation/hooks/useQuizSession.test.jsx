import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuizSession } from '../../../../src/presentation/hooks/useQuizSession';
import { mockQuiz } from '../../../fixtures/quiz';

// Mock do repositório de sessão — vi.hoisted garante que a variável existe
// quando vi.mock (que é hoisted pelo Vitest) for executado
const mockRepo = vi.hoisted(() => ({
  createOrResume:  vi.fn(),
  saveAnswer:      vi.fn(),
  saveEvent:       vi.fn(),
  completeSession: vi.fn(),
}));

vi.mock('../../../../src/infrastructure/api/SessionApiRepository', () => ({
  // função regular (não arrow) para compatibilidade com `new SessionApiRepository()`
  SessionApiRepository: vi.fn(function () { return mockRepo; }),
}));

beforeEach(() => {
  mockRepo.createOrResume.mockResolvedValue({ savedAnswers: [], current_step: 0, status: 'started' });
  mockRepo.saveAnswer.mockResolvedValue({ ok: true });
  mockRepo.saveEvent.mockResolvedValue({ ok: true });
  mockRepo.completeSession.mockResolvedValue({ ok: true });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function initHook(quizOverride) {
  const quiz = quizOverride || mockQuiz;
  const { result } = renderHook(() => useQuizSession(quiz));

  // Aguarda a inicialização assíncrona
  await act(async () => {
    await vi.runAllTimersAsync();
  });

  return result;
}

describe('useQuizSession — inicialização', () => {
  it('começa no step 0', async () => {
    const result = await initHook();
    expect(result.current.step).toBe(0);
  });

  it('cria sessionId e persiste no localStorage', async () => {
    await initHook();
    const key = `qf_session_${mockQuiz.slug}`;
    expect(localStorage.getItem(key)).toBeTruthy();
  });

  it('retoma sessão salva do localStorage', async () => {
    localStorage.setItem(`qf_session_${mockQuiz.slug}`, 'session-existente');
    await initHook();
    expect(mockRepo.createOrResume).toHaveBeenCalledWith(
      'session-existente',
      mockQuiz.id,
      mockQuiz.version
    );
  });

  it('restaura step ao retomar sessão com current_step > 0', async () => {
    mockRepo.createOrResume.mockResolvedValueOnce({
      savedAnswers: [],
      current_step: 2,
      status: 'started',
    });
    const result = await initHook();
    expect(result.current.step).toBe(2);
  });

  it('restaura answers ao retomar sessão', async () => {
    mockRepo.createOrResume.mockResolvedValueOnce({
      savedAnswers: [
        { question_id: mockQuiz.questions[1].id, value: 'João' },
      ],
      current_step: 1,
      status: 'started',
    });
    const result = await initHook();
    expect(result.current.answers[mockQuiz.questions[1].id]).toBe('João');
  });
});

describe('useQuizSession — navegação', () => {
  it('goNext avança o step', async () => {
    const result = await initHook();
    // Step 0 é welcome (required: false) — pode avançar
    await act(async () => { await result.current.goNext(); });
    expect(result.current.step).toBe(1);
  });

  it('goBack volta o step', async () => {
    const result = await initHook();
    await act(async () => { await result.current.goNext(); });
    await act(async () => { result.current.goBack(); });
    expect(result.current.step).toBe(0);
  });

  it('goBack não vai abaixo de 0', async () => {
    const result = await initHook();
    act(() => { result.current.goBack(); });
    expect(result.current.step).toBe(0);
  });

  it('isFirstStep = true no step 0', async () => {
    const result = await initHook();
    expect(result.current.isFirstStep).toBe(true);
  });

  it('isLastStep = true no último step', async () => {
    const result = await initHook();
    const lastIdx = mockQuiz.questions.length - 1;

    // Valor válido por tipo para garantir que canAdvance retorna true
    function validAnswerFor(q) {
      if (!q.required) return undefined;
      if (q.type === 'multichoice') return ['a'];
      if (q.type === 'date') return { day: '01', month: '01', year: '2000' };
      return 'resposta';
    }

    for (let i = 0; i < lastIdx; i++) {
      const q = mockQuiz.questions[i];
      act(() => result.current.updateAnswer(q.id, validAnswerFor(q)));
      await act(async () => { await result.current.goNext(); });
    }
    expect(result.current.isLastStep).toBe(true);
  });
});

describe('useQuizSession — validação', () => {
  it('canAdvance = true para welcome (required: false)', async () => {
    const result = await initHook();
    expect(result.current.step).toBe(0);
    expect(result.current.canAdvance()).toBe(true);
  });

  it('canAdvance = false se campo required vazio', async () => {
    const result = await initHook();
    // Avança para o step 1 (text, required: true)
    await act(async () => { await result.current.goNext(); });
    expect(result.current.step).toBe(1);
    expect(result.current.canAdvance()).toBe(false);
  });

  it('canAdvance = true após preencher campo required', async () => {
    const result = await initHook();
    await act(async () => { await result.current.goNext(); });

    const q = mockQuiz.questions[1];
    act(() => result.current.updateAnswer(q.id, 'João'));

    expect(result.current.canAdvance()).toBe(true);
  });
});

describe('useQuizSession — persistência', () => {
  it('salva answer ao avançar step', async () => {
    const result = await initHook();
    // welcome → step 1
    await act(async () => { await result.current.goNext(); });

    const q = mockQuiz.questions[1];
    act(() => result.current.updateAnswer(q.id, 'João'));
    await act(async () => { await result.current.goNext(); });

    expect(mockRepo.saveAnswer).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ questionId: q.id, value: 'João' })
    );
  });

  it('salva evento step_answered ao avançar', async () => {
    const result = await initHook();
    await act(async () => { await result.current.goNext(); });

    expect(mockRepo.saveEvent).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ type: 'step_answered' })
    );
  });
});

describe('useQuizSession — submit', () => {
  it('chama completeSession ao submeter', async () => {
    const result = await initHook();

    // Quiz com apenas uma pergunta welcome para simplificar
    const simpleQuiz = {
      ...mockQuiz,
      questions: [mockQuiz.questions[0]], // só welcome
    };
    const { result: r2 } = renderHook(() => useQuizSession(simpleQuiz));
    await act(async () => { await vi.runAllTimersAsync(); });
    await act(async () => { await r2.current.goNext(); });

    expect(mockRepo.completeSession).toHaveBeenCalled();
    expect(r2.current.isSubmitted).toBe(true);
  });

  it('isSubmitted = false antes de submeter', async () => {
    const result = await initHook();
    expect(result.current.isSubmitted).toBe(false);
  });

  it('exibe submitError em caso de falha', async () => {
    mockRepo.completeSession.mockRejectedValueOnce(new Error('Network error'));

    const simpleQuiz = { ...mockQuiz, questions: [mockQuiz.questions[0]] };
    const { result } = renderHook(() => useQuizSession(simpleQuiz));
    await act(async () => { await vi.runAllTimersAsync(); });
    await act(async () => { await result.current.goNext(); });

    expect(result.current.isSubmitted).toBe(false);
    expect(result.current.submitError).toBeTruthy();
  });
});

describe('useQuizSession — restart', () => {
  it('restart reseta step e answers', async () => {
    const result = await initHook();
    await act(async () => { await result.current.goNext(); });
    act(() => result.current.updateAnswer(mockQuiz.questions[1].id, 'João'));

    act(() => { result.current.restart(); });

    expect(result.current.step).toBe(0);
    expect(result.current.answers).toEqual({});
    expect(result.current.isSubmitted).toBe(false);
  });

  it('restart gera novo sessionId (limpa localStorage)', async () => {
    const key = `qf_session_${mockQuiz.slug}`;
    const result = await initHook();
    const oldSid = localStorage.getItem(key);

    act(() => { result.current.restart(); });
    await act(async () => { await vi.runAllTimersAsync(); });

    const newSid = localStorage.getItem(key);
    expect(newSid).not.toBe(oldSid);
  });
});

describe('useQuizSession — progress', () => {
  it('progress = 0 no step 0', async () => {
    const result = await initHook();
    expect(result.current.progress).toBe(0);
  });

  it('progress aumenta ao avançar', async () => {
    const result = await initHook();
    const before = result.current.progress;
    await act(async () => { await result.current.goNext(); });
    expect(result.current.progress).toBeGreaterThan(before);
  });
});
