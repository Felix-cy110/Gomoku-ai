import type { Difficulty } from './game-types.js';

export const EngineState = {
  STARTING: 'starting',
  READY: 'ready',
  ERROR: 'error',
  STOPPING: 'stopping',
  STOPPED: 'stopped',
} as const;
export type EngineState = (typeof EngineState)[keyof typeof EngineState];

export const AnalysisSource = { MODEL: 'model', TERMINAL: 'terminal' } as const;
export const AnalysisError = {
  INVALID_POSITION: 'invalid_position',
  UNAVAILABLE: 'unavailable',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const;
export type AnalysisError = (typeof AnalysisError)[keyof typeof AnalysisError];

export interface EngineStatus {
  state: EngineState;
  message: string;
}

export interface AnalysisRequest {
  id: string;
  moveHistory: readonly number[];
}

export interface MoveRequest extends AnalysisRequest {
  difficulty: Difficulty;
}

export interface Probabilities {
  blackWin: number;
  whiteWin: number;
  draw: number;
}

export interface PositionAnalysis extends Probabilities {
  source: (typeof AnalysisSource)[keyof typeof AnalysisSource];
  elapsedMs: number;
}

export type EngineFailure = { id: string; ok: false; code: AnalysisError; message: string };
export type AnalysisReply = { id: string; ok: true; analysis: PositionAnalysis } | EngineFailure;
export type MoveReply = { id: string; ok: true; move: number } | EngineFailure;

export interface AnalysisBridge {
  getStatus(): Promise<EngineStatus>;
  analyze(request: AnalysisRequest): Promise<AnalysisReply>;
  bestMove(request: MoveRequest): Promise<MoveReply>;
  cancel(id: string): Promise<void>;
  restart(): Promise<EngineStatus>;
}
