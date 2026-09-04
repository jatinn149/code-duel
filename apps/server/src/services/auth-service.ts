import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { User, UserRole, PresenceStatus, AuthResponse } from '@code-duel/types';
import { SignupInput, LoginInput } from '@code-duel/validation';
import { calculateStartingCp, calculateCpRank } from '@code-duel/shared';
import { IUserRepository } from '@/repositories/interfaces';
import { SessionService } from './session-service';
import { env } from '@/config/env';
import { UnauthorizedError, ConflictError } from '@/errors';

function generatePlayerId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = (len: number) => {
    let result = '';
    for (let i = 0; i < len; i++) {
      result += chars.charAt(crypto.randomInt(chars.length));
    }
    return result;
  };
  return `CD-${rand(4)}-${rand(4)}`;
}

export class AuthService {
  constructor(
    private userRepository: IUserRepository,
    private sessionService: SessionService,
  ) {}

  async signup(input: SignupInput): Promise<AuthResponse & { refreshToken: string }> {
    const existingEmail = await this.userRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new ConflictError('Email already in use');
    }

    const existingUsername = await this.userRepository.findByUsername(input.username);
    if (existingUsername) {
      throw new ConflictError('Username already in use');
    }

    let playerId = generatePlayerId();
    let collisionCheck = await this.userRepository.findByPlayerId(playerId);
    while (collisionCheck) {
      playerId = generatePlayerId();
      collisionCheck = await this.userRepository.findByPlayerId(playerId);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const now = new Date().toISOString();
    const startingRating = calculateStartingCp((input as any).skillRating);

    const user: User = {
      id: uuidv4(),
      username: input.username,
      email: input.email,
      playerId,
      passwordHash,
      role: UserRole.USER,
      tokenVersion: 0,
      matchesPlayed: 0,
      matchesWon: 0,
      rating: startingRating,
      xp: 0,
      level: 1,
      rank: calculateCpRank(startingRating) as any,
      wins: 0,
      losses: 0,
      streak: 0,
      highestStreak: 0,
      highestRating: startingRating,
      dailyChallengeWins: 0,
      dailyChallengeBestRank: 0,
      placementMatchesPlayed: 0,
      seasonalTier: 'UNRANKED',
      
      // Phase 3: Retention
      dailyWins: 0,
      streakGraceAvailable: 1,
      
      status: PresenceStatus.OFFLINE,
      createdAt: now,
      updatedAt: now,
    };

    await this.userRepository.create(user);

    const { accessToken, refreshToken } = await this.generateTokens(user);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  async login(
    input: LoginInput,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponse & { refreshToken: string }> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateTokens(user, userAgent, ipAddress);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  async refresh(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponse & { refreshToken: string }> {
    try {
      const [sessionId] = refreshToken.split('.');
      const session = await this.sessionService.findSessionById(sessionId);

      if (!session) {
        throw new UnauthorizedError('Invalid session');
      }

      const user = await this.userRepository.findById(session.userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      const { accessToken, refreshToken: newRefreshToken } = await this.sessionService
        .validateAndRotateToken(user.id, refreshToken, userAgent, ipAddress)
        .then(async ({ refreshToken: rotatedToken }) => {
          const accessToken = this.generateAccessToken(user);
          return { accessToken, refreshToken: rotatedToken };
        });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _passwordHash, ...safeUser } = user;
      return { user: safeUser, accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_REFRESH_TOKEN') {
        throw new UnauthorizedError('Invalid refresh token');
      }
      throw error;
    }
  }

  async logout(refreshToken: string): Promise<void> {
    const [sessionId] = refreshToken.split('.');
    await this.sessionService.revokeSession(sessionId);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.revokeAllUserSessions(userId);
    const user = await this.userRepository.findById(userId);
    if (user) {
      await this.userRepository.update(userId, { tokenVersion: user.tokenVersion + 1 });
    }
  }

  private async generateTokens(user: User, userAgent?: string, ipAddress?: string) {
    const accessToken = this.generateAccessToken(user);
    const { refreshToken } = await this.sessionService.createSession(user, userAgent, ipAddress);
    return { accessToken, refreshToken };
  }

  private generateAccessToken(user: User): string {
    return jwt.sign(
      {
        sub: user.id,
        role: user.role,
        version: user.tokenVersion,
      },
      env.JWT_SECRET,
      { expiresIn: '15m' },
    );
  }
}
