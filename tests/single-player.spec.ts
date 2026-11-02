import { test, expect, type Page } from '@playwright/test';
import type { MoveReply, MoveRequest } from '../shared/analysis';

declare global {
  interface Window {
    singleTest: {
      requests: MoveRequest[];
      cancelled: string[];
      respond(index: number, move: number): void;
      fail(index: number): void;
    };
  }
}

async function installEngine(page: Page) {
  await page.addInitScript(() => {
    const requests: MoveRequest[] = [];
    const resolvers: ((reply: MoveReply) => void)[] = [];
    const cancelled: string[] = [];
    window.singleTest = {
      requests,
      cancelled,
      respond(index, move) {
        resolvers[index]({ id: requests[index].id, ok: true, move });
      },
      fail(index) {
        resolvers[index]({
          id: requests[index].id,
          ok: false,
          code: 'failed',
          message: '模型搜索失败，请重试。',
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
        analyze: async (request) => ({
          id: request.id,
          ok: true,
          analysis: { source: 'model', elapsedMs: 1, blackWin: 0.6, whiteWin: 0.3, draw: 0.1 },
        }),
        bestMove: (request) =>
          new Promise((resolve) => {
            requests.push(request);
            resolvers.push(resolve);
          }),
      },
    };
  });
}

const cell = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp('^' + name + '，') });
async function openSingle(page: Page, color: 'black' | 'white' = 'black') {
  await page.goto('/');
  await page.getByRole('button', { name: '选择单人模式' }).click();
  await page.getByLabel(color === 'black' ? '执黑 · 先行' : '执白 · 后行').check();
  await page.getByRole('button', { name: '开始人机对弈' }).click();
  await expect(page.getByRole('heading', { name: '与 Rapfi，落子过招。' })).toBeVisible();
}
async function expectRequests(page: Page, count: number) {
  await expect.poll(() => page.evaluate(() => window.singleTest.requests.length)).toBe(count);
}

test('执黑由玩家先行，模型思考期间禁止代落子，完成应手后按一轮悔棋', async ({ page }) => {
  await installEngine(page);
  await openSingle(page);
  await expect(page.getByTestId('probability-black')).toBeVisible();
  expect(await page.evaluate(() => window.singleTest.requests.length)).toBe(0);
  await cell(page, 'H8').click();
  await expectRequests(page, 1);
  expect(await page.evaluate(() => window.singleTest.requests[0])).toMatchObject({
    moveHistory: [112],
    difficulty: 'normal',
  });
  await expect(cell(page, 'I8')).toBeDisabled();
  await cell(page, 'I8').click({ force: true });
  await cell(page, 'J8').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.game-stone')).toHaveCount(1);
  await page.evaluate(() => window.singleTest.respond(0, 113));
  await expect(cell(page, 'I8')).toHaveAttribute('data-stone', 'white');
  await expect(cell(page, 'J8')).toBeEnabled();
  await expect(page.getByTestId('chart-point-black')).toHaveCount(3);
  await page.getByRole('button', { name: '悔棋', exact: true }).click();
  await expect(page.locator('.game-stone')).toHaveCount(0);
  await expect(page.getByTestId('chart-point-black')).toHaveCount(1);
  await expect(cell(page, 'H8')).toBeEnabled();
  await expect(page.getByRole('button', { name: '悔棋', exact: true })).toBeDisabled();
});

test('执白时模型开局，保留开局棋子并撤回玩家及模型的一轮', async ({ page }) => {
  await installEngine(page);
  await openSingle(page, 'white');
  await expect(cell(page, 'H8')).toBeDisabled();
  await expectRequests(page, 1);
  expect(await page.evaluate(() => window.singleTest.requests[0].moveHistory)).toEqual([]);
  await page.evaluate(() => window.singleTest.respond(0, 112));
  await expect(cell(page, 'H8')).toHaveAttribute('data-stone', 'black');
  await expect(page.getByRole('button', { name: '悔棋', exact: true })).toBeDisabled();
  await cell(page, 'I8').click();
  await expectRequests(page, 2);
  await page.evaluate(() => window.singleTest.respond(1, 114));
  await expect(page.locator('.game-stone')).toHaveCount(3);
  await page.getByRole('button', { name: '悔棋', exact: true }).click();
  await expect(page.locator('.game-stone')).toHaveCount(1);
  await expect(cell(page, 'I8')).toHaveAttribute('data-stone', 'empty');
  await expect(cell(page, 'I8')).toBeEnabled();
  await page.getByRole('button', { name: '重新开始' }).click();
  await expectRequests(page, 3);
  await expect(page.locator('.game-stone')).toHaveCount(0);
  await page.evaluate(() => window.singleTest.respond(2, 112));
  await expect(page.locator('.game-stone')).toHaveCount(1);
});

