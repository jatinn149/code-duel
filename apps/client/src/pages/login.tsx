import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { Sword, Loader2, Shield, Zap, Target, AlertCircle, ChevronRight, Eye, EyeOff } from 'lucide-react';
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

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { login, isLoading, error, setError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      setIsSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col justify-center items-center bg-zinc-950 relative overflow-x-hidden selection:bg-indigo-500/30 font-sans px-3 sm:px-6 py-6 sm:py-12">
      {/* Premium Ambient Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Subtle grid pattern with center fade */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)]" />
        
        {/* Soft elegant glowing orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] opacity-70 animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[250px] bg-violet-600/5 rounded-full blur-[90px] opacity-40" />
      </div>

      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div
            key="login-form"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)', transition: { duration: 0.2 } }}
            className="w-full max-w-[440px] relative z-10"
          >
            {/* Elegant glassmorphic card */}
            <div className="relative bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden transition-colors duration-300 hover:border-zinc-700/80 group/card">
              {/* Subtle top edge glowing line */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
              
              <motion.div variants={itemVariants} className="flex flex-col items-center mb-8">
                {/* Brand mark/Logo */}
                <div className="w-12 h-12 bg-gradient-to-b from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 rounded-xl flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-5 relative group/logo transition-all duration-300 hover:border-indigo-500/40">
                  <div className="absolute inset-0 rounded-xl bg-indigo-500/5 opacity-0 group-hover/logo:opacity-100 transition-opacity" />
                  <Sword className="w-5 h-5 text-indigo-400 transform -rotate-12 group-hover/logo:rotate-0 transition-transform duration-300 relative z-10" />
                </div>
                
                {/* Clean, high-end SaaS title */}
                <h1 className="text-2xl font-bold tracking-tight text-white text-center leading-tight">
                  Operational <span className="bg-gradient-to-r from-indigo-400 via-indigo-300 to-indigo-400 bg-clip-text text-transparent">Access</span>
                </h1>
                
                {/* Verification badges */}
                <div className="flex items-center gap-2.5 mt-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                    <Shield className="w-2.5 h-2.5" />
                    Verified
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                    <Zap className="w-2.5 h-2.5" />
                    Secure
                  </span>
                </div>
              </motion.div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400 rounded-lg flex items-center gap-3 overflow-hidden shadow-sm shadow-rose-950/10"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <motion.div variants={itemVariants} className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider ml-0.5">
                    Email Address
                  </label>
                  <div className="relative group">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-4 pr-10 py-3.5 sm:py-3 bg-zinc-950/40 hover:bg-zinc-950/70 border border-zinc-800/80 rounded-xl text-base sm:text-sm text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 hover:border-zinc-700/80 transition-all duration-200 shadow-inner"
                      placeholder="name@domain.com"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <Target className="w-4 h-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors duration-200" />
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider ml-0.5">
                    Password
                  </label>
                  <div className="relative group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-4 pr-11 py-3.5 sm:py-3 bg-zinc-950/40 hover:bg-zinc-950/70 border border-zinc-800/80 rounded-xl text-base sm:text-sm text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 hover:border-zinc-700/80 transition-all duration-200 shadow-inner"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 focus:outline-none transition-colors"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </motion.div>

                <motion.button
                  variants={itemVariants}
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 0 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 sm:py-3 mt-2 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-base sm:text-sm rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.15)] border border-indigo-700 relative overflow-hidden active:scale-[0.98]"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <span>Log In / Authenticate</span>
                      <Zap className="w-4 h-4 fill-current text-indigo-200" />
                    </>
                  )}
                </motion.button>
              </form>

              <motion.div
                variants={itemVariants}
                className="mt-8 pt-6 border-t border-zinc-800/60 flex flex-col items-center"
              >
                <p className="text-[11px] font-medium text-zinc-500 tracking-wider mb-2">
                  New operator?
                </p>
                <Link
                  to="/signup"
                  className="text-xs font-semibold text-zinc-300 hover:text-indigo-400 transition-colors flex items-center group/link"
                  onClick={() => setError(null)}
                >
                  Sign Up & Start Coding
                  <ChevronRight className="w-4 h-4 ml-0.5 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="mt-8 flex justify-between px-1">
              <p className="text-[10px] font-medium text-zinc-600 tracking-wide">
                System v4.2.0-STABLE
              </p>
              <p className="text-[10px] font-medium text-zinc-600 tracking-wide">
                © 2026 CODE DUEL LEAGUE
              </p>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="success-screen"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            className="flex flex-col items-center text-center z-10 max-w-[420px] px-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 100 }}
              className="w-16 h-16 bg-gradient-to-b from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10"
            >
              <Shield className="w-8 h-8 text-emerald-400" />
            </motion.div>
            <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
              Access <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Granted</span>
            </h2>
            <p className="text-zinc-400 text-sm tracking-wide mb-6">
              Security validation successful. Welcome back.
            </p>
            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-wider font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Redirecting to Command Center...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
