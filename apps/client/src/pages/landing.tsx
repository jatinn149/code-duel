import React, { useEffect } from 'react';
import { LandingNavHeader } from '@/components/landing/nav-header';
import { HeroSection } from '@/components/landing/hero-section';
import { ThreeDLanguagesShowcase } from '@/components/landing/three-d-languages-showcase';
import { BentoFeatures } from '@/components/landing/bento-features';
import { RankProgressionShowcase } from '@/components/landing/rank-progression-showcase';
import { TerminalSimulation } from '@/components/landing/terminal-simulation';
import { CtaFooter } from '@/components/landing/cta-footer';

export const LandingPage: React.FC = () => {
  useEffect(() => {
    // Set document title for professional esports SaaS feel
    document.title = 'Code Duel — Real-Time Competitive Programming Esports Platform';
  }, []);

  return (
    <div className="min-h-screen bg-black text-neutral-200 selection:bg-indigo-600 selection:text-white flex flex-col font-sans overflow-x-hidden">
      {/* 1. Global Fixed Glassmorphism Header Navigation */}
      <LandingNavHeader />

      {/* 2. Main High-Impact Hero with Live 3D Combat HUD */}
      <main className="flex-1">
        <HeroSection />

        {/* 3. The 3D Languages Dimension (Scroll-driven 3D Python, JS/TS, C++ Showcase) */}
        <ThreeDLanguagesShowcase />

        {/* 4. Competitive Arena Modes (Bento Grid) */}
        <BentoFeatures />

        {/* 5. 9-Tier Division Ladder Roadmap */}
        <RankProgressionShowcase />

        {/* 6. Live Interactive Terminal Simulation */}
        <TerminalSimulation />
      </main>

      {/* 7. Call To Action & Telemetry Esports Footer */}
      <CtaFooter />
    </div>
  );
};
