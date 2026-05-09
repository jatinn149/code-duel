import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/utils/logger';

export class JsonStorageAdapter {
  private lock: Promise<void> = Promise.resolve();
  private baseDir: string;

  constructor(baseDir: string = path.join(process.cwd(), 'data')) {
    this.baseDir = baseDir;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      logger.error({ error }, 'Failed to initialize storage directory');
      throw error;
    }
  }

  private getFilePath(collection: string): string {
    return path.join(this.baseDir, `${collection}.json`);
  }

  async read<T>(collection: string): Promise<T[]> {
    const filePath = this.getFilePath(collection);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as T[];
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return [];
      }
      logger.error({ error, collection }, 'Failed to read from JSON storage');
      throw error;
    }
  }

  async write<T>(collection: string, data: T[]): Promise<void> {
    // Atomic write strategy: Write to temp file then rename
    const filePath = this.getFilePath(collection);
    const tempPath = `${filePath}.${Date.now()}.tmp`;

    // Sequence writes using a simple promise lock to prevent race conditions on the same collection
    // Note: In a real production system with high concurrency, we might need a more robust file locking mechanism.
    this.lock = this.lock.then(async () => {
      try {
        const json = JSON.stringify(data, null, 2);
        await fs.writeFile(tempPath, json, 'utf-8');
        await fs.rename(tempPath, filePath);
      } catch (error) {
        logger.error({ error, collection }, 'Failed to write to JSON storage');
        // Attempt to clean up temp file
        try {
          await fs.unlink(tempPath);
        } catch {
          // Ignore unlink error
        }
        throw error;
      }
    });

    return this.lock;
  }
}

export const jsonStorage = new JsonStorageAdapter();
