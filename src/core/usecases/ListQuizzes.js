/**
 * Use case: listar quizzes publicados
 *
 * @param {Object} quizRepository - implementa { listPublished(): Promise<Quiz[]> }
 * @returns {Function}
 */
export function makeListQuizzes(quizRepository) {
  return async function listQuizzes() {
    return quizRepository.listPublished();
  };
}
