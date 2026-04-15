import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Trophy, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

// ─── Scoring Engine ────────────────────────────────────────────────────────────

function parseValue(raw) {
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

function scoreSession(session, questionsMap) {
  const get = (key) => {
    const q = questionsMap[key];
    if (!q) return null;
    const a = (session.answers || []).find(x => x && x.question_id === q.id);
    return a?.value != null ? parseValue(a.value) : null;
  };

  const q1        = get('q1');
  const q2        = get('q2');
  const q3_horas  = get('q3_horas');
  const q3_gasto  = get('q3_gasto');
  const q3_abriu  = get('q3_abriu');
  const q4        = get('q4');
  const q4_detail = get('q4_detail');
  const q5        = get('q5');
  const q5_detail = get('q5_detail');
  const q6        = get('q6');
  const q7        = get('q7');
  const q8        = get('q8');
  const q9        = get('q9');
  const q10       = get('q10');

  // ── Eliminatórios ──────────────────────────────────────────────────────────
  const q2str = String(q2 || '').trim();
  const q9str = String(q9 || '').trim();
  const elim_q2 = q2str.length >= 30 && !['quero aprender', 'aprender ia', 'aprender sobre'].some(p => q2str.toLowerCase().includes(p));
  const elim_q9 = q9str.length >= 30 && !['dependeria', 'depende da comunidade', 'não sei'].some(p => q9str.toLowerCase().includes(p));
  const elim_q3 = !!(String(q3_horas || '').trim() || String(q3_gasto || '').trim() || String(q3_abriu || '').trim());

  const eliminated = !elim_q2 || !elim_q9 || !elim_q3;
  const eliminatoryDetail = {
    q2: { ok: elim_q2, label: 'Q2 — ideia específica' },
    q9: { ok: elim_q9, label: 'Q9 — projeto concreto' },
    q3: { ok: elim_q3, label: 'Q3 — skin-in-the-game' },
  };

  // ── Q1: 0–20 pts ───────────────────────────────────────────────────────────
  const q1Score = { D: 20, C: 15, B: 5, A: 0 }[q1] ?? 0;

  // ── Q4: 0–20 pts ───────────────────────────────────────────────────────────
  const q4d = String(q4_detail || '').trim();
  let q4Score = 0;
  if (q4 === 'A' && q4d.length >= 60) q4Score = 20;
  else if (q4 === 'B' && q4d.length >= 60) q4Score = 15;
  else if ((q4 === 'A' || q4 === 'B') && q4d.length > 0) q4Score = 8;

  // ── Q5: 0–15 pts ───────────────────────────────────────────────────────────
  const q5d = String(q5_detail || '').trim();
  let q5Score = 0;
  if (q5 === 'A' && q5d.length >= 50) q5Score = 15;
  else if (q5 === 'A' && q5d.length > 0) q5Score = 7;
  else if (q5 === 'B') q5Score = 3;
  // C = 0

  // ── Q6: 0–15 pts (5 pts cada critério — estimado por extensão) ─────────────
  const q6str = String(q6 || '').trim();
  let q6Score = 0;
  if (q6str.length >= 80)  q6Score += 5; // descreve o que quebrou
  if (q6str.length >= 180) q6Score += 5; // descreve o processo de resolução
  if (q6str.length >= 300) q6Score += 5; // menciona aprendizado
  const q6NeedsReview = q6str.length > 0 && q6str.length < 300;

  // ── Q7: 0–15 pts ───────────────────────────────────────────────────────────
  const q7Score = { A: 15, B: 12, C: 3, D: 0 }[q7] ?? 0;

  // ── Q8: 0–10 pts ───────────────────────────────────────────────────────────
  const q8Score = { C: 10, B: 5, D: 3, A: 0 }[q8] ?? 0;

  // ── Q10: 0–5 pts ───────────────────────────────────────────────────────────
  const q10arr = Array.isArray(q10) ? q10 : [];
  let q10Score = 0;
  if (!q10arr.includes('nenhuma')) {
    if (q10arr.length >= 3) q10Score = 5;
    else if (q10arr.length >= 1) q10Score = 3;
  }

  const totalScore = q1Score + q4Score + q5Score + q6Score + q7Score + q8Score + q10Score;

  // ── Decisão ────────────────────────────────────────────────────────────────
  let decision, decisionVariant;
  if (eliminated) {
    decision = 'Eliminado';
    decisionVariant = 'eliminated';
  } else if (totalScore >= 85) {
    decision = 'Entrada imediata';
    decisionVariant = 'immediate';
  } else if (totalScore >= 70) {
    decision = 'Entrada confirmada';
    decisionVariant = 'confirmed';
  } else if (totalScore >= 50) {
    decision = 'Lista de espera';
    decisionVariant = 'waitlist';
  } else {
    decision = 'Não entra agora';
    decisionVariant = 'rejected';
  }

  const breakdown = { q1Score, q4Score, q5Score, q6Score, q7Score, q8Score, q10Score };

  return { totalScore, eliminated, eliminatoryDetail, decision, decisionVariant, breakdown, q6NeedsReview };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const DECISION_STYLES = {
  immediate:  { badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', icon: Trophy },
  confirmed:  { badge: 'bg-green-500/15 text-green-400 border border-green-500/20', icon: CheckCircle },
  waitlist:   { badge: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20', icon: Clock },
  rejected:   { badge: 'bg-zinc-700/50 text-zinc-400 border border-zinc-700', icon: XCircle },
  eliminated: { badge: 'bg-red-500/15 text-red-400 border border-red-500/20', icon: XCircle },
};

function DecisionBadge({ variant, label }) {
  const { badge, icon: Icon } = DECISION_STYLES[variant] || DECISION_STYLES.rejected;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${badge}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

function ScoreBar({ value, max, color = 'bg-brand' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-zinc-400 w-12 text-right">{value}/{max}</span>
    </div>
  );
}

function EliminatoryTag({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
      ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
    }`}>
      {ok ? '✓' : '✗'} {label}
    </span>
  );
}

function AnswerRow({ label, value, highlight = false }) {
  if (value == null || value === '') return null;
  const display = Array.isArray(value) ? value.join(', ') : String(value);
  return (
    <div className={`flex gap-3 text-sm py-1.5 ${highlight ? 'border-l-2 border-brand pl-3' : ''}`}>
      <span className="shrink-0 w-40 text-zinc-500 font-medium">{label}</span>
      <span className="text-zinc-200 whitespace-pre-wrap">{display}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EvaluationPage({ token }) {
  const { id } = useParams();
  const [sessions, setSessions] = useState([]);
  const [questionsMap, setQuestionsMap] = useState({});
  const [questionsById, setQuestionsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filterDecision, setFilterDecision] = useState('');
  const [quizName, setQuizName] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/quizzes/${id}/sessions`, { headers }).then(r => r.json()),
      fetch(`/api/admin/quizzes/${id}/questions`, { headers }).then(r => r.json()),
      fetch(`/api/admin/quizzes`, { headers }).then(r => r.json()),
    ]).then(([sessionsData, qs, quizzes]) => {
      const questions = Array.isArray(qs) ? qs : [];

      // Map: config.key → question object
      const byKey = {};
      const byId = {};
      for (const q of questions) {
        const key = q.config?.key;
        if (key) byKey[key] = q;
        byId[q.id] = q;
      }
      setQuestionsMap(byKey);
      setQuestionsById(byId);

      const raw = sessionsData.sessions || [];
      setSessions(raw.filter(s => s.status === 'completed'));

      const quiz = (Array.isArray(quizzes) ? quizzes : []).find(q => q.id === id);
      if (quiz) setQuizName(quiz.name);
    }).finally(() => setLoading(false));
  }, [id]);

  // Score all sessions and sort by score desc
  const scored = sessions
    .map(s => ({ session: s, result: scoreSession(s, questionsMap) }))
    .filter(({ result }) => !filterDecision || result.decisionVariant === filterDecision)
    .sort((a, b) => {
      // Non-eliminated first, then by score desc
      if (a.result.eliminated !== b.result.eliminated) return a.result.eliminated ? 1 : -1;
      return b.result.totalScore - a.result.totalScore;
    });

  const getAnswer = (session, key) => {
    const q = questionsMap[key];
    if (!q) return null;
    const a = (session.answers || []).find(x => x && x.question_id === q.id);
    return a?.value != null ? parseValue(a.value) : null;
  };

  const counts = sessions.reduce((acc, s) => {
    const r = scoreSession(s, questionsMap);
    acc[r.decisionVariant] = (acc[r.decisionVariant] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-8 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/admin/quizzes" className="text-zinc-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black">Avaliação de Candidatos</h1>
            <p className="text-zinc-400 text-sm mt-0.5">{quizName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/quizzes/${id}/responses`}
            className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-colors"
          >
            Ver todas as respostas
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-zinc-600" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-5 gap-3 mb-8">
            {[
              { label: 'Total concluídos', value: sessions.length, variant: null },
              { label: 'Entrada imediata', value: counts.immediate || 0, variant: 'immediate' },
              { label: 'Entrada confirmada', value: counts.confirmed || 0, variant: 'confirmed' },
              { label: 'Lista de espera', value: counts.waitlist || 0, variant: 'waitlist' },
              { label: 'Eliminados', value: (counts.eliminated || 0) + (counts.rejected || 0), variant: 'eliminated' },
            ].map(({ label, value, variant }) => (
              <button
                key={label}
                onClick={() => setFilterDecision(filterDecision === variant ? '' : variant)}
                className={`bg-zinc-900 border rounded-xl p-4 text-left transition-colors ${
                  filterDecision === variant
                    ? 'border-brand bg-brand/10'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-xs text-zinc-500 mt-1">{label}</p>
              </button>
            ))}
          </div>

          {/* Nota sobre Q6 */}
          {scored.some(({ result }) => result.q6NeedsReview) && (
            <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 mb-6 text-sm text-yellow-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>
                <strong>Revisão manual recomendada:</strong> A pontuação de Q6 (Transparência de Processo) é estimada por extensão da resposta. Candidatos marcados com ⚠ devem ter a resposta lida para validar o score.
              </span>
            </div>
          )}

          {/* Ranking */}
          {scored.length === 0 ? (
            <div className="text-center py-20 text-zinc-600">
              Nenhum candidato encontrado
            </div>
          ) : (
            <div className="space-y-2">
              {scored.map(({ session, result }, idx) => {
                const isExpanded = expandedId === session.id;
                const rank = idx + 1;
                const { totalScore, eliminated, eliminatoryDetail, decision, decisionVariant, breakdown, q6NeedsReview } = result;

                return (
                  <div
                    key={session.id}
                    className={`bg-zinc-900 border rounded-xl overflow-hidden transition-colors ${
                      eliminated ? 'border-zinc-800/60 opacity-70' : 'border-zinc-800'
                    }`}
                  >
                    {/* Row header */}
                    <div
                      className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-zinc-800/40 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : session.id)}
                    >
                      {/* Rank */}
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                        !eliminated && rank <= 10
                          ? 'bg-brand/20 text-brand'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {eliminated ? '—' : rank}
                      </span>

                      {/* Session ID */}
                      <div className="w-24 shrink-0">
                        <p className="text-xs font-mono text-zinc-500">{session.id.slice(0, 8)}…</p>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {new Date(session.completed_at || session.started_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      {/* Score */}
                      <div className="w-24 shrink-0">
                        <p className={`text-xl font-black ${eliminated ? 'text-zinc-600' : 'text-white'}`}>
                          {eliminated ? '—' : totalScore}
                          {!eliminated && <span className="text-xs text-zinc-500 font-normal ml-1">/100</span>}
                        </p>
                      </div>

                      {/* Score bar */}
                      <div className="flex-1">
                        {!eliminated && (
                          <ScoreBar value={totalScore} max={100} color={
                            totalScore >= 85 ? 'bg-emerald-500' :
                            totalScore >= 70 ? 'bg-green-500' :
                            totalScore >= 50 ? 'bg-yellow-500' : 'bg-zinc-600'
                          } />
                        )}
                        {eliminated && (
                          <div className="flex flex-wrap gap-1.5">
                            {Object.values(eliminatoryDetail).filter(e => !e.ok).map(e => (
                              <EliminatoryTag key={e.label} ok={false} label={e.label} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Decision */}
                      <div className="w-44 shrink-0 flex justify-end">
                        <DecisionBadge variant={decisionVariant} label={decision} />
                        {q6NeedsReview && !eliminated && (
                          <span className="ml-2 text-yellow-400" title="Q6 requer revisão manual">⚠</span>
                        )}
                      </div>

                      {isExpanded ? <ChevronUp size={16} className="text-zinc-500 shrink-0" /> : <ChevronDown size={16} className="text-zinc-500 shrink-0" />}
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-zinc-800 px-5 py-5 space-y-6">
                        {/* Score breakdown */}
                        {!eliminated && (
                          <div>
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Pontuação por critério</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                              <div>
                                <p className="text-xs text-zinc-500 mb-1">Q1 — Estágio atual (max 20)</p>
                                <ScoreBar value={breakdown.q1Score} max={20} />
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500 mb-1">Q4 — Teste de produção (max 20)</p>
                                <ScoreBar value={breakdown.q4Score} max={20} />
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500 mb-1">Q5 — Critério de rejeição (max 15)</p>
                                <ScoreBar value={breakdown.q5Score} max={15} />
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500 mb-1">
                                  Q6 — Transparência de processo (max 15)
                                  {q6NeedsReview && <span className="ml-1 text-yellow-400">⚠ revisar</span>}
                                </p>
                                <ScoreBar value={breakdown.q6Score} max={15} />
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500 mb-1">Q7 — Dor real vs. hype (max 15)</p>
                                <ScoreBar value={breakdown.q7Score} max={15} />
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500 mb-1">Q8 — Generosidade técnica (max 10)</p>
                                <ScoreBar value={breakdown.q8Score} max={10} />
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500 mb-1">Q10 — Fit cultural (max 5)</p>
                                <ScoreBar value={breakdown.q10Score} max={5} />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Eliminatory status */}
                        {eliminated && (
                          <div>
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Critérios eliminatórios</h3>
                            <div className="flex flex-wrap gap-2">
                              {Object.values(eliminatoryDetail).map(e => (
                                <EliminatoryTag key={e.label} ok={e.ok} label={e.label} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Answers */}
                        <div>
                          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Respostas</h3>
                          <div className="space-y-1 divide-y divide-zinc-800/50">
                            <AnswerRow label="Q1 — Estágio" value={getAnswer(session, 'q1')} />
                            <AnswerRow label="Q2 — Ideia (elim.)" value={getAnswer(session, 'q2')} highlight />
                            <AnswerRow label="Q3 — Horas/semana" value={getAnswer(session, 'q3_horas')} />
                            <AnswerRow label="Q3 — Gasto mensal" value={getAnswer(session, 'q3_gasto')} />
                            <AnswerRow label="Q3 — Abriu mão de" value={getAnswer(session, 'q3_abriu')} />
                            <AnswerRow label="Q4 — Em produção" value={getAnswer(session, 'q4')} />
                            <AnswerRow label="Q4 — Detalhe" value={getAnswer(session, 'q4_detail')} />
                            <AnswerRow label="Q5 — Descartou abordagem" value={getAnswer(session, 'q5')} />
                            <AnswerRow label="Q5 — Detalhe" value={getAnswer(session, 'q5_detail')} />
                            <AnswerRow label="Q6 — O que quebrou" value={getAnswer(session, 'q6')} highlight />
                            <AnswerRow label="Q7 — Dor real" value={getAnswer(session, 'q7')} />
                            <AnswerRow label="Q8 — Compartilha?" value={getAnswer(session, 'q8')} />
                            <AnswerRow label="Q9 — Próx. 3 meses (elim.)" value={getAnswer(session, 'q9')} highlight />
                            <AnswerRow label="Q10 — O que irrita" value={getAnswer(session, 'q10')} />
                          </div>
                        </div>

                        {/* Rejection message if not apt */}
                        {(eliminated || result.decisionVariant === 'rejected') && (
                          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm">
                            <p className="text-zinc-500 font-semibold mb-1">Mensagem de retorno sugerida:</p>
                            {eliminated && !result.eliminatoryDetail.q2.ok && (
                              <p className="text-zinc-300">"Você precisa <strong>definir o problema específico que quer resolver com agentes</strong> antes de voltar. Quando tiver, manda de novo."</p>
                            )}
                            {eliminated && !result.eliminatoryDetail.q9.ok && (
                              <p className="text-zinc-300">"Você precisa ter um <strong>projeto concreto com próximo passo definido</strong> antes de voltar. Quando tiver, manda de novo."</p>
                            )}
                            {eliminated && !result.eliminatoryDetail.q3.ok && (
                              <p className="text-zinc-300">"Você precisa mostrar que tem <strong>skin-in-the-game</strong> — horas, gasto ou sacrifício real. Quando tiver, manda de novo."</p>
                            )}
                            {!eliminated && result.decisionVariant === 'rejected' && (
                              <p className="text-zinc-300">"Você precisa <strong>colocar algo em produção, mesmo que simples</strong>, antes de entrar. Quando tiver, manda de novo."</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
