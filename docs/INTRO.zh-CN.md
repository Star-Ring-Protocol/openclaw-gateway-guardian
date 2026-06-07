# OpenClaw Gateway Guardian 简介

**小乙-星环协议出品**

OpenClaw Gateway Guardian 是一个面向 OpenClaw 和长期运行 agent 系统的网关可靠性工具。它用于重启前预检、故障诊断和合成压力测试，帮助操作者判断：该不该重启、是不是还有任务在跑、gateway 是真的不可用还是深层 RPC 变慢、memory search 是否已经退化成高延迟路径。

## 一句话

**重启前先检查风险，保留证据，用合成压力测试定位慢路径。**

## 它解决什么问题

很多 gateway 问题从界面上看很像：

- TUI 显示 `gateway disconnected`
- WebSocket handshake timeout
- gateway request timeout
- tick timeout
- memory 维护任务卡住
- 后台 cron/model 超时
- memory search 越跑越慢
- 操作者反复重启，最后把还在跑的任务打断

Gateway Guardian 先收集证据，再给出风险判断。它会检查 gateway status、health、running tasks、task audit、stability heartbeat、日志模式、进程状态和 memory/vector 退化信号，然后输出结构化诊断报告。

## 核心能力

- 重启前预检：`ALLOW / CAUTION / BLOCK`
- 网关 watchdog：`healthy / degraded / critical`
- 安全 dry-run restart：不真重启也能看风险
- 诊断报告：保留证据，而不是只给一句“超时了”
- 合成压力测试：覆盖 health、status、tasks、audit、工具探针和 memory search 慢路径
- 退化识别：识别 stuck session、cron/model timeout、sqlite-vec unavailable、vector recall degraded

## 适合谁

- 正在运行 OpenClaw 的个人或团队
- 正在搭 AI agent gateway / MCP gateway 的开发者
- 遇到过 agent 长任务卡死、TUI 断连、后台任务超时的人
- 希望 agent 系统能稳定完成长会话任务的人

## 它不是什么

- 不是 OpenClaw core 的替代品
- 不是上游模型服务的 SLA 保证
- 不是多租户安全沙箱
- 不是自动改配置的黑盒工具
- 不是监控大屏或可视化平台

## 定位

Gateway Guardian 是“小乙-星环协议”发布的开源可靠性工具。它采用 MIT 协议，方便 OpenClaw 操作者检查实现、按需调整，并把诊断数据留在本地。

## 推荐标语

> 重启前先检查，保住正在执行的任务，留下可复盘的证据。

> Gateway reliability tooling for long-running agent systems.
