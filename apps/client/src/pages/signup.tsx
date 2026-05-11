import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import {
  Sword,
  Loader2,
  Shield,
  Zap,
  Target,
  UserPlus,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
} as const;

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 120 },
  },
} as const;

export const SignupPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const { signup, isLoading, error, setError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup({ username, email, password });
      setIsSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 relative overflow-hidden selection:bg-emerald-500/30">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/5 rounded-full blur-[140px]" />
        {/* Scanning Grid Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div
            key="signup-form"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            className="w-full max-w-[480px] px-6 relative z-10"
          >
            <div className="esports-card p-10 shadow-2xl border-t-4 border-t-emerald-600 backdrop-blur-2xl bg-slate-900/40">
              <motion.div variants={itemVariants} className="flex flex-col items-center mb-10">
                <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/40 mb-6 group cursor-default relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent" />
                  <UserPlus className="w-10 h-10 text-white group-hover:scale-110 transition-transform duration-500 relative z-10" />
                </div>
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic text-center leading-none">
                  Recruit <br />
                  <span className="text-emerald-500">Onboarding</span>
                </h1>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-4">
                  Initialize League Credentials
                </p>
              </motion.div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 text-xs font-bold bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center overflow-hidden"
                  >
                    <AlertCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}

                <motion.div variants={itemVariants} className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                    Callsign (Username)
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-white font-medium placeholder:text-slate-800"
                      placeholder="CODEWARRIOR_01"
                      required
                    />
                    <Target className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 group-focus-within:text-emerald-500 transition-colors" />
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                    Comm Link (Email)
                  </label>
                  <div className="relative group">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-white font-medium placeholder:text-slate-800"
                      placeholder="recruit@league.com"
                      required
                    />
                    <Zap className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 group-focus-within:text-emerald-500 transition-colors" />
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                    Access Protocol (Password)
                  </label>
                  <div className="relative group">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-white font-medium placeholder:text-slate-800"
                      placeholder="••••••••"
                      required
                    />
                    <Shield className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 group-focus-within:text-emerald-500 transition-colors" />
                  </div>
                </motion.div>

                <motion.button
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, boxShadow: '0 0 30px -5px rgba(16, 185, 129, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-[0.2em] text-xs rounded-xl transition-all flex items-center justify-center space-x-3 shadow-lg shadow-emerald-500/20 relative overflow-hidden"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Create Credentials</span>
                      <Sword className="w-4 h-4 fill-current" />
                    </>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                </motion.button>
              </form>

              <motion.div
                variants={itemVariants}
                className="mt-10 pt-8 border-t border-slate-800/50 flex flex-col items-center"
              >
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4">
                  Already Enlisted?
                </p>
                <Link
                  to="/login"
                  className="text-xs font-black text-white hover:text-emerald-400 uppercase tracking-[0.2em] transition-colors flex items-center group"
                  onClick={() => setError(null)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                  Return to Access Node
                </Link>
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="mt-8 flex justify-between px-2">
              <p className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">
                Protocol v1.0.4-BETA
              </p>
              <p className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">
                © 2026 CODE DUEL LEAGUE
              </p>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="success-screen"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(16,185,129,0.4)]"
            >
              <UserPlus className="w-12 h-12 text-white" />
            </motion.div>
            <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-4">
              Enlistment <span className="text-emerald-500">Confirmed</span>
            </h2>
            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-sm animate-pulse">
              Initializing Command Profile...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
