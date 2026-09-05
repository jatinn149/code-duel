import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { Sparkles, Code2, CheckCircle, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface LanguageWeapon {
  id: 'python' | 'java';
  name: string;
  tagline: string;
  status: 'READY' | 'COMING_SOON';
  statusBadge: string;
  badge: string;
  accentColor: string;
  glowColor: string;
  gradient: string;
  borderHover: string;
  stats: {
    speed: string;
    learningCurve: string;
    battleStyle: string;
    statusText: string;
  };
  features: string[];
  codeSnippet: string;
  description: string;
}

const LANGUAGES: LanguageWeapon[] = [
  {
    id: 'python',
    name: 'Python 3.12',
    tagline: 'Clean, readable syntax & super fast to write',
    status: 'READY',
    statusBadge: 'READY TO PLAY',
    badge: 'ACTIVE IN ARENA',
    accentColor: 'text-[#FFD438]',
    glowColor: 'rgba(255, 212, 56, 0.25)',
    gradient: 'from-[#3776AB]/30 via-[#FFD438]/20 to-transparent',
    borderHover: 'hover:border-[#FFD438]/50',
    stats: {
      speed: 'Instant Execution',
      learningCurve: 'Beginner Friendly',
      battleStyle: 'Quick Solutions',
      statusText: '100% Ready',
    },
    features: [
      'Simple, clean syntax that reads almost like plain English',
      'Built-in helpers for lists, sorting, sets, and math',
      'Minimal typing so you can code your ideas faster than the clock',
    ],
    codeSnippet: `def count_even_numbers(numbers: list[int]) -> int:
    # Count all numbers divisible by 2
    return sum(1 for num in numbers if num % 2 == 0)

# Example: [1, 2, 3, 4, 5, 6] -> 3 even numbers`,
    description:
      'The most popular language in Code Duel. Python lets you focus purely on problem-solving logic without worrying about complex setup or difficult boilerplate.',
  },
  {
    id: 'java',
    name: 'Java 21',
    tagline: 'Strongly typed, structured & industry standard',
    status: 'COMING_SOON',
    statusBadge: 'COMING SOON',
    badge: 'IN ENGINE TESTING',
    accentColor: 'text-[#F89820]',
    glowColor: 'rgba(248, 152, 32, 0.3)',
    gradient: 'from-[#5382A1]/30 via-[#F89820]/20 to-transparent',
    borderHover: 'hover:border-[#F89820]/50',
    stats: {
      speed: 'High Performance',
      learningCurve: 'Structured & Clear',
      battleStyle: 'Object-Oriented',
      statusText: 'Next Arena Update',
    },
    features: [
      'Strict variable types catch bugs before you even submit',
      'Standard language taught in CS universities and AP Computer Science',
      'High-speed virtual machine optimized for complex algorithms',
    ],
    codeSnippet: `public class Solution {
    // Java support arriving in the next major patch!
    public static int countEvenNumbers(int[] numbers) {
        int count = 0;
        for (int num : numbers) {
            if (num % 2 == 0) count++;
        }
        return count;
    }
}`,
    description:
      'The gold standard of computer science education and enterprise software. Java brings rigid structure and high-speed execution to competitive coding matches.',
  },
];

// Interactive 3D Tilt Card with dynamic light reflection
const Interactive3DLogoCard: React.FC<{ lang: LanguageWeapon }> = ({ lang }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // High-precision smooth springs for instantaneous, tactile 3D tilt
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [18, -18]), { stiffness: 320, damping: 28 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-18, 18]), { stiffness: 320, damping: 28 });

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

  // Mobile Touch Support: Allows users on phones and tablets to tilt cards with their finger
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!cardRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = cardRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width - 0.5;
    const y = (touch.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(Math.max(-0.5, Math.min(0.5, x)));
    mouseY.set(Math.max(-0.5, Math.min(0.5, y)));
  };

  const handleTouchEnd = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div style={{ perspective: 1200 }} className="w-full h-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        animate={{
          y: [0, -6, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: lang.id === 'python' ? 0 : 0.6,
        }}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          transformPerspective: 1200,
        }}
        className={clsx(
          "relative rounded-3xl bg-gradient-to-b from-neutral-900/95 via-neutral-950 to-black p-6 sm:p-8 border border-neutral-800 shadow-2xl flex flex-col justify-between group h-full cursor-pointer transition-colors duration-200",
          lang.borderHover
        )}
      >
        {/* Specular Interactive Cursor & Touch Highlight (subtly active on mobile, intense on hover/touch) */}
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-35 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: useTransform(
              [mouseX, mouseY],
              ([x, y]) =>
                `radial-gradient(600px circle at ${(Number(x) + 0.5) * 100}% ${(Number(y) + 0.5) * 100}%, ${lang.glowColor}, transparent 65%)`
            ),
          }}
        />

        <div className="relative z-10" style={{ transform: 'translateZ(25px)' }}>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className={clsx(
              "px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border",
              lang.status === 'READY'
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            )}>
              {lang.status === 'READY' ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {lang.statusBadge}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Clock size={11} className="text-amber-400" />
                  {lang.statusBadge}
                </span>
              )}
            </span>
          </div>

          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-semibold">
            {lang.badge}
          </span>
        </div>

        {/* 3D Floating Logo Stage */}
        <div className="py-6 flex flex-col items-center justify-center relative">
          <div style={{ transform: 'translateZ(50px)' }}>
            {lang.id === 'python' ? <Python3DLogo /> : <Java3DLogo />}
          </div>

          <div style={{ transform: 'translateZ(30px)' }} className="text-center mt-5">
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {lang.name}
            </h3>
            <p className={clsx("text-xs font-semibold mt-1", lang.accentColor)}>
              {lang.tagline}
            </p>
          </div>
        </div>

        {/* Description in simple friendly English */}
        <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mt-2 mb-6">
          {lang.description}
        </p>

        {/* Key Features */}
        <div className="space-y-2 mb-6">
          {lang.features.map((feature, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs text-neutral-300">
              <span className={clsx("mt-0.5 shrink-0", lang.accentColor)}>•</span>
              <span className="leading-snug">{feature}</span>
            </div>
          ))}
        </div>

        {/* Code Preview Stage */}
        <div className="rounded-xl bg-black/90 border border-neutral-800 p-4 font-mono text-xs overflow-hidden relative group/code">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-900 text-[10px] text-neutral-400">
            <span>Sample Solution</span>
            <span className="text-neutral-500 font-sans">
              {lang.status === 'READY' ? 'Interactive Python' : 'Java Preview'}
            </span>
          </div>
          <pre className="text-[11px] leading-relaxed text-neutral-300 overflow-x-auto scrollbar-hide">
            <code>{lang.codeSnippet}</code>
          </pre>
        </div>
      </div>

      {/* Card Footer: Quick Stats */}
      <div className="relative z-10 mt-6 pt-5 border-t border-neutral-850 grid grid-cols-3 gap-3 font-mono text-center">
        <div className="bg-neutral-900/50 rounded-lg p-2">
          <span className="text-[9px] text-neutral-400 uppercase block">Execution</span>
          <span className="text-xs font-bold text-white mt-0.5 block">{lang.stats.speed}</span>
        </div>
        <div className="bg-neutral-900/50 rounded-lg p-2">
          <span className="text-[9px] text-neutral-400 uppercase block">Learning</span>
          <span className="text-xs font-bold text-neutral-200 mt-0.5 block">{lang.stats.learningCurve}</span>
        </div>
        <div className="bg-neutral-900/50 rounded-lg p-2">
          <span className="text-[9px] text-neutral-400 uppercase block">Arena Status</span>
          <span className={clsx("text-xs font-bold mt-0.5 block", lang.accentColor)}>
            {lang.stats.statusText}
          </span>
        </div>
      </div>
    </motion.div>
  </div>
  );
};

