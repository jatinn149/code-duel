import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { useSocket } from '@/hooks/use-socket';
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
  Gift,
  Mail,
  Send,
  Radio,
  RotateCcw,
  BookOpen,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { clsx } from 'clsx';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'rooms' | 'guide'>('users');
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

  // Gift Modal State
  const [giftModalUser, setGiftModalUser] = useState<AdminUser | null>(null);
  const [giftForm, setGiftForm] = useState({
    xp: '' as string | number,
    rating: '' as string | number,
    level: '' as string | number,
    seasonalTier: '',
    note: '',
  });
  const [isGifting, setIsGifting] = useState(false);

  // Mail Modal State
  const [mailModalUser, setMailModalUser] = useState<AdminUser | null>(null);
  const [mailForm, setMailForm] = useState({
    title: 'HQ Transmission to Operative',
    message: '',
    giftXp: '' as string | number,
    giftCp: '' as string | number,
    tierUpgrade: '',
  });
  const [isSendingMail, setIsSendingMail] = useState(false);

  // Broadcast Modal State
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: 'CODE DUEL LEAGUE ANNOUNCEMENT',
    message: '',
    giftXp: '' as string | number,
    giftCp: '' as string | number,
  });
  const [isBroadcasting, setIsBroadcasting] = useState(false);

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

  const socket = useSocket();

  const refreshRooms = async () => {
    try {
      const roomsData = await adminApi.getRooms();
      setRooms(roomsData);
    } catch {
      // silent background update
    }
  };

  const refreshStats = async () => {
    try {
      const statsData = await adminApi.getStats();
      if (statsData) setStats(statsData);
    } catch {
      // silent background update
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Real-time socket event for active rooms update
  useEffect(() => {
    if (!socket) return;
    const handleRoomsChanged = () => {
      refreshRooms();
      refreshStats();
    };
    socket.on('admin:rooms_changed', handleRoomsChanged);
    return () => {
      socket.off('admin:rooms_changed', handleRoomsChanged);
    };
  }, [socket]);

  // Automated background polling every 3 seconds for instant updates
  useEffect(() => {
    const timer = setInterval(() => {
      refreshRooms();
      refreshStats();
    }, 3000);
    return () => clearInterval(timer);
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

  // 5.1 Open & Execute Gift
  const handleOpenGift = (u: AdminUser) => {
    setGiftModalUser(u);
    setGiftForm({
      xp: '',
      rating: '',
      level: '',
      seasonalTier: '',
      note: '',
    });
  };

  const handleExecuteGift = async () => {
    if (!giftModalUser) return;
    try {
      setIsGifting(true);
      await adminApi.giftUser(giftModalUser.id, {
        xp: giftForm.xp !== '' ? Number(giftForm.xp) : undefined,
        rating: giftForm.rating !== '' ? Number(giftForm.rating) : undefined,
        level: giftForm.level !== '' ? Number(giftForm.level) : undefined,
        seasonalTier: giftForm.seasonalTier || undefined,
        note: giftForm.note || undefined,
      });
      showFeedback(`🎁 Granted rewards to @${giftModalUser.username}!`);
      setGiftModalUser(null);
      await loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gift failed');
    } finally {
      setIsGifting(false);
    }
  };

  // 5.2 Open & Execute Direct System Mail
  const handleOpenMail = (u: AdminUser) => {
    setMailModalUser(u);
    setMailForm({
      title: 'HQ Transmission to Operative',
      message: `Greetings @${u.username}, your tactical progression has been acknowledged by League Administration.`,
      giftXp: '',
      giftCp: '',
      tierUpgrade: '',
    });
  };

  const handleExecuteMail = async () => {
    if (!mailModalUser) return;
    if (!mailForm.title.trim() || !mailForm.message.trim()) {
      alert('Subject title and message body are required.');
      return;
    }
    try {
      setIsSendingMail(true);
      await adminApi.sendUserMail(mailModalUser.id, {
        title: mailForm.title.trim(),
        message: mailForm.message.trim(),
        giftXp: mailForm.giftXp !== '' ? Number(mailForm.giftXp) : undefined,
        giftCp: mailForm.giftCp !== '' ? Number(mailForm.giftCp) : undefined,
        tierUpgrade: mailForm.tierUpgrade || undefined,
      });
      showFeedback(`✉️ Mail dispatched to @${mailModalUser.username}!`);
      setMailModalUser(null);
      await loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Mail delivery failed');
    } finally {
      setIsSendingMail(false);
    }
  };

  // 5.3 Execute Broadcast Announcement
  const handleExecuteBroadcast = async () => {
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      alert('Broadcast title and message are required.');
      return;
    }
    try {
      setIsBroadcasting(true);
      const res = await adminApi.broadcastMail({
        title: broadcastForm.title.trim(),
        message: broadcastForm.message.trim(),
        giftXp: broadcastForm.giftXp !== '' ? Number(broadcastForm.giftXp) : undefined,
        giftCp: broadcastForm.giftCp !== '' ? Number(broadcastForm.giftCp) : undefined,
      });
      showFeedback(`📢 Broadcast delivered to ${res.recipientsCount} operative(s)!`);
      setBroadcastModalOpen(false);
      await loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Broadcast failed');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // 5.4 Reset User Progression Stats
  const handleResetUserStats = async (u: AdminUser) => {
    if (!window.confirm(`Reset stats for @${u.username} back to starter rank? (Rating 1000 CP, XP 0, Level 1, wins/losses 0). Account credentials will remain intact.`)) return;
    try {
      await adminApi.resetUserStats(u.id);
      showFeedback(`🔄 Progression stats reset for @${u.username}`);
      await loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Reset stats failed');
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
      <header className="min-h-16 py-2 px-3 sm:px-6 border-b border-rose-500/20 bg-zinc-900/80 backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center justify-between shrink-0 z-20 shadow-lg shadow-rose-950/20 gap-2">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 sm:p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-mono shrink-0"
          >
            <ArrowLeft size={16} /> <span className="hidden xs:inline">Back to Arena</span>
          </button>
          <div className="h-4 w-px bg-zinc-800 hidden xs:block" />
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 shrink-0">
              <ShieldAlert size={18} />
            </span>
            <div>
              <h1 className="text-xs sm:text-sm font-black text-white tracking-wider flex items-center gap-1.5 sm:gap-2">
                GOD MODE CONTROL CENTER
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  SUPER ADMIN
                </span>
              </h1>
              <p className="text-[9px] sm:text-[10px] font-mono text-zinc-400">
                System Storage: {stats?.storageMode || 'Detecting...'} • Uptime: {stats?.uptimeSec || 0}s
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto sm:ml-0">
          <button
            onClick={handleGodBoostSelf}
            title="Grant Max CP & Stats to Admin"
            className="px-2.5 sm:px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold rounded-lg transition-colors flex items-center gap-1.5 active:scale-95"
          >
            <Sparkles size={14} />
            God Boost Self (3000 CP)
          </button>

          <button
            onClick={loadAllData}
            disabled={loading}
            className="p-1.5 sm:p-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-lg transition-colors active:scale-95"
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
      <div className="px-3 sm:px-6 pt-3 sm:pt-4 border-b border-zinc-800 bg-zinc-900/40 flex items-center gap-1 sm:gap-2 shrink-0 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('system')}
          className={clsx(
            'px-3 sm:px-4 py-2 text-xs font-mono font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap',
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
            'px-3 sm:px-4 py-2 text-xs font-mono font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap',
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
            'px-3 sm:px-4 py-2 text-xs font-mono font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap',
            activeTab === 'rooms'
              ? 'border-rose-500 text-rose-400 bg-rose-500/10'
              : 'border-transparent text-zinc-400 hover:text-white',
          )}
        >
          <Swords size={15} />
          Active Duel Arenas ({rooms.length})
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={clsx(
            'px-3 sm:px-4 py-2 text-xs font-mono font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap',
            activeTab === 'guide'
              ? 'border-rose-500 text-rose-400 bg-rose-500/10'
              : 'border-transparent text-zinc-400 hover:text-white',
          )}
        >
          <BookOpen size={15} />
          Powers Codex & Guide
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* TAB 1: SYSTEM & DATABASE CONTROL */}
        {activeTab === 'system' && (
          <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
            {/* Live Diagnostics Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
            {/* Super Admin Cloaking Notice & Broadcast Announcement Action */}
            <div className="p-3 sm:p-4 bg-gradient-to-r from-rose-950/40 via-zinc-900/60 to-zinc-900/60 border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-rose-950/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                    <span>ADMIN ISOLATION PROTOCOL ACTIVE</span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px]">CLOAKED</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Admin accounts are completely hidden from public leaderboards, daily challenge rankings, live arena match listings, and user searches.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setBroadcastModalOpen(true)}
                className="w-full sm:w-auto px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-rose-600/30 transition-all active:scale-95"
              >
                <Radio size={14} />
                <span>Broadcast Announcement</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by username, email, or player ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="text-xs font-mono text-zinc-400 flex items-center justify-between sm:justify-end gap-2">
                <span>Showing <strong className="text-white">{filteredUsers.length}</strong> of {users.length} registered operatives</span>
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-950/90 border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Operative</th>
                      <th className="p-3.5">Rating & Rank</th>
                      <th className="p-3.5">Level & XP</th>
                      <th className="p-3.5">Streak</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5 text-right">Admin Powers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-500">
                          No operatives match the search query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-zinc-850/50 transition-colors">
                          <td className="p-3.5 font-bold text-white flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-indigo-400 font-black">
                              {u.username.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate">{u.username}</div>
                              <span className="text-[10px] text-zinc-500 block truncate">{u.playerId} • {u.email}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="text-amber-400 font-bold">{u.rating} CP</span>
                            <span className="text-[10px] text-zinc-500 ml-1.5">({u.rank})</span>
                          </td>
                          <td className="p-3.5 text-zinc-300">
                            <span className="text-indigo-400 font-bold">Lvl {u.level}</span>
                            <span className="text-zinc-500 text-[10px] ml-1.5">• {u.xp} XP</span>
                          </td>
                          <td className="p-3.5 text-rose-400 font-bold">{u.streak} 🔥</td>
                          <td className="p-3.5">
                            {u.role === 'ADMIN' ? (
                              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-bold tracking-wider">
                                ADMIN (CLOAKED)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-[10px]">
                                USER
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1 sm:gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleOpenGift(u)}
                                title="Gift XP, CP & Resources"
                                className="px-2 sm:px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-lg text-[11px] font-mono flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                              >
                                <Gift size={12} />
                                <span className="hidden xs:inline">Gift</span>
                              </button>

                              <button
                                onClick={() => handleOpenMail(u)}
                                title="Send Direct System Mail"
                                className="px-2 sm:px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] font-mono flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                              >
                                <Mail size={12} />
                                <span className="hidden xs:inline">Mail</span>
                              </button>

                              <button
                                onClick={() => handleOpenEdit(u)}
                                title="Calibrate Stats (Rating, XP, Streak, Role)"
                                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
                              >
                                <Edit3 size={14} />
                              </button>

                              <button
                                onClick={() => handleResetUserStats(u)}
                                title="Reset Stats Back to Starter (1000 CP, 0 XP, Level 1)"
                                className="p-1.5 hover:bg-amber-500/20 text-zinc-500 hover:text-amber-400 rounded-lg transition-colors"
                              >
                                <RotateCcw size={14} />
                              </button>

                              {u.id !== user?.id && (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  title="Permanently Delete User"
                                  className="p-1.5 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 rounded-lg transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
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
            {/* Live Indicator Bar */}
            <div className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider">
                  REAL-TIME ARENA RADAR ACTIVE
                </span>
                <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
                  (Live push + 3s Auto-Sync)
                </span>
              </div>
              <button
                onClick={refreshRooms}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5 border border-zinc-700"
              >
                <RefreshCw size={12} />
                <span>Refresh Arenas ({rooms.length})</span>
              </button>
            </div>

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

                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-zinc-800/80">
                      <button
                        onClick={() => {
                          const modePath = room.gameMode === 'MULTI_ROUND'
                            ? 'multi-round'
                            : room.gameMode === 'CHAOS_ARENA'
                            ? 'chaos-arena'
                            : 'quickode';
                          if (room.state === 'WAITING' || room.state === 'WAITING_FOR_PLAYERS' || room.state === 'COUNTDOWN') {
                            navigate(`/lobby/${room.id}`);
                          } else {
                            navigate(`/battle/${modePath}/${room.id}`);
                          }
                        }}
                        className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold rounded-lg transition-colors flex items-center gap-1.5 active:scale-95"
                      >
                        <Eye size={13} /> Spectate (Cloaked)
                      </button>

                      <button
                        onClick={() => handleTerminateRoom(room.id)}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5 active:scale-95"
                      >
                        <Trash2 size={13} /> Disband Arena
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: POWERS CODEX & COMPREHENSIVE DOCUMENTATION */}
        {activeTab === 'guide' && (
          <div className="space-y-6 max-w-5xl mx-auto font-sans pb-12">
            {/* Header Banner */}
            <div className="p-6 bg-gradient-to-r from-rose-950/40 via-zinc-900/60 to-zinc-900/60 border border-rose-500/30 rounded-2xl shadow-xl space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <BookOpen size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black text-white font-mono tracking-wider">
                    SUPER ADMIN PROTOCOL & POWERS CODEX
                  </h2>
                  <p className="text-xs text-zinc-400 font-mono">
                    Full specifications of administrative capabilities, account stealth, resource granting, and system controls.
                  </p>
                </div>
              </div>
            </div>

            {/* Documentation Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card 1: Cloaking & Stealth */}
              <div className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm font-mono">
                  <ShieldCheck size={18} />
                  <span>1. Full Admin Account Isolation (Cloaking)</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  All accounts with the <code className="text-rose-300 bg-rose-950/50 px-1 py-0.5 rounded font-mono">ADMIN</code> role are strictly quarantined from player discovery:
                </p>
                <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                  <li><strong className="text-white">Global Leaderboard:</strong> Filtered out entirely. Admins will never rank among regular players.</li>
                  <li><strong className="text-white">Daily Challenge Hall of Fame:</strong> Admin challenge submissions and rankings are scrubbed from public display.</li>
                  <li><strong className="text-white">Live Arena Matches:</strong> Active rooms hosted by admins are invisible to regular users on the Dashboard.</li>
                  <li><strong className="text-white">Player Search & Summary:</strong> Regular players searching for admin handles will receive a <span className="text-zinc-300">"Player not found"</span> response.</li>
                  <li><strong className="text-white">Friend & Duel Guard:</strong> Regular users cannot send friend requests or duel challenges to admin accounts.</li>
                </ul>
              </div>

              {/* Card 2: Resource & Progression Grants */}
              <div className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2.5 text-yellow-400 font-bold text-sm font-mono">
                  <Gift size={18} />
                  <span>2. Resource & Progression Gifting Suite</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Admins hold supreme authorization to calibrate or gift progression metrics to any account:
                </p>
                <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                  <li><strong className="text-white">XP Gifting:</strong> Grant custom quantities of Experience Points (e.g., +500 XP, +5,000 XP).</li>
                  <li><strong className="text-white">CP (Rating) Gifting:</strong> Directly increment competitive Code Points (e.g., +100 CP, +500 CP). Ranks automatically recalibrate instantly.</li>
                  <li><strong className="text-white">Level Assignment:</strong> Set operative level directly to any target tier.</li>
                  <li><strong className="text-white">Seasonal Tier Calibration:</strong> Assign designated titles (<em className="text-amber-300">Initiate, Coder, Specialist, Expert, Master, Grandmaster, Apex Coder</em>).</li>
                  <li><strong className="text-white">Instant Live Dispatch:</strong> When gifts are granted, an encrypted reward transmission is deposited into the player's inbox immediately.</li>
                </ul>
              </div>

              {/* Card 3: System Mail Center */}
              <div className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-sm font-mono">
                  <Mail size={18} />
                  <span>3. Direct System Mail Transmissions</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Admins can send official communications directly to operative mailboxes:
                </p>
                <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                  <li><strong className="text-white">Direct Inbox Placement:</strong> Messages arrive in the user's Mail Center (the Mail icon right beside Friends in the navigation bar).</li>
                  <li><strong className="text-white">Attached Rewards:</strong> Attach optional XP or CP grants to any message. Attached resources are credited to the user account on delivery and badged.</li>
                  <li><strong className="text-white">Real-Time Notification:</strong> If the operative is currently online, a live socket notification pushes to their HUD immediately.</li>
                </ul>
              </div>

              {/* Card 4: Broadcast Announcements */}
              <div className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm font-mono">
                  <Radio size={18} />
                  <span>4. League Broadcast Dispatches</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Transmit global announcements across the entire active network:
                </p>
                <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                  <li><strong className="text-white">Network-Wide Delivery:</strong> Transmits simultaneously to every registered non-admin operative.</li>
                  <li><strong className="text-white">Global Celebrations / Gifts:</strong> Attach XP or CP rewards to deliver network-wide compensation or championship celebration gifts to all operatives.</li>
                </ul>
              </div>

              {/* Card 5: Stat Zeroing & Recalibration */}
              <div className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm font-mono">
                  <RotateCcw size={18} />
                  <span>5. Stat Zeroing & Recalibration</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Quickly reset any player's competitive record without deleting their account:
                </p>
                <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                  <li><strong className="text-white">Reset to Starter:</strong> Re-initializes Rating to 1000 CP, Rank to Initiate, XP to 0, Level to 1, and zeroes streak, wins, and losses.</li>
                  <li><strong className="text-white">Credential Preservation:</strong> User password, email, and identity tokens remain fully operational.</li>
                </ul>
              </div>

              {/* Card 6: Infrastructure & Arena Overwatch */}
              <div className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm font-mono">
                  <Database size={18} />
                  <span>6. Tactical Infrastructure Controls</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Direct controls for cluster maintenance and match hygiene:
                </p>
                <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                  <li><strong className="text-white">Arena Termination:</strong> Force-close locked, disconnected, or orphaned arena duel rooms.</li>
                  <li><strong className="text-white">Redis Cache Flush:</strong> Clear all in-memory Redis keys and ghost matchmaking queues.</li>
                  <li><strong className="text-white">Force Daily Rotation:</strong> Trigger an on-demand reset and problem re-seeding for today's Daily Challenges.</li>
                  <li><strong className="text-white">Database Purge:</strong> Wipes non-admin data while safely preserving admin credentials.</li>
                </ul>
              </div>

            </div>
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

      {/* MODAL: GIFT XP, CP & RESOURCES */}
      <AnimatePresence>
        {giftModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-zinc-900 border border-yellow-500/30 rounded-2xl p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Gift size={20} />
                  <h3 className="text-sm font-bold text-white">Gift Resources: @{giftModalUser.username}</h3>
                </div>
                <button onClick={() => setGiftModalUser(null)} className="text-zinc-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-zinc-400">
                Granted resources and level adjustments will update the user's account immediately and dispatch an encrypted HQ reward mail to their inbox.
              </p>

              <div className="space-y-3.5 text-xs font-mono">
                <div>
                  <label className="block text-zinc-300 mb-1">XP Points to Grant (+XP)</label>
                  <input
                    type="number"
                    value={giftForm.xp}
                    onChange={(e) => setGiftForm({ ...giftForm, xp: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                    placeholder="e.g. 500 (optional)"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1">CP (Rating) to Grant (+CP)</label>
                  <input
                    type="number"
                    value={giftForm.rating}
                    onChange={(e) => setGiftForm({ ...giftForm, rating: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                    placeholder="e.g. 50 (optional)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-300 mb-1">Set Level</label>
                    <input
                      type="number"
                      value={giftForm.level}
                      onChange={(e) => setGiftForm({ ...giftForm, level: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                      placeholder="e.g. 5 (optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 mb-1">Set Seasonal Tier</label>
                    <select
                      value={giftForm.seasonalTier}
                      onChange={(e) => setGiftForm({ ...giftForm, seasonalTier: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                    >
                      <option value="">No Tier Change</option>
                      <option value="Initiate">Initiate (0+ CP baseline)</option>
                      <option value="Coder">Coder (500+ CP baseline)</option>
                      <option value="Specialist">Specialist (900+ CP baseline)</option>
                      <option value="Expert">Expert (1400+ CP baseline)</option>
                      <option value="Elite">Elite (2000+ CP baseline)</option>
                      <option value="Master">Master (2700+ CP baseline)</option>
                      <option value="Grandmaster">Grandmaster (3500+ CP baseline)</option>
                      <option value="Codebreaker">Codebreaker (4500+ CP baseline)</option>
                      <option value="Apex Coder">Apex Coder (6000+ CP baseline)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1">Notification Note / Commendation</label>
                  <input
                    type="text"
                    value={giftForm.note}
                    onChange={(e) => setGiftForm({ ...giftForm, note: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                    placeholder="e.g. For outstanding tournament participation"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setGiftModalUser(null)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-mono rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteGift}
                  disabled={isGifting}
                  className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-mono font-bold rounded-xl transition-all shadow-lg shadow-yellow-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Gift size={14} />
                  <span>{isGifting ? 'Granting...' : 'Grant Rewards'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DIRECT SYSTEM MAIL */}
      <AnimatePresence>
        {mailModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-zinc-900 border border-indigo-500/30 rounded-2xl p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Mail size={20} />
                  <h3 className="text-sm font-bold text-white">Send Direct Mail: @{mailModalUser.username}</h3>
                </div>
                <button onClick={() => setMailModalUser(null)} className="text-zinc-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-zinc-400">
                This transmission will be delivered directly to the operative's Mailbox (the Mail icon in their header and bottom bar).
              </p>

              <div className="space-y-3.5 text-xs font-mono">
                <div>
                  <label className="block text-zinc-300 mb-1">Subject Title</label>
                  <input
                    type="text"
                    value={mailForm.title}
                    onChange={(e) => setMailForm({ ...mailForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Message title..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1">Message Content</label>
                  <textarea
                    rows={4}
                    value={mailForm.message}
                    onChange={(e) => setMailForm({ ...mailForm, message: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none font-sans text-xs"
                    placeholder="Type official message..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-300 mb-1">Attached XP (Optional)</label>
                    <input
                      type="number"
                      value={mailForm.giftXp}
                      onChange={(e) => setMailForm({ ...mailForm, giftXp: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                      placeholder="e.g. 50"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 mb-1">Attached CP (Optional)</label>
                    <input
                      type="number"
                      value={mailForm.giftCp}
                      onChange={(e) => setMailForm({ ...mailForm, giftCp: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                      placeholder="e.g. 25"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1">Tier Promotion / Elevation (Optional)</label>
                  <select
                    value={mailForm.tierUpgrade}
                    onChange={(e) => setMailForm({ ...mailForm, tierUpgrade: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">No Tier Change</option>
                    <option value="Initiate">Initiate (0+ CP baseline)</option>
                    <option value="Coder">Coder (500+ CP baseline)</option>
                    <option value="Specialist">Specialist (900+ CP baseline)</option>
                    <option value="Expert">Expert (1400+ CP baseline)</option>
                    <option value="Elite">Elite (2000+ CP baseline)</option>
                    <option value="Master">Master (2700+ CP baseline)</option>
                    <option value="Grandmaster">Grandmaster (3500+ CP baseline)</option>
                    <option value="Codebreaker">Codebreaker (4500+ CP baseline)</option>
                    <option value="Apex Coder">Apex Coder (6000+ CP baseline)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setMailModalUser(null)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-mono rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteMail}
                  disabled={isSendingMail}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Send size={14} />
                  <span>{isSendingMail ? 'Transmitting...' : 'Send Transmission'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: BROADCAST ANNOUNCEMENT */}
      <AnimatePresence>
        {broadcastModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-zinc-900 border border-rose-500/40 rounded-2xl p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400">
                  <Radio size={20} />
                  <h3 className="text-sm font-bold text-white">Broadcast Announcement to All Operatives</h3>
                </div>
                <button onClick={() => setBroadcastModalOpen(false)} className="text-zinc-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                This transmission will be delivered to every active registered user on the platform. If rewards are attached, every recipient will receive the credits immediately.
              </p>

              <div className="space-y-3.5 text-xs font-mono">
                <div>
                  <label className="block text-zinc-300 mb-1">Broadcast Title</label>
                  <input
                    type="text"
                    value={broadcastForm.title}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-rose-500 focus:outline-none"
                    placeholder="ANNOUNCEMENT HEADLINE..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1">Broadcast Body</label>
                  <textarea
                    rows={4}
                    value={broadcastForm.message}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-rose-500 focus:outline-none font-sans text-xs"
                    placeholder="Enter message for all players..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1">Grant XP to All (+XP)</label>
                    <input
                      type="number"
                      value={broadcastForm.giftXp}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, giftXp: e.target.value })}
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:border-rose-500 focus:outline-none"
                      placeholder="e.g. 50"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1">Grant CP to All (+CP)</label>
                    <input
                      type="number"
                      value={broadcastForm.giftCp}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, giftCp: e.target.value })}
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:border-rose-500 focus:outline-none"
                      placeholder="e.g. 25"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setBroadcastModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-mono rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteBroadcast}
                  disabled={isBroadcasting}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold rounded-xl transition-all shadow-lg shadow-rose-600/30 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Radio size={14} />
                  <span>{isBroadcasting ? 'Broadcasting...' : 'Execute Broadcast'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
