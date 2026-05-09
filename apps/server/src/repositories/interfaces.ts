import { User, Session } from '@code-duel/types';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(id: string, user: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}

export interface ISessionRepository {
  findById(id: string): Promise<Session | null>;
  findByUserId(userId: string): Promise<Session[]>;
  create(session: Session): Promise<Session>;
  update(id: string, session: Partial<Session>): Promise<Session>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

export interface IRoomRepository {
  findById(id: string): Promise<Record<string, unknown> | null>;
  findAll(): Promise<Record<string, unknown>[]>;
  create(room: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(id: string, room: Partial<Record<string, unknown>>): Promise<Record<string, unknown>>;
  delete(id: string): Promise<void>;
}

export interface IProblemRepository {
  findById(id: string): Promise<Record<string, unknown> | null>;
  findAll(): Promise<Record<string, unknown>[]>;
  create(problem: Record<string, unknown>): Promise<Record<string, unknown>>;
}
