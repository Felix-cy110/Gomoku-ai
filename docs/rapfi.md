# 本地 Rapfi 分析

[返回项目首页](../README.md) · [开发与验证](development.md) · [架构说明](architecture.md)

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

当前完成的是 Windows x64 桌面源码运行与生产构建，尚未生成安装包。以后配置安装包时，需要把整个 `resources/rapfi/` 作为独立资源复制到 `process.resourcesPath/rapfi/`，不能只打入 ASAR。用户运行时不需要下载模型或编译守护程序。引擎和权重的来源、许可证及分发要求见 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。
