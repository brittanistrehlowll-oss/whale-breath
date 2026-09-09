# workbuddy-jingxi-bridge（鲸息只读业务桥接）v0.1.0

WorkBuddy → Jingxi Bridge → DSH Runtime 的**只读**桥接组件。
定位：让 WorkBuddy 能真实读取鲸息运行态（版本/状态/呼吸快照/会话摘要），
**不**构成完整 WorkBuddy 产品集成，**不**承担安装/升级/卸载/生命周期控制。

> This component provides read-only WorkBuddy access to Jingxi runtime facts.
> It does not provide fresh model requests, DSH lifecycle control, or full WorkBuddy product integration.
>
> 本组件仅提供 WorkBuddy 对鲸息运行事实的只读读取能力。
> 不发起模型请求，不控制 DSH 生命周期，不执行安装、更新或卸载，
> 不等于鲸息已经完成 WorkBuddy 全量业务集成。

## 边界

- 仅回环（`127.0.0.1 / localhost / [::1]`）、仅 GET、零外部网络；
- 零模型请求、零 Provider 调用、零额度消耗、零文件上传、零 DSH 配置修改、零 DSH 生命周期控制；
- 字段白名单 + 会话脱敏（前 8 位别名）+ 错误脱敏（仅错误码，不透传原始 HTTP 体）；
- 鲸息核心 V1.0.4 语义冻结；运维 Skill（skill/jingxi）保持 DO_NOT_INSTALL_YET。

## 目录

```text
bridge-contract.json   机器可读合同（方法/信封/七态/白名单/禁区/不可执行项）
SKILL.md               WorkBuddy 侧技能定义（部署到 ~/.workbuddy/skills/jingxi-bridge/）
scripts/
  bridge.mjs           桥实现（Node ≥20，零依赖）
  security-scan.mjs    防回归安全扫描（区分 executable/fixtures/docs 作用域）
  deploy-check.mjs     仓库源与本机部署副本一致性检查
tests/
  bridge-contract.test.mjs  合同一致性（方法/白名单/信封/禁区）
  bridge-states.test.mjs    七态状态机（fixture stub 全覆盖）
  fixtures/stub-dsh.mjs     可控 DSH  stub（不触真实 DSH）
docs/
  lifecycle-notes.md        DSH 生命周期只读观察附录
```

## 运行

```bash
node scripts/bridge.mjs health                 # DSH 是否在线
node scripts/bridge.mjs status                 # 鲸息版本状态
node scripts/bridge.mjs status --expect-version 1.0.4
node scripts/bridge.mjs breath                 # 呼吸快照（脱敏）
node scripts/bridge.mjs session                # 会话摘要
```

返回统一信封：`{ ok, state, method, observedAt, runtime, data, warnings, error, meta }`；
`state` 七态：`DSH_RUNNING / STALE_SNAPSHOT / NO_SESSION / DSH_NOT_RUNNING / JINGXI_NOT_REGISTERED / VERSION_MISMATCH / RUNTIME_ERROR`。

## 测试（五类分离，不混总数）

```bash
# A. 鲸息核心（本仓库 test/）：220/220 基线，与本组件无关
node --test "test/*.test.mjs"

# B. Bridge 专项（合同 + 七态 fixture）
node --test "integrations/workbuddy-jingxi-bridge/tests/*.test.mjs"

# C. Bridge 静态安全扫描
node integrations/workbuddy-jingxi-bridge/scripts/security-scan.mjs

# D. 部署副本一致性（仓库源 vs ~/.workbuddy/skills/jingxi-bridge/）
node integrations/workbuddy-jingxi-bridge/scripts/deploy-check.mjs

# E. 现场双态验收（离线/在线只读，见 docs 与交付报告）
```

## 版本谱系

鲸息主线：V1.0.4（0.5.2-dev/V5.9/269 为 2026-08-29 冻结历史；dsh-control-center 为过渡态）。
Bridge 独立版本 0.1.0，不改变核心版本号。

## 非目标（non-goals）

完整 WorkBuddy 产品集成 / 真实模型请求生命周期 / 子代理新请求生命周期 /
自动更新、自动重启、安装、卸载 / 任何依赖真实额度的验证。
