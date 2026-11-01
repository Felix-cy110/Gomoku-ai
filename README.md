# 弈间 · Gomoku Club

基于 **Electron + TypeScript + React + Spring Boot 3.5.11 + Java 17** 的五子棋桌面应用，支持首页和本地双人对弈。

## 当前功能

- 暖白、墨绿配色的对弈大厅，包含本地 SVG 棋盘插画和响应式布局。
- **单人模式**：选择执黑／执白及初出茅庐／棋逢对手／高手过招三档棋力，点击「开始人机对弈」后与本机 Rapfi 对战。执黑由玩家先落子；执白由模型自动开局。模型思考时禁止代落子，悔棋撤回到玩家上一手之前，执白时保留模型的开局棋子。
- **双人模式**：点击「开始双人对弈」直接进入 15 × 15 棋盘，无需登录、昵称或其他设置。第一手黑棋，第二手白棋，之后交替落子。
- 横、竖或任意斜向连续五子及以上即获胜，标出获胜连线并停止落子；棋盘下满无人获胜则和棋。支持悔棋、重新开始、再来一局和返回首页。每次悔棋撤回最近一手，可连续撤回；获胜或和棋后也可悔棋继续对局，空棋盘时禁用。
- **本地局面分析**：桌面端使用 Rapfi 250615 预训练 NNUE 权重，在本机 CPU 上预测黑胜、白胜与和棋概率。客户端启动时初始化，落子、悔棋和重开后更新，退出时回收引擎；Windows 强制结束主进程时也会自动清理引擎。
- **胜率走势**：右侧折线图展示黑胜、白胜和和棋概率随手数的变化；悬停、轻触或聚焦后使用方向键查看历史局面，Home / End 跳到开局 / 当前手。悔棋会裁剪旧分支，重开清空曲线；未完成分析的手数保留缺口，不生成虚构预测。回合提示、手数与最近落子显示在棋盘上方。
- 模式、难度、执子和音效设置仅保存在当前页面内存中，刷新或重启恢复默认。
- 自由五子棋规则说明、对局记录空状态、对局音效开关。落子采用木棋盘敲击声，获胜连线绘制时同步播放铅笔划过纸面的声音；悔棋、重开、离开对局或静音会停止划线声，系统减少动态效果时不播放划线声。
- 弹窗支持 Escape 关闭、焦点恢复、键盘操作，动效遵循系统减少动态效果设置。

**范围说明：人机对弈需要桌面客户端的本机 Rapfi 引擎，对局记录尚未实现。当前版本不持久化任何用户设置或棋局数据。** 刷新、返回首页或关闭应用会结束本局，不保存棋谱。

## 环境要求

- Node.js 22.12+，或 24+（本地使用 Node 24）。
- JDK 17+，`java` 和 `javac` 可用。
- Maven 3.9+，`mvn` 可用。
- 本地分析当前支持 Windows x64，CPU 需要 SSE4.1；使用系统 .NET Framework 4.x 运行守护程序。构建准备需要 Windows 自带的 `tar.exe`、PowerShell 和 Framework64 下的 `csc.exe`。无需 Python、CUDA 或显卡。

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

后端配置位于 `backend/src/main/resources/application.properties`。打包后的 JAR 支持 Spring Boot 标准启动参数，例如：

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

## 本地 Rapfi 分析

分析和模型落子的调用链为 `React → preload 受限 IPC → Electron 引擎管理器 → Rapfi 子进程`，不经过 Java HTTP 服务。只暴露状态查询、局面分析、搜索落子、取消及重试能力，页面不能执行任意命令或指定可执行文件。

