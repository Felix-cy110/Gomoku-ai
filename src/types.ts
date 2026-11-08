import { Difficulty, Stone, type StoneColor } from '../shared/game-types';
import type { AnalysisBridge } from '../shared/analysis';
export type { StoneColor, Difficulty } from '../shared/game-types';

export const GameMode = { SINGLE: 'single', LOCAL: 'local' } as const;
export type GameMode = (typeof GameMode)[keyof typeof GameMode];

export const Panel = { RULES: 'rules', HISTORY: 'history', SETTINGS: 'settings' } as const;
export type Panel = (typeof Panel)[keyof typeof Panel];

export interface GamePreferences {
  mode: GameMode;
  difficulty: Difficulty;
  color: StoneColor;
}

export const DEFAULT_PREFERENCES: GamePreferences = {
  mode: GameMode.SINGLE,
  difficulty: Difficulty.NORMAL,
  color: Stone.BLACK,
};

export const DIFFICULTIES = [Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD] as const;

declare global {
  interface Window {
    desktop?: {
      getHealth: () => Promise<{ status: string; service: string; version: string }>;
      analysis: AnalysisBridge;
    };
  }
}
