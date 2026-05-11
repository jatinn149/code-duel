import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';

export class BackupService {
  private dataDir: string;
  private backupDir: string;

  constructor(
    dataDir: string = path.join(process.cwd(), 'data'),
    backupDir: string = path.join(process.cwd(), 'backups'),
  ) {
    this.dataDir = dataDir;
    this.backupDir = backupDir;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true });
  }

  async createSnapshot(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const snapshotDir = path.join(this.backupDir, `snapshot-${timestamp}`);
      await fs.mkdir(snapshotDir, { recursive: true });

      const files = await fs.readdir(this.dataDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      for (const file of jsonFiles) {
        await fs.copyFile(path.join(this.dataDir, file), path.join(snapshotDir, file));
      }

      logger.info({ snapshotDir, count: jsonFiles.length }, 'Backup snapshot created');
      await this.rotateBackups();
    } catch (error) {
      logger.error({ error }, 'Failed to create backup snapshot');
    }
  }

  private async rotateBackups(maxBackups: number = 10): Promise<void> {
    try {
      const dirs = await fs.readdir(this.backupDir);
      const snapshots = dirs
        .filter((d) => d.startsWith('snapshot-'))
        .sort()
        .reverse();

      if (snapshots.length > maxBackups) {
        const toDelete = snapshots.slice(maxBackups);
        for (const dir of toDelete) {
          await fs.rm(path.join(this.backupDir, dir), { recursive: true, force: true });
          logger.info({ dir }, 'Old backup snapshot rotated');
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to rotate backups');
    }
  }
}

export const backupService = new BackupService();
