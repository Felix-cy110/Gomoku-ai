import { test, expect, type Page } from '@playwright/test';
import type { AnalysisRequest, AnalysisReply, MoveRequest, MoveReply } from '../shared/analysis';
import zhCN from '../src/i18n/locales/zh-CN.json' with { type: 'json' };
import en from '../src/i18n/locales/en.json' with { type: 'json' };

declare global {
  interface Window {
    localeTest: {
      requests: AnalysisRequest[];
      searches: MoveRequest[];
      cancelled: string[];
      analyze: (reply: AnalysisReply) => void;
      move: (reply: MoveReply) => void;
    };
  }
}

async function english(page: Page) {
  await page.getByRole('combobox', { name: '界面语言' }).selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
}

async function installEngine(page: Page) {
  await page.addInitScript(() => {
    window.localeTest = {
      requests: [],
      searches: [],
      cancelled: [],
      analyze: () => {},
      move: () => {},
    };
    window.desktop = {
      getHealth: async () => ({ status: 'ok', service: 'test', version: 'test' }),
      analysis: {
        getStatus: async () => ({ state: 'ready', message: '已就绪' }),
        restart: async () => ({ state: 'ready', message: '已就绪' }),
        cancel: async (id) => {
          window.localeTest.cancelled.push(id);
        },
        analyze: (request) =>
          new Promise((resolve) => {
            window.localeTest.requests.push(request);
            window.localeTest.analyze = resolve;
          }),
        bestMove: (request) =>
          new Promise((resolve) => {
            window.localeTest.searches.push(request);
            window.localeTest.move = resolve;
          }),
      },
    };
  });
}

async function respond(page: Page) {
  await page.evaluate(() =>
    window.localeTest.analyze({
      ok: true,
      id: window.localeTest.requests.at(-1)!.id,
      analysis: { blackWin: 0.6, whiteWin: 0.3, draw: 0.1, source: 'model', elapsedMs: 10 },
    }),
  );
}

test('两种语言的资源键与插值参数完整一致', () => {
  function flatten(value: object, prefix = ''): Record<string, string> {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, child]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        return typeof child === 'string' ? [[path, child]] : Object.entries(flatten(child, path));
      }),
    );
  }
  const chinese = flatten(zhCN);
  const english = flatten(en);
  expect(Object.keys(english).sort()).toEqual(Object.keys(chinese).sort());
  for (const [key, value] of Object.entries(chinese)) {
    expect(english[key].trim(), key).not.toBe('');
    expect(english[key].match(/\{\{[^}]+\}\}/g)?.sort() ?? [], key).toEqual(
      value.match(/\{\{[^}]+\}\}/g)?.sort() ?? [],
    );
  }
});

test('切换语言同步元数据、弹窗和音效提示，刷新恢复中文且不访问存储', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem', 'clear', 'key']) {
      Object.defineProperty(Storage.prototype, method, {
        value: () => {
          throw new Error('不得访问存储');
        },
      });
    }
  });
  await page.goto('/');
  await page.getByRole('button', { name: '关闭对局音效' }).click();
  await english(page);
  await expect(page).toHaveTitle('Yijian · Gomoku');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    en.meta.description,
  );
  await expect(
    page.getByRole('heading', { name: /A little board.*Endless delight/ }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Game sounds muted');
  await page.getByRole('button', { name: 'Learn the rules' }).click();
  await expect(page.getByRole('dialog')).toContainText('Black goes first');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Game history' }).click();
  await expect(page.getByRole('dialog')).toContainText('No games recorded yet');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Preferences', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Game sounds' })).not.toBeChecked();
  await page.reload();
  await expect(page).toHaveTitle('弈间 · 五子棋');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('button', { name: '关闭对局音效' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('对局中切换语言保留棋子、胜率历史、待完成请求与悔棋能力', async ({ page }) => {
  await installEngine(page);
  await page.goto('/');
  await page.getByRole('button', { name: '开始双人对弈' }).click();
  await expect.poll(() => page.evaluate(() => window.localeTest.requests.length)).toBe(1);
  await respond(page);
  await expect(page.getByTestId('probability-black')).toHaveText('60.0%');
  await page.getByRole('button', { name: 'H8，空位', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.localeTest.requests.length)).toBe(2);
  const cancelled = await page.evaluate(() => window.localeTest.cancelled);
  await english(page);
  await expect(page.getByRole('button', { name: 'H8, Black', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'White to move' })).toBeVisible();
  await expect(page.getByText('Analyzing this position…')).toBeVisible();
  await respond(page);
  await expect(page.getByTestId('chart-point-black')).toHaveCount(2);
  await expect(page.getByTestId('probability-black')).toHaveText('60.0%');
  expect(await page.evaluate(() => window.localeTest.requests.length)).toBe(2);
  expect(await page.evaluate(() => window.localeTest.cancelled)).toEqual(cancelled);
  await page.getByRole('slider', { name: 'Inspect win probability by move' }).focus();
  await page.keyboard.press('Home');
  await expect(page.getByTestId('analysis-move')).toHaveText('Move 0 · Opening');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.game-stone')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Language' }).selectOption('zh-CN');
  await expect(page.getByRole('heading', { name: '轮到黑棋落子' })).toBeVisible();
});

