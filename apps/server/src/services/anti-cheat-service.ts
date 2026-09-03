import { MatchTelemetry } from '@code-duel/types';
import { logger } from '@/utils/logger';

export class AntiCheatService {
  private suspicionThreshold = 100;
  private suspiciousUsers: Map<string, number> = new Map();

  async processTelemetry(
    telemetry: MatchTelemetry,
  ): Promise<{ score: number; isSuspicious: boolean }> {
    const { userId, events } = telemetry;
    let suspicionScore = this.suspiciousUsers.get(userId) || 0;

    // Analyze events
    const pasteEvents = events.filter((e) => e.type === 'paste');
    const keystrokeEvents = events.filter((e) => e.type === 'keystroke');
    const tabSwitchEvents = events.filter((e) => e.type === 'tab_switch');

    // Rule 1: Large Paste detection
    for (const paste of pasteEvents) {
      const pasteSize = paste.data?.length || 0;
      if (pasteSize > 500) {
        suspicionScore += 50;
        logger.warn({ userId, pasteSize }, 'Large paste detected');
      }
    }

    // Rule 2: Impossible typing speed
    // Calculate CPS (Characters per second) in bursts
    if (keystrokeEvents.length > 20) {
      const duration = Math.max(
        0.1,
        (new Date(keystrokeEvents[keystrokeEvents.length - 1].timestamp).getTime() -
          new Date(keystrokeEvents[0].timestamp).getTime()) /
        1000
      );
      const cps = keystrokeEvents.length / duration;
      if (cps > 15) {
        // More than 15 chars per second consistently
        suspicionScore += 30;
        logger.warn({ userId, cps }, 'Impossible typing speed detected');
      }
    }

    // Rule 3: Excessive tab switching
    if (tabSwitchEvents.length > 10) {
      suspicionScore += 20;
      logger.warn({ userId, count: tabSwitchEvents.length }, 'Excessive tab switching detected');
    }

    // Rule 4: Instant submission (Low keystroke vs Code length)
    // This would be checked at submission time in the controller

    this.suspiciousUsers.set(userId, suspicionScore);

    return {
      score: suspicionScore,
      isSuspicious: suspicionScore >= this.suspicionThreshold,
    };
  }

  validateSubmission(userId: string, code: string, keystrokes: number, initialCode?: string): boolean {
    const codeLength = code.length;

    // Rule A: Submitting unchanged initial starter code or boilerplate is always valid
    if (initialCode && (code === initialCode || code.trim() === initialCode.trim())) {
      return true;
    }

    // Rule B: Compute net code length added beyond starter code
    const netLength = initialCode ? Math.max(0, codeLength - initialCode.length) : codeLength;

    // Rule C: Flag anomaly if code is long (>200) AND keystrokes are low (<10% of net length)
    if (netLength > 200 && keystrokes < netLength * 0.1) {
      logger.warn({ userId, codeLength, keystrokes, netLength }, 'Submission anomaly: Low keystroke ratio');
      return false;
    }
    return true;
  }

  clearSuspicion(userId: string): void {
    this.suspiciousUsers.delete(userId);
  }

  resetMatch(userIds: string[]): void {
    userIds.forEach((uid) => this.suspiciousUsers.delete(uid));
  }
}

export const antiCheatService = new AntiCheatService();
