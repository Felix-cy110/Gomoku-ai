import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { performance } from 'node:perf_hooks';
import {
  AnalysisError,
  AnalysisSource,
  EngineState,
  type AnalysisReply,
  type AnalysisRequest,
  type EngineStatus,
} from '../../shared/analysis.js';
import { parseProbabilities, positionCommands, validatePosition } from './protocol.js';
import { terminalAnalysis } from '../../src/game/analysis.js';

export interface EngineOptions {
  command: string;
  args: string[];
  cwd: string;
  startupTimeoutMs: number;
  analysisTimeoutMs: number;
  shutdownTimeoutMs: number;
}

interface PendingAnalysis {
  request: AnalysisRequest;
  resolve: (reply: AnalysisReply) => void;
  cancelled: boolean;
}

interface Exchange {
  lines: string[];
  bytes: number;
  resolve: (lines: string[]) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const cancelled = (id: string): AnalysisReply => ({
  id,
  ok: false,
  code: AnalysisError.CANCELLED,
  message: '该局面的分析已取消。',
});

export class RapfiEngine {
  private child?: ChildProcessWithoutNullStreams;
  private status: EngineStatus = { state: EngineState.STOPPED, message: '分析引擎未启动。' };
  private exchange?: Exchange;
  private active?: PendingAnalysis;
  private queued?: PendingAnalysis;
  private starting?: Promise<EngineStatus>;
  private stopping?: Promise<void>;
  private exited?: Promise<void>;
  private stderr = '';
  private wantedRunning = false;

  constructor(private readonly options: EngineOptions) {}

  getStatus(): EngineStatus {
    return { ...this.status };
  }

  start(): Promise<EngineStatus> {
    this.wantedRunning = true;
    if (this.starting) return this.starting;
    if (this.status.state === EngineState.READY) return Promise.resolve(this.getStatus());
    this.starting = this.initialize().finally(() => {
      this.starting = undefined;
    });
    return this.starting;
  }

  private async initialize(): Promise<EngineStatus> {
    await (this.stopping ?? this.shutdown());
    if (!this.wantedRunning) return this.getStatus();
    this.status = { state: EngineState.STARTING, message: '正在初始化本地分析引擎…' };
    this.stderr = '';
    try {
      const child = spawn(this.options.command, this.options.args, {
        cwd: this.options.cwd,
        shell: false,
        windowsHide: true,
        stdio: 'pipe',
      });
      this.child = child;
      const reader = createInterface({ input: child.stdout, crlfDelay: Infinity });
      reader.on('line', (line) => this.onLine(line));
      child.stderr.on('data', (chunk: Buffer) => {
        this.stderr = (this.stderr + chunk.toString()).slice(-4000);
      });
      this.exited = new Promise((resolve) => {
        child.once('close', () => {
          reader.close();
          if (
            this.child === child &&
            this.status.state !== EngineState.STOPPING &&
            this.status.state !== EngineState.STOPPED
          )
            this.fail(new Error('本地引擎已退出，请重试。'));
          resolve();
        });
      });
      child.on('error', (error) => this.fail(error));
      child.stdin.on('error', (error) => this.fail(error));
      const initialization =
        'START 15\nINFO RULE 0\nINFO THREAD_NUM 1\nINFO HASH_SIZE 1024\nINFO PONDERING 0\nINFO USEDATABASE 0\n';
      const lines = await this.send(
        initialization + positionCommands([]),
        this.options.startupTimeoutMs,
      );
      if (!lines.includes('OK')) throw new Error('引擎棋盘初始化失败。');
      parseProbabilities(lines);
      if (this.status.state === EngineState.STARTING)
        this.status = { state: EngineState.READY, message: '本地分析引擎已就绪。' };
    } catch (error) {
      if (this.status.state !== EngineState.STOPPING && this.status.state !== EngineState.STOPPED)
        this.fail(error instanceof Error ? error : new Error(String(error)));
    }
    return this.getStatus();
  }

  analyze(input: unknown): Promise<AnalysisReply> {
    let validated: ReturnType<typeof validatePosition>;
    try {
      validated = validatePosition(input);
    } catch (error) {
      return Promise.resolve({
        id: '',
        ok: false,
        code: AnalysisError.INVALID_POSITION,
        message: (error as Error).message,
      });
    }
    const { request, game } = validated;
    // 只保留当前与最新待分析局面，快速落子不会堆积任务。
    if (this.queued) {
      this.queued.resolve(cancelled(this.queued.request.id));
      this.queued = undefined;
    }
    if (this.active) this.active.cancelled = true;
    const terminal = terminalAnalysis(game);
    if (terminal) return Promise.resolve({ id: request.id, ok: true, analysis: terminal });
    if (this.status.state !== EngineState.READY)
      return Promise.resolve({
        id: request.id,
        ok: false,
        code: AnalysisError.UNAVAILABLE,
        message: this.status.message,
      });
    return new Promise((resolve) => {
      this.queued = { request, resolve, cancelled: false };
      void this.drain();
    });
  }

