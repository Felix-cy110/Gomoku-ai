import { test, expect, type Page } from '@playwright/test';

const cell = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^${name}，`) });

async function openGame(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '开始双人对弈' }).click();
  await expect(page.getByRole('group', { name: '五子棋棋盘' })).toBeVisible();
}

test('不填写用户信息即可开始，黑白交替，黑棋横向获胜后锁定棋盘', async ({ page }) => {
  await openGame(page);
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '轮到黑棋落子' })).toBeVisible();
  await cell(page, 'D8').click();
  await expect(cell(page, 'D8')).toHaveAttribute('data-stone', 'black');
  await expect(cell(page, 'D8')).toBeDisabled();
  await cell(page, 'D8').click({ force: true });
  await expect(page.getByRole('heading', { name: '轮到白棋落子' })).toBeVisible();
  await cell(page, 'A1').click();
  await expect(cell(page, 'A1')).toHaveAttribute('data-stone', 'white');
  await expect(page.getByRole('heading', { name: '轮到黑棋落子' })).toBeVisible();
  for (const point of ['E8', 'C1', 'F8', 'E1', 'G8', 'G1', 'H8']) await cell(page, point).click();
  await expect(page.getByRole('heading', { name: '黑棋获胜', exact: true })).toBeVisible();
  await expect(page.locator('.winning-stone')).toHaveCount(5);
  await expect(cell(page, 'I8')).toBeDisabled();
  await cell(page, 'I8').click({ force: true });
  await expect(cell(page, 'I8')).toHaveAttribute('data-stone', 'empty');
  await expect(page.locator('.game-stone')).toHaveCount(9);
  await page.getByRole('button', { name: '再来一局' }).click();
  await expect(page.locator('.game-stone')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '轮到黑棋落子' })).toBeVisible();
});

test('白棋纵向五连获胜', async ({ page }) => {
  await openGame(page);
  for (const point of ['A1', 'H4', 'C1', 'H5', 'E1', 'H6', 'G1', 'H7', 'I1', 'H8'])
    await cell(page, point).click();
  await expect(page.getByRole('heading', { name: '白棋获胜', exact: true })).toBeVisible();
  await expect(page.locator('.winning-stone.stone-white')).toHaveCount(5);
});

test('方向键和空格落子，规则弹窗保留棋局，重开与返回首页可用', async ({ page }) => {
  await openGame(page);
  await cell(page, 'H8').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await expect(cell(page, 'I8')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cell(page, 'I8')).toHaveAttribute('data-stone', 'white');
  await page.getByRole('button', { name: '查看规则' }).click();
  await page.getByRole('button', { name: '明白了，继续对弈' }).click();
  await expect(page.locator('.game-stone')).toHaveCount(2);
  await page.getByRole('button', { name: '重新开始' }).click();
  await expect(page.locator('.game-stone')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '轮到黑棋落子' })).toBeVisible();
  await cell(page, 'H8').click();
  await page.getByRole('button', { name: '返回首页', exact: true }).click();
  await page.getByRole('button', { name: '开始双人对弈' }).click();
  await expect(page.locator('.game-stone')).toHaveCount(0);
});

test('服务不可用时双人模式仍可直接下棋，刷新后清空棋局', async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
  await openGame(page);
  await cell(page, 'H8').click();
  await cell(page, 'I8').click();
  await expect(cell(page, 'H8')).toHaveAttribute('data-stone', 'black');
  await expect(cell(page, 'I8')).toHaveAttribute('data-stone', 'white');
  expect(
    await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
  ).toEqual({ local: 0, session: 0 });
  await page.reload();
  await page.getByRole('button', { name: '开始双人对弈' }).click();
  await expect(page.locator('.game-stone')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '轮到黑棋落子' })).toBeVisible();
});

test('窄屏棋盘四角均可点击，窗口缩放后不横向溢出', async ({ page }) => {
  await openGame(page);
  for (const width of [900, 540, 390, 360]) {
    await page.setViewportSize({ width, height: 844 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
  }
  for (const point of ['A1', 'O1', 'A15', 'O15']) await cell(page, point).click();
  await expect(page.locator('.game-stone')).toHaveCount(4);
  const board = await page.getByRole('group', { name: '五子棋棋盘' }).boundingBox();
  expect(board).not.toBeNull();
  expect(Math.abs(board!.width - board!.height)).toBeLessThan(1);
});
