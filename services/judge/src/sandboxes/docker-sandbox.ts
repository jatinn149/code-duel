import Docker from 'dockerode';
import { logger } from '../utils/logger';

export interface SandboxExecutionOptions {
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface SandboxExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timeout: boolean;
  durationMs: number;
  memoryUsageMb: number;
}

export class DockerSandbox {
  private docker: Docker;
  private container: Docker.Container | null = null;
  public isReady: boolean = false;

  constructor(private language: string) {
    this.docker = new Docker({
      socketPath: process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock',
    });
  }

  async initialize() {
    const image = 'python:3.11-slim';
    if (this.language !== 'python') {
       throw new Error(`Language ${this.language} not yet supported in warm pool.`);
    }

    // Creating a warm container with readonly rootfs and tmpfs mounts for isolation
    const container = await this.docker.createContainer({
      Image: image,
      Cmd: ['tail', '-f', '/dev/null'],
      Tty: false,
      Labels: { 'com.code-duel.judge.warm': 'true' },
      HostConfig: {
        NetworkMode: 'none',
        Memory: 256 * 1024 * 1024, // Hard limit for the whole sandbox
        MemorySwap: 256 * 1024 * 1024,
        CpuQuota: 50000, // 50% CPU limit
        ReadonlyRootfs: true,
        PidsLimit: 32, // Prevent fork bombs
        Tmpfs: {
          '/tmp': 'size=16M,mode=1777',
          '/workspace': 'size=16M,mode=1777',
          '/dev/shm': 'size=16M,mode=1777',
        },
        AutoRemove: false,
      },
    });

    this.container = container;
    await this.container.start();
    this.isReady = true;
    logger.debug({ id: this.container.id }, 'Warm sandbox initialized');
  }

  async checkHealth(): Promise<boolean> {
    if (!this.container) return false;
    try {
      const inspect = await this.container.inspect();
      if (!inspect.State.Running) return false;

      // Try running a simple command via exec to ensure responsiveness
      const exec = await this.container.exec({
        Cmd: ['echo', 'healthy'],
        AttachStdout: true,
      });
      const stream = await exec.start({}) as any;
      
      const output = await new Promise<string>((resolve) => {
        let data = '';
        stream.on('data', (chunk: any) => { data += chunk.toString(); });
        stream.on('end', () => resolve(data.trim()));
        stream.on('error', () => resolve(''));
      });
      
      // Docker logs/exec prefix output with 8 byte headers, so check substring
      return output.includes('healthy');
    } catch (e) {
      return false;
    }
  }

  async cleanWorkspace(): Promise<boolean> {
    if (!this.container) return false;
    try {
      // 1. Kill stray user processes
      const killExec = await this.container.exec({
        Cmd: ['sh', '-c', 'pkill -9 -f python3 || true'],
      });
      const killStream = await killExec.start({}) as any;
      await new Promise((resolve) => killStream.on('end', resolve));

      // 2. Clear out temp and workspace directories
      const cleanExec = await this.container.exec({
        Cmd: ['sh', '-c', 'rm -rf /workspace/* /workspace/.* /tmp/* /tmp/.* /dev/shm/* /dev/shm/.* 2>/dev/null || true'],
      });
      const cleanStream = await cleanExec.start({}) as any;
      await new Promise((resolve) => cleanStream.on('end', resolve));

      // 3. Verify workspace is actually writable and empty
      const verifyExec = await this.container.exec({
        Cmd: ['sh', '-c', 'touch /workspace/.health && rm -f /workspace/.health'],
      });
      const verifyStream = await verifyExec.start({}) as any;
      
      let exitCode = -1;
      await new Promise<void>((resolve) => {
        verifyStream.on('end', async () => {
          try {
            const inspect = await verifyExec.inspect();
            exitCode = inspect.ExitCode ?? -1;
            resolve();
          } catch {
            resolve();
          }
        });
        verifyStream.on('error', () => resolve());
      });

      return exitCode === 0;
    } catch (e) {
      logger.error({ error: e }, 'Failed to clean warm sandbox workspace');
      return false;
    }
  }

