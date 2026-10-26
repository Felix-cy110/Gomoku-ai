import { DEFAULT_PREFERENCES, type GamePreferences } from './types';

async function request(method: 'GET' | 'PUT', body?: GamePreferences): Promise<GamePreferences> {
  if (window.desktop) {
    return (await window.desktop.request(method, '/api/preferences', body)) as GamePreferences;
  }
  const response = await fetch('/api/preferences', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('设置暂时无法保存，请稍后重试。');
  return (await response.json()) as GamePreferences;
}

export async function loadPreferences(): Promise<GamePreferences> {
  const saved = await request('GET');
  return { ...DEFAULT_PREFERENCES, ...saved };
}

export function savePreferences(preferences: GamePreferences) {
  return request('PUT', preferences);
}
