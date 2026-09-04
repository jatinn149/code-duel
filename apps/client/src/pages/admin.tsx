import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { adminApi, AdminStats, AdminUser, AdminRoom } from '@/api/admin-api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Trash2,
  RefreshCw,
  Zap,
  Users,
  Swords,
  Database,
  Cpu,
  Flame,
  AlertTriangle,
  CheckCircle,
  X,
  Edit3,
  Sparkles,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { clsx } from 'clsx';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'rooms'>('system');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Action States
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<{ rating: number; xp: number; streak: number; role: 'USER' | 'ADMIN' }>({
    rating: 1200,
    xp: 0,
    streak: 0,
    role: 'USER',
  });
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Security Guard: Only ADMIN allowed
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/');
    }
  }, [user, navigate]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [statsData, usersData, roomsData] = await Promise.all([
        adminApi.getStats().catch(() => null),
        adminApi.getUsers().catch(() => []),
        adminApi.getRooms().catch(() => []),
      ]);
      if (statsData) setStats(statsData);
      setUsers(usersData);
      setRooms(roomsData);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // 1. Purge User Database
  const handlePurgeDatabase = async () => {
    if (purgeConfirmText.trim().toUpperCase() !== 'PURGE') return;
    setIsPurging(true);
    try {
      const res = await adminApi.clearUserDatabase(true);
      showFeedback(`✅ ${res.message} (${res.deletedUsersCount} users purged)`);
      setPurgeModalOpen(false);
      setPurgeConfirmText('');
      await loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Purge failed');
    } finally {
      setIsPurging(false);
    }
  };

  // 2. Flush Redis
  const handleFlushRedis = async () => {
    if (!window.confirm('Flush all keys from Redis cache?')) return;
    try {
      await adminApi.flushRedis();
      showFeedback('✅ Redis cache flushed successfully');
      await loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Flush failed');
    }
  };

  // 3. Reset Daily Challenge
  const handleResetDaily = async () => {
    try {
      await adminApi.resetDailyChallenge();
      showFeedback("✅ Today's daily challenge rotated to a new problem");
    } catch (err: any) {
      alert(err.response?.data?.message || 'Rotation failed');
    }
  };

  // 4. Edit User
  const handleOpenEdit = (u: AdminUser) => {
    setEditingUser(u);
    setEditForm({
      rating: u.rating,
      xp: u.xp,
      streak: u.streak,
      role: u.role,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      await adminApi.updateUser(editingUser.id, editForm);
      showFeedback(`✅ User @${editingUser.username} updated`);
      setEditingUser(null);
      await loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  // 5. Delete User
  const handleDeleteUser = async (u: AdminUser) => {
    if (!window.confirm(`Permanently delete @${u.username}? This cannot be undone.`)) return;
    try {
      await adminApi.deleteUser(u.id);
      showFeedback(`✅ Deleted user @${u.username}`);
      await loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  // 6. Terminate Room
  const handleTerminateRoom = async (roomId: string) => {
    if (!window.confirm(`Force terminate room #${roomId}?`)) return;
    try {
      await adminApi.terminateRoom(roomId);
      showFeedback(`✅ Terminated room #${roomId}`);
      await loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Termination failed');
    }
  };

  // 7. God-Boost Self
  const handleGodBoostSelf = async () => {
    if (!user) return;
    try {
      await adminApi.updateUser(user.id, {
        rating: 3000,
        xp: 99999,
        streak: 100,
        role: 'ADMIN',
      });
      showFeedback('⚡ Applied Apex Grandmaster (3000 CP) God Boost!');
      await loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Boost failed');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.playerId.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Top Admin Header */}
      <header className="h-16 px-6 border-b border-rose-500/20 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between shrink-0 z-20 shadow-lg shadow-rose-950/20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-mono"
          >
            <ArrowLeft size={16} /> Back to Arena
          </button>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400">
              <ShieldAlert size={18} />
            </span>
            <div>
              <h1 className="text-sm font-black text-white tracking-wider flex items-center gap-2">
                GOD MODE CONTROL CENTER
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  SUPER ADMIN
                </span>
              </h1>
              <p className="text-[10px] font-mono text-zinc-400">
                System Storage: {stats?.storageMode || 'Detecting...'} • Uptime: {stats?.uptimeSec || 0}s
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGodBoostSelf}
            title="Grant Max CP & Stats to Admin"
            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            God Boost Self (3000 CP)
          </button>

          <button
            onClick={loadAllData}
            disabled={loading}
            className="p-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-lg transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={clsx(loading && 'animate-spin')} />
          </button>
        </div>
      </header>

      {/* Action Toast Feedback */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-mono font-bold rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2"
          >
            <CheckCircle size={16} className="text-emerald-400" />
            {actionFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Tabs */}
      <div className="px-6 pt-4 border-b border-zinc-800 bg-zinc-900/40 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('system')}
          className={clsx(
            'px-4 py-2 text-xs font-mono font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-2',
            activeTab === 'system'
              ? 'border-rose-500 text-rose-400 bg-rose-500/10'
              : 'border-transparent text-zinc-400 hover:text-white',
          )}
        >
          <Database size={15} />
          System & Database Purge
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={clsx(
            'px-4 py-2 text-xs font-mono font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-2',
            activeTab === 'users'
              ? 'border-rose-500 text-rose-400 bg-rose-500/10'
              : 'border-transparent text-zinc-400 hover:text-white',
          )}
        >
          <Users size={15} />
          Operatives Manager ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={clsx(
            'px-4 py-2 text-xs font-mono font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-2',
            activeTab === 'rooms'
              ? 'border-rose-500 text-rose-400 bg-rose-500/10'
              : 'border-transparent text-zinc-400 hover:text-white',
          )}
        >
          <Swords size={15} />
          Active Duel Arenas ({rooms.length})
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* TAB 1: SYSTEM & DATABASE CONTROL */}
        {activeTab === 'system' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Live Diagnostics Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>TOTAL USERS</span>
                  <Users size={16} className="text-indigo-400" />
                </div>
                <div className="text-2xl font-black text-white mt-2">{users.length}</div>
                <span className="text-[10px] font-mono text-zinc-500">Registered operatives</span>
              </div>

              <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>ACTIVE ROOMS</span>
                  <Swords size={16} className="text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white mt-2">{rooms.length}</div>
                <span className="text-[10px] font-mono text-zinc-500">Live battle instances</span>
              </div>

              <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>SERVER MEMORY</span>
                  <Cpu size={16} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white mt-2">{stats?.memoryMb || 0} MB</div>
                <span className="text-[10px] font-mono text-zinc-500">Heap: {stats?.heapUsedMb || 0} MB</span>
              </div>

              <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>STORAGE ADAPTER</span>
                  <Database size={16} className="text-rose-400" />
                </div>
                <div className="text-base font-bold text-white mt-2 truncate">{stats?.storageMode || 'Active'}</div>
                <span className="text-[10px] font-mono text-zinc-500">Auto-fallback enabled</span>
              </div>
            </div>

            {/* DANGER ZONE: CLEAR USER DATABASE */}
            <div className="p-6 bg-rose-950/20 border-2 border-rose-500/40 rounded-2xl space-y-4 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <AlertTriangle size={160} className="text-rose-500" />
              </div>

              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-400">
                  <Trash2 size={24} />
                </span>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    Purge User Database & Reset
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-500 text-black font-black rounded uppercase">
                      Irreversible
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Wipes all registered user accounts, match history records, problem histories, friends lists, and
                    active socket sessions. Preserves the Super Admin account (<code className="text-rose-300">admin@codeduel.io</code>).
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-4">
                <button
                  onClick={() => setPurgeModalOpen(true)}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-xl transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Purge User Database Now
                </button>
                <span className="text-[11px] font-mono text-zinc-500">
                  CLI equivalent: <code className="bg-zinc-900 px-2 py-1 rounded text-zinc-300 border border-zinc-800">npm run db:clear-users</code>
                </span>
              </div>
            </div>

            {/* Quick Super Admin Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Zap size={18} className="text-amber-400" />
                  Flush Redis Memory Cache
                </div>
                <p className="text-xs text-zinc-400">
                  Purges all in-memory Redis keys including cached username availability checks, daily problem solver caches, and room mappings.
                </p>
                <button
                  onClick={handleFlushRedis}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={14} /> Flush Redis Keys
                </button>
              </div>

              <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Flame size={18} className="text-rose-400" />
                  Force Daily Challenge Rotation
                </div>
                <p className="text-xs text-zinc-400">
                  Forces an immediate cycle of today's Daily Challenge problem, selecting a fresh algorithm cipher for Beginner, Intermediate, and Advanced tiers.
                </p>
                <button
                  onClick={handleResetDaily}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={14} /> Force Daily Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: OPERATIVES / USERS MANAGER */}
        {activeTab === 'users' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by username, email, or player ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="text-xs font-mono text-zinc-400">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 text-[11px]">
                    <tr>
                      <th className="p-3">Operative</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Rating / Rank</th>
                      <th className="p-3">Level / XP</th>
                      <th className="p-3">Streak</th>
                      <th className="p-3">Role</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-500">
                          No operatives match the search query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-zinc-850/50 transition-colors">
                          <td className="p-3 font-bold text-white flex items-center gap-2">
                            <span className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs">
                              {u.username.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <div>{u.username}</div>
                              <span className="text-[10px] text-zinc-500">{u.playerId}</span>
                            </div>
                          </td>
                          <td className="p-3 text-zinc-400">{u.email}</td>
                          <td className="p-3">
                            <span className="text-amber-400 font-bold">{u.rating} CP</span>
                            <span className="text-[10px] text-zinc-500 ml-1.5">({u.rank})</span>
                          </td>
                          <td className="p-3 text-zinc-300">
                            Lvl {u.level} • {u.xp} XP
                          </td>
                          <td className="p-3 text-rose-400 font-bold">{u.streak} 🔥</td>
                          <td className="p-3">
                            {u.role === 'ADMIN' ? (
                              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-bold">
                                ADMIN
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-[10px]">
                                USER
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEdit(u)}
                              title="Edit CP / Level / Role"
                              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
                            >
                              <Edit3 size={15} />
                            </button>
                            {u.id !== user?.id && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                title="Delete User"
                                className="p-1.5 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACTIVE DUEL ROOMS */}
        {activeTab === 'rooms' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            {rooms.length === 0 ? (
              <div className="p-12 text-center bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
                <Swords size={32} className="mx-auto text-zinc-600 mb-2" />
                <h4 className="text-sm font-bold text-zinc-400">No Active Duel Arenas</h4>
                <p className="text-xs text-zinc-500">No multiplayer rooms currently hosted on the server.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms.map((room) => (
                  <div key={room.id} className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          #{room.id}
                        </span>
                        <span className="text-xs font-bold text-white">{room.gameMode}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {room.state}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-400 font-mono space-y-1">
                      <div>Players ({room.players?.length || 0}):</div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {room.players?.map((p) => (
                          <span
                            key={p.id}
                            className="px-2 py-1 bg-zinc-800 rounded text-[11px] text-white flex items-center gap-1.5"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            {p.username} ({p.rating} CP)
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => handleTerminateRoom(room.id)}
                        className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-mono rounded transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 size={13} /> Terminate Arena
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: PURGE DATABASE CONFIRMATION */}
      <AnimatePresence>
        {purgeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-zinc-900 border-2 border-rose-500/50 rounded-2xl p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-rose-400">
                  <AlertTriangle size={24} />
                  <h3 className="text-base font-black text-white">Confirm User Database Purge</h3>
                </div>
                <button onClick={() => setPurgeModalOpen(false)} className="text-zinc-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                This action will delete all user accounts, match history records, and sessions from the database.
                <br />
                <br />
                The Super Admin account (<strong className="text-white">admin@codeduel.io</strong>) will be preserved.
                <br />
                <br />
                To confirm, type <strong className="text-rose-400 font-mono">PURGE</strong> below:
              </p>

              <input
                type="text"
                placeholder="Type PURGE to confirm"
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-rose-500/40 rounded-xl text-sm font-mono text-white text-center focus:outline-none focus:border-rose-500 uppercase"
              />

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setPurgeModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-mono rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePurgeDatabase}
                  disabled={purgeConfirmText.trim().toUpperCase() !== 'PURGE' || isPurging}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-mono font-bold rounded-xl transition-colors shadow-lg shadow-rose-600/30"
                >
                  {isPurging ? 'Purging...' : 'Execute Purge'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT USER GOD MODE */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 size={18} className="text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Edit Operative: @{editingUser.username}</h3>
                </div>
                <button onClick={() => setEditingUser(null)} className="text-zinc-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-zinc-400 mb-1">CP Rating (0 - 3500)</label>
                  <input
                    type="number"
                    value={editForm.rating}
                    onChange={(e) => setEditForm({ ...editForm, rating: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">XP Points</label>
                  <input
                    type="number"
                    value={editForm.xp}
                    onChange={(e) => setEditForm({ ...editForm, xp: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Active Daily Streak (Days)</label>
                  <input
                    type="number"
                    value={editForm.streak}
                    onChange={(e) => setEditForm({ ...editForm, streak: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Account Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
                  >
                    <option value="USER">USER (Standard Operative)</option>
                    <option value="ADMIN">ADMIN (Full Super Admin Powers)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-mono rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold rounded-xl transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
