import { describe, it, expect, vi } from 'vitest';
import { makeGetQuizBySlug } from '../../../../src/core/usecases/GetQuizBySlug';
import { mockQuiz } from '../../../fixtures/quiz';

function makeRepo(overrides = {}) {
  return {
    getBySlug: vi.fn().mockResolvedValue(mockQuiz),
    ...overrides,
  };
}

describe('GetQuizBySlug', () => {
  it('retorna o quiz quando encontrado', async () => {
    const repo = makeRepo();
    const getQuiz = makeGetQuizBySlug(repo);

    const result = await getQuiz('test-quiz');

    expect(repo.getBySlug).toHaveBeenCalledWith('test-quiz');
    expect(result).toEqual(mockQuiz);
  });

  it('lança erro 404 quando quiz não existe', async () => {
    const repo = makeRepo({ getBySlug: vi.fn().mockResolvedValue(null) });
    const getQuiz = makeGetQuizBySlug(repo);

    await expect(getQuiz('slug-inexistente')).rejects.toMatchObject({
      message: 'Quiz não encontrado',
      statusCode: 404,
    });
  });

  it('lança erro se slug não fornecido', async () => {
    const repo = makeRepo();
    const getQuiz = makeGetQuizBySlug(repo);

    await expect(getQuiz('')).rejects.toThrow('Slug é obrigatório');
    await expect(getQuiz(null)).rejects.toThrow('Slug é obrigatório');
    expect(repo.getBySlug).not.toHaveBeenCalled();
  });

  it('propaga erros do repositório', async () => {
    const repo = makeRepo({
      getBySlug: vi.fn().mockRejectedValue(new Error('Banco offline')),
    });
    const getQuiz = makeGetQuizBySlug(repo);

    await expect(getQuiz('test-quiz')).rejects.toThrow('Banco offline');
  });
});
