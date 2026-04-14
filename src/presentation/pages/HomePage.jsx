import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, Loader2 } from 'lucide-react';
import { QuizApiRepository } from '../../infrastructure/api/QuizApiRepository';
import { makeListQuizzes } from '../../core/usecases/ListQuizzes';

const listQuizzes = makeListQuizzes(new QuizApiRepository());

export default function HomePage() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listQuizzes()
      .then(setQuizzes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center font-black text-white text-sm">
              Q
            </div>
            <span className="font-bold text-white tracking-tight">Quiz Factory</span>
          </div>
          <Link
            to="/admin"
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Admin →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
          Quizzes disponíveis
        </h1>
        <p className="text-zinc-400 text-lg">
          Escolha um quiz para responder
        </p>
      </div>

      {/* Lista de quizzes */}
      <main className="max-w-4xl mx-auto px-4 pb-20">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-zinc-600" />
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <ClipboardList size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold">Nenhum quiz publicado ainda</p>
            <p className="text-sm mt-1">Crie um no painel de administração</p>
            <Link
              to="/admin"
              className="inline-block mt-6 px-6 py-3 rounded-xl bg-brand text-white font-bold hover:bg-brand-dark transition-colors"
            >
              Ir para o Admin
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map(quiz => (
              <Link
                key={quiz.id}
                to={`/${quiz.slug}`}
                className="group block p-6 rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-brand/60 hover:bg-zinc-800/80 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                        style={{
                          backgroundColor: quiz.config?.theme?.primary || '#6C5CE7',
                        }}
                      >
                        {quiz.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-zinc-500 font-mono">/{quiz.slug}</span>
                    </div>
                    <h2 className="text-xl font-bold text-white group-hover:text-brand transition-colors mb-1">
                      {quiz.name}
                    </h2>
                    {quiz.description && (
                      <p className="text-sm text-zinc-400 line-clamp-2">{quiz.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-xs text-zinc-500">
                        {quiz.response_count || 0} respostas
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    size={20}
                    className="text-zinc-600 group-hover:text-brand group-hover:translate-x-1 transition-all mt-1 shrink-0"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
