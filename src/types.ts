export type GameMode = 'single' | 'local';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type StoneColor = 'black' | 'white';

export interface GamePreferences {
  mode: GameMode;
  difficulty: Difficulty;
  color: StoneColor;
  playerOne: string;
  playerTwo: string;
}

export const DEFAULT_PREFERENCES: GamePreferences = {
  mode: 'single',
  difficulty: 'normal',
  color: 'black',
  playerOne: '棋手一',
  playerTwo: '棋手二',
};

export const DIFFICULTIES = [
  { value: 'easy', label: '初出茅庐', description: '轻松入门，慢慢找到手感' },
  { value: 'normal', label: '棋逢对手', description: '认真思考，享受来回较量' },
  { value: 'hard', label: '高手过招', description: '步步为营，挑战你的棋力' },
] as const;

declare global {
  interface Window {
    desktop?: {
      request: (method: 'GET' | 'PUT', path: string, body?: GamePreferences) => Promise<unknown>;
    };
  }
}
