import { test, expect, type Page } from '@playwright/test';
import type { AnalysisReply, AnalysisRequest } from '../shared/analysis';

declare global {
  interface Window {
    analysisTest: {
      requests: AnalysisRequest[];
      cancelled: string[];
      respond(index: number, blackWin: number, draw?: number): void;
      fail(index: number): void;
    };
  }
}

async function installAnalysisBridge(page: Page) {
  await page.addInitScript(() => {
    const requests: AnalysisRequest[] = [];
    const resolvers: ((reply: AnalysisReply) => void)[] = [];
    const cancelled: string[] = [];
    window.analysisTest = {
      requests,
      cancelled,
      respond(index, blackWin, draw = 0) {
        resolvers[index]({
          id: requests[index].id,
          ok: true,
          analysis: {
            source: 'model',
            elapsedMs: 10,
            blackWin,
            whiteWin: 1 - blackWin - draw,
            draw,
          },
        });
      },
      fail(index) {
        resolvers[index]({
          id: requests[index].id,
          ok: false,
          code: 'failed',
          message: '本次分析失败',
        });
      },
    };
    window.desktop = {
      getHealth: async () => ({ status: 'ok', service: 'test', version: 'test' }),
      analysis: {
        getStatus: async () => ({ state: 'ready', message: '已就绪' }),
        restart: async () => ({ state: 'ready', message: '已就绪' }),
        cancel: async (id) => {
          cancelled.push(id);
        },
        analyze: (request) =>
          new Promise((resolve) => {
            requests.push(request);
            resolvers.push(resolve);
          }),
      },
    };
  });
}

async function expectRequests(page: Page, count: number) {
  await expect.poll(() => page.evaluate(() => window.analysisTest.requests.length)).toBe(count);
}

async function expectPointMoves(page: Page, moves: number[]) {
  for (const color of ['black', 'white', 'draw']) {
    await expect
      .poll(() =>
        page
          .getByTestId(`chart-point-${color}`)
          .evaluateAll((points) => points.map((point) => Number(point.getAttribute('data-move')))),
      )
      .toEqual(moves);
  }
}

test('曲线保留真实历史与缺口，过滤过期结果并随悔棋、改下和重开更新', async ({ page }) => {
  await installAnalysisBridge(page);
  await page.goto('/');
  await page.getByRole('button', { name: '开始双人对弈' }).click();
  const black = page.getByTestId('probability-black');
  await expect.poll(() => page.evaluate(() => window.analysisTest.requests.length)).toBe(1);
  await page.evaluate(() => window.analysisTest.respond(0, 0.5));
  await expect(black).toHaveText('50.0%');
  await expectPointMoves(page, [0]);
  await expect(page.locator('.turn-card, .analysis-bar')).toHaveCount(0);
  await page.getByRole('button', { name: /^H8，/ }).click();
  await expect.poll(() => page.evaluate(() => window.analysisTest.requests.length)).toBe(2);
  await expect(black).toHaveCount(0);
  await page.getByRole('button', { name: /^I8，/ }).click();
  await expect.poll(() => page.evaluate(() => window.analysisTest.requests.length)).toBe(3);
  await page.evaluate(() => window.analysisTest.respond(2, 0.2));
  await expect(black).toHaveText('20.0%');
  await expectPointMoves(page, [0, 2]);
  await expect(page.getByTestId('chart-line-black')).not.toHaveAttribute('d', /L/);
  const chart = page.getByRole('slider', { name: '查看各手胜率' });
  await chart.focus();
  await chart.press('ArrowLeft');
  await expect(page.getByText('这一手尚无分析结果')).toBeVisible();
  await expect(black).toHaveCount(0);
  await chart.press('Home');
  await expect(black).toHaveText('50.0%');
  await chart.press('End');
  await page.evaluate(async () => {
    window.analysisTest.respond(1, 0.9);
    await new Promise(requestAnimationFrame);
  });
  await expect(black).toHaveText('20.0%');
  await expectPointMoves(page, [0, 2]);
  await page.getByRole('button', { name: '悔棋', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.analysisTest.requests.length)).toBe(4);
  expect(await page.evaluate(() => window.analysisTest.requests[3].moveHistory)).toEqual([112]);
  await page.evaluate(() => window.analysisTest.respond(3, 0.9));
  await expect(black).toHaveText('90.0%');
  await expectPointMoves(page, [0, 1]);
  await expect(page.getByTestId('chart-line-black')).toHaveAttribute('d', /L/);
  await page.getByRole('button', { name: /^J8，/ }).click();
  await expectRequests(page, 5);
  await expectPointMoves(page, [0, 1]);
  await page.evaluate(() => window.analysisTest.respond(4, 0.4));
  await expect(black).toHaveText('40.0%');
  await expectPointMoves(page, [0, 1, 2]);
  await page.getByRole('button', { name: /^K8，/ }).click();
  await expectRequests(page, 6);
  await page.getByRole('button', { name: '重新开始' }).click();
  await expectRequests(page, 7);
  await expectPointMoves(page, []);
  expect(await page.evaluate(() => window.analysisTest.requests[6].moveHistory)).toEqual([]);
  await page.evaluate(() => window.analysisTest.respond(5, 0.99));
  await expectPointMoves(page, []);
  await page.evaluate(() => window.analysisTest.respond(6, 0.5));
  await expect(black).toHaveText('50.0%');
  await expectPointMoves(page, [0]);
  await page.getByRole('button', { name: '重新开始' }).click();
  await expectRequests(page, 8);
  await expectPointMoves(page, []);
  await page.evaluate(() => window.analysisTest.respond(7, 0.6));
  await expect(black).toHaveText('60.0%');
  await expectPointMoves(page, [0]);
});

