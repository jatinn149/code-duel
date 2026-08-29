import React from 'react';
import { useSocialStore } from '../../store/social-store';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, Flame, CheckCircle, User, Activity } from 'lucide-react';

export const ActivityFeed: React.FC = () => {
  const { activities } = useSocialStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'RANK_UP': return <Trophy className="text-accent-amber" size={16} />;
      case 'STREAK_MILESTONE': return <Flame className="text-accent-rose" size={16} />;
      case 'CHALLENGE_COMPLETED': return <CheckCircle className="text-accent-emerald" size={16} />;
      case 'DUEL_VICTORY': return <Zap className="text-accent-cyan" size={16} />;
      default: return <User className="text-surface-400" size={16} />;
    }
  };

  return (
    <div className="card flex flex-col h-full shadow-lg relative overflow-hidden bg-noise">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-[40px] pointer-events-none" />
      
      <div className="p-4 border-b border-surface-800/50 glass flex items-center justify-between">
        <div className="flex items-center gap-2 text-title text-surface-100">
          <Activity size={18} className="text-accent-cyan animate-glow-pulse" />
          <span className="tracking-widest">ACTIVITY FEED</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-up">
            <Activity className="w-12 h-12 text-surface-700 mb-3" />
            <span className="text-body text-surface-400">Quiet sector.<br/>Awaiting new transmissions...</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {activities.map((activity) => (
              <motion.div 
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-4 relative group"
              >
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-surface-900 border border-surface-800 flex items-center justify-center z-10 group-hover:border-surface-600 transition-colors shadow-sm inner-light">
                    {getIcon(activity.type)}
                  </div>
                  <div className="w-px h-full bg-gradient-to-b from-surface-800 to-transparent absolute top-10 bottom-0" />
                </div>
                
                <div className="flex-1 pb-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-body font-bold text-accent-cyan hover:text-white transition-colors cursor-pointer tracking-wide">
                      {activity.username}
                    </span>
                    <span className="text-caption font-mono text-surface-500 font-medium bg-surface-900/50 px-2 py-0.5 rounded border border-surface-800/50">
                      {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-body text-surface-300 mt-1 leading-relaxed">
                    {activity.message}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
