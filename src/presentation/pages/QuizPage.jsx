import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useQuiz } from '../hooks/useQuiz';
import { QuizPlayer } from '../components/QuizPlayer';

export default function QuizPage() {
  const { slug } = useParams();
  const { quiz, loading, error } = useQuiz(slug);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-zinc-600" />
      </div>
    );
  }

  if (error === 'not_found') {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle size={48} className="mx-auto mb-4 text-zinc-600" />
          <h1 className="text-2xl font-black text-white mb-2">Quiz não encontrado</h1>
          <p className="text-zinc-500 mb-6">
            O quiz <code className="text-zinc-400">/{slug}</code> não existe ou foi despublicado.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition-colors"
          >
            ← Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500/60" />
          <h1 className="text-2xl font-black text-white mb-2">Erro ao carregar</h1>
          <p className="text-zinc-500 mb-6">Tente recarregar a página.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition-colors"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }

  return <QuizPlayer quiz={quiz} />;
}
