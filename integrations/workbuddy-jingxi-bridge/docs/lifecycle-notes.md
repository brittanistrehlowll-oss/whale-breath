# DSH 生命周期只读观察附录（lifecycle-notes）

> 性质：只读归因笔记；不构成修复；Bridge 永不隐式拉起/重启/维持 DSH。

## 已观察事实（2026-09-08/09，多次实证）

| 实例 | 启动来源 | 存活表现 |
|---|---|---|
| DSH CLI web（pid 21776，09-08 白天） | 用户既有启动链 | 稳定运行 7+ 小时 |
| Agent 拉起的 5 个实例（09-08 晚，pid 28492/22336/32788 等） | 本会话后台任务/Start-Process | 1–3 分钟内被静默终止（无错误日志、stderr 干净） |
| Agent 拉起的 2 个实例（09-09，pid 31484/28360） | 本会话后台任务（净环境变量） | 采集完成后离线，规律一致 |

## 只读归因（证据强度分层）

- **已证实**：① 死亡是静默的（无 DSH 错误输出）；② 与启动方式强相关（用户链路稳定、Agent 链路短寿）；③ 与代码/配置无关（同一二进制与 home）；④ safe-delete NODE_OPTIONS shim 会致死（已规避：拉起时清空 4 个环境变量）；⑤ 崩溃遗留的 `.credentials.yaml.lock` 会阻塞后续启动（需手动清除）。
- **疑似（NOT_VERIFIED）**：本机第三方安全软件终止「非常见父链的 node 监听进程」。该软件此前有拦截 npm 文件替换（移回收站）的实证记录，与本现象兼容，但无直接日志证据，故不升级为结论。
- **不可归因项**：DSH Desktop harness（Electron 拉起）长期稳定——与「疑似安全软件」假说部分冲突（Electron 父链可能被信任）；仅记为观察，不强行统一解释。

## 对 Bridge 的约束（已实现并测试）

- 离线即受控失败：`LOOPBACK_REFUSED/LOOPBACK_TIMEOUT → DSH_NOT_RUNNING`，单次请求、3.5s 超时、零重试、零轮询风暴；
- 绝不隐式执行：`install / open / update / uninstall / watchdog marker / 拉起 DSH`；
- 对操作者的建议（仅提示、不自动执行）：DSH 应由用户既有链路启动（用户终端 `dsh web` 或其既有 watchdog）；Agent 拉起实例在本机不具备长时可靠性。

## 待办（需另行授权）

- 真实新请求生命周期验收（含模型请求与额度消耗，`WAITING_FOR_AUTHORIZATION`）；
- 若需长时在线演示，由用户启动 DSH；Bridge 只负责读取。