// 3D Visualized Python Logo Component
const Python3DLogo = () => {
  return (
    <motion.div
      animate={{
        rotateY: [0, 14, -14, 0],
        rotateX: [0, -6, 6, 0],
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

      {/* 3D Python Emblem SVG */}
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

// 3D Visualized Java Coffee Cup Logo Component
const Java3DLogo = () => {
  return (
    <motion.div
      animate={{
        rotateY: [0, 16, -16, 0],
        rotateX: [0, -6, 6, 0],
        y: [0, -6, 0],
      }}
      transition={{
        duration: 7,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{ transformStyle: 'preserve-3d' }}
      className="relative w-28 h-28 flex items-center justify-center"
    >
      {/* Radiant Amber & Red Aura */}
      <div className="absolute inset-0 bg-[#F89820]/25 rounded-full blur-2xl animate-pulse" />
      <div className="absolute inset-2 bg-[#5382A1]/20 rounded-full blur-xl" />

      {/* 3D Java Coffee Cup & Heat Plumes SVG */}
      <svg
        viewBox="0 0 128 128"
        className="w-24 h-24 drop-shadow-[0_15px_30px_rgba(0,0,0,0.85)] filter transition-transform hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="javaSteam1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EA2D2E" />
            <stop offset="100%" stopColor="#F89820" />
          </linearGradient>
          <linearGradient id="javaSteam2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F89820" />
            <stop offset="100%" stopColor="#FFC837" />
          </linearGradient>
          <linearGradient id="javaCupBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6C9BBF" />
            <stop offset="50%" stopColor="#4178A3" />
            <stop offset="100%" stopColor="#1E4766" />
          </linearGradient>
        </defs>

        {/* Steam Plume 1 (Curving Red/Orange) */}
        <path
          d="M62 14 C68 20, 56 26, 63 35 C66 39, 72 41, 70 47 C68 52, 60 55, 58 60"
          stroke="url(#javaSteam1)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Steam Plume 2 (Left Flame S-Curve) */}
        <path
          d="M50 20 C55 26, 44 32, 51 42 C54 46, 58 49, 56 54"
          stroke="url(#javaSteam2)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* Coffee Cup Body */}
        <path
          d="M36 62 H82 L78 92 C77 99, 71 104, 63 104 H55 C47 104, 41 99, 40 92 Z"
          fill="url(#javaCupBlue)"
          stroke="#87B4D4"
          strokeWidth="1.5"
        />

        {/* Cup Rim Highlight */}
        <ellipse cx="59" cy="62" rx="23" ry="5" fill="#1C4763" stroke="#87B4D4" strokeWidth="1.5" />

        {/* Cup Handle */}
        <path
          d="M79 68 C88 68, 92 76, 90 84 C88 90, 82 92, 76 90"
          stroke="url(#javaCupBlue)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Saucer Base Under Cup */}
        <path
          d="M28 106 C42 114, 76 114, 90 106 C84 113, 34 113, 28 106 Z"
          fill="#3E6B89"
        />
        <path
          d="M34 113 C48 119, 70 119, 84 113"
          stroke="#F89820"
          strokeWidth="2"
          strokeLinecap="round"
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

  const backgroundY = useTransform(scrollYProgress, [0, 1], ['-50px', '50px']);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.4, 1, 1, 0.4]);

  return (
    <section
      ref={containerRef}
      id="languages-dimension"
      className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-black overflow-hidden border-t border-b border-neutral-900"
    >
      {/* Ambient Parallax Grid Background */}
      <motion.div
        style={{ y: backgroundY }}
        className="absolute inset-0 bg-[linear-gradient(to_right,#141414_1px,transparent_1px),linear-gradient(to_bottom,#141414_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"
      />

      {/* Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-gradient-to-r from-blue-600/10 via-amber-500/10 to-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div style={{ opacity: titleOpacity }} className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-300 text-xs font-mono font-semibold uppercase tracking-widest mb-4">
            <Sparkles size={13} className="text-amber-400" />
            <span>SUPPORTED CODING LANGUAGES</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none mb-4">
            YOUR CODE,{' '}
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 bg-clip-text text-transparent">
              EVALUATED IN REAL TIME.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed">
            Write code directly in our built-in browser editor. Python is fully active and ready for duels today, with Java rolling out in our next release.
          </p>
        </motion.div>

        {/* 2-Column Responsive 3D Showcase Grid (Python + Java) */}
        <div className="grid grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto gap-8 sm:gap-10">
          {LANGUAGES.map((lang) => (
            <Interactive3DLogoCard key={lang.id} lang={lang} />
          ))}
        </div>

        {/* Clean Execution Feature Bar */}
        <div className="mt-14 sm:mt-16 max-w-5xl mx-auto p-5 rounded-2xl bg-neutral-950/80 border border-neutral-850 flex flex-col md:flex-row items-center justify-between gap-5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Code2 size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                Lightning Fast Cloud Execution
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Each submission runs safely in milliseconds with automatic test verification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <CheckCircle size={14} />
              <span>Python 3.12 Active</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-400 border-l border-neutral-800 pl-4">
              <Clock size={14} />
              <span>Java 21 Coming Soon</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
