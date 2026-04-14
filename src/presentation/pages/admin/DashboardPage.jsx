import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Users, TrendingUp, Plus, ArrowRight } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <p className="text-sm text-zinc-400 font-medium">{label}</p>
      </div>
      <p className="text-3xl font-black text-white">{value ?? '—'}</p>
    </div>
  );
}

export default function DashboardPage({ token }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/quizzes', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setQuizzes(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [token]);

  const totalQuizzes = quizzes.length;
  const publishedQuizzes = quizzes.filter(q => q.status === 'published').length;
  const totalResponses = quizzes.reduce((s, q) => s + parseInt(q.completed_sessions || 0), 0);
  const avgCompletion = (() => {
    const valid = quizzes.filter(q => parseInt(q.total_sessions) > 0);
    if (!valid.length) return null;
    const avg = valid.reduce((s, q) =>
      s + (parseInt(q.completed_sessions) / parseInt(q.total_sessions)), 0) / valid.length;
    return `${Math.round(avg * 100)}%`;
  })();

  return (
    <div className="p-8 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Dashboard</h1>
          <p className="text-zinc-400 mt-1">Visão geral dos seus quizzes</p>
        </div>
        <Link
          to="/admin/quizzes/new"
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-dark transition-colors"
        >
          <Plus size={16} /> Novo Quiz
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard icon={ClipboardList} label="Total de quizzes" value={totalQuizzes} color="#6C5CE7" />
        <StatCard icon={TrendingUp} label="Publicados" value={publishedQuizzes} color="#00B894" />
        <StatCard icon={Users} label="Respostas totais" value={totalResponses} color="#0984E3" />
        <StatCard icon={TrendingUp} label="Taxa média de conclusão" value={avgCompletion} color="#FDCB6E" />
      </div>

      {/* Lista recente */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="font-bold text-white">Quizzes recentes</h2>
          <Link to="/admin/quizzes" className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">
            Ver todos <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-600">Carregando...</div>
        ) : quizzes.length === 0 ? (
          <div className="p-8 text-center text-zinc-600">
            <p className="mb-3">Nenhum quiz criado ainda</p>
            <Link to="/admin/quizzes/new" className="text-brand text-sm font-semibold">
              Criar primeiro quiz →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 uppercase tracking-wider">
                <th className="text-left px-6 py-3">Quiz</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-right px-6 py-3">Sessões</th>
                <th className="text-right px-6 py-3">Concluídas</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {quizzes.slice(0, 5).map(quiz => (
                <tr key={quiz.id} className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-white">{quiz.name}</p>
                    <p className="text-zinc-500 font-mono text-xs">/{quiz.slug}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                      quiz.status === 'published'
                        ? 'bg-green-500/15 text-green-400'
                        : quiz.status === 'archived'
                        ? 'bg-zinc-700 text-zinc-400'
                        : 'bg-yellow-500/15 text-yellow-400'
                    }`}>
                      {quiz.status === 'published' ? 'Publicado' : quiz.status === 'archived' ? 'Arquivado' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-zinc-300">{quiz.total_sessions || 0}</td>
                  <td className="px-6 py-4 text-right text-zinc-300">{quiz.completed_sessions || 0}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/admin/quizzes/${quiz.id}/edit`}
                      className="text-brand text-xs font-semibold hover:underline"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
