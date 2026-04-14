import { describe, it, expect, vi } from 'vitest';
import { makeSubmitSession } from '../../../../src/core/usecases/SubmitSession';

function makeRepo() {
  return {
    saveAnswer:       vi.fn().mockResolvedValue({ ok: true }),
    completeSession:  vi.fn().mockResolvedValue({ ok: true }),
    saveEvent:        vi.fn().mockResolvedValue({ ok: true }),
  };
}

const mockAnswers = [
  { questionId: 'q-1', questionType: 'text',   value: 'João' },
  { questionId: 'q-2', questionType: 'choice', value: 'a' },
];

describe('SubmitSession', () => {
  it('salva todas as answers em paralelo', async () => {
    const repo = makeRepo();
    const submit = makeSubmitSession(repo);

    await submit('session-abc', mockAnswers);

    expect(repo.saveAnswer).toHaveBeenCalledTimes(2);
    expect(repo.saveAnswer).toHaveBeenCalledWith('session-abc', mockAnswers[0]);
    expect(repo.saveAnswer).toHaveBeenCalledWith('session-abc', mockAnswers[1]);
  });

  it('completa a sessão após salvar answers', async () => {
    const repo = makeRepo();
    const submit = makeSubmitSession(repo);

    await submit('session-abc', mockAnswers);

    expect(repo.completeSession).toHaveBeenCalledWith('session-abc');
  });

  it('salva evento session_completed', async () => {
    const repo = makeRepo();
    const submit = makeSubmitSession(repo);

    await submit('session-abc', mockAnswers);

    expect(repo.saveEvent).toHaveBeenCalledWith('session-abc', {
      type: 'session_completed',
    });
  });

  it('lança erro se sessionId não fornecido', async () => {
    const repo = makeRepo();
    const submit = makeSubmitSession(repo);

    await expect(submit('', mockAnswers)).rejects.toThrow('sessionId é obrigatório');
    await expect(submit(null, mockAnswers)).rejects.toThrow('sessionId é obrigatório');
    expect(repo.saveAnswer).not.toHaveBeenCalled();
  });

  it('lança erro se answers não for array', async () => {
    const repo = makeRepo();
    const submit = makeSubmitSession(repo);

    await expect(submit('session-abc', null)).rejects.toThrow('answers deve ser um array');
    await expect(submit('session-abc', {})).rejects.toThrow('answers deve ser um array');
  });

  it('funciona com lista de answers vazia', async () => {
    const repo = makeRepo();
    const submit = makeSubmitSession(repo);

    await expect(submit('session-abc', [])).resolves.toEqual({ ok: true });
    expect(repo.saveAnswer).not.toHaveBeenCalled();
    expect(repo.completeSession).toHaveBeenCalled();
  });

  it('propaga erros do repositório', async () => {
    const repo = { ...makeRepo(), completeSession: vi.fn().mockRejectedValue(new Error('Timeout')) };
    const submit = makeSubmitSession(repo);

    await expect(submit('session-abc', [])).rejects.toThrow('Timeout');
  });
});
