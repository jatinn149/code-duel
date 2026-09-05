import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { Session, User } from '@code-duel/types';
import { ISessionRepository } from '@/repositories/interfaces';

export class SessionService {
  constructor(private sessionRepository: ISessionRepository) {}

  async createSession(
    user: User,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ sessionId: string; refreshToken: string }> {
    const sessionId = uuidv4();
    const refreshToken = `${sessionId}.${uuidv4()}`; // Opaque token with ID component
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.sessionRepository.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      userAgent,
      ipAddress,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    });

    return { sessionId, refreshToken };
  }

  async validateAndRotateToken(
    userId: string,
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ sessionId: string; refreshToken: string }> {
    const [sessionId] = refreshToken.split('.');
    const session = await this.sessionRepository.findById(sessionId);

    if (!session || session.userId !== userId || new Date(session.expiresAt) < new Date()) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    if (session.revokedAt) {
      const revokedTime = new Date(session.revokedAt).getTime();
      const now = Date.now();
      // Allow a 15-second grace window for in-flight concurrent requests during token rotation
      if (now - revokedTime <= 15 * 1000) {
        return this.createSession({ id: userId } as User, userAgent, ipAddress);
      }

      // Genuine token reuse detected outside grace window! Revoke all sessions for this user.
      await this.revokeAllUserSessions(session.userId);
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const isValid = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!isValid) {
      await this.revokeSession(session.id);
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // Revoke old session and create new one (rotation)
    await this.revokeSession(session.id);
    return this.createSession({ id: userId } as User, userAgent, ipAddress);
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepository.update(sessionId, { revokedAt: new Date().toISOString() });
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepository.deleteByUserId(userId);
  }

  async findSessionById(sessionId: string): Promise<Session | null> {
    return this.sessionRepository.findById(sessionId);
  }
}
