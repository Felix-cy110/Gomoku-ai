# 开发与验证

[返回项目首页](../README.md) · [架构说明](architecture.md) · [Rapfi 引擎](rapfi.md)

## 环境要求

- Node.js 22.12+，或 24+（本地使用 Node 24）。
- JDK 17+，`java` 和 `javac` 可用。
- Maven 3.9+，`mvn` 可用。
- 本地分析支持 Windows x64 与 Apple Silicon Mac，无需 Python、CUDA 或显卡。
  - Windows：CPU 需要 SSE4.1；使用系统 .NET Framework 4.x 运行守护程序。构建准备需要系统自带的 `tar.exe`、PowerShell 和 Framework64 下的 `csc.exe`。
  - macOS：需要 macOS 14 或更新版本；构建准备使用系统自带的 `curl`、`tar` 和 `xattr`，不需要安装 Xcode。Intel Mac 没有官方引擎，只能双人对弈。
- 以下命令在 Windows PowerShell 与 macOS 终端中写法相同。

## 启动

```powershell
npm install
npm run dev
```

`dev` 会先准备本地引擎与模型，再使用 Maven 构建 Spring Boot 可执行 JAR、编译 Electron 主进程，并自动启动后端、Vite 与 Electron 桌面窗口，无需额外启动后端。首次准备需要联网下载约 35 MB 的官方引擎包；后续使用已校验的下载缓存。应用运行及分析过程不访问模型服务器。React 页面支持热更新，修改 Electron 主进程或 Java 源码后需重新运行命令。

只在浏览器预览首页：

```powershell
npm run dev:web
```

访问 `http://127.0.0.1:5187`。开发环境 Java 服务监听 `127.0.0.1:18087`，由 Vite 代理 `/api`。可通过 `GOMOKU_WEB_PORT` 和 `GOMOKU_API_PORT` 修改端口；若已占用，启动脚本会明确报错。

网页预览可以双人下棋，但不能启动本机分析引擎；单人棋盘会提示使用桌面客户端，不生成模拟落子。

单独开发后端时，在项目根目录运行：

```powershell
mvn -f backend/pom.xml spring-boot:run
```

也可以进入 `backend` 目录执行 `mvn spring-boot:run`。默认监听 `127.0.0.1:18087`，健康检查地址为 `http://127.0.0.1:18087/api/health`。单独运行后端不会打开桌面窗口；`npm run dev` 和 `npm run dev:web` 会自行启动后端，不要同时在相同端口另开后端进程。

后端配置位于 `backend/src/main/resources/application.yml`。打包后的 JAR 支持 Spring Boot 标准启动参数，例如：

```powershell
npm run backend:build
java -jar backend/target/gomoku-backend.jar --server.port=18088
```

原自定义 `--port 18088` 参数已改为 `--server.port=18088`，开发脚本与 Electron 已同步更新。独立启动后端的默认端口由 `18080` 统一为 `18087`；需要旧端口时，可设置 `GOMOKU_API_PORT=18080` 或传入 `--server.port=18080`。

构建并启动本地生产版本：

```powershell
npm run build
npm start
```

生产模式下 Electron 自动为 Java 服务选择本机可用端口，通过受限 IPC 调用后端。关闭桌面应用时会终止其创建的 Java 进程。当前尚未配置安装包打包，也未内置 JRE，运行仍需要本机 Java 环境。

## 验证

```powershell
npm run typecheck
npm run engine:prepare
npm run test:engine
npm run test:backend
npx playwright install chromium --only-shell
npm run test:e2e
npm run build
npm run test:desktop
npm run format:check
```

后端测试使用 `@SpringBootTest` 在随机端口启动真实 HTTP 服务，覆盖健康检查 JSON、禁止缓存与 `nosniff` 响应头、不创建会话 Cookie、旧偏好读写接口移除、未知路径的 404、请求方法限制的 405，以及数据目录参数移除。另使用完整 Spring 上下文配合 MockMvc，验证自定义服务配置经过 Service 层后正确返回。

`test:e2e` 验证 Vite 到 Spring Boot 的健康检查代理，并运行棋局逻辑和页面测试。棋局逻辑覆盖黑白交替、重复与越界落子、双方四个方向的五连、长连、缺口和阻断、跨行边界以及满盘和棋。页面测试覆盖双人落子和胜负、键盘与窄屏操作，以及设置和音效刷新后恢复默认、旧音效数据不再读取、不调用浏览器存储或偏好接口、棋局刷新后清空。测试使用独立的 `5197` / `18097` 端口。

`test:engine` 验证请求校验、协议概率解析、最新任务队列、取消、缺少网络输出、超时、引擎崩溃和关闭期限，并实际加载官方模型验证概率、悔棋复现、重启、正常退出与父进程强制退出后的进程清理。该测试需先准备引擎资源。

`test:desktop` 会构建并实际打开 Electron，验证真实模型初始化、预测显示、终局确定结果，以及正常退出和强制结束 Electron 主进程后的 Rapfi 清理；同时覆盖生产页面、健康检查桥接、Java 自动启动、非持久化会话、设置刷新和重启后恢复默认、不生成偏好文件，以及双人落子获胜与重新开始。结束后自动关闭窗口；测试使用 `.local/` 下的独立运行目录。网页测试还验证过期分析不会覆盖落子、悔棋和重开的新结果。

代码编写规范见 [AGENT.md](../AGENT.md)，参与方式与 PR 要求见 [贡献指南](../CONTRIBUTING.md)。
