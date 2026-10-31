import { playAudioBuffer } from './playAudioBuffer';

const STONE_SOUND = {
  DURATION_SECONDS: 0.14,
  ATTACK_SECONDS: 0.0006,
  FADE_OUT_SECONDS: 0.02,
  VOLUME: 0.32,
  IMPACT_VOLUME: 0.45,
  IMPACT_DECAY_SECONDS: 0.003,
  IMPACT_LOW_CUTOFF_HZ: 900,
  IMPACT_HIGH_CUTOFF_HZ: 6500,
} as const;

// 不按整数倍排列共振频率，并让高频更快衰减，形成短促、偏厚的木板敲击声。
const WOOD_RESONANCES = [
  { frequency: 460, volume: 0.62, decaySeconds: 0.022 },
  { frequency: 780, volume: 0.3, decaySeconds: 0.014 },
  { frequency: 1270, volume: 0.24, decaySeconds: 0.01 },
  { frequency: 2070, volume: 0.17, decaySeconds: 0.007 },
  { frequency: 3460, volume: 0.09, decaySeconds: 0.004 },
] as const;

function createStoneSoundBuffer(context: BaseAudioContext): AudioBuffer {
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * STONE_SOUND.DURATION_SECONDS),
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  const highCutoff =
    1 - Math.exp((-2 * Math.PI * STONE_SOUND.IMPACT_HIGH_CUTOFF_HZ) / context.sampleRate);
  const lowCutoff =
    1 - Math.exp((-2 * Math.PI * STONE_SOUND.IMPACT_LOW_CUTOFF_HZ) / context.sampleRate);
  let filteredNoise = 0;
  let lowNoise = 0;

  for (let index = 0; index < samples.length; index++) {
    const time = index / context.sampleRate;
    const attack = Math.min(1, time / STONE_SOUND.ATTACK_SECONDS);
    const fadeOut = Math.min(
      1,
      (STONE_SOUND.DURATION_SECONDS - time) / STONE_SOUND.FADE_OUT_SECONDS,
    );

    // 限制噪声频带，只保留棋子接触棋盘瞬间的轻脆碰撞，避免持续沙沙声。
    filteredNoise += highCutoff * (Math.random() * 2 - 1 - filteredNoise);
    lowNoise += lowCutoff * (filteredNoise - lowNoise);
    const impact =
      (filteredNoise - lowNoise) *
      STONE_SOUND.IMPACT_VOLUME *
      Math.exp(-time / STONE_SOUND.IMPACT_DECAY_SECONDS);
    let resonance = 0;
    for (const mode of WOOD_RESONANCES) {
      resonance +=
        Math.sin(2 * Math.PI * mode.frequency * time) *
        mode.volume *
        Math.exp(-time / mode.decaySeconds);
    }
    samples[index] = (impact + resonance) * attack * fadeOut * STONE_SOUND.VOLUME;
  }
  samples[samples.length - 1] = 0;
  return buffer;
}

export function playStoneSound(): void {
  playAudioBuffer(createStoneSoundBuffer, '落子音效');
}