test('连续分析形成三条曲线，支持历史查看、坐标扩展及窄屏布局', async ({ page }) => {
  await installAnalysisBridge(page);
  await page.goto('/');
  await page.getByRole('button', { name: '开始双人对弈' }).click();
  await expectRequests(page, 1);
  await page.evaluate(() => window.analysisTest.respond(0, 0.6, 0.2));
  const moves = ['H8', 'I8', 'H9', 'I9', 'J8', 'J9', 'G8', 'F8', 'G9', 'F9', 'H7', 'I7'];
  for (const [index, point] of moves.entries()) {
    await page.getByRole('button', { name: new RegExp('^' + point + '，') }).click();
    await expectRequests(page, index + 2);
    await page.evaluate(
      (index) => window.analysisTest.respond(index + 1, index % 2 === 0 ? 0.7 : 0.4, 0.1),
      index,
    );
    await expect(page.getByTestId('probability-black')).toHaveText(
      index % 2 === 0 ? '70.0%' : '40.0%',
    );
  }
  await expectPointMoves(
    page,
    Array.from({ length: 13 }, (_, index) => index),
  );
  await expect(page.getByTestId('chart-line-black')).toHaveAttribute('d', /^M[^M]+$/);
  const chart = page.getByRole('slider', { name: '查看各手胜率' });
  await expect(chart).toHaveAttribute('aria-valuemax', '12');
  await expect(chart.locator('.chart-axis').filter({ hasText: /^20$/ })).toHaveCount(1);
  await chart.focus();
  await chart.press('Home');
  await expect(chart).toHaveAttribute(
    'aria-valuetext',
    '第 0 手，黑胜 60.0%，白胜 20.0%，和棋 20.0%',
  );
  await chart.press('ArrowRight');
  await expect(page.getByTestId('analysis-move')).toHaveText('第 1 手 · H8');
  await expect(page.getByTestId('probability-black')).toHaveText('70.0%');
  await chart.press('End');
  await expect(page.getByTestId('analysis-move')).toHaveText('第 12 手 · I7');
  const initialPoint = page.getByTestId('chart-point-black').first();
  await initialPoint.hover();
  await expect(page.getByTestId('analysis-move')).toHaveText('第 0 手 · 开局');
  await page.mouse.move(0, 0);
  await expect(page.getByTestId('analysis-move')).toHaveText('第 12 手 · I7');
  await page.getByRole('heading', { name: '胜率走势' }).click();
  await page.screenshot({ path: '.local/win-rate-chart-desktop.png', fullPage: true });
  for (const width of [1100, 900, 390, 360]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(chart).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 390)
      await page.screenshot({ path: '.local/win-rate-chart-mobile.png', fullPage: true });
  }
});

test('触屏轻触后保留历史读数，落子后回到当前局面', async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await installAnalysisBridge(page);
    await page.goto('/');
    await page.getByRole('button', { name: '开始双人对弈' }).click();
    await expectRequests(page, 1);
    await page.evaluate(() => window.analysisTest.respond(0, 0.5));
    await page.getByRole('button', { name: /^H8，/ }).click();
    await expectRequests(page, 2);
    await page.evaluate(() => window.analysisTest.respond(1, 0.7));
    await expectPointMoves(page, [0, 1]);
    await page.getByTestId('chart-point-white').first().tap();
    await expect(page.getByTestId('analysis-move')).toHaveText('第 0 手 · 开局');
    await expect(page.getByTestId('probability-black')).toHaveText('50.0%');
    await page.getByRole('button', { name: /^I8，/ }).click();
    await expect(page.getByTestId('analysis-move')).toHaveText('第 2 手 · I8');
  } finally {
    await context.close();
  }
});

test('分析失败保留历史，重试补回当前点且不重复记录', async ({ page }) => {
  await installAnalysisBridge(page);
  await page.goto('/');
  await page.getByRole('button', { name: '开始双人对弈' }).click();
  await expectRequests(page, 1);
  await page.evaluate(() => window.analysisTest.respond(0, 0.5));
  await expectPointMoves(page, [0]);
  await page.getByRole('button', { name: /^H8，/ }).click();
  await expectRequests(page, 2);
  await page.evaluate(() => window.analysisTest.fail(1));
  await expect(page.getByText('本次分析失败')).toBeVisible();
  await expectPointMoves(page, [0]);
  await page.getByRole('button', { name: '重试分析' }).click();
  await expectRequests(page, 3);
  await page.evaluate(() => window.analysisTest.respond(2, 0.7));
  await expectPointMoves(page, [0, 1]);
  await expect(page.getByTestId('probability-black')).toHaveText('70.0%');
  await page.getByRole('button', { name: '悔棋', exact: true }).click();
  await expectRequests(page, 4);
  await page.evaluate(() => window.analysisTest.respond(3, 0.5));
  await expectPointMoves(page, [0]);
});

test('网页预览提示桌面端分析；终局由规则给出确定结果', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '开始双人对弈' }).click();
  await expect(page.getByText('请在桌面客户端使用本地分析')).toBeVisible();
  for (const point of ['D8', 'A1', 'E8', 'C1', 'F8', 'E1', 'G8', 'G1', 'H8'])
    await page.getByRole('button', { name: new RegExp('^' + point + '，') }).click();
  await expect(page.getByTestId('probability-black')).toHaveText('100.0%');
  await expect(page.getByTestId('probability-white')).toHaveText('0.0%');
  await expectPointMoves(page, [9]);
  await expect(page.getByText('终局概率由对局规则确定')).toBeVisible();
  await page.getByRole('button', { name: '悔棋', exact: true }).click();
  await expect(page.getByTestId('probability-black')).toHaveCount(0);
  await expectPointMoves(page, []);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