test('模型搜索中切换语言不会重启搜索，错误提示由错误码翻译', async ({ page }) => {
  await installEngine(page);
  await page.goto('/');
  await page.getByRole('button', { name: '选择单人模式' }).click();
  await page.getByRole('button', { name: '开始人机对弈' }).click();
  await page.getByRole('button', { name: 'H8，空位', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.localeTest.requests.at(-1)?.moveHistory))
    .toEqual([112]);
  await respond(page);
  await expect.poll(() => page.evaluate(() => window.localeTest.searches.length)).toBe(1);
  const cancelled = await page.evaluate(() => window.localeTest.cancelled);
  await english(page);
  await expect(page.getByText('Rapfi is thinking…')).toBeVisible();
  await page.evaluate(() =>
    window.localeTest.move({
      ok: false,
      id: window.localeTest.searches[0].id,
      code: 'failed',
      message: '模型搜索失败，请重试。',
    }),
  );
  await expect(page.getByText('AI move search failed. Please retry.')).toBeVisible();
  expect(await page.evaluate(() => window.localeTest.searches.length)).toBe(1);
  expect(await page.evaluate(() => window.localeTest.cancelled)).toEqual(cancelled);
  await page.getByRole('button', { name: 'Retry analysis' }).click();
  await expect(page.getByText('AI move search failed. Please retry.')).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.localeTest.requests.length))
    .toBeGreaterThan(1);
  // retry 新请求到达后再回应。
  await expect
    .poll(() =>
      page.evaluate(
        () => window.localeTest.requests.at(-1)!.id !== window.localeTest.searches[0].id,
      ),
    )
    .toBe(true);
  await respond(page);
  await expect.poll(() => page.evaluate(() => window.localeTest.searches.length)).toBe(2);
  await page.evaluate(() =>
    window.localeTest.move({ ok: true, id: window.localeTest.searches[1].id, move: 113 }),
  );
  await expect(page.getByRole('button', { name: 'I8, White', exact: true })).toBeVisible();
  await expect(page.locator('.game-stone')).toHaveCount(2);
});

test('英文窄屏支持配置、规则、终局连线和悔棋，布局无横向溢出', async ({ page }) => {
  await page.goto('/');
  await english(page);
  for (const width of [1440, 900, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByRole('combobox', { name: 'Language' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: 'Choose solo play' }).click();
  await page.getByRole('radio', { name: 'Hard', exact: true }).check();
  await page.getByRole('radio', { name: 'White · Play second' }).check();
  await page.getByRole('button', { name: 'Start AI game' }).click();
  await expect(page.getByText('Play AI · Hard · White · Second')).toBeVisible();
  await expect(page.getByText('Play Rapfi in the desktop app')).toBeVisible();
  await page.getByRole('button', { name: 'Back to home' }).click();
  await page.getByRole('button', { name: 'Start two-player game' }).click();
  for (const point of ['D8', 'A1', 'E8', 'C1', 'F8', 'E1', 'G8', 'G1', 'H8']) {
    await page.getByRole('button', { name: `${point}, Empty`, exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Black wins' })).toBeVisible();
  await expect(page.locator('.winning-line')).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'H8, Black, Winning line', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Final probabilities follow the game result')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'View rules' }).click();
  await expect(page.getByRole('dialog')).toContainText('Five in a row');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.winning-line')).toHaveCount(0);
  await expect(page.getByTestId('move-count')).toHaveText('8 moves');
});
