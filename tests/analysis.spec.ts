import { test, expect } from '@playwright/test';
import type { AnalysisReply, AnalysisRequest } from '../shared/analysis';

declare global {
  interface Window {
    analysisTest: {
      requests: AnalysisRequest[];
      cancelled: string[];
      respond(index: number, blackWin: number): void;
    };
  }
}

test('分析结果跟随局面，过期响应不会覆盖落子、悔棋和重开的结果', async ({ page }) => {
  await page.addInitScript(() => {
    const requests: AnalysisRequest[] = [];
    const resolvers: ((reply: AnalysisReply) => void)[] = [];
    const cancelled: string[] = [];
    window.analysisTest = {
      requests,
      cancelled,
      respond(index, blackWin) {
        resolvers[index]({
          id: requests[index].id,
          ok: true,
          analysis: { source: 'model', elapsedMs: 10, blackWin, whiteWin: 1 - blackWin, draw: 0 },
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
  await page.goto('/');
  await page.getByRole('button', { name: '开始双人对弈' }).click();
  const black = page.getByTestId('probability-black');
  await expect.poll(() => page.evaluate(() => window.analysisTest.requests.length)).toBe(1);
  await page.evaluate(() => window.analysisTest.respond(0, 0.5));
  await expect(black).toHaveText('50.0%');
  await page.getByRole('button', { name: /^H8，/ }).click();
  await expect.poll(() => page.evaluate(() => window.analysisTest.requests.length)).toBe(2);
  await expect(black).toHaveCount(0);
  await page.getByRole('button', { name: /^I8，/ }).click();
  await expect.poll(() => page.evaluate(() => window.analysisTest.requests.length)).toBe(3);
  await page.evaluate(() => window.analysisTest.respond(2, 0.2));
  await expect(black).toHaveText('20.0%');
  await page.evaluate(async () => {
    window.analysisTest.respond(1, 0.9);
    await new Promise(requestAnimationFrame);
  });
  await expect(black).toHaveText('20.0%');
  await page.getByRole('button', { name: '悔棋', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.analysisTest.requests.length)).toBe(4);
  expect(await page.evaluate(() => window.analysisTest.requests[3].moveHistory)).toEqual([112]);
  await page.evaluate(() => window.analysisTest.respond(3, 0.9));
  await expect(black).toHaveText('90.0%');
  await page.getByRole('button', { name: '重新开始' }).click();
  await expect.poll(() => page.evaluate(() => window.analysisTest.requests.length)).toBe(5);
  expect(await page.evaluate(() => window.analysisTest.requests[4].moveHistory)).toEqual([]);
  await page.evaluate(() => window.analysisTest.respond(4, 0.5));
  await expect(black).toHaveText('50.0%');
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
  await expect(page.getByRole('heading', { name: '本局结果' })).toBeVisible();
  await page.getByRole('button', { name: '悔棋', exact: true }).click();
  await expect(page.getByTestId('probability-black')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
