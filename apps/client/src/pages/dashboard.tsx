import { useNavigate } from 'react-router-dom';
import { useSocket } from '@/hooks/use-socket';
import { SocketEvents } from '@code-duel/shared';
import { useRoomStore } from '@/store/room-store';
import { Plus, Users, Trophy, Play } from 'lucide-react';

export const DashboardPage = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const { setRoom, setLoading, setError } = useRoomStore();

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

  return (
    <div className="flex-1 p-8 max-w-6xl mx-auto w-full">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Arena Dashboard</h1>
          <p className="text-slate-400 mt-2">
            Challenge other developers and rise through the ranks.
          </p>
        </div>
        <button
          onClick={handleCreateRoom}
          className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Create Duel</span>
        </button>
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
    </div>
  );
};
