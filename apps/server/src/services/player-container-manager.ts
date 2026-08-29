import Docker from 'dockerode';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export interface RunCodeResult {
  success: boolean;
  error?: string;
  remainingRuns?: number;
  stdout?: string;
  stderr?: string;
  executionTimeMs?: number;
  exitCode?: number;
}

export class PlayerContainerManager {
  private docker: Docker;
  // Map of playerId -> Docker.Container
  private containers = new Map<string, Docker.Container>();
  // Map of matchId -> Set of playerIds
  private matchPlayerMap = new Map<string, Set<string>>();
  // Map of playerId -> remaining runs
  private remainingRuns = new Map<string, number>();
  // Track active execution per player to prevent concurrent execution conflicts
  private activeExecutions = new Set<string>();

  // Configurable options via environment variables
  private maxRunsPerMatch = parseInt(process.env.MAX_RUNS_PER_MATCH || '15', 10);
  private startupTimeoutMs = parseInt(process.env.PLAYER_CONTAINER_STARTUP_TIMEOUT || '10000', 10);

  constructor() {
    this.docker = new Docker({
      socketPath: process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock',
    });
    // Run startup pruning of orphan containers in fire-and-forget fashion
    this.pruneOrphanContainers().catch((err) => {
      logger.error({ err }, 'Failed to prune orphan player containers in constructor');
    });
  }

