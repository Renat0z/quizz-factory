/**
 * Use case: carregar quiz público por slug
 * Depende de IQuizRepository (não de implementação concreta)
 *
 * @param {Object} quizRepository - implementa { getBySlug(slug): Promise<Quiz> }
 * @returns {Function}
 */
export function makeGetQuizBySlug(quizRepository) {
  return async function getQuizBySlug(slug) {
    if (!slug) throw new Error('Slug é obrigatório');
    const quiz = await quizRepository.getBySlug(slug);
    if (!quiz) {
      const err = new Error('Quiz não encontrado');
      err.statusCode = 404;
      throw err;
    }
    return quiz;
  };
}
