import { test, expect } from '@playwright/test';

test('首页展示两种模式，单人配置通过 Java 保存并在刷新后恢复', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /方寸之间，\s*落子有趣。/ })).toBeVisible();
  await page.getByRole('button', { name: '选择单人模式' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await modal.getByText('高手过招', { exact: true }).click();
  await modal.getByText('执白 · 后行', { exact: true }).click();
  await modal.getByRole('button', { name: '确认对局设置' }).click();
  await expect(modal).not.toBeVisible();
  await expect(page.getByText('人机对弈 · 高手过招 · 执白后行')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '选择单人模式' }).click();
  await expect(page.locator('input[name="difficulty"][value="hard"]')).toBeChecked();
  await expect(page.locator('input[name="color"][value="white"]')).toBeChecked();
  expect(errors).toEqual([]);
});

test('取消单人设置不会更改已保存的偏好', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '选择单人模式' }).click();
  await page.getByText('初出茅庐', { exact: true }).click();
  await page.getByRole('button', { name: '确认对局设置' }).click();
  await page.getByRole('button', { name: '已选择单人 · 调整设置' }).click();
  await page.getByText('高手过招', { exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '已选择单人 · 调整设置' }).click();
  await expect(page.locator('input[name="difficulty"][value="easy"]')).toBeChecked();
});

test('规则、空记录、音效偏好和键盘关闭可用', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '了解规则' }).click();
  await expect(page.getByRole('heading', { name: '五子相连，就这么简单。' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '了解规则' })).toBeFocused();
  await page.getByRole('button', { name: '对局记录' }).click();
  await expect(page.getByText('还没有对局记录', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '回到对弈大厅' }).click();
  await page.getByRole('button', { name: '偏好设置' }).click();
  await page.getByRole('switch', { name: '落子音效' }).click();
  await expect(page.getByRole('switch', { name: '落子音效' })).not.toBeChecked();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.getByRole('button', { name: '开启落子音效' })).toBeVisible();
});

test('保存失败时显示错误并保留编辑内容', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '选择单人模式' }).click();
  await page.getByText('高手过招', { exact: true }).click();
  await page.route('**/api/preferences', async (route) => {
    if (route.request().method() === 'PUT') await route.fulfill({ status: 500, body: '{}' });
    else await route.continue();
  });
  await page.getByRole('button', { name: '确认对局设置' }).click();
  await expect(page.getByRole('alert')).toContainText('暂时无法保存设置');
  await expect(page.locator('input[name="difficulty"][value="hard"]')).toBeChecked();
});

test('移动端布局无横向溢出，双人选择可操作', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '开始双人对弈' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: '开始双人对弈' }).click();
  await expect(page.getByRole('group', { name: '五子棋棋盘' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '轮到黑棋落子' })).toBeVisible();
});
