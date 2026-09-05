import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { Cpu, Sparkles, Code2, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface LanguageWeapon {
  id: 'python' | 'javascript' | 'cpp';
  name: string;
  tagline: string;
  badge: string;
  accentColor: string;
  glowColor: string;
  gradient: string;
  borderHover: string;
  stats: {
    compileSpeed: string;
    memoryEfficiency: string;
    arenaWinRate: string;
    popularity: string;
  };
  features: string[];
  codeSnippet: string;
  description: string;
}

const LANGUAGES: LanguageWeapon[] = [
  {
    id: 'python',
    name: 'Python 3.12',
    tagline: 'Velocity, Algorithmic Purity & Rapid Prototyping',
    badge: 'PY_INTERPRETER_V3',
    accentColor: 'text-[#FFD438]',
    glowColor: 'rgba(255, 212, 56, 0.25)',
    gradient: 'from-[#3776AB]/30 via-[#FFD438]/20 to-transparent',
    borderHover: 'hover:border-[#FFD438]/50',
    stats: {
      compileSpeed: '< 18ms (JIT)',
      memoryEfficiency: 'High-Level GC',
      arenaWinRate: '54.2%',
      popularity: '42% of Duels',
    },
    features: [
      'Concise list comprehensions for blitz round speed',
      'Built-in heapq, collections, and bisect libraries',
      'Zero boilerplate syntax for split-second submissions',
    ],
    codeSnippet: `def solve_chaos_arena(stream: list[int], target: int) -> int:
    seen = set()
    for val in stream:
        complement = target - val
        if complement in seen:
            return val * complement
        seen.add(val)
    return -1  # Optimized O(N) dual lookup`,
    description:
      'The premier weapon for rapid algorithmic composition. Clean syntax allows operatives to write solutions with minimal keystrokes, capturing early-submission time bonuses.',
  },
  {
    id: 'javascript',
    name: 'JavaScript / TypeScript',
    tagline: 'Asynchronous Concurrency & The Modern Web Titan',
    badge: 'NODE_V20_TURBOFAN',
    accentColor: 'text-[#F7DF1E]',
    glowColor: 'rgba(247, 223, 30, 0.25)',
    gradient: 'from-[#F7DF1E]/25 via-[#3178C6]/20 to-transparent',
    borderHover: 'hover:border-[#F7DF1E]/50',
    stats: {
      compileSpeed: '< 12ms (V8)',
      memoryEfficiency: 'Generational GC',
      arenaWinRate: '51.8%',
      popularity: '35% of Duels',
    },
    features: [
      'Event loop mastery for high-throughput stream processing',
      'Flexible closures and modern ES2024 array operations',
      'Strict TypeScript static checking prevents runtime traps',
    ],
    codeSnippet: `export function maxSubarraySum(nums: number[], k: number): number {
  let maxSum = 0, current = 0;
  for (let i = 0; i < nums.length; i++) {
    current += nums[i];
    if (i >= k) current -= nums[i - k];
    if (i >= k - 1) maxSum = Math.max(maxSum, current);
  }
  return maxSum; // Sub-millisecond sliding window
}`,
    description:
      'Lightning-fast V8 execution combined with dynamic typing or strict TypeScript guarantees. The battle weapon of choice for full-stack engineers and web gladiators.',
  },
  {
    id: 'cpp',
    name: 'C++ 20',
    tagline: 'Raw Bare-Metal Silicon & Zero-Overhead Dominance',
    badge: 'GCC_O3_ULTRA_NATIVE',
    accentColor: 'text-[#00599C]',
    glowColor: 'rgba(0, 89, 156, 0.35)',
    gradient: 'from-[#00599C]/30 via-[#659AD2]/20 to-transparent',
    borderHover: 'hover:border-[#659AD2]/50',
    stats: {
      compileSpeed: 'Native Native',
      memoryEfficiency: 'Direct Stack/Heap (Manual)',
      arenaWinRate: '56.9%',
      popularity: '23% of Duels',
    },
    features: [
      'Zero-cost abstractions with standard template library (STL)',
      'Direct pointer arithmetic & SIMD vectorization',
      'Undisputed fastest execution time in tight compute loops',
    ],
    codeSnippet: `#include <vector>
#include <algorithm>

long long solveSpeedRun(std::vector<int>& arr) {
    std::sort(arr.begin(), arr.end());
    long long ans = 0;
    for (size_t i = 0; i < arr.size(); ++i) {
        ans += 1LL * arr[i] * (i + 1);
    }
    return ans; // Pure hardware-accelerated throughput
}`,
    description:
      'The heavyweight warhorse of competitive programming. When memory constraints are punishing and every nanosecond counts toward the tiebreaker, C++ reigns supreme.',
  },
];

// Interactive 3D Tilt Card with dynamic light reflection
const Interactive3DLogoCard: React.FC<{ lang: LanguageWeapon }> = ({ lang }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [18, -18]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-18, 18]), { stiffness: 200, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: 1200,
      }}
      className="relative w-full group cursor-pointer"
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
        className={clsx(
          "relative rounded-3xl bg-gradient-to-b from-neutral-900/90 via-black to-neutral-950 p-6 sm:p-8 border border-neutral-800 transition-colors duration-300 shadow-2xl",
          lang.borderHover
        )}
      >
        {/* Specular Glare Effect */}
        <div
          className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${lang.glowColor}, transparent 70%)`,
          }}
        />

        {/* 3D Content Wrapper with transformZ */}
        <div style={{ transform: 'translateZ(35px)' }} className="relative z-10 flex flex-col h-full justify-between">
          {/* Header & 3D Logo Visualization */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-mono tracking-widest px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-400 uppercase font-semibold">
                {lang.badge}
              </span>
              <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-400">
                <Sparkles size={13} className={lang.accentColor} />
                <span>Tier 1 Native</span>
              </div>
            </div>

            {/* 3D Geometric Logo Centerpiece */}
            <div className="h-44 sm:h-48 w-full flex items-center justify-center relative my-2 overflow-visible">
              {lang.id === 'python' && <Python3DLogo />}
              {lang.id === 'javascript' && <JavaScript3DLogo />}
              {lang.id === 'cpp' && <Cpp3DLogo />}
            </div>

            {/* Title & Tagline */}
            <div className="text-center mt-3">
              <h3 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                <span>{lang.name}</span>
                <span className={clsx("text-xs font-mono px-2 py-0.5 rounded bg-white/[0.06] border border-white/10", lang.accentColor)}>
                  READY
                </span>
              </h3>
              <p className="text-xs text-neutral-400 font-medium mt-1">
                {lang.tagline}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5 my-6 pt-5 border-t border-neutral-800/80 text-left">
            <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/60">
              <span className="text-[10px] font-mono text-neutral-450 uppercase block">Execution Speed</span>
              <span className="text-xs font-mono font-bold text-white mt-0.5 block">{lang.stats.compileSpeed}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/60">
              <span className="text-[10px] font-mono text-neutral-450 uppercase block">Arena Win Rate</span>
              <span className={clsx("text-xs font-mono font-bold mt-0.5 block", lang.accentColor)}>{lang.stats.arenaWinRate}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/60">
              <span className="text-[10px] font-mono text-neutral-450 uppercase block">Memory Archetype</span>
              <span className="text-xs font-mono font-bold text-neutral-300 mt-0.5 block truncate">{lang.stats.memoryEfficiency}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/60">
              <span className="text-[10px] font-mono text-neutral-450 uppercase block">Match Share</span>
              <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 block">{lang.stats.popularity}</span>
            </div>
          </div>

          {/* Code Snippet Card */}
          <div className="rounded-xl bg-black/80 border border-neutral-800/90 p-3.5 text-left font-mono text-[11px] text-neutral-300 overflow-x-auto scrollbar-hide shadow-inner">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800/60 text-[10px] text-neutral-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Arena Solution
              </span>
              <span>UTF-8</span>
            </div>
            <pre className="text-neutral-300 leading-relaxed overflow-x-auto">
              <code>{lang.codeSnippet}</code>
            </pre>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// 3D Visualized Python Logo Component
const Python3DLogo = () => {
  return (
    <motion.div
      animate={{
        rotateY: [0, 15, -15, 0],
        rotateX: [0, -8, 8, 0],
        y: [0, -6, 0],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{ transformStyle: 'preserve-3d' }}
      className="relative w-28 h-28 flex items-center justify-center"
    >
      {/* Glow aura */}
      <div className="absolute inset-0 bg-[#3776AB]/30 rounded-full blur-2xl animate-pulse" />
      <div className="absolute inset-4 bg-[#FFD438]/25 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Handcrafted High-Precision 3D Python Emblem SVG */}
      <svg
        viewBox="0 0 128 128"
        className="w-24 h-24 drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] filter transition-transform hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="pyBlue3D" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5A9FD4" />
            <stop offset="50%" stopColor="#306998" />
            <stop offset="100%" stopColor="#1E4564" />
          </linearGradient>
          <linearGradient id="pyYellow3D" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE873" />
            <stop offset="50%" stopColor="#FFD438" />
            <stop offset="100%" stopColor="#D4A716" />
          </linearGradient>
          <filter id="pyGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Top Blue Serpent */}
        <path
          d="M63.5 12C41.2 12 42.6 21.6 42.6 21.6L42.7 31.6H64.2V34.8H32.4C32.4 34.8 19 33.2 19 55.4C19 77.6 30.7 76 30.7 76H37.8V66H63.5C63.5 66 73 66.8 73 57.2V21.6C73 21.6 74.4 12 63.5 12ZM52.8 19.3C55.4 19.3 57.5 21.4 57.5 24C57.5 26.6 55.4 28.7 52.8 28.7C50.2 28.7 48.1 26.6 48.1 24C48.1 21.4 50.2 19.3 52.8 19.3Z"
          fill="url(#pyBlue3D)"
          filter="url(#pyGlow)"
        />

        {/* Bottom Yellow Serpent */}
        <path
          d="M64.5 116C86.8 116 85.4 106.4 85.4 106.4L85.3 96.4H63.8V93.2H95.6C95.6 93.2 109 94.8 109 72.6C109 50.4 97.3 52 97.3 52H90.2V62H64.5C64.5 62 55 61.2 55 70.8V106.4C55 106.4 53.6 116 64.5 116ZM75.2 108.7C72.6 108.7 70.5 106.6 70.5 104C70.5 101.4 72.6 99.3 75.2 99.3C77.8 99.3 79.9 101.4 79.9 104C79.9 106.6 77.8 108.7 75.2 108.7Z"
          fill="url(#pyYellow3D)"
          filter="url(#pyGlow)"
        />
      </svg>
    </motion.div>
  );
};

// 3D Visualized JavaScript / TypeScript Logo Component
const JavaScript3DLogo = () => {
  return (
    <motion.div
      animate={{
        rotateY: [0, -18, 18, 0],
        rotateZ: [0, -4, 4, 0],
        y: [0, -8, 0],
      }}
      transition={{
        duration: 7.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{ transformStyle: 'preserve-3d' }}
      className="relative w-28 h-28 flex items-center justify-center"
    >
      {/* Glowing backdrop halo */}
      <div className="absolute inset-0 bg-[#F7DF1E]/20 rounded-3xl blur-2xl animate-pulse" />
      <div className="absolute inset-3 bg-[#3178C6]/25 rounded-2xl blur-xl" />

      {/* 3D Isometric Dual Tile (JS + TS) */}
      <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#C9B310] via-[#F7DF1E] to-[#FFF176] p-1 shadow-[0_20px_40px_rgba(0,0,0,0.9)] flex items-end justify-end overflow-hidden border border-yellow-200/50">
        {/* Metallic Bevel Inset */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

        {/* Diagonal TS Companion Strip */}
        <div className="absolute top-0 left-0 bg-gradient-to-br from-[#3178C6] to-[#1E4F8A] px-2 py-0.5 rounded-br-lg text-[9px] font-mono font-black text-white shadow-md border-r border-b border-blue-400/40">
          TS + JS
        </div>

        {/* Classic Embossed JS Logo Glyph */}
        <span className="text-4xl font-black font-sans text-black pr-2 pb-1 tracking-tighter drop-shadow-sm select-none">
          JS
        </span>
      </div>
    </motion.div>
  );
};

// 3D Visualized C++ Logo Component
const Cpp3DLogo = () => {
  return (
    <motion.div
      animate={{
        rotateY: [0, 20, -20, 0],
        rotateX: [0, 10, -10, 0],
        y: [0, -7, 0],
      }}
      transition={{
        duration: 9,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{ transformStyle: 'preserve-3d' }}
      className="relative w-28 h-28 flex items-center justify-center"
    >
      {/* Radiant Cyan & Blue Aura */}
      <div className="absolute inset-0 bg-[#00599C]/35 rounded-full blur-2xl animate-pulse" />
      <div className="absolute inset-2 bg-[#659AD2]/25 rounded-full blur-lg" />

      {/* 3D Shield Crest SVG */}
      <svg
        viewBox="0 0 128 128"
        className="w-24 h-24 drop-shadow-[0_15px_30px_rgba(0,0,0,0.85)] filter transition-transform hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cppMetallic3D" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E78C2" />
            <stop offset="50%" stopColor="#00599C" />
            <stop offset="100%" stopColor="#003561" />
          </linearGradient>
          <linearGradient id="cppCyanAccent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A4D2FF" />
            <stop offset="100%" stopColor="#4A9BF5" />
          </linearGradient>
        </defs>

        {/* Shield Outer Bevel */}
        <polygon
          points="64,12 114,32 114,76 64,116 14,76 14,32"
          fill="url(#cppMetallic3D)"
          stroke="#5FA8E6"
          strokeWidth="3"
        />

        {/* Inner Shield Facet */}
        <polygon
          points="64,22 104,38 104,72 64,104 24,72 24,38"
          fill="#002447"
          opacity="0.85"
        />

        {/* Stylized 'C' Emblem */}
        <path
          d="M62 45 C48 45, 40 54, 40 64 C40 74, 48 83, 62 83 C69 83, 75 79, 78 74 L69 69 C67 72, 65 73, 62 73 C54 73, 50 67, 50 64 C50 61, 54 55, 62 55 C65 55, 67 56, 69 59 L78 54 C75 49, 69 45, 62 45 Z"
          fill="url(#cppCyanAccent)"
        />

        {/* First Plus '+' */}
        <path
          d="M84 57 H88 V62 H93 V66 H88 V71 H84 V66 H79 V62 H84 Z"
          fill="#FFF"
        />

        {/* Second Plus '+' */}
        <path
          d="M98 57 H102 V62 H107 V66 H102 V71 H98 V66 H93 V62 H98 Z"
          fill="#659AD2"
        />
      </svg>
    </motion.div>
  );
};

export const ThreeDLanguagesShowcase: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ['-60px', '60px']);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.4, 1, 1, 0.4]);

  return (
    <section
      ref={containerRef}
      id="languages-dimension"
      className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-black overflow-hidden border-t border-b border-neutral-900"
    >
      {/* Ambient Parallax Grid Canvas Background */}
      <motion.div
        style={{ y: backgroundY }}
        className="absolute inset-0 bg-[linear-gradient(to_right,#141414_1px,transparent_1px),linear-gradient(to_bottom,#141414_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"
      />

      {/* Decorative Glow Nodes */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-r from-blue-600/10 via-amber-500/10 to-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div style={{ opacity: titleOpacity }} className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-300 text-xs font-mono font-semibold uppercase tracking-widest mb-4">
            <Cpu size={13} className="text-indigo-400" />
            <span>POLYGLOT ARENA ARSENAL</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none mb-5">
            CHOOSE YOUR WEAPON.{' '}
            <span className="bg-gradient-to-r from-neutral-200 via-white to-neutral-450 bg-clip-text text-transparent">
              DOMINATE IN 3D.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed">
            Every coding language is a unique battle class with dedicated execution runtimes, native telemetry, and time-tested algorithmic libraries. Master your syntax and out-think opponents in real-time.
          </p>
        </motion.div>

        {/* 3-Column Responsive 3D Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
          {LANGUAGES.map((lang) => (
            <Interactive3DLogoCard key={lang.id} lang={lang} />
          ))}
        </div>

        {/* Polyglot Runtimes Telemetry Footer */}
        <div className="mt-16 sm:mt-20 p-6 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Code2 size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                Sandboxed Docker Real-Time Execution Cluster
              </h4>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                Each submission runs isolated with rlimit memory capping, wall-clock timing, and zero cold starts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <CheckCircle size={14} />
              <span>Judge0 Core Active</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-neutral-400 border-l border-neutral-800 pl-4">
              <span>99.99% Execution Reliability</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
