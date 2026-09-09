# WorkBuddy 只读桥接状态（WORKBUDDY_BRIDGE_STATUS）

> 更新时间：2026-09-09 · 适用分支：`feat/workbuddy-jingxi-readonly-bridge-v0.1.0`

## 冻结边界（本任务切片必须保持）

- **Whale Breath V1.0.4 core remains frozen for this bridge slice.** 核心遥测、呼吸曲线、UI 业务语义不因本切片改变。
- **This change does not establish full WorkBuddy product integration.** 本桥是只读业务桥接，不等于鲸息「完整接入 WorkBuddy」。
- **The bridge is read-only and loopback-only.** 仅 GET、仅 127.0.0.1/localhost 受控等价形式。
- **No model request, provider call, token consumption, or external upload is performed.** 零模型请求、零 Provider 调用、零额度消耗、零外部上传。
- **The operational Jingxi skill remains `DO_NOT_INSTALL_YET`.** `skill/jingxi`（安装/升级/诊断/打开/卸载）保留为候选运维组件，不安装；与本桥职责不重叠。
- **Fresh streaming lifecycle verification remains `WAITING_FOR_AUTHORIZATION`.** 真实新请求生命周期验收需用户单独授权（可能触发模型请求与额度消耗）。

## 当前状态

```text
Whale Breath Core:      V1.0.4（main@85af7e8，语义冻结）
DSH Host:               PASS_WITH_NOTES（可内部演示、可限范围试用）
WorkBuddy Read-only Bridge: BRIDGE_READONLY_PASS → 本切片将其固化为仓库正式组件
WorkBuddy Operational Skill: DO_NOT_INSTALL_YET
Fresh Request Lifecycle: WAITING_FOR_AUTHORIZATION
Formal Delivery:        FORMAL_GATE_HOLD
```

## 组件位置

- 仓库内正式组件：`integrations/workbuddy-jingxi-bridge/`（版本 0.1.0）
- 本机部署目标：`~/.workbuddy/skills/jingxi-bridge/`（仅部署目标，不纳入 Git）
- 合同：`integrations/workbuddy-jingxi-bridge/bridge-contract.json`
