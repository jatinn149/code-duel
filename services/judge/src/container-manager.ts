import Docker from 'dockerode';
import { logger } from './utils/logger';

export class ContainerManager {
  private docker: Docker;

  constructor() {
    // Standard Docker socket connection
    this.docker = new Docker({
      socketPath: process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock',
    });
  }

  async runPython(
    code: string,
    input: string,
    options: { timeLimitMs: number; memoryLimitMb: number },
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    timeout: boolean;
    durationMs: number;
  }> {
    const startTime = Date.now();
    let timeoutReached = false;

    // We use a base python image. In production, we'd pre-build a custom one.
    const container = await this.docker.createContainer({
      Image: 'python:3.11-slim',
      Cmd: ['python3', '-c', code],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: true,
      StdinOnce: true,
      Tty: false,
      Labels: { 'com.code-duel.judge': 'true' },
      HostConfig: {
        Memory: options.memoryLimitMb * 1024 * 1024,
        MemorySwap: options.memoryLimitMb * 1024 * 1024, // Disable swap
        CpuQuota: 50000, // 50% CPU limit
        NetworkMode: 'none',
        ReadonlyRootfs: true,
        AutoRemove: false, // Prevent premature deletion before log collection
        PidsLimit: 32, // Prevent fork bombs
        Tmpfs: {
          '/tmp': 'size=16M,mode=1777',
        },
      },
    });

    try {
      const stream = await container.attach({
        stream: true,
        stdin: true,
        stdout: true,
        stderr: true,
        hijack: true,
      });

      await container.start();

      // Write input to stdin
      stream.write(input);
      stream.end();

      // Handle timeout
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<void>((_, reject) => {
        timeoutId = setTimeout(() => {
          timeoutReached = true;
          reject(new Error('TIMEOUT'));
        }, options.timeLimitMs);
      });

      const waitPromise = container.wait();

      let exitCode = 0;
      try {
        const result = (await Promise.race([waitPromise, timeoutPromise])) as {
          StatusCode: number;
        };
        exitCode = result.StatusCode;
      } catch (error: unknown) {
        if (error instanceof Error && error.message === 'TIMEOUT') {
          await container.kill().catch(() => {}); // Force kill if still running
          exitCode = 137; // SIGKILL
        } else {
          throw error;
        }
      } finally {
        clearTimeout(timeoutId!);
      }

      // Capture logs
      const logs = await container.logs({ stdout: true, stderr: true });

      // For now, using a simplified buffer capture for the sandbox
      const output = this.parseDockerLogs(logs);

      return {
        stdout: output.stdout,
        stderr: output.stderr,
        exitCode,
        timeout: timeoutReached,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      logger.error({ error }, 'Container execution failed');
      throw error;
    } finally {
      // Ensure container is gone (AutoRemove should handle it, but safety first)
      await container.remove({ force: true }).catch(() => {});
    }
  }

  private parseDockerLogs(logs: Buffer): { stdout: string; stderr: string } {
    // Docker log format: [8 bytes header][payload]
    // Header[0] = 1 for stdout, 2 for stderr
    const stdoutArr: string[] = [];
    const stderrArr: string[] = [];

    let offset = 0;
    while (offset < logs.length) {
      const type = logs.readUInt8(offset);
      const size = logs.readUInt32BE(offset + 4);
      const payload = logs.subarray(offset + 8, offset + 8 + size).toString('utf-8');

      if (type === 1) stdoutArr.push(payload);
      else if (type === 2) stderrArr.push(payload);

      offset += 8 + size;
    }

    return {
      stdout: stdoutArr.join(''),
      stderr: stderrArr.join(''),
    };
  }

  async pruneOrphans(): Promise<void> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: { label: ['com.code-duel.judge=true'] },
      });
      for (const containerInfo of containers) {
        const container = this.docker.getContainer(containerInfo.Id);
        await container.remove({ force: true }).catch(() => {});
      }
    } catch (error) {
      logger.error({ error }, 'Failed to prune orphan containers');
    }
  }
}
