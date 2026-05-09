import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { LogOut, Sword } from 'lucide-react';

export const Layout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-950 text-slate-200">
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
          <Sword className="w-8 h-8 text-indigo-500" />
          <span className="text-xl font-bold tracking-tight text-white">Code Duel</span>
        </div>

        {user && (
          <div className="flex items-center space-x-6">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-white">{user.username}</span>
              <span className="text-xs text-slate-400">Rating: {user.rating}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};
