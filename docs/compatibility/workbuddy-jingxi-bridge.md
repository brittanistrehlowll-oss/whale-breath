# 兼容矩阵 — workbuddy-jingxi-bridge（只读桥接）

> 更新时间：2026-09-09 · 分支：`feat/workbuddy-jingxi-readonly-bridge-v0.1.0`

| 项目 | 当前值 | 备注 |
|---|---|---|
| Whale Breath Core version | `1.0.4` | 语义冻结；Bridge 不改变核心版本号 |
| Core design version | `V1.0.4` | lib/index.js designVersion |
| Jingxi Bridge version | `0.1.0` | 独立版本线，勿与核心版本混写 |
| DSH runtime（已验证） | `0.1.3-alpha`（pnpm 安装，CLI `dsh web`） | bootId dsh-20260909-154819 实证 |
| DSH Desktop harness（已部署） | Desktop harness home（%APPDATA%\dsh-desktop\harness） | 部署副本与源仓库 SHA 一致 |
| WorkBuddy（已验证） | 本机客户端（Bridge 部署于 `~/.workbuddy/skills/jingxi-bridge/`） | 通过 bridge.mjs 实跑验证 |
| Node（测试矩阵） | 22 / 24 | CI 与本地双跑 |
| 支持状态 | **只读回环读取**（health/status/breath/session） | 仅 127.0.0.1/localhost/[::1]、仅 GET |
| 不支持 | 新模型请求 / 实时流生命周期 / 安装 / 更新 / 卸载 / DSH 生命周期控制 / 外部写入 / 凭据接触 | — |

## 版本独立管理声明

- Whale Breath Core 与 Jingxi Bridge 为两条独立版本线：Core `1.0.4`、Bridge `0.1.0`。
- Bridge 的版本升级（0.1.x）不得牵动核心版本号；核心的版本演进亦不要求 Bridge 同步改号，除非合同面变化。
