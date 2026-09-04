import React, { useState, useEffect, useRef } from 'react';
import { useSocialStore } from '../../store/social-store';
import { useAuthStore } from '../../store/auth-store';
import { useSocial } from '../../hooks/use-social';
import { useSocket } from '../../hooks/use-socket';
import { PresenceStatus } from '@code-duel/types';
import { SocketEvents, calculateCpRank } from '@code-duel/shared';
import { 
  Users, UserPlus, Swords, UserMinus, Search, Circle, Shield, X, MessageSquare, Send, Check, ArrowLeft, Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { apiClient } from '../../api/api-client';

interface DirectMessage {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  text: string;
  timestamp: string;
}

interface SearchResult {
  id: string;
  username: string;
  playerId: string;
  rank: string;
  rating: number;
  wins: number;
  losses: number;
  streak: number;
  relationshipState: 'None' | 'Pending Sent' | 'Pending Received' | 'Friends' | 'Self';
}

export const FriendSidebar: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { friends } = useSocialStore();
  const { user } = useAuthStore();
  const socket = useSocket();
  const { sendDuelInvite, removeFriend } = useSocial();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isAddingMode, setIsAddingMode] = useState(false);

  // Chat State
  const [activeChatFriend, setActiveChatFriend] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, DirectMessage[]>>({});
  const [messageInput, setMessageInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Listen for real-time direct messages
  useEffect(() => {
    if (!socket) return;
    const handleReceiveMessage = (msg: DirectMessage) => {
      const partnerId = msg.fromUserId === user?.id ? msg.toUserId : msg.fromUserId;
      setChatMessages((prev) => ({
        ...prev,
        [partnerId]: [...(prev[partnerId] || []), msg],
      }));
    };

    socket.on('social:direct_message_receive' as any, handleReceiveMessage);
    return () => {
      socket.off('social:direct_message_receive' as any, handleReceiveMessage);
    };
  }, [socket, user?.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeChatFriend]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const res = await apiClient.get(`/social/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.data?.success && res.data?.data) {
        setSearchResult(res.data.data);
      } else {
        setSearchError('Operative not found.');
      }
    } catch (err: any) {
      setSearchError(err.response?.data?.message || 'Operative not found.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFriendRequest = (target: SearchResult) => {
    if (!socket) return;
    socket.emit(SocketEvents.FRIEND_REQUEST_SEND, { toUserId: target.id });
    setSearchResult((prev) => prev ? { ...prev, relationshipState: 'Pending Sent' } : null);
  };

  const handleSendMessage = () => {
    if (!socket || !activeChatFriend || !messageInput.trim()) return;
    socket.emit('social:direct_message_send' as any, {
      toUserId: activeChatFriend.id,
      text: messageInput.trim(),
    });
    setMessageInput('');
  };

  const getStatusClasses = (status: PresenceStatus) => {
    switch (status) {
      case PresenceStatus.ONLINE: return 'text-emerald-400 fill-emerald-400 animate-pulse';
      case PresenceStatus.IN_GAME: return 'text-amber-400 fill-amber-400 animate-pulse';
      case PresenceStatus.IN_QUEUE: return 'text-cyan-400 fill-cyan-400';
      case PresenceStatus.PRACTICING: return 'text-purple-400 fill-purple-400';
      default: return 'text-zinc-600 fill-zinc-600';
    }
  };

  const getStatusLabel = (status: PresenceStatus) => {
    switch (status) {
      case PresenceStatus.ONLINE: return 'Online';
      case PresenceStatus.IN_GAME: return 'In Duel';
      case PresenceStatus.IN_QUEUE: return 'In Queue';
      case PresenceStatus.PRACTICING: return 'Practicing';
      default: return 'Offline';
    }
  };

  return (
    <div className="w-full sm:w-96 max-w-full h-full bg-zinc-950 border-l border-zinc-800/80 flex flex-col relative z-50 shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
        <div className="flex items-center gap-2 text-white">
          {activeChatFriend ? (
            <button 
              onClick={() => setActiveChatFriend(null)}
              className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors mr-1"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <Shield size={18} className="text-indigo-400" />
          )}
          <span className="text-sm font-bold font-mono tracking-wider uppercase">
            {activeChatFriend ? activeChatFriend.username : 'Operatives & Friends'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {!activeChatFriend && (
            <button
              onClick={() => {
                setIsAddingMode(!isAddingMode);
                setSearchError(null);
                setSearchResult(null);
              }}
              title={isAddingMode ? 'View Friends' : 'Add Friend'}
              className={clsx(
                "p-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5",
                isAddingMode
                  ? "bg-indigo-600 text-white border-indigo-500"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <UserPlus size={15} />
              <span className="text-[10px] font-bold uppercase">{isAddingMode ? 'Friends' : 'Add'}</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors ml-1"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* CHAT VIEW */}
      {activeChatFriend ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          {/* Chat header status */}
          <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-850 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Circle size={8} className={getStatusClasses(activeChatFriend.status)} />
              <span className="text-zinc-400 text-[11px]">{getStatusLabel(activeChatFriend.status)}</span>
            </div>
            <span className="text-zinc-500 text-[10px]">{activeChatFriend.rating} CP</span>
          </div>

          {/* Message Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(!chatMessages[activeChatFriend.id] || chatMessages[activeChatFriend.id].length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
                <MessageSquare size={28} className="text-zinc-700 mb-2" />
                <span className="text-xs">Start a secure transmission with {activeChatFriend.username}.</span>
              </div>
            ) : (
              chatMessages[activeChatFriend.id].map((msg) => {
                const isMe = msg.fromUserId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={clsx(
                      "flex flex-col max-w-[80%]",
                      isMe ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div
                      className={clsx(
                        "px-3 py-2 rounded-xl text-xs font-mono break-words",
                        isMe
                          ? "bg-indigo-600 text-white rounded-tr-none"
                          : "bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700/50"
                      )}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[8px] font-mono text-zinc-600 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Message Input */}
          <div className="p-3 border-t border-zinc-850 bg-zinc-900/40 flex items-center gap-2">
            <input
              type="text"
              placeholder="Send message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-lg transition-colors"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      ) : isAddingMode ? (
        /* ADD FRIEND VIEW */
        <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Recruit Operative
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Enter username (e.g. jatin)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-mono font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Search
              </button>
            </div>
          </div>

          {searchError && (
            <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-lg text-rose-400 text-xs font-mono">
              {searchError}
            </div>
          )}

          {searchResult && (
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white text-sm">
                  {searchResult.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    {searchResult.username}
                    <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                      {calculateCpRank(searchResult.rating)}
                    </span>
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {searchResult.rating} CP • {searchResult.wins}W / {searchResult.losses}L
                  </span>
                </div>
              </div>

              {searchResult.relationshipState === 'Self' ? (
                <div className="text-[11px] font-mono text-zinc-500 italic text-center py-1">
                  This is your own profile
                </div>
              ) : searchResult.relationshipState === 'Friends' ? (
                <div className="text-[11px] font-mono text-emerald-400 text-center py-1 flex items-center justify-center gap-1">
                  <Check size={14} /> Already Operatives
                </div>
              ) : searchResult.relationshipState === 'Pending Sent' ? (
                <div className="text-[11px] font-mono text-amber-400 text-center py-1">
                  Request Sent (Awaiting Response)
                </div>
              ) : (
                <button
                  onClick={() => handleSendFriendRequest(searchResult)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md"
                >
                  <UserPlus size={15} />
                  Send Friend Request
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* FRIENDS LIST VIEW */
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-center p-4">
              <Users size={32} className="text-zinc-700 mb-3" />
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">No Operatives Connected</h4>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                Recruit friends using their username to duel, chat, and compare statistics.
              </p>
              <button
                onClick={() => setIsAddingMode(true)}
                className="mt-4 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-indigo-400 text-xs font-mono font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <UserPlus size={14} />
                Add Operative
              </button>
            </div>
          ) : (
            friends.map((friend) => (
              <div
                key={friend.id}
                className="p-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white text-xs">
                      {(friend.username?.[0] || 'U').toUpperCase()}
                    </div>
                    <Circle
                      size={10}
                      className={clsx("absolute -bottom-0.5 -right-0.5 border border-zinc-950 rounded-full", getStatusClasses(friend.status))}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span>{friend.username}</span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-2 mt-0.5">
                      <span>{friend.rating || 1200} CP</span>
                      <span className="text-zinc-600">•</span>
                      <span className={clsx(
                        "text-[9px] font-semibold",
                        friend.status === PresenceStatus.ONLINE ? "text-emerald-400" :
                        friend.status === PresenceStatus.IN_GAME ? "text-amber-400" :
                        "text-zinc-500"
                      )}>
                        {getStatusLabel(friend.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Duel Invite */}
                  <button
                    onClick={() => friend.id && sendDuelInvite(friend.id)}
                    title="Invite to Duel"
                    className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                  >
                    <Swords size={15} />
                  </button>

                  {/* Direct Chat */}
                  <button
                    onClick={() => setActiveChatFriend(friend)}
                    title="Direct Message"
                    className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                  >
                    <MessageSquare size={15} />
                  </button>

                  {/* Remove Friend */}
                  <button
                    onClick={() => {
                      if (window.confirm(`Remove ${friend.username} from your operatives?`)) {
                        friend.id && removeFriend(friend.id);
                      }
                    }}
                    title="Remove Friend"
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <UserMinus size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
