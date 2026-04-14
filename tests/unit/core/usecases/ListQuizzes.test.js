import { describe, it, expect, vi } from 'vitest';
import { makeListQuizzes } from '../../../../src/core/usecases/ListQuizzes';
import { mockQuiz } from '../../../fixtures/quiz';

describe('ListQuizzes', () => {
  it('retorna lista de quizzes publicados', async () => {
    const repo = { listPublished: vi.fn().mockResolvedValue([mockQuiz]) };
    const list = makeListQuizzes(repo);

    const result = await list();

    expect(repo.listPublished).toHaveBeenCalledOnce();
    expect(result).toEqual([mockQuiz]);
  });

  it('retorna array vazio quando não há quizzes', async () => {
    const repo = { listPublished: vi.fn().mockResolvedValue([]) };
    const list = makeListQuizzes(repo);

    const result = await list();

    expect(result).toEqual([]);
  });

  it('propaga erros do repositório', async () => {
    const repo = { listPublished: vi.fn().mockRejectedValue(new Error('DB error')) };
    const list = makeListQuizzes(repo);

    await expect(list()).rejects.toThrow('DB error');
  });
});
