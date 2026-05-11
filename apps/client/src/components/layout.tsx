import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { LogOut, Sword, Shield, Bell, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Layout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:bg-indigo-500 transition-colors">
              <Sword className="w-6 h-6 text-white transform -rotate-12" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter text-white uppercase italic leading-none">
                Code <span className="text-indigo-500">Duel</span>
              </span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mt-1">
                League System
              </span>
            </div>
          </motion.div>

          {user && (
            <div className="flex items-center space-x-8">
              <nav className="hidden md:flex items-center space-x-6">
                {['Dashboard', 'Leaderboard', 'Arena', 'Training'].map((item) => (
                  <button
                    key={item}
                    className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-white transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </nav>

              <div className="h-6 w-px bg-white/5 hidden md:block" />

              <div className="flex items-center space-x-4">
                <button className="p-2 text-slate-500 hover:text-indigo-400 transition-colors relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full border border-slate-950" />
                </button>

                <div className="flex items-center space-x-4 pl-4 border-l border-white/5">
                  <div className="flex flex-col items-end mr-3">
                    <span className="text-xs font-black text-white uppercase tracking-tight">
                      {user.username}
                    </span>
                    <div className="flex items-center space-x-1 mt-0.5">
                      <Shield className="w-3 h-3 text-indigo-500" />
                      <span className="text-[10px] font-mono text-slate-400 font-bold tracking-tighter italic">
                        RANK: SILVER IV
                      </span>
                    </div>
                  </div>

                  <div className="relative group">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center overflow-hidden cursor-pointer">
                      <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-transparent flex items-center justify-center">
                        <span className="text-sm font-black text-indigo-400">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform translate-y-2 group-hover:translate-y-0">
                      <button className="w-full px-4 py-2 text-left text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-between">
                        <span>Profile Settings</span>
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-between"
                      >
                        <span>Terminate Session</span>
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex-1 flex flex-col overflow-auto scrollbar-hide"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>

        {/* Background Decorative Elements */}
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/5 rounded-full blur-[120px]" />
        </div>
      </main>
    </div>
  );
};