  cancel(id: string): void {
    if (this.active?.request.id === id) this.active.cancelled = true;
    if (this.queued?.request.id === id) {
      this.queued.resolve(cancelled(id));
      this.queued = undefined;
    }
  }

  cancelAll(): void {
    if (this.active) this.active.cancelled = true;
    if (this.queued) {
      this.queued.resolve(cancelled(this.queued.request.id));
      this.queued = undefined;
    }
  }

  private async drain(): Promise<void> {
    if (this.active || !this.queued) return;
    const pending = this.queued;
    this.queued = undefined;
    this.active = pending;
    const started = performance.now();
    try {
      const lines = await this.send(
        positionCommands(pending.request.moveHistory),
        this.options.analysisTimeoutMs,
      );
      const probabilities = parseProbabilities(lines);
      pending.resolve(
        pending.cancelled
          ? cancelled(pending.request.id)
          : {
              id: pending.request.id,
              ok: true,
              analysis: {
                ...probabilities,
                source: AnalysisSource.MODEL,
                elapsedMs: Math.round(performance.now() - started),
              },
            },
      );
    } catch (error) {
      if (this.status.state !== EngineState.STOPPING && this.status.state !== EngineState.STOPPED)
        this.fail(error instanceof Error ? error : new Error(String(error)));
      pending.resolve(
        pending.cancelled
          ? cancelled(pending.request.id)
          : {
              id: pending.request.id,
              ok: false,
              code: AnalysisError.FAILED,
              message: this.status.message,
            },
      );
    } finally {
      this.active = undefined;
      if (this.status.state === EngineState.READY) void this.drain();
    }
  }

  private send(commands: string, timeoutMs: number): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (this.exchange || !this.child || this.child.exitCode !== null || this.child.killed) {
        reject(new Error('引擎当前不可用。'));
        return;
      }
      const timer = setTimeout(() => this.fail(new Error('本地引擎响应超时，请重试。')), timeoutMs);
      this.exchange = { resolve, reject, timer, lines: [], bytes: 0 };
      this.child.stdin.write(commands);
    });
  }

  private onLine(line: string): void {
    if (line.startsWith('ERROR')) {
      this.fail(new Error('Rapfi 配置或局面处理失败：' + line.slice(0, 250)));
      return;
    }
    const exchange = this.exchange;
    if (!exchange) return;
    exchange.bytes += line.length;
    if (exchange.bytes > 64 * 1024) {
      this.fail(new Error('引擎输出超出预期。'));
      return;
    }
    // ABOUT 是串行协议的结束屏障，读完当前响应后才可发送下一局面。
    if (line.startsWith('name="Rapfi"')) {
      clearTimeout(exchange.timer);
      this.exchange = undefined;
      exchange.resolve(exchange.lines);
    } else exchange.lines.push(line);
  }

  private fail(error: Error): void {
    if (this.status.state === EngineState.STOPPING || this.status.state === EngineState.STOPPED)
      return;
    if (this.status.state !== EngineState.ERROR) {
      console.error('Rapfi:', error.message, this.stderr);
      this.status = {
        state: EngineState.ERROR,
        message: '本地分析引擎不可用，请重试；若仍失败，请检查引擎资源。',
      };
    }
    this.rejectExchange(error);
    if (this.queued) {
      this.queued.resolve({
        id: this.queued.request.id,
        ok: false,
        code: AnalysisError.FAILED,
        message: this.status.message,
      });
      this.queued = undefined;
    }
    this.child?.kill();
  }

  private rejectExchange(error: Error): void {
    if (!this.exchange) return;
    clearTimeout(this.exchange.timer);
    this.exchange.reject(error);
    this.exchange = undefined;
  }

  stop(): Promise<void> {
    this.wantedRunning = false;
    if (this.stopping) return this.stopping;
    this.stopping = this.shutdown().finally(() => {
      this.stopping = undefined;
    });
    return this.stopping;
  }

  private async shutdown(): Promise<void> {
    this.status = { state: EngineState.STOPPING, message: '正在关闭本地分析引擎。' };
    this.cancelAll();
    this.rejectExchange(new Error('引擎正在退出。'));
    const child = this.child;
    if (child && child.exitCode === null && !child.killed) {
      child.stdin.end('END\n');
      const timer = setTimeout(() => child.kill(), this.options.shutdownTimeoutMs);
      await this.exited;
      clearTimeout(timer);
    } else if (this.exited) await this.exited;
    this.child = undefined;
    this.status = { state: EngineState.STOPPED, message: '本地分析引擎已关闭。' };
  }
}
