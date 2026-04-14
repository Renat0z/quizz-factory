import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    completed: { label: 'Concluído', cls: 'bg-green-500/15 text-green-400' },
    started:   { label: 'Em andamento', cls: 'bg-yellow-500/15 text-yellow-400' },
    abandoned: { label: 'Abandonado', cls: 'bg-red-500/15 text-red-400' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'bg-zinc-700 text-zinc-400' };
  return <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${cls}`}>{label}</span>;
}

export default function ResponsesPage({ token }) {
  const { id } = useParams();
  const [sessions, setSessions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/quizzes/${id}/sessions?status=${filterStatus}`, { headers }).then(r => r.json()),
      fetch(`/api/admin/quizzes/${id}/questions`, { headers }).then(r => r.json()),
    ]).then(([sessionsData, qs]) => {
      setSessions(sessionsData.sessions || []);
      setTotal(sessionsData.total || 0);
      setQuestions(Array.isArray(qs) ? qs : []);
    }).finally(() => setLoading(false));
  }, [id, filterStatus]);

  const getAnswer = (session, questionId) => {
    const answers = session.answers || [];
    const a = answers.find(x => x && x.question_id === questionId);
    if (!a?.value) return <span className="text-zinc-600">—</span>;
    try {
      const parsed = JSON.parse(a.value);
      if (Array.isArray(parsed)) return parsed.join(', ');
      return String(parsed);
    } catch {
      return a.value;
    }
  };

  return (
    <div className="p-8 text-white">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/admin/quizzes" className="text-zinc-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black">Respostas</h1>
            <p className="text-zinc-400 text-sm mt-0.5">{total} sessões</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm outline-none focus:border-brand"
          >
            <option value="">Todos</option>
            <option value="completed">Concluídos</option>
            <option value="started">Em andamento</option>
            <option value="abandoned">Abandonados</option>
          </select>
          <a
            href={`/api/admin/quizzes/${id}/export`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-colors"
          >
            <Download size={15} /> CSV
          </a>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-zinc-600" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 text-zinc-600">
          Nenhuma resposta encontrada
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => (
            <div key={session.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                onClick={() => setExpandedId(id => id === session.id ? null : session.id)}
              >
                <StatusBadge status={session.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-zinc-400 truncate">{session.id.slice(0, 8)}…</p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {new Date(session.started_at).toLocaleString('pt-BR')}
                    {session.completed_at && ` → ${new Date(session.completed_at).toLocaleString('pt-BR')}`}
                  </p>
                </div>
                <span className="text-xs text-zinc-500">
                  {(session.answers || []).filter(Boolean).length} / {questions.length} perguntas
                </span>
                {expandedId === session.id ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
              </div>

              {expandedId === session.id && (
                <div className="border-t border-zinc-800 px-5 py-4 space-y-3">
                  {questions.map(q => (
                    <div key={q.id} className="flex gap-4 text-sm">
                      <div className="w-1/3 text-zinc-500 font-medium shrink-0">{q.title}</div>
                      <div className="text-zinc-200">{getAnswer(session, q.id)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
