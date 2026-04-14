import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erro');
      const { token } = await res.json();
      localStorage.setItem('qf_admin_token', token);
      onLogin(token);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center font-black text-white text-2xl mx-auto mb-4">
            Q
          </div>
          <h1 className="text-2xl font-black text-white">Quiz Factory</h1>
          <p className="text-zinc-500 text-sm mt-1">Painel de administração</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Usuário
            </label>
            <input
              autoFocus
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 outline-none focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-12 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 outline-none focus:border-brand transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-3.5 rounded-xl bg-brand text-white font-bold transition-all hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
