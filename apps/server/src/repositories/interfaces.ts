import { User } from '@code-duel/types';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(id: string, user: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
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
