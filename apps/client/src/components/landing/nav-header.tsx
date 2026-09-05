import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { Swords, ArrowRight, Terminal } from 'lucide-react';

export const LandingNavHeader: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/[0.08] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
            <div className="w-full h-full bg-black rounded-[7px] flex items-center justify-center">
              <Swords className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-wider text-white font-mono uppercase">
                CODE DUEL
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>
            <span className="text-[9px] font-mono text-neutral-400 tracking-tight -mt-0.5 hidden xs:block">
              REAL-TIME 1v1 CODING BATTLES
            </span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:brightness-110 text-white text-xs font-mono font-bold tracking-wide rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 sm:gap-2 active:scale-95 transition-all"
            >
              <Terminal size={14} className="hidden xs:block" />
              <span className="hidden sm:inline">RETURN TO DASHBOARD (@{user?.username || 'PLAYER'})</span>
              <span className="sm:hidden">DASHBOARD</span>
              <ArrowRight size={13} />
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-mono text-neutral-350 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="relative group p-[1px] rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-gradient-x" />
                <div className="relative px-3 sm:px-4 py-1.5 sm:py-2 bg-neutral-950 rounded-[11px] flex items-center gap-1.5 group-hover:bg-opacity-80 transition-colors">
                  <span className="text-xs font-mono font-bold text-white tracking-wide">
                    PLAY NOW
                  </span>
                  <ArrowRight size={13} className="text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
