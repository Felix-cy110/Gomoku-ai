# 弈间 · Gomoku Club

基于 **Electron + TypeScript + React + Java 17** 的五子棋桌面应用。当前完成首页与模式设置流程。

## 当前功能

- 暖白、墨绿配色的对弈大厅，包含本地 SVG 棋盘插画和响应式布局。
- **单人模式**：选择初出茅庐／棋逢对手／高手过招三档难度，以及执黑／执白。
- **双人模式**：本地双人对弈设置，自定义两位棋手的昵称。
- Java 服务验证、保存对局偏好，关闭应用后仍可恢复配置。
- 自由五子棋规则说明、对局记录空状态、可记忆的音效开关。
- 弹窗支持 Escape 关闭、焦点恢复、键盘操作，动效遵循系统减少动态效果设置。

**范围说明：本版本仅完成首页、模式选择和设置保存；棋盘落子、胜负判断、AI 搜索与真实对局记录尚未实现。** 难度与执子选项目前用于保存未来对局的偏好。

## 环境要求

- Node.js 22.12+，或 24+（本地使用 Node 24）。
- JDK 17+，`java` 和 `javac` 可用。
- Maven 3.9+，`mvn` 可用。

## 启动

```powershell
npm install
npm run dev
```

`dev` 会构建 Java 服务和 Electron 主进程，再启动 Java、Vite 与 Electron 桌面窗口。React 页面支持热更新，修改 Electron 主进程或 Java 源码后需重新运行命令。

只在浏览器预览首页：

```powershell
npm run dev:web
```

访问 `http://127.0.0.1:5187`。开发环境 Java 服务监听 `127.0.0.1:18087`，由 Vite 代理 `/api`。可通过 `GOMOKU_WEB_PORT` 和 `GOMOKU_API_PORT` 修改端口；若已占用，启动脚本会明确报错。

构建并启动本地生产版本：

```powershell
npm run build
npm start
```

生产模式下 Electron 自动为 Java 服务选择本机可用端口，通过受限 IPC 调用后端。关闭桌面应用时会终止其创建的 Java 进程。当前尚未配置安装包打包，也未内置 JRE，运行仍需要本机 Java 环境。

## 验证

```powershell
npm run typecheck
npm run test:backend
npx playwright install chromium --only-shell
npm run test:e2e
npm run build
npm run test:desktop
```

后端测试覆盖默认配置、中文设置的跨重启持久化、非法参数、请求大小与方法限制、损坏配置恢复。

页面测试覆盖单人偏好保存与刷新恢复、双人昵称、取消编辑、规则与记录弹窗、音效开关、服务失败提示、移动端布局。测试使用独立的 `5197` / `18097` 端口和 `.local/e2e` 数据目录。

`test:desktop` 会构建并实际打开 Electron，验证生产页面、preload 桥接、Java 自动启动和设置保存，结束后自动关闭窗口。测试使用 `.local/` 下的独立用户目录。

## 目录

```text
src/             React 页面、样式、模式设置与 API 客户端
electron/        Electron 主进程和受限 preload 桥接
backend/         Java HTTP 服务与 JUnit 测试
scripts/         开发启动与进程管理
tests/           Playwright 端到端测试
public/          本地图标
```

Java 使用 JDK 自带 `HttpServer`，Gson 处理 JSON；首页阶段保持后端轻量，后续可以在 `backend/` 增加棋局与 AI 模块。React 页面未直接暴露 Node.js 能力，Electron 启用上下文隔离和沙箱。

中文字体由 npm 字体包提供，随应用本地构建，无需运行时从外网加载字体或图片。

## API 与数据

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/health` | 检查服务状态 |
| GET | `/api/preferences` | 读取对局偏好 |
| PUT | `/api/preferences` | 验证并保存对局偏好 |

```json
{
  "mode": "single",
  "difficulty": "normal",
  "color": "black",
  "playerOne": "棋手一",
  "playerTwo": "棋手二"
}
```

`mode` 支持 `single` / `local`；`difficulty` 支持 `easy` / `normal` / `hard`；`color` 支持 `black` / `white`。昵称去除首尾空白后为 1–16 个 UTF-16 代码单元。

开发数据保存在 `.local/preferences.json`；生产模式保存在 Electron `userData` 下的 `lobby/preferences.json`。音效偏好保存在当前页面来源的 `localStorage`。本地数据、构建产物及测试截图均已被 Git 忽略。
