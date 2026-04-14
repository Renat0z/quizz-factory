/**
 * Helpers compartilhados pelos testes E2E.
 * Toda comunicação com a API usa o token de admin armazenado após login.
 */

const BASE_URL = 'http://localhost:3001';

/**
 * Obtém token de admin via login na API.
 */
export async function getAdminToken(request) {
  const res = await request.post(`${BASE_URL}/api/admin/auth/login`, {
    data: { username: 'admin', password: 'admin123' },
  });
  const { token } = await res.json();
  return token;
}

/**
 * Cria um quiz de teste via API e retorna { id, slug }.
 * Gera slug único por timestamp para isolamento entre testes.
 */
export async function createTestQuiz(request, token, overrides = {}) {
  const slug = `e2e-test-${Date.now()}`;
  const res = await request.post(`${BASE_URL}/api/admin/quizzes`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: 'Quiz E2E',
      slug,
      description: 'Criado pelos testes E2E',
      config: {
        theme: { primary: '#6C5CE7' },
        successTitle: 'Obrigado!',
        successMessage: 'Resposta registrada.',
        showProgressCount: true,
      },
      ...overrides,
    },
  });
  return await res.json();
}

/**
 * Adiciona pergunta a um quiz de teste.
 */
export async function addQuestion(request, token, quizId, question) {
  const res = await request.post(`${BASE_URL}/api/admin/quizzes/${quizId}/questions`, {
    headers: { Authorization: `Bearer ${token}` },
    data: question,
  });
  return await res.json();
}

/**
 * Publica um quiz.
 */
export async function publishQuiz(request, token, quizId) {
  await request.post(`${BASE_URL}/api/admin/quizzes/${quizId}/publish`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { publish: true },
  });
}

/**
 * Remove um quiz de teste (soft delete).
 */
export async function deleteTestQuiz(request, token, quizId) {
  await request.delete(`${BASE_URL}/api/admin/quizzes/${quizId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
