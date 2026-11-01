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

export interface Probabilities {
  blackWin: number;
  whiteWin: number;
  draw: number;
}

export interface PositionAnalysis extends Probabilities {
  source: (typeof AnalysisSource)[keyof typeof AnalysisSource];
  elapsedMs: number;
}

export type AnalysisReply =
  | { id: string; ok: true; analysis: PositionAnalysis }
  | { id: string; ok: false; code: AnalysisError; message: string };

export interface AnalysisBridge {
  getStatus(): Promise<EngineStatus>;
  analyze(request: AnalysisRequest): Promise<AnalysisReply>;
  cancel(id: string): Promise<void>;
  restart(): Promise<EngineStatus>;
}