- 使用官方 `250615` 发布包中的 SSE 引擎和 `mix9svqfreestyle_bsmix.bin.lz4` 权重；下载包固定 SHA256，禁止混用最新权重与旧引擎。
- 初始化时发送 15×15 自由规则配置，并实际运行一次空棋盘评估，确认神经网络加载成功后才标记为就绪。
- `YXBOARD` 还原完整落子序列，`TRACESEARCH` 读取固定黑方视角的 `WR / LR / DR`，以 `ABOUT` 响应作为本次协议输出的结束标记。展示的是模型直接预测，未经搜索，也不等同于某个人类棋手的实际胜率。
- 单人模式在同一局面完成概率评估后，通过 `BOARD` 启动 Rapfi 搜索；收到落点后再发送 `ABOUT` 排空响应。主进程与棋盘均校验落点，过期、取消或非法结果不会落子。悔棋、重开和离开时使用 `STOP` 取消搜索；失败可点击「重试分析」恢复。
- 三档棋力分别采用 200 / 700 / 1800 ms 单步时间预算和 4 / 10 / 20 层深度上限，搜索可能提前结束；这是搜索强度设置，不代表固定的人类棋力等级。所有搜索仍在 CPU 单线程执行。
- 三项概率包含和棋；只对四位小数输出的舍入误差做归一化。收到传统估值、缺少网络输出或异常概率时明确报错。终局复用游戏规则给出确定结果。
- 任务串行执行，只保留最新待处理局面。取消正在运行的直接评估时丢弃其结果、读完协议响应再继续；不把过期结果显示到新局面。
- 空闲时关闭后台思考，模型保留在内存中；配置使用一个线程与 1 MiB 置换表。该大小不包含模型和进程的其他内存。数据库关闭，不保存棋局或分析记录。
- 正常退出发送 `END`，超过关闭期限终止守护进程。Windows 守护程序使用 Job Object 的 `KILL_ON_JOB_CLOSE`，并监视 Electron 主进程句柄；主进程强制退出时同样回收 Rapfi。

单独准备资源：

```powershell
npm run engine:prepare
```

资源位于 `resources/rapfi/`，下载缓存位于 `.local/rapfi-download/`，均已忽略，不提交模型或二进制。原始配置维护在 `config/rapfi.toml`，准备脚本会复制到资源目录。引擎加载失败时仍可双人对弈，可在分析面板点击“重试分析”；文件缺失时重新执行准备命令。

可通过环境变量调整 `GOMOKU_ENGINE_STARTUP_TIMEOUT_MS`（默认 30000）、`GOMOKU_ENGINE_ANALYSIS_TIMEOUT_MS`（默认 5000）和 `GOMOKU_ENGINE_SHUTDOWN_TIMEOUT_MS`（默认 1500），单位毫秒，范围 100～120000。

当前完成的是 Windows x64 桌面源码运行与生产构建，尚未生成安装包。以后配置安装包时，需要把整个 `resources/rapfi/` 作为独立资源复制到 `process.resourcesPath/rapfi/`，不能只打入 ASAR。用户运行时不需要下载模型或编译守护程序。引擎和权重的来源、许可证及分发要求见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

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

## 目录

```text
src/             React 页面、样式与内存中的模式设置
src/game/        本地双人棋局状态与胜负判断
electron/        Electron 主进程和受限 preload 桥接
electron/engine/ Rapfi 生命周期、协议与配置
shared/          前端与主进程共用的类型和业务枚举
native/windows/  Windows Job Object 守护程序源码
config/          随引擎复制的版本匹配配置
resources/rapfi/ 本地引擎和权重（生成目录，Git 忽略）
backend/         Spring Boot 服务、配置与集成测试
scripts/         开发启动与进程管理
tests/           Playwright 端到端测试
tests-engine/    协议、真实模型与进程生命周期测试
public/          本地图标
```

后端使用 Spring Boot 3.5.11、Spring MVC 和内嵌 Tomcat，Java 版本为 17；Spring Boot 与 Java 版本对齐参考项目 CampusSys。入口为 `GomokuApplication`，通过 Spring Boot Maven 插件打包为 `backend/target/gomoku-backend.jar`。当前仅提供健康检查，不读写用户数据，也不需要数据库或 Redis。双人棋局由 TypeScript 本地处理，本地 AI 分析由 Electron 管理 Rapfi 子进程完成。React 页面未直接暴露 Node.js 能力，Electron 启用上下文隔离、沙箱与不写磁盘缓存的内存会话。

