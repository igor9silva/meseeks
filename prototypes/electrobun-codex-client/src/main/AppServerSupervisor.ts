import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

export type AppServerSupervisorConfig = {
  command: string;
  args: string[];
  cwd: string;
  restartBackoffMs: number;
  maxRestartAttempts: number;
};

const defaultConfig: AppServerSupervisorConfig = {
  command: 'codex',
  args: ['app-server', '--transport', 'stdio'],
  cwd: process.cwd(),
  restartBackoffMs: 1200,
  maxRestartAttempts: 4,
};

export class AppServerSupervisor {
  private process: ChildProcessWithoutNullStreams | null = null;
  private isShuttingDown = false;
  private restartCount = 0;
  private readonly config: AppServerSupervisorConfig;
  private lastSpawnError: Error | null = null;
  private readonly listeners = {
    restarting: new Set<() => void>(),
    started: new Set<() => void>(),
    stopped: new Set<() => void>(),
    failed: new Set<(error: Error) => void>(),
  };

  constructor(config: Partial<AppServerSupervisorConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  onRestarting(listener: () => void): void {
    this.listeners.restarting.add(listener);
  }

  onStarted(listener: () => void): void {
    this.listeners.started.add(listener);
  }

  onStopped(listener: () => void): void {
    this.listeners.stopped.add(listener);
  }

  onFailed(listener: (error: Error) => void): void {
    this.listeners.failed.add(listener);
  }

  get stdioProcess(): ChildProcessWithoutNullStreams {
    if (!this.process) throw new Error('app server process is not running');
    return this.process;
  }

  async start(): Promise<void> {
    if (this.process) return;

    this.spawnProcess();
    await this.waitForHealthy();
    this.emitStarted();
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    if (!this.process) {
      this.emitStopped();
      return;
    }

    this.process.kill('SIGTERM');
    await delay(250);

    if (!this.process.killed) this.process.kill('SIGKILL');

    this.process = null;
    this.emitStopped();
  }

  private emitRestarting(): void {
    for (const listener of this.listeners.restarting) listener();
  }

  private emitStarted(): void {
    for (const listener of this.listeners.started) listener();
  }

  private emitStopped(): void {
    for (const listener of this.listeners.stopped) listener();
  }

  private emitFailed(error: Error): void {
    for (const listener of this.listeners.failed) listener(error);
  }

  private spawnProcess(): void {
    this.lastSpawnError = null;
    this.process = spawn(this.config.command, this.config.args, {
      cwd: this.config.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    this.process.once('exit', () => {
      const shouldRestart = !this.isShuttingDown;
      this.process = null;

      if (!shouldRestart) return;
      void this.restart();
    });

    this.process.once('error', (error) => {
      this.lastSpawnError = error;
      this.emitFailed(error);
    });
  }

  private async restart(): Promise<void> {
    if (this.restartCount >= this.config.maxRestartAttempts) {
      this.emitFailed(new Error('app server exceeded restart budget'));
      return;
    }

    this.restartCount += 1;
    this.emitRestarting();
    await delay(this.config.restartBackoffMs * this.restartCount);

    this.spawnProcess();

    try {
      await this.waitForHealthy();
      this.emitStarted();
    } catch (error) {
      const restartError = error instanceof Error ? error : new Error(String(error));
      this.emitFailed(restartError);
    }
  }

  private async waitForHealthy(): Promise<void> {
    if (!this.process) throw new Error('cannot health-check app server without running process');

    await delay(150);

    if (this.lastSpawnError) throw this.lastSpawnError;

    if (!this.process) throw new Error('app server process ended before health check');

    if (this.process.exitCode !== null) {
      throw new Error(`app server exited early with code ${this.process.exitCode}`);
    }
  }
}
