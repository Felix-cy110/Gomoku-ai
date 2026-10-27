import { test, expect } from '@playwright/test';

test('开发服务将健康检查代理到 Spring Boot 后端', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    status: 'ok',
    service: 'yijian-lobby',
    version: '0.1.0',
  });
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
});