  /**
   * Startup safety cleanup of any orphan execution containers from previous server runs/crashes.
   */
  async pruneOrphanContainers(): Promise<void> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: { label: ['com.code-duel.player-execution=true'] },
      });
      if (containers.length > 0) {
        logger.info({ count: containers.length }, 'Pruning orphan player execution containers at startup');
        for (const containerInfo of containers) {
          const container = this.docker.getContainer(containerInfo.Id);
          await container.remove({ force: true }).catch(() => {});
        }
      }
    } catch (err) {
      logger.error({ err }, 'Failed to prune orphan player containers at startup');
    }
  }

  /**
   * Initializes a persistent container for a player.
   */
  async createContainerForPlayer(matchId: string, playerId: string): Promise<void> {
    if (this.containers.has(playerId)) {
      logger.warn({ playerId, matchId }, 'Container already exists for player. Destroying old one first.');
      await this.destroyContainerForPlayer(playerId);
    }

    logger.info({ playerId, matchId }, 'Starting persistent execution container for player');

    try {
      const container = await this.docker.createContainer({
        Image: 'python:3.11-slim',
        Cmd: ['tail', '-f', '/dev/null'],
        Tty: false,
        Labels: {
          'com.code-duel.player-execution': 'true',
          'matchId': matchId,
          'playerId': playerId,
        },
        HostConfig: {
          Memory: 128 * 1024 * 1024, // 128MB limit
          MemorySwap: 128 * 1024 * 1024, // Disable swap
          CpuQuota: 50000, // 50% CPU limit
          NetworkMode: 'none', // Strict sandbox isolation (no network)
          ReadonlyRootfs: true,
          AutoRemove: false,
          PidsLimit: 32, // Fork bomb protection
          Tmpfs: {
            '/tmp': 'size=16M,mode=1777', // Temporary writable workspace
          },
        },
      });

      // Implement startup timeout guarantee
      const startPromise = container.start();
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('STARTUP_TIMEOUT')), this.startupTimeoutMs);
      });

      await Promise.race([startPromise, timeoutPromise]);

      this.containers.set(playerId, container);
      this.remainingRuns.set(playerId, this.maxRunsPerMatch);

      // Track player in the match list
      if (!this.matchPlayerMap.has(matchId)) {
        this.matchPlayerMap.set(matchId, new Set());
      }
      this.matchPlayerMap.get(matchId)!.add(playerId);

      logger.info({ playerId, matchId, containerId: container.id }, 'Persistent player container started successfully');
    } catch (err) {
      logger.error({ err, playerId, matchId }, 'Failed to start persistent container for player');
      // Clean up mapping if partial creation
      this.containers.delete(playerId);
      this.remainingRuns.delete(playerId);
      throw err;
    }
  }

  /**
   * Helper to demux docker multiplexed streams (stdout type=1, stderr type=2).
   */
  private demuxStream(stream: NodeJS.ReadableStream): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      let buffer = Buffer.alloc(0);
      const stdoutArr: Buffer[] = [];
      const stderrArr: Buffer[] = [];

      stream.on('data', (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);
        let offset = 0;
        while (offset + 8 <= buffer.length) {
          const type = buffer.readUInt8(offset);
          const size = buffer.readUInt32BE(offset + 4);
          if (offset + 8 + size > buffer.length) {
            break;
          }
          const payload = buffer.subarray(offset + 8, offset + 8 + size);
          if (type === 1) {
            stdoutArr.push(payload);
          } else if (type === 2) {
            stderrArr.push(payload);
          }
          offset += 8 + size;
        }
        if (offset > 0) {
          buffer = buffer.subarray(offset);
        }
      });

      stream.on('end', () => {
        resolve({
          stdout: Buffer.concat(stdoutArr).toString('utf-8'),
          stderr: Buffer.concat(stderrArr).toString('utf-8'),
        });
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Runs the code inside the player's persistent container.
   */
  async runCodeForPlayer(playerId: string, code: string, input: string, isFree?: boolean): Promise<RunCodeResult> {
    if (env.USE_EVALUATOR_SERVICE) {
      const runsLeft = this.remainingRuns.get(playerId) ?? 0;
      if (!isFree && runsLeft <= 0) {
        return { success: false, error: `Execution limit reached (${this.maxRunsPerMatch} runs max per match).`, remainingRuns: 0 };
      }

      const nextRuns = isFree ? runsLeft : runsLeft - 1;
      if (!isFree) {
        this.remainingRuns.set(playerId, nextRuns);
      }

      try {
        const response = await fetch(`${env.CODE_EVALUATOR_URL}/api/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            language: 'python',
            testCases: [{ input, expectedOutput: '' }],
            timeoutMs: 5000,
          }),
        });

        if (!response.ok) {
          throw new Error(`Evaluator HTTP ${response.status}`);
        }

        const data: any = await response.json();
        if (!data.success || !data.results || data.results.length === 0) {
          throw new Error('Evaluator returned unsuccessful status');
        }

        const res = data.results[0];
        const isTimeout = res.status === 'TIMEOUT';

        return {
          success: true,
          remainingRuns: nextRuns,
          stdout: res.actualOutput,
          stderr: isTimeout ? 'Time Limit Exceeded (5000ms)' : res.stderr,
          executionTimeMs: res.timeMs,
          exitCode: isTimeout ? 137 : res.exitCode,
        };
      } catch (err: any) {
        logger.error({ err, playerId }, 'Error calling code evaluator service for dry run');
        return {
          success: false,
          error: 'Execution failed due to sandbox environment error.',
          remainingRuns: nextRuns,
        };
      }
    }

    let container = this.containers.get(playerId);
    
    // 1. Container Health Verification & Automatic Recovery
    let isHealthy = false;
    if (container) {
      try {
        const inspect = await container.inspect();
        isHealthy = inspect.State.Running;
      } catch {
        isHealthy = false;
      }
    }

    if (!isHealthy) {
      logger.warn({ playerId }, 'Player execution container is missing or not running. Recreating...');
      let matchId: string | undefined;
      for (const [mId, pIds] of this.matchPlayerMap.entries()) {
        if (pIds.has(playerId)) {
          matchId = mId;
          break;
        }
      }
      if (matchId) {
        try {
          await this.createContainerForPlayer(matchId, playerId);
          container = this.containers.get(playerId);
        } catch (err) {
          logger.error({ err, playerId }, 'Failed to recreate execution container for player');
          return { success: false, error: 'Execution environment crashed and failed to auto-recover.' };
        }
      }
    }

    if (!container) {
      return { success: false, error: 'Execution environment not found. Please wait or rejoin.' };
    }

    // 2. Concurrency Control (Avoid overlapping executions in the same container workspace)
    if (this.activeExecutions.has(playerId)) {
      return { success: false, error: 'An execution is already in progress. Please wait.' };
    }
    this.activeExecutions.add(playerId);

    const runsLeft = this.remainingRuns.get(playerId) ?? 0;
    if (!isFree && runsLeft <= 0) {
      this.activeExecutions.delete(playerId);
      return { success: false, error: `Execution limit reached (${this.maxRunsPerMatch} runs max per match).`, remainingRuns: 0 };
    }

    // Decrement counter unless it is a free execution
    const nextRuns = isFree ? runsLeft : runsLeft - 1;
    if (!isFree) {
      this.remainingRuns.set(playerId, nextRuns);
    }

    const startTime = Date.now();
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // 1. Clean workspace and write fresh source code
      const writeExec = await container.exec({
        Cmd: ['sh', '-c', 'rm -rf /tmp/* && cat > /tmp/solution.py'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });

      const writeStream = await writeExec.start({ hijack: true, stdin: true });
      writeStream.write(code);
      writeStream.end();

      await new Promise<void>((resolve, reject) => {
        writeStream.on('end', () => resolve());
        writeStream.on('error', reject);
      });

      // 2. Write the input to a file in the workspace
      const inputExec = await container.exec({
        Cmd: ['sh', '-c', 'cat > /tmp/input.txt'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });

      const inputStream = await inputExec.start({ hijack: true, stdin: true });
      inputStream.write(input || '');
      inputStream.end();

      await new Promise<void>((resolve, reject) => {
        inputStream.on('end', () => resolve());
        inputStream.on('error', reject);
      });

      // 3. Execute code in the clean workspace with input redirection from file using GNU timeout (5 seconds limit)
      const runExec = await container.exec({
        Cmd: ['sh', '-c', 'timeout 5 python3 /tmp/solution.py < /tmp/input.txt'],
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });

      const runStream = await runExec.start({ hijack: true });

      // Safety fallback timeout at 7 seconds in case GNU timeout fails or Docker stream hangs
      const safetyTimeoutMs = 7000;
      const timeoutPromise = new Promise<{ stdout: string; stderr: string }>((_, reject) => {
        timeoutId = setTimeout(async () => {
          logger.warn({ playerId }, 'Safety timeout triggered. Forcing termination of python3 processes inside container.');
          try {
            const killExec = await container!.exec({
              Cmd: ['pkill', '-f', 'python3'],
            });
            const killStream = await killExec.start({ hijack: true });
            await new Promise<void>((res) => killStream.on('end', res));
          } catch (e) {
            logger.error({ e, playerId }, 'Failed to pkill python3 inside container');
          }
          reject(new Error('TIMEOUT'));
        }, safetyTimeoutMs);
      });

      const runPromise = this.demuxStream(runStream);

      let stdout = '';
      let stderr = '';
      let exitCode = 0;

      try {
        const result = await Promise.race([runPromise, timeoutPromise]);
        stdout = result.stdout;
        stderr = result.stderr;

        const inspectResult = await runExec.inspect();
        exitCode = inspectResult.ExitCode ?? 0;

        // If GNU timeout exited with code 124, it indicates execution exceeded 5 seconds limit
        if (exitCode === 124) {
          exitCode = 137;
          stderr = 'Time Limit Exceeded (5000ms)';
        }
      } catch (error: any) {
        if (error.message === 'TIMEOUT') {
          exitCode = 137;
          stderr = 'Time Limit Exceeded (5000ms)';
        } else {
          throw error;
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }

      const durationMs = Date.now() - startTime;

      return {
        success: true,
        remainingRuns: nextRuns,
        stdout,
        stderr,
        executionTimeMs: durationMs,
        exitCode,
      };
    } catch (err: any) {
      logger.error({ err, playerId }, 'Error running code inside persistent container');
      return {
        success: false,
        error: 'Execution failed due to sandbox environment error.',
        remainingRuns: nextRuns,
      };
    } finally {
      // Always unlock execution
      this.activeExecutions.delete(playerId);
    }
  }

  /**
   * Destroys a player's persistent container.
   */
  async destroyContainerForPlayer(playerId: string): Promise<void> {
    const container = this.containers.get(playerId);
    if (!container) return;

    try {
      logger.info({ playerId, containerId: container.id }, 'Destroying persistent container for player');
      await container.remove({ force: true }).catch(() => {});
    } catch (err) {
      logger.error({ err, playerId }, 'Error removing player container');
    } finally {
      this.containers.delete(playerId);
      this.remainingRuns.delete(playerId);
      this.activeExecutions.delete(playerId);
    }
  }

  /**
   * Destroys all persistent containers assigned to a match.
   */
  async destroyContainersForMatch(matchId: string): Promise<void> {
    const playerIds = this.matchPlayerMap.get(matchId);
    if (!playerIds) return;

    logger.info({ matchId }, 'Cleaning up persistent containers for completed/cancelled match');

    for (const pid of playerIds) {
      await this.destroyContainerForPlayer(pid);
    }

    this.matchPlayerMap.delete(matchId);
  }

  /**
   * Shutdown/cleanup of all persistent containers.
   */
  async destroyAllContainers(): Promise<void> {
    logger.info('Shutting down all active player persistent containers...');
    for (const pid of Array.from(this.containers.keys())) {
      await this.destroyContainerForPlayer(pid);
    }
    this.matchPlayerMap.clear();
  }
}

export const playerContainerManager = new PlayerContainerManager();
