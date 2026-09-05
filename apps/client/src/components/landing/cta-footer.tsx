import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, ArrowRight, Terminal, Shield, Activity, Sparkles } from 'lucide-react';

export const CtaFooter: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-black border-t border-neutral-900 text-neutral-400 font-mono text-xs relative overflow-hidden">
      {/* Top CTA Banner */}
      <div className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b border-neutral-900 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-transparent to-black pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-xl shadow-indigo-500/25 mb-6">
            <div className="w-full h-full bg-black rounded-[15px] flex items-center justify-center">
              <Swords className="w-6 h-6 text-white" />
            </div>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-4">
            READY TO TEST YOUR CODING SKILLS?
          </h2>

          <p className="text-sm sm:text-base text-neutral-400 font-sans max-w-xl mb-8 leading-relaxed">
            No installation required. Write code in our editor, run tests instantly in your browser, and battle friends or competitors worldwide.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
            <button
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-neutral-100 text-black font-mono text-xs font-black tracking-wider uppercase transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 active:scale-95"
            >
              <span>CREATE FREE ACCOUNT</span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-neutral-200 border border-neutral-800 font-mono text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Terminal size={14} className="text-indigo-400" />
              <span>SIGN IN TO ACCOUNT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Telemetry */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & System Status */}
        <div className="flex flex-col items-center md:items-start space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-white tracking-wider">CODE DUEL</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEMS ONLINE
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 font-sans">
            Real-time coding duels powered by sandboxed execution, Redis WebSocket mesh, and PostgreSQL.
          </p>
        </div>

        {/* Live System Specs */}
        <div className="flex items-center gap-4 sm:gap-6 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Activity size={12} className="text-emerald-400" />
            <span>Redis 7 Active</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Shield size={12} className="text-indigo-400" />
            <span>Automated Judge</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-amber-400" />
            <span>9 Divisions</span>
          </span>
        </div>

        {/* Copyright */}
        <div className="text-[11px] text-neutral-500 text-center md:text-right font-sans">
          <p>© {new Date().getFullYear()} Code Duel. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
