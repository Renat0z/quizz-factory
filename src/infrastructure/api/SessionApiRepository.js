/**
 * Implementação HTTP do ISessionRepository
 */
export class SessionApiRepository {
  async createOrResume(sessionId, quizId, quizVersion) {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, quizId, quizVersion, consent: true }),
    });
    if (!res.ok) throw new Error('Erro ao criar sessão');
    return res.json();
  }

  async saveAnswer(sessionId, answer) {
    const res = await fetch(`/api/sessions/${sessionId}/answers`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answer),
    });
    if (!res.ok) console.warn('Falha ao salvar answer:', answer.questionId);
    return res.json().catch(() => ({ ok: false }));
  }

  async saveEvent(sessionId, event) {
    // Fire-and-forget: não bloqueia o fluxo
    fetch(`/api/sessions/${sessionId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {});
  }

  async completeSession(sessionId) {
    const res = await fetch(`/api/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Erro ao completar sessão');
    return res.json();
  }
}
