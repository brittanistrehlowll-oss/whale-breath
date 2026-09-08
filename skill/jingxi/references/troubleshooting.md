# 鲸息 troubleshooting

## 安装后侧边栏没有鲸息

1. 运行 doctor.ps1，确认 `web profile cordis.patch.yml 含 dsh-jingxi 注册行`。
2. 确认插件包已部署：`<home>\profiles\node_modules\dsh-jingxi\lib\index.js`
   存在且非零（doctor 会逐项校验）。
3. 重启 DSH web（由外部 watchdog 或用户手动处理，不要在会话内直接重启）。
4. 若 cordis.patch.yml 有语法问题，检查 YAML 缩进（`- insert:` 下子项必须缩进）。

## install.ps1 报「未发现任何 DSH home」

1. CLI 场景：确认 `$env:DSH_HOME` 或缺省 `C:\Users\wx\.dsh` 存在。
2. Desktop 场景：确认 `$env:APPDATA\dsh-desktop\harness` 存在。
3. 或用 `-DshHome <路径>` 显式指定单个目标。

## install.ps1 报「源文件缺失」

仓库不完整（缺 lib/client.js、lib/index.js、package.json 或 cordis.patch.yml）。
脚本会在任何写动作之前终止，不会留下半截部署。重新 clone/pull
whale-breath 仓库后重试。

## update.ps1 报「git pull 失败」

pull 失败即终止，未改动任何部署。检查网络/远程/本地是否有未提交修改
（--ff-only 要求可快进），处理后重跑。

## 更新后插件异常

update.ps1 部署前已把旧版本备份到 `<home>\jingxi\backups\<版本>-<时间戳>\`；
部署验证失败会自动回滚。若需手动回滚，把备份目录里的 `dsh-jingxi`
整体复制回 `<home>\profiles\node_modules\dsh-jingxi` 即可。

## 「检查 DSH 更新」与「升级鲸息」的区别

- 鲸息设置区「诊断与修复」的 DSH 更新检查 → 只读针对
  `deepseek-ai/deepseek-harness` 官方发布，界面无更新/重启按钮。
- Skill `update.ps1` → 只更新鲸息自身。
- doctor 报告的是鲸息部署版本（manifest 与包 package.json 一致性）。
