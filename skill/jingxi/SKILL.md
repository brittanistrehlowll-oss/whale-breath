---
name: jingxi
description: 安装、升级、诊断、打开和卸载鲸息（DeepSeek Harness 的轻量伴生插件：侧栏鲸鱼入口直达呼吸轨迹）
disable-model-invocation: true
user-invocable: true
jingxiVersion: 1.0.3
---

# jingxi — 鲸息

鲸息（jingxi）V1.0.3（Pure Breath）是 DeepSeek Harness 的轻量伴生插件：
侧边栏一个鲸鱼入口，**点击直达呼吸轨迹浮层**——只呈现基础调用事实
（轮次/步数、Token、时长、Cache 命中、速度）与呼吸曲线（事件刻度、Event
Rail、最近 5 轮、阶段故事）。计费/额度、中间面板、侧栏快捷操作行与版本行
均已移除；DSH 更新检查在设置区「诊断与修复」中只读呈现。

本 Skill 只负责**安装 / 升级 / 诊断 / 打开 / 卸载**鲸息运行时，本身不承载 UI 或
长期运行的服务（Skill 不是 runtime）。

## 动作（仅这 5 个）

| 动作 | 命令 | 说明 |
|---|---|---|
| 安装鲸息 | 运行 `scripts/install.ps1` | 从仓库根目录部署 dsh-jingxi 插件包到各 DSH home 的 `profiles/node_modules/dsh-jingxi` 并注入 cordis 插件行；自动探测 CLI/Desktop home；幂等 |
| 打开鲸息 | 运行 `scripts/open.ps1` | 打开 DSH 内的鲸息页面（http://127.0.0.1:3080/jingxi） |
| 升级鲸息 | 运行 `scripts/update.ps1` | 更新鲸息自身（**不是**更新 DSH）；git pull 失败即终止，部署前备份、失败自动回滚 |
| 诊断鲸息 | 运行 `scripts/doctor.ps1` | 校验真实部署物：包文件齐全 + 注册行存在 + 版本一致（只读） |
| 卸载鲸息 | 运行 `scripts/uninstall.ps1` | 只移除真实部署物（包目录 + 注册行 + manifest）；幂等，不碰未知文件与 DSH 数据 |

## 执行规则

- 每次只执行一个动作；用户未明确要求时不得运行 install/uninstall/update。
- 先运行 `scripts/doctor.ps1` 再执行其他动作，除非用户直接指定。
- 所有脚本须以用户身份运行（不需要管理员，除非 doctor 明确提示）。
- 不得修改 DSH 官方源码、不得直接 kill DSH 进程、不得写未知文件。
- 「升级鲸息」与「检查 DSH 更新」是两件不同的事：
  - `update.ps1` 只更新鲸息自身；
  - DSH 官方更新在鲸息设置区「诊断与修复」中只读检查（针对
    deepseek-ai/deepseek-harness 官方发布），界面不提供更新/重启按钮。

## 参考

- `references/architecture.md` — 鲸息部署架构（V1.0.1：纯插件包，无独立 Host/Guardian）
- `references/troubleshooting.md` — 常见问题

## 卸载承诺

`uninstall.ps1` 只移除真实部署物（包目录 + 注册行 + manifest）；DSH 数据、设置、会话不受影响。
