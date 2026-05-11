import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';

export class BackupService {
  private dataDir: string;
  private backupDir: string;
  private isProcessing = false;

  constructor(
    dataDir: string = path.join(process.cwd(), 'data'),
    backupDir: string = path.join(process.cwd(), 'backups'),
  ) {
    this.dataDir = dataDir;
    this.backupDir = backupDir;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true });
    // Recovery Cleanup: Prune any stale .tmp directories and enforce retention on startup
    await this.rotateBackups();
  }

  async createSnapshot(): Promise<void> {
    if (this.isProcessing) {
      logger.warn('Backup already in progress, skipping concurrent request');
      return;
    }

    this.isProcessing = true;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotName = `snapshot-${timestamp}`;
    const snapshotDir = path.join(this.backupDir, snapshotName);
    const tempDir = `${snapshotDir}.tmp`;

    try {
      // 1. Create temporary directory
      await fs.mkdir(tempDir, { recursive: true });

      // 2. Copy files to temp directory
      const files = await fs.readdir(this.dataDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      for (const file of jsonFiles) {
        await fs.copyFile(path.join(this.dataDir, file), path.join(tempDir, file));
      }

      // 3. Atomic rename to final snapshot directory
      await fs.rename(tempDir, snapshotDir);

      logger.info(
        { snapshotName, count: jsonFiles.length },
        'Backup snapshot created successfully',
      );

      // 4. Enforce retention policy
      await this.rotateBackups();
    } catch (error) {
      logger.error({ error, snapshotName }, 'Failed to create backup snapshot');
      // Attempt to clean up the failed temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async rotateBackups(maxBackups: number = 10): Promise<void> {
    try {
      const items = await fs.readdir(this.backupDir);

      // Separate valid snapshots and stale/temporary artifacts
      const validSnapshots = items
        .filter((i) => i.startsWith('snapshot-') && !i.endsWith('.tmp'))
        .sort()
        .reverse();

      const staleArtifacts = items.filter((i) => i.startsWith('snapshot-') && i.endsWith('.tmp'));

      let prunedCount = 0;

      // 1. Immediate cleanup of stale/orphaned .tmp directories
      for (const artifact of staleArtifacts) {
        await fs.rm(path.join(this.backupDir, artifact), { recursive: true, force: true });
        prunedCount++;
      }

      // 2. Retention enforcement for valid snapshots
      if (validSnapshots.length > maxBackups) {
        const toDelete = validSnapshots.slice(maxBackups);
        for (const snapshot of toDelete) {
          await fs.rm(path.join(this.backupDir, snapshot), { recursive: true, force: true });
          prunedCount++;
        }
      }

      if (prunedCount > 0) {
        logger.info(
          { prunedCount, remaining: Math.min(validSnapshots.length, maxBackups) },
          'Backup retention policy enforced: stale snapshots pruned',
        );
      }
    } catch (error) {
      logger.error({ error }, 'Failed to enforce backup retention policy');
    }
  }
}

export const backupService = new BackupService();
