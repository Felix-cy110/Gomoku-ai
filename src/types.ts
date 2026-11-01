import type { StoneColor } from '../shared/game-types';
import type { AnalysisBridge } from '../shared/analysis';
export type { StoneColor } from '../shared/game-types';

export type GameMode = 'single' | 'local';
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface GamePreferences {
  mode: GameMode;
  difficulty: Difficulty;
  color: StoneColor;
}

export const DEFAULT_PREFERENCES: GamePreferences = {
  mode: 'single',
  difficulty: 'normal',
  color: 'black',
};

export const DIFFICULTIES = [
  { value: 'easy', label: '初出茅庐', description: '轻松入门，慢慢找到手感' },
  { value: 'normal', label: '棋逢对手', description: '认真思考，享受来回较量' },
  { value: 'hard', label: '高手过招', description: '步步为营，挑战你的棋力' },
] as const;

declare global {
  interface Window {
    desktop?: {
      getHealth: () => Promise<{ status: string; service: string; version: string }>;
      analysis: AnalysisBridge;
    };
  }
}
