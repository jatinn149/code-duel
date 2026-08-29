import React, { useState } from 'react';
import { useSocialStore } from '../../store/social-store';
import { useSocial } from '../../hooks/use-social';
import { Notification, NotificationType } from '@code-duel/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, UserPlus, Swords, Trophy, Clock, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

export const NotificationDropdown: React.FC = () => {
  const { notifications, unreadNotificationsCount } = useSocialStore();
  const { markRead, respondToFriendRequest, respondToDuelInvite } = useSocial();
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.FRIEND_REQUEST: return <UserPlus className="text-accent-cyan" size={18} />;
      case NotificationType.FRIEND_ACCEPTED: return <UserPlus className="text-accent-emerald" size={18} />;
      case NotificationType.DUEL_INVITE: return <Swords className="text-accent-rose" size={18} />;
      case NotificationType.INVITE_ACCEPTED: return <Trophy className="text-accent-amber" size={18} />;
      case NotificationType.CHALLENGE_RESET: return <Clock className="text-accent-violet" size={18} />;
      default: return <Bell className="text-surface-400" size={18} />;
    }
  };

  const handleAction = (n: Notification, action: 'ACCEPT' | 'REJECT') => {
    if (n.type === NotificationType.FRIEND_REQUEST) {
      if (n.data && typeof n.data.requestId === 'string') respondToFriendRequest(n.data.requestId, action);
    } else if (n.type === NotificationType.DUEL_INVITE) {
      if (n.data && typeof n.data.inviteId === 'string') respondToDuelInvite(n.data.inviteId, action);
    }
    markRead(n.id);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={clsx("relative p-2.5 rounded-xl transition-all duration-300", isOpen ? "bg-surface-800 text-white" : "text-surface-400 hover:text-white hover:bg-surface-800/80")}
      >
        <Bell size={22} className={unreadNotificationsCount > 0 ? "animate-glow-pulse text-accent-cyan" : ""} />
        {unreadNotificationsCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-accent-rose text-white text-[10px] font-bold rounded-full flex items-center justify-center border-[2px] border-surface-950 shadow-[0_0_10px_rgba(251,113,133,0.6)]">
            {unreadNotificationsCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute right-0 mt-3 w-[360px] card-elevated shadow-2xl z-50 overflow-hidden border border-surface-700/50"
            >
              <div className="p-4 border-b border-surface-800 flex items-center justify-between glass">
                <span className="text-title font-black text-white tracking-widest">NOTIFICATIONS</span>
                {unreadNotificationsCount > 0 && (
                  <button className="text-caption font-bold text-accent-cyan hover:text-cyan-300 transition-colors">
                    MARK ALL READ
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-surface-500">
                    <AlertTriangle size={32} className="text-surface-700 mb-4" />
                    <span className="text-body font-medium">No active alerts.</span>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      className={clsx(
                        "p-4 border-b border-surface-800/50 hover:bg-surface-800/40 transition-colors relative group",
                        !n.isRead && "bg-brand-500/5 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-accent-cyan"
                      )}
                    >
                      <div className="flex gap-4">
                        <div className="mt-1 flex-shrink-0 w-10 h-10 rounded-xl bg-surface-900 border border-surface-700 flex items-center justify-center inner-light shadow-sm">
                          {getIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-body font-bold text-white truncate">{n.title}</div>
                          <div className="text-caption text-surface-300 mt-1 leading-relaxed">{n.message}</div>
                          
                          {(n.type === NotificationType.FRIEND_REQUEST || n.type === NotificationType.DUEL_INVITE) && !n.isRead && (
                            <div className="flex gap-2 mt-3">
                              <button 
                                onClick={() => handleAction(n, 'ACCEPT')}
                                className="flex-1 btn-success py-1.5 text-[10px]"
                              >
                                ACCEPT
                              </button>
                              <button 
                                onClick={() => handleAction(n, 'REJECT')}
                                className="flex-1 btn-ghost py-1.5 text-[10px]"
                              >
                                DECLINE
                              </button>
                            </div>
                          )}

                          <div className="text-[10px] font-mono text-surface-500 mt-2">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {!n.isRead && (
                          <button 
                            onClick={() => markRead(n.id)}
                            className="text-surface-600 hover:text-accent-cyan transition-colors self-start p-1 opacity-0 group-hover:opacity-100"
                            title="Mark as read"
                          >
                            <Check size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-3 border-t border-surface-800 glass text-center">
                <button className="text-caption font-bold text-surface-400 hover:text-white transition-colors uppercase tracking-widest">
                  View All Activity
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
