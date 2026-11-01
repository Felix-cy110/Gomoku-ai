export const Stone = { BLACK: 'black', WHITE: 'white' } as const;
export type StoneColor = (typeof Stone)[keyof typeof Stone];

export const Difficulty = { EASY: 'easy', NORMAL: 'normal', HARD: 'hard' } as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];
