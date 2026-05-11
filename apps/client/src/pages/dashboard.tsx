import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '@/hooks/use-socket';
import { SocketEvents } from '@code-duel/shared';
import { useRoomStore } from '@/store/room-store';
import { Plus, Users, Trophy, Play, LogIn, X, Loader2 } from 'lucide-react';

export const DashboardPage = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const { setRoom, setLoading, setError, isLoading } = useRoomStore();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');

  const handleCreateRoom = () => {
    if (!socket) return;
    setLoading(true);
    socket.emit(SocketEvents.CREATE_ROOM, { maxPlayers: 2 });

    socket.once(SocketEvents.ROOM_UPDATED, (room) => {
      setRoom(room);
      setLoading(false);
      navigate(`/battle/${room.id}`);
    });

    socket.once(SocketEvents.ROOM_ERROR, (message) => {
      setError(message);
      setLoading(false);
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !joinRoomId.trim()) return;

    setLoading(true);
    socket.emit(SocketEvents.JOIN_ROOM, { roomId: joinRoomId.trim() });

    socket.once(SocketEvents.ROOM_UPDATED, (room) => {
      setRoom(room);
      setLoading(false);
      setShowJoinModal(false);
      navigate(`/battle/${room.id}`);
    });

    socket.once(SocketEvents.ROOM_ERROR, (message) => {
      setError(message);
      setLoading(false);
    });
  };

  return (
    <div className="flex-1 p-8 max-w-6xl mx-auto w-full">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Arena Dashboard</h1>
          <p className="text-slate-400 mt-2">
            Challenge other developers and rise through the ranks.
          </p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all border border-slate-700 active:scale-95"
          >
            <LogIn className="w-5 h-5" />
            <span>Join Duel</span>
          </button>
          <button
            onClick={handleCreateRoom}
            disabled={isLoading}
            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            <span>Create Duel</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="p-3 bg-blue-500/10 rounded-xl w-fit mb-4">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-white">Active Duels</h3>
          <p className="text-3xl font-bold text-white mt-2">12</p>
        </div>

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="p-3 bg-amber-500/10 rounded-xl w-fit mb-4">
            <Trophy className="w-6 h-6 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-white">Global Rank</h3>
          <p className="text-3xl font-bold text-white mt-2">#42</p>
        </div>

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="p-3 bg-emerald-500/10 rounded-xl w-fit mb-4">
            <Play className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-white">Win Rate</h3>
          <p className="text-3xl font-bold text-white mt-2">68%</p>
        </div>
      </div>

      <div className="mt-12 p-8 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Ready to prove your skills?</h2>
        <p className="text-slate-400 max-w-md mb-6">
          Create a private room and invite your friends to a real-time coding battle.
        </p>
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Join a Duel</h2>
              <button
                onClick={() => setShowJoinModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleJoinRoom}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-400 mb-2">Room ID</label>
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  placeholder="Enter the room code..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !joinRoomId.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>Join Arena</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
