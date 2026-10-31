import { test, expect, type Page } from '@playwright/test';

const BLACK_WIN = ['D8', 'A1', 'E8', 'C1', 'F8', 'E1', 'G8', 'G1', 'H8'];
const WHITE_WIN = ['A1', 'H4', 'C1', 'H5', 'E1', 'H6', 'G1', 'H7', 'I1', 'H8'];

async function observeAudio(page: Page, deferDrawing = false) {
  await page.addInitScript((defer) => {
    const starts: { duration: number; time: number; context: AudioContext }[] = [];
    const closes = new Map<AudioContext, number>();
    const contexts: AudioContext[] = [];
    const animations: number[] = [];
    Reflect.set(window, 'audioProbe', { starts, closes, contexts, animations });
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      private lastSource?: AudioBufferSourceNode;

      constructor(options?: AudioContextOptions) {
        super(options);
        contexts.push(this);
      }

      override get state(): AudioContextState {
        if (defer && super.state !== 'closed') return 'suspended';
        return super.state;
      }

      override createBufferSource() {
        this.lastSource = super.createBufferSource();
        return this.lastSource;
      }

      override resume() {
        if (defer && (this.lastSource?.buffer?.duration ?? 0) > 0.2) {
          return new Promise<void>((resolve) => Reflect.set(window, 'finishAudioResume', resolve));
        }
        return super.resume();
      }

      override close() {
        closes.set(this, performance.now());
        return super.close();
      }
    };
    const originalStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (when = 0, offset = 0, duration?: number) {
      starts.push({
        duration: this.buffer?.duration ?? 0,
        time: performance.now(),
        context: this.context as AudioContext,
      });
      originalStart.call(this, when, offset, duration);
    };
    document.addEventListener('animationstart', (event) => {
      if (event.animationName === 'winning-line-draw') animations.push(performance.now());
    });
  }, deferDrawing);
}

async function drawingSounds(page: Page) {
  return page.evaluate(() => {
    const probe = Reflect.get(window, 'audioProbe');
    return probe.starts
      .filter((sound: { duration: number }) => sound.duration > 0.2)
      .map((sound: { duration: number; time: number; context: AudioContext }) => ({
        duration: sound.duration,
        time: sound.time,
        closedAt: probe.closes.get(sound.context) as number | undefined,
        state: sound.context.state,
      })) as { duration: number; time: number; closedAt?: number; state: AudioContextState }[];
  });
}

async function playUntilWin(page: Page, points = BLACK_WIN) {
  for (const point of points) {
    await page.getByRole('button', { name: new RegExp(`^${point}，`) }).click();
  }
}

test.beforeEach(async ({ page }) => {
  await observeAudio(page);
  await page.goto('/');
  await page.getByRole('button', { name: '开始双人对弈' }).click();
});

for (const [color, points] of [
  ['黑棋', BLACK_WIN],
  ['白棋', WHITE_WIN],
] as const) {
  test(`${color}获胜划线同步播放一次音效，悔棋后再次获胜可重播`, async ({ page }) => {
    await playUntilWin(page, points.slice(0, -1));
    expect(await drawingSounds(page)).toHaveLength(0);
    await playUntilWin(page, points.slice(-1));
    await expect.poll(async () => (await drawingSounds(page)).length).toBe(1);
    const [sound] = await drawingSounds(page);
    const duration = await page
      .locator('.winning-line')
      .evaluate((line) => Number.parseFloat(getComputedStyle(line).animationDuration));
    expect(sound.duration).toBeCloseTo(duration, 3);
    const animationTime = await page.evaluate(
      () => Reflect.get(window, 'audioProbe').animations[0],
    );
    expect(Math.abs(sound.time - animationTime)).toBeLessThan(150);
    await expect.poll(async () => (await drawingSounds(page))[0].state).toBe('closed');
    await page.getByRole('button', { name: '查看规则' }).click();
    await page.getByRole('button', { name: '明白了，继续对弈' }).click();
    expect(await drawingSounds(page)).toHaveLength(1);
    await page.getByRole('button', { name: '悔棋', exact: true }).click();
    await playUntilWin(page, points.slice(-1));
    await expect.poll(async () => (await drawingSounds(page)).length).toBe(2);
    await expect(page.getByRole('heading', { name: `${color}获胜`, exact: true })).toBeVisible();
  });
}

for (const action of ['关闭对局音效', '悔棋', '再来一局', '返回首页']) {
  test(`划线过程中${action}立即停止音效`, async ({ page }) => {
    await playUntilWin(page);
    await expect.poll(async () => (await drawingSounds(page)).length).toBe(1);
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect.poll(async () => (await drawingSounds(page))[0].state).toBe('closed');
    const [sound] = await drawingSounds(page);
    expect(sound.closedAt! - sound.time).toBeLessThan(sound.duration * 1000 - 100);
    if (action === '关闭对局音效') {
      await page.getByRole('button', { name: '开启对局音效' }).click();
      expect(await drawingSounds(page)).toHaveLength(1);
    }
  });
}

test('静音时获胜不播放划线声', async ({ page }) => {
  await page.getByRole('button', { name: '关闭对局音效' }).click();
  await playUntilWin(page);
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, 'audioProbe').animations.length))
    .toBe(1);
  expect(await drawingSounds(page)).toHaveLength(0);
});

test('减少动态效果时直接显示连线，不播放划线声', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await playUntilWin(page);
  await expect(page.locator('.winning-line')).toHaveCSS('animation-name', 'none');
  expect(await drawingSounds(page)).toHaveLength(0);
});

test('声卡仍在恢复时悔棋，恢复完成后不会补播划线声', async ({ page }) => {
  await observeAudio(page, true);
  await page.reload();
  await page.getByRole('button', { name: '开始双人对弈' }).click();
  await playUntilWin(page);
  await expect
    .poll(() => page.evaluate(() => typeof Reflect.get(window, 'finishAudioResume')))
    .toBe('function');
  await page.getByRole('button', { name: '悔棋', exact: true }).click();
  await page.evaluate(async () => {
    Reflect.get(window, 'finishAudioResume')();
    await Promise.resolve();
  });
  expect(await drawingSounds(page)).toHaveLength(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        Reflect.get(window, 'audioProbe').contexts.every(
          (context: AudioContext) => context.state === 'closed',
        ),
      ),
    )
    .toBe(true);
});