  async executeCode(
    code: string,
    input: string,
    options: SandboxExecutionOptions
  ): Promise<SandboxExecutionResult> {
    return this.executeCodeWithStreams(code, input, options);
  }

  async executeCodeWithStreams(
    code: string,
    input: string,
    options: SandboxExecutionOptions
  ): Promise<SandboxExecutionResult> {
    if (!this.container) throw new Error('Sandbox not initialized');

    const startTime = Date.now();
    let timeoutReached = false;

    // 1. Write the code to /workspace/solution.py inside the container via base64 command execution
    const base64Code = Buffer.from(code).toString('base64');
    const writeExec = await this.container.exec({
      Cmd: ['sh', '-c', `echo '${base64Code}' | base64 -d > /workspace/solution.py`],
      AttachStdout: true,
      AttachStderr: true,
    });
    const writeStream = await writeExec.start({}) as any;
    await new Promise<void>((resolve) => {
      writeStream.on('end', resolve);
      writeStream.on('error', () => resolve());
    });

    // 2. Prepare the execution with ulimit constraints (RLIMIT_AS and RLIMIT_CPU)
    const memLimitKb = options.memoryLimitMb * 1024;
    const cpuLimitSec = Math.ceil(options.timeLimitMs / 1000) + 1;

    const exec = await this.container.exec({
      Cmd: ['sh', '-c', `ulimit -v ${memLimitKb} && ulimit -t ${cpuLimitSec} && python3 /workspace/solution.py`],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ stdin: true }) as any;
    
    let stdoutData = Buffer.alloc(0);
    let stderrData = Buffer.alloc(0);
    const MAX_OUTPUT_SIZE = 10 * 1024; // 10KB cap

    this.docker.modem.demuxStream(stream, {
        write: (chunk: Buffer) => {
          if (stdoutData.length < MAX_OUTPUT_SIZE) {
            stdoutData = Buffer.concat([stdoutData, chunk]);
            if (stdoutData.length > MAX_OUTPUT_SIZE) {
               stdoutData = stdoutData.subarray(0, MAX_OUTPUT_SIZE);
            }
          }
          return true;
        }
    } as NodeJS.WritableStream, {
        write: (chunk: Buffer) => {
          if (stderrData.length < MAX_OUTPUT_SIZE) {
            stderrData = Buffer.concat([stderrData, chunk]);
            if (stderrData.length > MAX_OUTPUT_SIZE) {
               stderrData = stderrData.subarray(0, MAX_OUTPUT_SIZE);
            }
          }
          return true;
        }
    } as NodeJS.WritableStream);

    stream.write(input);
    stream.end();

    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => {
        timeoutReached = true;
        reject(new Error('TIMEOUT'));
      }, options.timeLimitMs);
    });

    const waitExecPromise = new Promise<number>((resolve, reject) => {
      stream.on('end', async () => {
         try {
            const inspect = await exec.inspect();
            resolve(inspect.ExitCode ?? 0);
         } catch (e) {
            reject(e);
         }
      });
      stream.on('error', reject);
    });

    let exitCode = 0;
    try {
      exitCode = (await Promise.race([waitExecPromise, timeoutPromise])) as number;
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
         timeoutReached = true;
         // Mark container as tainted and destroy it so a fresh one is created
         await this.cleanup();
         exitCode = 137;
      } else {
         throw error;
      }
    } finally {
      clearTimeout(timeoutId!);
    }

    return {
      stdout: stdoutData.toString('utf-8'),
      stderr: stderrData.toString('utf-8'),
      exitCode,
      timeout: timeoutReached,
      durationMs: Date.now() - startTime,
      memoryUsageMb: 0,
    };
  }

  async cleanup() {
    if (this.container) {
      await this.container.remove({ force: true }).catch(() => {});
      this.container = null;
      this.isReady = false;
    }
  }
}
