import React, { useState } from 'react';
import { useSocialStore } from '../../store/social-store';
import { useSocial } from '../../hooks/use-social';
import { Notification, NotificationType } from '@code-duel/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  MailOpen,
  Check,
  UserPlus,
  Swords,
  Trophy,
  Clock,
  Gift,
  Zap,
  Sparkles,
  Inbox,
  X,
  CheckCheck
} from 'lucide-react';
import { clsx } from 'clsx';

interface NotificationDropdownProps {
  isOpenControlled?: boolean;
  onCloseControlled?: () => void;
  hideTriggerButton?: boolean;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpenControlled,
  onCloseControlled,
  hideTriggerButton = false,
}) => {
  const { notifications, unreadNotificationsCount } = useSocialStore();
  const { markRead, markAllRead, respondToFriendRequest, respondToDuelInvite } = useSocial();
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = typeof isOpenControlled === 'boolean';
  const isOpen = isControlled ? isOpenControlled : internalOpen;

  const handleClose = () => {
    if (isControlled && onCloseControlled) {
      onCloseControlled();
    } else {
      setInternalOpen(false);
    }
  };

  const handleToggle = () => {
    if (isControlled && onCloseControlled) {
      onCloseControlled();
    } else {
      setInternalOpen(!internalOpen);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead();
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.FRIEND_REQUEST:
        return <UserPlus className="text-cyan-400" size={18} />;
      case NotificationType.FRIEND_ACCEPTED:
        return <UserPlus className="text-emerald-400" size={18} />;
      case NotificationType.DUEL_INVITE:
        return <Swords className="text-rose-400" size={18} />;
      case NotificationType.INVITE_ACCEPTED:
        return <Trophy className="text-amber-400" size={18} />;
      case NotificationType.CHALLENGE_RESET:
        return <Clock className="text-violet-400" size={18} />;
      case NotificationType.ADMIN_REWARD:
        return <Gift className="text-yellow-400" size={18} />;
      case NotificationType.SYSTEM_MAIL:
        return <Mail className="text-indigo-400" size={18} />;
      default:
        return <MailOpen className="text-neutral-400" size={18} />;
    }
  };

  const handleAction = (n: Notification, action: 'ACCEPT' | 'REJECT') => {
    if (n.type === NotificationType.FRIEND_REQUEST) {
      if (n.data && typeof n.data.requestId === 'string') {
        respondToFriendRequest(n.data.requestId, action);
      }
    } else if (n.type === NotificationType.DUEL_INVITE) {
      if (n.data && typeof n.data.inviteId === 'string') {
        respondToDuelInvite(n.data.inviteId, action);
      }
    }
    markRead(n.id);
  };

  return (
    <div className="relative">
      {!hideTriggerButton && (
        <button
          onClick={handleToggle}
          title="Operative Mail & Inbox"
          aria-label="Mail and Notifications"
          className={clsx(
            "relative p-2 rounded-lg transition-all duration-200",
            isOpen
              ? "bg-neutral-800 text-white border border-neutral-700"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900"
          )}
        >
          <Mail size={18} className={unreadNotificationsCount > 0 ? "text-indigo-400 animate-pulse" : ""} />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 px-1 min-w-[15px] h-[15px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-black shadow-[0_0_8px_rgba(244,63,94,0.6)]">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for closing */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={handleClose}
            />

            {/* Modal / Dropdown Box: Centered Drawer on Mobile, Popover on Desktop */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className={clsx(
                "z-50 bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden flex flex-col",
                // Mobile layout: Fixed bottom sheet or centered card
                "fixed inset-x-3 bottom-4 max-h-[85vh] rounded-2xl",
                // Desktop layout: Positioned dropdown right below header
                "sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[400px] sm:max-h-[520px] sm:rounded-xl sm:border-neutral-800/90"
              )}
            >
              {/* Header */}
              <div className="p-3.5 sm:p-4 border-b border-neutral-800/80 bg-neutral-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <span className="text-xs font-black tracking-widest uppercase text-white font-mono">
                    MAILBOX & INBOX
                  </span>
                  {unreadNotificationsCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold font-mono">
                      {unreadNotificationsCount} NEW
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {unreadNotificationsCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-mono font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 active:scale-95"
                    >
                      <CheckCheck size={12} />
                      <span>MARK ALL</span>
                    </button>
                  )}
                  <button
                    onClick={handleClose}
                    className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Notification List */}
              <div className="flex-1 overflow-y-auto divide-y divide-neutral-900/80 scrollbar-hide">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-3 text-neutral-600">
                      <Inbox size={24} />
                    </div>
                    <p className="text-xs font-semibold text-neutral-300">Your Mailbox is Empty</p>
                    <p className="text-[11px] text-neutral-550 mt-1 max-w-xs">
                      Friend requests, match challenges, and HQ system mails will arrive here.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const hasRewards = !!(n.data?.giftXp || n.data?.giftCp);

                    return (
                      <div
                        key={n.id}
                        className={clsx(
                          "p-3.5 sm:p-4 transition-colors relative group",
                          !n.isRead
                            ? "bg-indigo-950/15 hover:bg-indigo-950/25 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-indigo-500"
                            : "hover:bg-neutral-900/40"
                        )}
                      >
                        <div className="flex gap-3">
                          <div className={clsx(
                            "mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center shadow-sm",
                            n.type === NotificationType.ADMIN_REWARD
                              ? "bg-yellow-500/10 border-yellow-500/30"
                              : n.type === NotificationType.SYSTEM_MAIL
                              ? "bg-indigo-500/10 border-indigo-500/30"
                              : "bg-neutral-900 border-neutral-800"
                          )}>
                            {getIcon(n.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                <span>{n.title}</span>
                                {n.type === NotificationType.ADMIN_REWARD && (
                                  <span className="text-[8px] font-mono font-black uppercase px-1 py-0.2 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                                    REWARD
                                  </span>
                                )}
                                {n.type === NotificationType.SYSTEM_MAIL && (
                                  <span className="text-[8px] font-mono font-black uppercase px-1 py-0.2 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                                    HQ MAIL
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] font-mono text-neutral-550 shrink-0">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed break-words font-sans">
                              {n.message}
                            </p>

                            {/* Attached Gift/Resource Badges */}
                            {hasRewards && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {Boolean(n.data?.giftXp) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
                                    <Sparkles size={10} />
                                    +{String(n.data?.giftXp)} XP
                                  </span>
                                )}
                                {Boolean(n.data?.giftCp) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-400">
                                    <Zap size={10} />
                                    +{String(n.data?.giftCp)} CP
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Action Buttons for Friend Requests & Duel Invites */}
                            {(n.type === NotificationType.FRIEND_REQUEST || n.type === NotificationType.DUEL_INVITE) && !n.isRead && (
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => handleAction(n, 'ACCEPT')}
                                  className="flex-1 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-[11px] rounded-lg transition-colors active:scale-95 text-center"
                                >
                                  ACCEPT
                                </button>
                                <button
                                  onClick={() => handleAction(n, 'REJECT')}
                                  className="flex-1 py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-[11px] rounded-lg border border-neutral-700 transition-colors active:scale-95 text-center"
                                >
                                  DECLINE
                                </button>
                              </div>
                            )}
                          </div>

                          {!n.isRead && (
                            <button
                              onClick={() => markRead(n.id)}
                              className="text-neutral-500 hover:text-indigo-400 transition-colors self-start p-1"
                              title="Mark as read"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 border-t border-neutral-900 bg-neutral-950 text-center">
                <span className="text-[10px] font-mono text-neutral-550 uppercase tracking-widest">
                  Operative Encrypted Dispatch Channel
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