中文字体由 npm 字体包提供，随应用本地构建，无需运行时从外网加载字体或图片。

### 后端分层约定

```text
backend/src/main/java/dev/yijian/gomoku/
├── GomokuApplication.java          应用启动入口与配置扫描
├── config/
│   └── ServiceProperties.java      服务元信息的类型化配置
├── controller/
│   └── HealthController.java       HTTP 路由与业务服务调用
├── dto/
│   └── ErrorResponse.java          API 错误响应对象
├── entity/
│   └── HealthStatus.java           服务健康状态业务对象
├── exception/
│   └── GlobalExceptionHandler.java 统一异常处理
├── filter/
│   └── ApiResponseFilter.java      API 通用响应头过滤器
├── mapper/
│   └── package-info.java           数据访问层预留与职责说明
├── service/
│   ├── HealthService.java          业务接口
│   └── impl/
│       └── HealthServiceImpl.java  业务实现
└── utils/
    └── ApplicationArgumentsUtils.java 启动参数校验工具
```

- 包名统一小写，类名使用大驼峰；Service 接口放在 `service`，实现类放在 `service.impl` 并以 `Impl` 结尾。Java 使用 4 个空格缩进，XML 使用 2 个空格，具体编辑器约定见 `backend/.editorconfig`。
- Controller 调用 Service 接口，由 Spring 注入 `service.impl` 中的实现类；Controller 只处理路由和调用，业务状态由 Service 实现类构建，依赖使用构造器注入。
- `entity` 放业务对象，`dto` 放接口传输对象；目前的 `HealthStatus` 是不可变业务对象，不映射数据库表。错误响应继续使用 `error` 字段，健康检查继续使用 `status`、`service`、`version` 字段。
- `config` 放配置绑定和配置类，`exception` 放统一异常处理，`filter` 放 HTTP 过滤器，`utils` 只放无状态工具。
- `mapper` 当前仅保留包说明，没有 Mapper 实现或数据库依赖。未来明确需要持久化时，由 Service 实现调用 Mapper，Controller 不直接访问数据库。
- 测试放在 `backend/src/test/java` 对应包下；接口行为与配置绑定测试放在 `controller`，启动入口测试与启动类同包。

健康检查使用的服务标识和版本集中配置在 `application.properties` 的 `gomoku.service.name`、`gomoku.service.version`，也可通过标准 Spring Boot 命令行参数覆盖；默认接口响应与重构前一致。

## API 与数据

| 方法 | 路径          | 用途         |
| ---- | ------------- | ------------ |
| GET  | `/api/health` | 检查服务状态 |

原 `/api/preferences` 读写接口及 Java `--data-dir` 参数已移除。模式与音效只使用 React 内存状态，应用不使用 `localStorage`、`sessionStorage`、数据库或 JSON 文件持久化用户数据。

默认设置为普通难度（棋逢对手）、执黑、音效开启。刷新页面或重启应用后恢复默认，棋局与历史记录也不会恢复。旧版本已生成的偏好文件及浏览器数据不再读取或更新，不自动删除。

构建产物、测试截图及 Electron 自身的运行文件不属于用户设置或棋局数据；测试输出仍写入已被 Git 忽略的目录。

## 参与贡献

欢迎提交问题反馈、功能建议、代码、测试和文档。开始前请阅读 [贡献指南](CONTRIBUTING.md)，了解 [Issue 提交入口](https://github.com/Felix-cy110/Gomoku-ai/issues/new/choose)、PR 规则和验证方式；代码规范统一见 [AGENT.md](AGENT.md)。

## 贡献者

项目由 [Felix Sun（@Felix-cy110）](https://github.com/Felix-cy110) 创建与维护。感谢每一位参与者，署名及加入方式见 [贡献者名单](CONTRIBUTORS.md)，完整代码贡献记录见 [GitHub Contributors](https://github.com/Felix-cy110/Gomoku-ai/graphs/contributors)。

## 许可证

本项目采用 [MIT License](LICENSE)，版权声明为 `Copyright (c) 2026 Felix Sun`。第三方依赖及字体等资源遵循各自的许可证。
