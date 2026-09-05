import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocialStore } from '@/store/social-store';
import { useSocial } from '@/hooks/use-social';
import { PresenceStatus } from '@code-duel/types';
import { UserPlus, Check, X, Search, Copy } from 'lucide-react';

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
  isOpen,
  onClose,
  roomCode,
}) => {
  const { friends } = useSocialStore();
  const { sendDuelInvite } = useSocial();
  const [searchTerm, setSearchTerm] = useState('');
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const filteredFriends = friends.filter((f) =>
    (f.username || '').toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleInvite = (friendId?: string) => {
    if (!friendId) return;
    sendDuelInvite(friendId);
    setInvitedIds((prev) => new Set(prev).add(friendId));
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md bg-zinc-950 border border-indigo-500/40 rounded-3xl p-6 shadow-2xl space-y-4 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400">
              <UserPlus size={20} />
              <h3 className="text-base font-bold text-white tracking-tight">Invite Operatives to Lobby</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-white rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Invited players will receive an instant duel notification directly in their Operative Mailbox. Accepting will automatically navigate them here.
          </p>

          {/* Quick Copy Room Code Fallback */}
          <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] text-zinc-500 font-mono uppercase block">Lobby Sector Code</span>
              <span className="text-xs font-mono font-bold text-white tracking-wider truncate block">{roomCode}</span>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Friend Search Bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search friends list..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-900/70 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Friends List */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredFriends.length === 0 ? (
              <div className="py-8 text-center text-zinc-600 font-mono text-xs">
                {friends.length === 0
                  ? 'No friends yet. Add operatives using their @username or Player ID!'
                  : 'No friends match your search.'}
              </div>
            ) : (
              filteredFriends.map((friend) => {
                const isInvited = friend.id ? invitedIds.has(friend.id) : false;
                const isOnline = friend.status === PresenceStatus.ONLINE;
                const isInGame = friend.status === PresenceStatus.IN_GAME;

                return (
                  <div
                    key={friend.id}
                    className="p-3 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/80 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-white font-mono">
                          {(friend.username?.charAt(0) || 'U').toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${
                            isOnline
                              ? 'bg-emerald-500'
                              : isInGame
                              ? 'bg-amber-500'
                              : 'bg-zinc-600'
                          }`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">@{friend.username}</div>
                        <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                          <span className="text-indigo-400">{friend.rank || 'Initiate'}</span>
                          <span>•</span>
                          <span>{friend.rating || 1000} CP</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleInvite(friend.id)}
                      disabled={isInvited}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 ${
                        isInvited
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      }`}
                    >
                      {isInvited ? (
                        <>
                          <Check size={12} />
                          <span>Dispatched</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={12} />
                          <span>Invite</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-zinc-900 flex justify-end">
            <button
              onClick={onClose}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-mono rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
