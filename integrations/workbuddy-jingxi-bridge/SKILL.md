---
name: jingxi-bridge
description: 鲸息只读业务桥接（WorkBuddy → Jingxi Bridge → DSH Runtime）：读取鲸息版本/状态/呼吸快照/会话摘要。仅回环、仅 GET、字段白名单、会话脱敏。不承担安装/升级/卸载（候选运维组件 skill/jingxi，DO_NOT_INSTALL_YET）；不构成完整 WorkBuddy 产品集成。
disable-model-invocation: true
user-invocable: true
bridgeVersion: 0.1.0
---

# jingxi-bridge — 鲸息只读业务桥接（仓库正式组件 v0.1.0）

WorkBuddy 经本桥读取 DSH 宿主中鲸息（jingxi）插件的**只读**状态。
本桥**不是**鲸息本体、**不是**运行时、**不是**运维入口、**不是**完整 WorkBuddy 集成。

## 方法（仅 4 个，全部只读）

| 合同方法 | 命令 | 上游（回环 GET） |
|---|---|---|
| `jingxi.runtime.health` | `node scripts/bridge.mjs health` | `/api/system/health` |
| `jingxi.status` | `node scripts/bridge.mjs status [--expect-version X]` | `/api/jingxi/status` |
| `jingxi.breath.current` | `node scripts/bridge.mjs breath` | `/api/jingxi/breath/current` |
| `jingxi.session.summary` | `node scripts/bridge.mjs session` | status + breath 聚合 |

## 七态状态机（state 字段，必查）

| state | 含义 | 处置 |
|---|---|---|
| `DSH_RUNNING` | 在线且数据为 live | 正常呈现 |
| `STALE_SNAPSHOT` | 真实但 persisted/stale（**不是失败**） | 必须标注「历史快照」，禁止伪装实时 |
| `NO_SESSION` | 在线但无目标会话 | 如实空态 |
| `DSH_NOT_RUNNING` | 回环不可达（**合法且预期的受控失败**） | 报「DSH 未运行」，不得伪造数据 |
| `JINGXI_NOT_REGISTERED` | 插件未注册（404） | 提示先安装鲸息（运维域，超出本桥） |
| `VERSION_MISMATCH` | 与期望版本不符 | 报 expected/actual |
| `RUNTIME_ERROR` | 其他受控错误 | 仅脱敏错误码，不透传原始 HTTP 体 |

## 安全边界（硬约束）

- **仅回环**：host 仅允许 `127.0.0.1 / localhost / [::1]`（实现内置硬约束）。
- **仅 GET**：零写操作；不修改 DSH 配置；不控制 DSH 生命周期（不启动/停止/重启/watchdog）。
- **零凭据**：不读取/不转述 Token、Cookie、Authorization、API Key、secret、password。
- **白名单**：仅返回合同 allowlist 字段；sessionId 只出前 8 位别名。
- **禁区**：模型正文、会话正文、Provider 账户、余额明细、真实用户绝对路径、原始 HTTP 错误体。
- **零副作用**：零模型请求、零 Provider 调用、零额度消耗、零外部上传、零重试、短超时（3.5s）。

## 执行规则

1. 每次只调一个方法；先 `health` 再视状态决定后续。
2. 展示前必读 `state`；`STALE_SNAPSHOT` 必须带「快照」口径。
3. `DSH_NOT_RUNNING` / `JINGXI_NOT_REGISTERED` 是合法结果，按状态机处置，不得补造数据。
4. 合同详见 `bridge-contract.json`（机器可读）；实现与合同的一致性由 `tests/bridge-contract.test.mjs` 强制。

## 参考

- `bridge-contract.json` — 机器可读合同
- `README.md` — 组件说明、测试与部署
- `docs/status/WORKBUDDY_BRIDGE_STATUS.md` — 冻结边界与当前状态
