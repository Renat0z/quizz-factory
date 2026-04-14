/**
 * Use case: submeter sessão completa de quiz
 *
 * @param {Object} sessionRepository - implementa { saveAnswer, completeSession, saveEvent }
 * @returns {Function}
 */
export function makeSubmitSession(sessionRepository) {
  return async function submitSession(sessionId, answers) {
    if (!sessionId) throw new Error('sessionId é obrigatório');
    if (!Array.isArray(answers)) throw new Error('answers deve ser um array');

    // Salva answers em paralelo (são idempotentes via upsert)
    await Promise.all(answers.map(a => sessionRepository.saveAnswer(sessionId, a)));
    await sessionRepository.completeSession(sessionId);
    await sessionRepository.saveEvent(sessionId, { type: 'session_completed' });

    return { ok: true };
  };
}
