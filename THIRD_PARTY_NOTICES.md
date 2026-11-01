# 第三方引擎与模型

本项目的本地分析使用 Rapfi 官方发布包 250615：

- 项目：https://github.com/dotb1ue/rapfi
- 发布包：https://github.com/dotb1ue/rapfi/releases/tag/250615
- 对应引擎源码：https://github.com/dotb1ue/rapfi/tree/250615
- 源码归档：https://github.com/dotb1ue/rapfi/archive/refs/tags/250615.tar.gz
- 引擎许可：GNU GPL v3 或更新版本，完整许可由准备脚本复制为 `resources/rapfi/Copying.txt`，作者名单保留为 `AUTHORS`。
- 权重来源：https://github.com/dhbloo/rapfi-networks/tree/918b757a129258e9e765f77fe17d507c2bb1a60b
- 权重仓库声明权重采用 CC0：https://creativecommons.org/publicdomain/zero/1.0/

准备脚本使用官方未经修改的 Windows SSE 引擎、传统权重 `model210901.bin` 与神经网络权重 `mix9svqfreestyle_bsmix.bin.lz4`。本项目的配置仅启用自由五子棋模型、一个线程和 1 MiB 置换表，关闭数据库。

分发安装包时必须一并保留作者、许可与本说明，并按 GPL 的适用分发方式提供与所分发二进制对应的源码。此处源码链接用于追溯版本，不能代替对具体分发方式的 GPL 合规安排。模型和构建产物不提交到本仓库；构建时使用 `npm run engine:prepare` 获取和准备。
