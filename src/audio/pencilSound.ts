import { playAudioBuffer } from './playAudioBuffer';

const PENCIL_SOUND = {
  VOLUME: 0.32,
  LOW_CUTOFF_HZ: 700,
  HIGH_CUTOFF_HZ: 6500,
  ATTACK_SECONDS: 0.015,
  RELEASE_SECONDS: 0.06,
  GRAIN_SECONDS: 0.007,
  GRAIN_SMOOTHING_SECONDS: 0.001,
  MIN_PRESSURE: 0.45,
} as const;

function createPencilSoundBuffer(context: BaseAudioContext, durationSeconds: number): AudioBuffer {
  const buffer = context.createBuffer(
    1,
    Math.max(2, Math.ceil(context.sampleRate * durationSeconds)),
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  const highCutoff =
    1 - Math.exp((-2 * Math.PI * PENCIL_SOUND.HIGH_CUTOFF_HZ) / context.sampleRate);
  const lowCutoff = 1 - Math.exp((-2 * Math.PI * PENCIL_SOUND.LOW_CUTOFF_HZ) / context.sampleRate);
  const grainFrames = Math.max(1, Math.round(context.sampleRate * PENCIL_SOUND.GRAIN_SECONDS));
  const smoothing = 1 - Math.exp(-1 / (context.sampleRate * PENCIL_SOUND.GRAIN_SMOOTHING_SECONDS));
  let filteredNoise = 0;
  let lowNoise = 0;
  let pressure: number = PENCIL_SOUND.MIN_PRESSURE;
  let targetPressure = pressure;

  for (let index = 0; index < samples.length; index++) {
    const time = index / context.sampleRate;
    const progress = index / (samples.length - 1);
    // 不规则的小颗粒模拟笔尖擦过纸纹，平滑力度变化，避免变成尖锐的噼啪声。
    if (index % grainFrames === 0) {
      targetPressure = PENCIL_SOUND.MIN_PRESSURE + Math.random() * (1 - PENCIL_SOUND.MIN_PRESSURE);
    }
    pressure += smoothing * (targetPressure - pressure);
    filteredNoise += highCutoff * (Math.random() * 2 - 1 - filteredNoise);
    lowNoise += lowCutoff * (filteredNoise - lowNoise);
    const envelope =
      Math.min(1, time / PENCIL_SOUND.ATTACK_SECONDS) *
      Math.min(1, (durationSeconds - time) / PENCIL_SOUND.RELEASE_SECONDS) *
      Math.sin(Math.PI * progress);
    samples[index] = (filteredNoise - lowNoise) * pressure * envelope * PENCIL_SOUND.VOLUME;
  }
  samples[0] = 0;
  samples[samples.length - 1] = 0;
  return buffer;
}

export function playPencilSound(durationSeconds: number): () => void {
  return playAudioBuffer(
    (context) => createPencilSoundBuffer(context, durationSeconds),
    '划线音效',
  );
}