test('思考时悔棋、重开和返回首页取消搜索，迟到结果不落入新棋局', async ({ page }) => {
  await installEngine(page);
  await openSingle(page);
  await cell(page, 'H8').click();
  await expectRequests(page, 1);
  await page.getByRole('button', { name: '悔棋', exact: true }).click();
  await page.evaluate(() => window.singleTest.respond(0, 113));
  await expect(page.locator('.game-stone')).toHaveCount(0);
  await cell(page, 'I8').click();
  await expectRequests(page, 2);
  await page.getByRole('button', { name: '重新开始' }).click();
  await page.evaluate(() => window.singleTest.respond(1, 112));
  await expect(page.locator('.game-stone')).toHaveCount(0);
  await cell(page, 'J8').click();
  await expectRequests(page, 3);
  await page.getByRole('button', { name: '返回首页', exact: true }).click();
  await page.getByRole('button', { name: '再开一局 · 选择执子' }).click();
  await page.getByRole('button', { name: '开始人机对弈' }).click();
  await page.evaluate(() => window.singleTest.respond(2, 112));
  await expect(page.locator('.game-stone')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      window.singleTest.requests.every((request) =>
        window.singleTest.cancelled.includes(request.id),
      ),
    ),
  ).toBe(true);
});

test('搜索失败或返回非法落点时保留棋局，重试后才能落子', async ({ page }) => {
  await installEngine(page);
  await openSingle(page);
  await cell(page, 'H8').click();
  await expectRequests(page, 1);
  await page.evaluate(() => window.singleTest.fail(0));
  await expect(page.getByText('模型搜索失败，请重试。')).toBeVisible();
  await expect(page.locator('.game-stone')).toHaveCount(1);
  await page.getByRole('button', { name: '重试分析' }).click();
  await expectRequests(page, 2);
  await page.evaluate(() => window.singleTest.respond(1, 112));
  await expect(page.getByText('模型返回了无效落点，请重试。')).toBeVisible();
  await expect(page.locator('.game-stone')).toHaveCount(1);
  await page.getByRole('button', { name: '重试分析' }).click();
  await expectRequests(page, 3);
  await page.evaluate(() => window.singleTest.respond(2, 113));
  await expect(page.locator('.game-stone')).toHaveCount(2);
  await expect(page.getByRole('button', { name: '重试分析' })).toHaveCount(0);
});

for (const winner of ['player', 'computer'] as const) {
  test(`${winner === 'player' ? '玩家' : '模型'}获胜即停止请求，悔棋后仍可继续`, async ({
    page,
  }) => {
    await installEngine(page);
    await openSingle(page);
    const player =
      winner === 'player' ? ['D8', 'E8', 'F8', 'G8', 'H8'] : ['A1', 'C1', 'E1', 'G1', 'I1'];
    const computer = winner === 'player' ? [0, 2, 4, 6] : [48, 63, 78, 93, 108];
    for (const [index, point] of player.entries()) {
      await cell(page, point).click();
      if (index < computer.length) {
        await expectRequests(page, index + 1);
        await page.evaluate(({ index, move }) => window.singleTest.respond(index, move), {
          index,
          move: computer[index],
        });
        await expect(page.locator('.game-stone')).toHaveCount((index + 1) * 2);
      }
    }
    await expect(
      page.getByRole('heading', {
        name: winner === 'player' ? '黑棋获胜' : '白棋获胜',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByTestId(winner === 'player' ? 'probability-black' : 'probability-white'),
    ).toHaveText('100.0%');
    expect(await page.evaluate(() => window.singleTest.requests.length)).toBe(computer.length);
    await expect(cell(page, 'O15')).toBeDisabled();
    await page.getByRole('button', { name: '悔棋', exact: true }).click();
    await expect(page.locator('.winning-line')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '轮到黑棋落子' })).toBeVisible();
    await expect(page.locator('.game-stone')).toHaveCount(8);
    await expect(cell(page, 'O15')).toBeEnabled();
  });
}

test('网页单人模式提示需要桌面引擎，不代落棋子，双人模式仍可用', async ({ page }) => {
  await openSingle(page);
  await expect(page.getByText('请在桌面客户端与 Rapfi 对弈')).toBeVisible();
  await expect(cell(page, 'H8')).toBeDisabled();
  await cell(page, 'H8').click({ force: true });
  await expect(page.locator('.game-stone')).toHaveCount(0);
  await page.getByRole('button', { name: '返回首页', exact: true }).click();
  await page.getByRole('button', { name: '开始双人对弈' }).click();
  await cell(page, 'H8').click();
  await cell(page, 'I8').click();
  await expect(page.locator('.game-stone')).toHaveCount(2);
});
