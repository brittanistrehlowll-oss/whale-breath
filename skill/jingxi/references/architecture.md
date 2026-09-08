# 鲸息部署架构（jingxi V1.0.1 Pure Breath）

V1.0.1 起鲸息是**纯 cordis 插件包**，无独立 Host / Guardian / 离线页，
无任何长期运行进程。

```
用户（DSH 页面 / 浏览器）
      │
      ▼
dsh-jingxi 插件包（profiles/node_modules/dsh-jingxi，注入 DSH web）
  ├─ 侧栏鲸鱼入口（currentColor，官方 FishLogo 几何 + 喷水线）
  └─ 呼吸轨迹浮层：基础调用事实（轮次/Token/时长/Cache/速度）
     + 呼吸曲线（事件刻度、Event Rail、最近 5 轮、阶段故事）
```

## 部署布局

| 内容 | 位置 |
|---|---|
| 插件包 | `<home>\profiles\node_modules\dsh-jingxi\`（lib/ assets/icons/ test/ package.json cordis.patch.yml README.md） |
| 插件注册 | `<home>\profiles\web\cordis.patch.yml` 中 `- insert:` 行（id: jingxi, name: dsh-jingxi, inject: [webServer]） |
| manifest | `<home>\jingxi\manifest.json`（只记真实部署的文件） |
| 更新备份 | `<home>\jingxi\backups\<版本>-<时间戳>\dsh-jingxi\` |

`<home>` 自动探测：CLI home（`$env:DSH_HOME`，缺省 `C:\Users\wx\.dsh`）
与 Desktop harness（`$env:APPDATA\dsh-desktop\harness`），存在的才部署。

## 源仓库

whale-breath（`C:\Users\wx\whale-breath`）仓库根目录即插件包根：
`lib/`、`assets/icons/`、`test/`、`package.json`、`cordis.patch.yml`。
install.ps1 从仓库根部署；update.ps1 从 `$RepoPath\skill\jingxi\scripts\install.ps1`
执行，保证源脚本一致。

## 所有权与安全边界

- 安装/升级脚本不修改 DSH 官方源码、不 kill 进程、不在会话内重启 DSH。
- 源文件缺失在任何写动作之前 throw；任何一步失败即终止，不留"假完成"。
- update.ps1 部署前备份现部署目录，验证失败自动回滚。
- uninstall.ps1 只移除真实部署物，幂等，不碰未知文件。
- 鲸息 UI 只读呈现调用事实；DSH 官方更新检查在设置区「诊断与修复」中
  只读呈现（针对 deepseek-ai/deepseek-harness 官方发布），界面不提供
  更新/重启按钮。
