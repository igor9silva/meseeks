import { ChildProcessWithoutNullStreams, spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

export type AppServerSupervisorConfig = {
  command: string;
  args: string[];
  cwd: string;
  restartBackoffMs: number;
  maxRestartAttempts: number;
};

export type CodexRuntimeMode = 'app-server' | 'proto';

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
  private lastExitCode: number | null = null;
  private lastExitSignal: NodeJS.Signals | null = null;
  private recentStderr = '';
  private mode: CodexRuntimeMode = 'app-server';
  private readonly listeners = {
    restarting: new Set<() => void>(),
    started: new Set<() => void>(),
    stopped: new Set<() => void>(),
    failed: new Set<(error: Error) => void>(),
  };

  constructor(config: Partial<AppServerSupervisorConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    if (this.config.args[0] === 'proto') this.mode = 'proto';
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

  get runtimeMode(): CodexRuntimeMode {
    return this.mode;
  }

  async start(): Promise<void> {
    if (this.process) return;

    this.resolveRuntimeMode();
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
    this.lastExitCode = null;
    this.lastExitSignal = null;
    this.recentStderr = '';
    this.process = spawn(this.config.command, this.config.args, {
      cwd: this.config.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    this.process.stderr.on('data', (chunk: Buffer) => {
      this.captureStderr(chunk);
    });

    this.process.once('exit', (code, signal) => {
      this.lastExitCode = code;
      this.lastExitSignal = signal;
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

    if (!this.process) throw this.createEarlyExitError();

    if (this.process.exitCode !== null) {
      throw this.createEarlyExitError();
    }
  }

  private captureStderr(chunk: Buffer): void {
    const merged = this.recentStderr.concat(chunk.toString('utf8'));
    this.recentStderr = merged.slice(-4000);
  }

  private createEarlyExitError(): Error {
    const exitDescription = this.lastExitSignal
      ? `signal ${this.lastExitSignal}`
      : this.lastExitCode === null
        ? 'an unknown exit'
        : `code ${this.lastExitCode}`;

    const stderr = this.recentStderr.trim();
    const message = stderr
      ? `app server exited before health check (${exitDescription}): ${stderr}`
      : `app server exited before health check (${exitDescription})`;
    return new Error(message);
  }

  private resolveRuntimeMode(): void {
    const shouldCheckCommand = this.config.command === 'codex' && this.config.args[0] === 'app-server';
    if (!shouldCheckCommand) {
      this.mode = this.config.args[0] === 'proto' ? 'proto' : 'app-server';
      return;
    }

    const helpProbe = spawnSync(this.config.command, ['--help'], {
      cwd: this.config.cwd,
      env: process.env,
      encoding: 'utf8',
    });

    if (helpProbe.error) {
      throw new Error(`failed to probe codex app-server support: ${helpProbe.error.message}`);
    }

    const helpOutput = [helpProbe.stdout, helpProbe.stderr].join('\n').toLowerCase();
    if (helpOutput.includes('app-server')) {
      this.mode = 'app-server';
      return;
    }

    const versionProbe = spawnSync(this.config.command, ['--version'], {
      cwd: this.config.cwd,
      env: process.env,
      encoding: 'utf8',
    });
    const version = versionProbe.error
      ? 'unknown version'
      : [versionProbe.stdout, versionProbe.stderr].join('\n').trim() || 'unknown version';
    console.warn(
      `codex CLI does not expose "app-server". Falling back to "codex proto". Detected ${version}.`,
    );
    this.config.args = ['proto', '-c', 'model_reasoning_effort="high"'];
    this.mode = 'proto';
  }
}
