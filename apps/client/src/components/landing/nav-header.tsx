import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { Swords, ArrowRight, Menu, X, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const LandingNavHeader: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/[0.08] transition-all">
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
                LIVE
              </span>
            </div>
            <span className="text-[9px] font-mono text-neutral-450 tracking-tight -mt-0.5 hidden xs:block">
              COMPETITIVE CODING ESPORTS
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-xs font-mono">
          <button
            onClick={() => scrollToSection('hero-section')}
            className="px-3 py-1.5 text-neutral-350 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]"
          >
            Overview
          </button>
          <button
            onClick={() => scrollToSection('languages-dimension')}
            className="px-3 py-1.5 text-neutral-350 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04] flex items-center gap-1.5"
          >
            <span>3D Languages</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
              3D
            </span>
          </button>
          <button
            onClick={() => scrollToSection('game-modes')}
            className="px-3 py-1.5 text-neutral-350 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]"
          >
            Arena Modes
          </button>
          <button
            onClick={() => scrollToSection('tier-ladder')}
            className="px-3 py-1.5 text-neutral-350 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]"
          >
            Rank Ladder
          </button>
          <button
            onClick={() => scrollToSection('duel-simulation')}
            className="px-3 py-1.5 text-neutral-350 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]"
          >
            Live Simulator
          </button>
        </nav>

        {/* Action CTAs */}
        <div className="flex items-center space-x-3">
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:brightness-110 text-white text-xs font-mono font-bold tracking-wide rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 active:scale-95 transition-all"
            >
              <Terminal size={14} />
              <span>RETURN TO ARENA (@{user?.username || 'OPERATOR'})</span>
              <ArrowRight size={13} />
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-3.5 py-2 text-xs font-mono text-neutral-350 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="relative group p-[1px] rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-gradient-x" />
                <div className="relative px-4 py-2 bg-neutral-950 rounded-[11px] flex items-center gap-2 group-hover:bg-opacity-80 transition-colors">
                  <span className="text-xs font-mono font-bold text-white tracking-wide">
                    ENTER ARENA
                  </span>
                  <ArrowRight size={13} className="text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-neutral-400 hover:text-white md:hidden rounded-lg hover:bg-white/[0.05]"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-2xl px-5 py-6 space-y-4 font-mono text-sm"
          >
            <button
              onClick={() => scrollToSection('hero-section')}
              className="block w-full text-left py-2 text-neutral-300 hover:text-white"
            >
              Overview
            </button>
            <button
              onClick={() => scrollToSection('languages-dimension')}
              className="block w-full text-left py-2 text-neutral-300 hover:text-white"
            >
              3D Languages Dimension
            </button>
            <button
              onClick={() => scrollToSection('game-modes')}
              className="block w-full text-left py-2 text-neutral-300 hover:text-white"
            >
              Arena Modes
            </button>
            <button
              onClick={() => scrollToSection('tier-ladder')}
              className="block w-full text-left py-2 text-neutral-300 hover:text-white"
            >
              Ranked Ladder
            </button>
            <button
              onClick={() => scrollToSection('duel-simulation')}
              className="block w-full text-left py-2 text-neutral-300 hover:text-white"
            >
              Live Duel Simulator
            </button>

            <div className="pt-4 border-t border-neutral-800 flex flex-col gap-2.5">
              {!isAuthenticated ? (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full py-2.5 rounded-xl border border-neutral-800 text-center text-white text-xs font-bold"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-center text-white text-xs font-bold"
                  >
                    Create Operative Account
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-center text-white text-xs font-bold"
                >
                  Return to Dashboard
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
