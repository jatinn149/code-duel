import React, { useState } from 'react';
import { useSocialStore } from '../../store/social-store';
import { useSocial } from '../../hooks/use-social';
import { PresenceStatus } from '@code-duel/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Swords, UserMinus, Search, Circle, Shield } from 'lucide-react';
import { clsx } from 'clsx';

export const FriendSidebar: React.FC = () => {
  const { friends } = useSocialStore();
  const { sendDuelInvite, removeFriend } = useSocial();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const getStatusClasses = (status: PresenceStatus) => {
    switch (status) {
      case PresenceStatus.ONLINE: return 'text-accent-emerald animate-glow-pulse';
      case PresenceStatus.IN_GAME: return 'text-accent-amber animate-pulse';
      case PresenceStatus.IN_QUEUE: return 'text-accent-cyan';
      case PresenceStatus.PRACTICING: return 'text-accent-violet';
      default: return 'text-surface-600';
    }
  };

  return (
    <div className="w-72 h-full bg-surface-950/90 backdrop-blur-xl border-l border-surface-800 flex flex-col relative z-50 bg-noise elevation-3">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-[50px] pointer-events-none" />
      
      <div className="p-5 border-b border-surface-800/50 flex items-center justify-between glass z-10">
        <div className="flex items-center gap-2 text-title text-white">
          <Shield size={20} className="text-brand-400" />
          <span className="tracking-widest font-black">OPERATIVES</span>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={clsx(
            "btn-icon transition-colors",
            isAdding ? "bg-brand-500 text-white border-brand-400" : "hover:bg-surface-800"
          )}
        >
          <UserPlus size={18} />
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-3 border-b border-surface-800 bg-surface-900/50 overflow-hidden"
          >
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
              <input 
                type="text"
                placeholder="Search operative ID..."
                className="input w-full pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery) {
                    // Search implementation placeholder
                  }
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 z-10">
        {friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center animate-fade-in">
            <Users size={32} className="text-surface-700 mb-3" />
            <span className="text-body text-surface-500">No active operatives found.<br/>Recruit players to expand your network.</span>
          </div>
        ) : (
          friends.map((friend) => (
            <div 
              key={friend.id}
              className="group flex items-center gap-3 p-3 rounded-xl hover:bg-surface-800/60 transition-all cursor-pointer border border-transparent hover:border-surface-700 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-brand-500/0 via-brand-500/0 to-brand-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-surface-900 flex items-center justify-center font-bold text-white border border-surface-700 inner-light shadow-md">
                  {friend.username?.[0].toUpperCase()}
                </div>
                <Circle 
                  size={14} 
                  fill="currentColor" 
                  className={clsx("absolute -bottom-1 -right-1 border-2 border-surface-950 rounded-full", getStatusClasses(friend.status))}
                />
              </div>
              
              <div className="flex-1 min-w-0 z-10">
                <div className="text-body font-bold text-white truncate">{friend.username}</div>
                <div className="text-caption font-mono text-surface-400 flex items-center gap-2 mt-0.5">
                  <span className="badge-neutral px-1.5 py-0 text-[9px]">{friend.rank}</span>
                  <span>{friend.rating} CP</span>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10 translate-x-2 group-hover:translate-x-0">
                {friend.status === PresenceStatus.ONLINE && (
                  <button 
                    onClick={() => friend.id && sendDuelInvite(friend.id)}
                    className="p-2 text-accent-cyan hover:bg-accent-cyan/10 hover:text-cyan-300 rounded-lg transition-colors border border-transparent hover:border-accent-cyan/20"
                    title="Invite to Duel"
                  >
                    <Swords size={16} />
                  </button>
                )}
                <button 
                  onClick={() => friend.id && removeFriend(friend.id)}
                  className="p-2 text-accent-rose hover:bg-accent-rose/10 hover:text-rose-300 rounded-lg transition-colors border border-transparent hover:border-accent-rose/20"
                  title="Remove Operative"
                >
                  <UserMinus size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
