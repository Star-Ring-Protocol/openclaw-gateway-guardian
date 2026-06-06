# OpenClaw Gateway Guardian 简介

**小乙-星环协议出品**

OpenClaw Gateway Guardian 是一个面向 OpenClaw 和长期运行 AI agent 系统的网关加固 skill。它的目标不是“神奇地消灭所有崩溃”，而是在最容易出事故的时刻帮你做正确的判断：该不该重启、是不是还有任务在跑、gateway 是真的死了还是只是慢、memory search 是否已经退化成高延迟路径。

## 一句话

**防盲重启，识别网关退化，用压力训练找出 agent 系统的真实慢路径。**

## 它解决什么问题

很多 agent 系统出问题时，表面现象都很像：

- TUI 显示 `gateway disconnected`
- WebSocket handshake timeout
- gateway request timeout
- tick timeout
- memory 维护任务卡住
- 后台 cron/model 超时
- memory search 越跑越慢
- 操作者反复重启，最后把还在跑的任务打断

Gateway Guardian 做的事很克制：先看证据，再给结论。它会检查 gateway status、health、running tasks、task audit、stability heartbeat、日志模式、进程状态和 memory/vector 退化信号，然后输出结构化诊断报告。

## 核心能力

- 重启前预检：`ALLOW / CAUTION / BLOCK`
- 网关 watchdog：`healthy / degraded / critical`
- 安全 dry-run restart：不真重启也能看风险
- 诊断报告：保留证据，而不是只给一句“超时了”
- 压力训练：用多场景 agent 查询压测 route、semantic、vector、memory search、health、status、tasks、audit
- 退化识别：识别 stuck session、cron/model timeout、sqlite-vec unavailable、vector recall degraded

## 适合谁

- 正在运行 OpenClaw 的个人或团队
- 正在搭 AI agent gateway / MCP gateway 的开发者
- 遇到过 agent 长任务卡死、TUI 断连、后台任务超时的人
- 想把 agent 系统从“能演示”推进到“能长期干活”的人

## 它不是什么

- 不是 OpenClaw core 的替代品
- 不是上游模型服务的 SLA 保证
- 不是多租户安全沙箱
- 不是自动改配置的黑盒工具
- 不是用来掩盖慢路径的漂亮仪表盘

## 定位

Gateway Guardian 是“小乙-星环协议”长期 agent 可靠性体系里的一个基础组件。它免费开源，是为了让更多人看见：真正能干活的 agent，不只是会回答问题，还要能在长时间运行、失败恢复、任务保护和记忆检索退化中保持工程理性。

## 推荐标语

> 少重启一次，少丢一次任务；早定位一次，少熬一次夜。

> Gateway hardening for agents that do real work.
