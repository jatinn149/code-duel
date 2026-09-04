import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { useSocialStore } from '@/store/social-store';
import { FriendSidebar } from '@/components/social/friend-sidebar';
import { LogOut, Sword, Bell, User, Trophy, Users, ShieldAlert, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { clsx } from 'clsx';

export const Layout = () => {
  const { user, logout } = useAuthStore();
  const { friends } = useSocialStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);

  const onlineFriendsCount = useMemo(() => {
    return friends.filter(f => (f.status as any) === 'ONLINE' || (f.status as any) === 'IN_GAME').length;
  }, [friends]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userLevel = useMemo(() => {
    if (!user) return 1;
    const rating = user.rating;
    if (rating < 800) return 1;
    if (rating < 950) return 2;
    if (rating < 1100) return 3;
    if (rating < 1250) return 4;
    if (rating < 1400) return 5;
    if (rating < 1550) return 6;
    if (rating < 1700) return 7;
    if (rating < 1850) return 8;
    if (rating < 2000) return 9;
    return 10;
  }, [user]);

  const levelColorClass = useMemo(() => {
    if (userLevel === 10) return 'bg-orange-500 text-white font-black';
    if (userLevel >= 8) return 'bg-rose-500 text-white';
    if (userLevel >= 5) return 'bg-amber-500 text-black font-bold';
    if (userLevel >= 2) return 'bg-emerald-500 text-white';
    return 'bg-neutral-600 text-white';
  }, [userLevel]);

  const isLobbyOrBattle = location.pathname.includes('/lobby/') || location.pathname.includes('/battle/');

  return (
    <div className="flex flex-col min-h-screen w-full bg-black text-neutral-200 selection:bg-neutral-800">
      {!isLobbyOrBattle && (
        <header className="sticky top-0 z-40 w-full bg-black/80 backdrop-blur-md border-b border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-neutral-800 transition-colors group-hover:bg-neutral-200">
              <Sword className="w-4 h-4 text-black transform -rotate-12" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-extrabold tracking-[0.2em] text-white">
                CODE<span className="text-neutral-500">_</span>DUEL
              </span>
              <span className="text-[9px] font-mono text-neutral-600 tracking-widest uppercase border-l border-neutral-800 pl-2 mt-0.5">
                LEAGUE
              </span>
            </div>
          </div>

          {user && (
            <div className="flex items-center space-x-8">
              <nav className="hidden md:flex items-center space-x-6">
                {['Dashboard', 'Leaderboard', 'Arena', 'Training'].map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      if (item === 'Leaderboard') {
                        navigate('/leaderboard');
                      } else if (item === 'Dashboard' || item === 'Arena') {
                        navigate('/');
                      }
                    }}
                    className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                      (item === 'Dashboard' && location.pathname === '/') || 
                      (item === 'Arena' && location.pathname === '/') ||
                      (item === 'Leaderboard' && location.pathname === '/leaderboard')
                        ? 'text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {item === 'Dashboard' ? 'Dashboard' : item === 'Leaderboard' ? 'Leaderboard' : item === 'Arena' ? 'Battle Arena' : 'Code Practice'}
                  </button>
                ))}
              </nav>

              <div className="h-4 w-px bg-neutral-800 hidden md:block" />

              <div className="flex items-center space-x-3">
                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => navigate('/admin')}
                    title="Super Admin Control Center"
                    className="px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 rounded-lg text-[10px] font-mono font-bold tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(244,63,94,0.2)]"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span className="hidden sm:inline">GOD MODE</span>
                  </button>
                )}

                <button className="p-2 text-neutral-500 hover:text-white transition-colors relative rounded-lg hover:bg-neutral-900">
                  <Bell className="w-4.5 h-4.5" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-neutral-400 rounded-full border border-black" />
                </button>

                <button
                  onClick={() => setFriendsOpen(!friendsOpen)}
                  title="Operatives & Friends"
                  className={clsx(
                    "p-2 transition-colors relative rounded-lg",
                    friendsOpen
                      ? "text-indigo-400 bg-neutral-900 border border-indigo-500/30"
                      : "text-neutral-500 hover:text-white hover:bg-neutral-900"
                  )}
                >
                  <Users className="w-4.5 h-4.5" />
                  {onlineFriendsCount > 0 && (
                    <span className="absolute top-1 right-1 px-1 min-w-[14px] h-[14px] bg-emerald-500 text-black text-[8px] font-black rounded-full flex items-center justify-center border border-black shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                      {onlineFriendsCount}
                    </span>
                  )}
                </button>

                <div className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-4 border-l border-neutral-800 relative">
                  <div className="hidden sm:flex flex-col items-end mr-1.5">
                    <span className="text-xs font-semibold text-white tracking-tight leading-none">
                      {user.username}
                    </span>
                    <div className="flex items-center space-x-1.5 mt-1 leading-none">
                      <div className={`w-3.5 h-3.5 rounded text-[8px] flex items-center justify-center font-extrabold ${levelColorClass}`}>
                        {userLevel}
                      </div>
                      <span className="text-[9px] font-mono text-neutral-550 tracking-wider uppercase font-bold">
                        {user.rating} CP
                      </span>
                    </div>
                  </div>

                  <div 
                    className="relative"
                    onMouseEnter={() => setDropdownOpen(true)}
                    onMouseLeave={() => setDropdownOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center overflow-hidden cursor-pointer hover:border-neutral-700 transition-colors">
                      <span className="text-xs font-bold text-neutral-400 uppercase">
                        {user.username.charAt(0)}
                      </span>
                    </div>

                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-1 w-44 py-1.5 bg-black border border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden"
                        >
                          <button
                            onClick={() => {
                              navigate('/profile');
                              setDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-semibold text-neutral-300 hover:bg-neutral-900 hover:text-white transition-colors flex items-center justify-between"
                          >
                            <span>Profile & Coding Stats</span>
                            <User className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              navigate('/leaderboard');
                              setDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-semibold text-neutral-300 hover:bg-neutral-900 hover:text-white transition-colors flex items-center justify-between"
                          >
                            <span>Leaderboard</span>
                            <Trophy className="w-3.5 h-3.5" />
                          </button>
                          <div className="h-px bg-neutral-800 my-1" />
                          <button
                            onClick={handleLogout}
                            className="w-full px-3 py-2 text-left text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-between"
                          >
                            <span>Log Out</span>
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
      )}

      <main className={clsx("flex-1 flex flex-col overflow-hidden relative", !isLobbyOrBattle && user && "pb-16 md:pb-0")}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="flex-1 flex flex-col overflow-auto scrollbar-hide"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>

        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-black">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0c0c_1px,transparent_1px),linear-gradient(to_bottom,#0c0c0c_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[40%] bg-neutral-500/5 rounded-full blur-[100px]" />
        </div>

        {/* Friend / Operatives Slide-out Drawer */}
        <AnimatePresence>
          {friendsOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setFriendsOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="fixed top-0 right-0 h-full w-full sm:w-96 max-w-full z-50 shadow-2xl"
              >
                <FriendSidebar onClose={() => setFriendsOpen(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation Bar (< md) */}
      {!isLobbyOrBattle && user && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-850 md:hidden px-2 py-2 flex items-center justify-around shadow-2xl safe-area-bottom">
          <button
            onClick={() => navigate('/')}
            className={clsx(
              "flex flex-col items-center gap-1 transition-colors py-1 px-2.5 rounded-xl",
              location.pathname === '/' ? "text-indigo-400 font-bold" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Sword className="w-4.5 h-4.5" />
            <span className="text-[10px] font-mono tracking-tight">Arena</span>
          </button>

          <button
            onClick={() => navigate('/daily-challenge')}
            className={clsx(
              "flex flex-col items-center gap-1 transition-colors py-1 px-2.5 rounded-xl",
              location.pathname === '/daily-challenge' ? "text-amber-400 font-bold" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Zap className="w-4.5 h-4.5" />
            <span className="text-[10px] font-mono tracking-tight">Daily</span>
          </button>

          <button
            onClick={() => navigate('/leaderboard')}
            className={clsx(
              "flex flex-col items-center gap-1 transition-colors py-1 px-2.5 rounded-xl",
              location.pathname === '/leaderboard' ? "text-indigo-400 font-bold" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Trophy className="w-4.5 h-4.5" />
            <span className="text-[10px] font-mono tracking-tight">Rankings</span>
          </button>

          <button
            onClick={() => setFriendsOpen(true)}
            className="flex flex-col items-center gap-1 transition-colors py-1 px-2.5 rounded-xl relative text-zinc-400 hover:text-zinc-200"
          >
            <Users className="w-4.5 h-4.5" />
            {onlineFriendsCount > 0 && (
              <span className="absolute top-0.5 right-2 w-2 h-2 bg-emerald-500 rounded-full border border-black animate-pulse" />
            )}
            <span className="text-[10px] font-mono tracking-tight">Friends</span>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className={clsx(
              "flex flex-col items-center gap-1 transition-colors py-1 px-2.5 rounded-xl",
              location.pathname === '/profile' ? "text-indigo-400 font-bold" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <User className="w-4.5 h-4.5" />
            <span className="text-[10px] font-mono tracking-tight">Profile</span>
          </button>
        </nav>
      )}
    </div>
  );
};
