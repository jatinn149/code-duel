import { User } from '@code-duel/types';
import { IUserRepository } from './interfaces';
import { JsonStorageAdapter } from '@/storage/json-adapter';

export class JsonUserRepository implements IUserRepository {
  private collection = 'users';

  constructor(private storage: JsonStorageAdapter) {}

  async findById(id: string): Promise<User | null> {
    const users = await this.storage.read<User>(this.collection);
    return users.find((u) => u.id === id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const users = await this.storage.read<User>(this.collection);
    return users.find((u) => u.email === email) || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const users = await this.storage.read<User>(this.collection);
    return users.find((u) => u.username === username) || null;
  }

  async create(user: User): Promise<User> {
    const users = await this.storage.read<User>(this.collection);
    users.push(user);
    await this.storage.write(this.collection, users);
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const users = await this.storage.read<User>(this.collection);
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new Error(`User with id ${id} not found`);
    }
    users[index] = { ...users[index], ...data };
    await this.storage.write(this.collection, users);
    return users[index];
  }

  async delete(id: string): Promise<void> {
    let users = await this.storage.read<User>(this.collection);
    users = users.filter((u) => u.id !== id);
    await this.storage.write(this.collection, users);
  }
}
