export const Stone = { BLACK: 'black', WHITE: 'white' } as const;
export type StoneColor = (typeof Stone)[keyof typeof Stone];
