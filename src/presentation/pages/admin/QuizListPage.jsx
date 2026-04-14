import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, BarChart2, Trash2, Globe, EyeOff, Loader2 } from 'lucide-react';

export default function QuizListPage({ token }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = () => {
    setLoading(true);
    fetch('/api/admin/quizzes', { headers })
      .then(r => r.json())
      .then(d => setQuizzes(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const togglePublish = async (quiz) => {
    const publish = quiz.status !== 'published';
    await fetch(`/api/admin/quizzes/${quiz.id}/publish`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ publish }),
    });
    load();
  };

  const deleteQuiz = async (quiz) => {
    if (!confirm(`Deseja excluir "${quiz.name}"? Esta ação não pode ser desfeita.`)) return;
    await fetch(`/api/admin/quizzes/${quiz.id}`, { method: 'DELETE', headers });
    load();
  };

  return (
    <div className="p-8 text-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Meus Quizzes</h1>
          <p className="text-zinc-400 mt-1">{quizzes.length} quizzes criados</p>
        </div>
        <Link
          to="/admin/quizzes/new"
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-dark transition-colors"
        >
          <Plus size={16} /> Novo Quiz
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-zinc-600" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-lg font-semibold mb-2">Nenhum quiz ainda</p>
          <Link to="/admin/quizzes/new" className="text-brand text-sm font-semibold hover:underline">
            Criar o primeiro quiz →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map(quiz => (
            <div
              key={quiz.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4"
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-white truncate">{quiz.name}</h3>
                  <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-bold ${
                    quiz.status === 'published'
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-yellow-500/15 text-yellow-400'
                  }`}>
                    {quiz.status === 'published' ? 'Publicado' : 'Rascunho'}
                  </span>
                </div>
                <p className="text-zinc-500 text-sm font-mono">/{quiz.slug}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                  <span>{quiz.question_count || 0} perguntas</span>
                  <span>{quiz.total_sessions || 0} sessões</span>
                  <span>{quiz.completed_sessions || 0} concluídas</span>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/admin/quizzes/${quiz.id}/edit`}
                  className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </Link>
                <Link
                  to={`/admin/quizzes/${quiz.id}/analytics`}
                  className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                  title="Analytics"
                >
                  <BarChart2 size={16} />
                </Link>
                <button
                  onClick={() => togglePublish(quiz)}
                  className={`p-2.5 rounded-xl transition-colors ${
                    quiz.status === 'published'
                      ? 'bg-green-500/15 text-green-400 hover:bg-green-500/30'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                  }`}
                  title={quiz.status === 'published' ? 'Despublicar' : 'Publicar'}
                >
                  {quiz.status === 'published' ? <EyeOff size={16} /> : <Globe size={16} />}
                </button>
                <button
                  onClick={() => deleteQuiz(quiz)}
                  className="p-2.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
