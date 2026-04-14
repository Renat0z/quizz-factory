import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, LogOut, Plus
} from 'lucide-react';

export default function AdminLayout({ children, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('qf_admin_token');
    onLogout();
    navigate('/admin/login');
  };

  const navItem = (to, Icon, label) => (
    <NavLink
      to={to}
      end={to === '/admin'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
          isActive
            ? 'bg-brand/15 text-brand'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-zinc-950 font-sans flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center font-black text-white text-sm">
              Q
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">Quiz Factory</p>
              <p className="text-xs text-zinc-500">Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItem('/admin', LayoutDashboard, 'Dashboard')}
          {navItem('/admin/quizzes', ClipboardList, 'Meus Quizzes')}
        </nav>

        {/* Ações rápidas */}
        <div className="px-3 py-3 border-t border-zinc-800 space-y-1">
          <NavLink
            to="/admin/quizzes/new"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Plus size={18} />
            Novo Quiz
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
