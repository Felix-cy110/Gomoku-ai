import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';

export default defineConfig({
  plugins: [pluginReact(), pluginTailwindcss()],
  source: { entry: { index: './src/main.tsx' } },
  html: { template: './index.html' },
  output: {
    // 按 HTML、CSS 各自的位置计算相对路径，兼容 file:// 下的字体与分包加载。
    assetPrefix: 'auto',
    // 字体输出为本地文件，与 Electron 的 font-src 'self' 策略保持一致。
    dataUriLimit: { font: 0 },
  },
  server: {
    host: '127.0.0.1',
    port: Number(process.env.GOMOKU_WEB_PORT || 5187),
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${process.env.GOMOKU_API_PORT || 18087}` },
  },
  // Electron 的开发 CSP 不允许 eval，使用独立 source map 保留调试能力。
  tools: {
    rspack: (config, { isProd }) => {
      if (!isProd) config.devtool = 'source-map';
    },
  },
});
