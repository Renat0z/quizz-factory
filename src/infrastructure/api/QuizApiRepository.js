/**
 * Implementação HTTP do IQuizRepository
 * Usa a API REST do backend
 */
export class QuizApiRepository {
  async listPublished() {
    const res = await fetch('/api/quizzes');
    if (!res.ok) throw new Error('Erro ao carregar quizzes');
    return res.json();
  }

  async getBySlug(slug) {
    const res = await fetch(`/api/quizzes/${slug}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Erro ao carregar quiz');
    return res.json();
  }
}
