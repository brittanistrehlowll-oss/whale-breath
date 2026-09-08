# update.ps1 — 升级鲸息自身（jingxi Skill 动作之一）
#
# 重要：本脚本只更新「鲸息」自身（dsh-jingxi 包/whale-breath 仓库），
# 与 DSH 官方更新是两件事。
# 流程：git pull --ff-only（失败即 throw）→ 备份现部署 → 用仓库内
# install.ps1 重新部署 → 部署验证失败自动回滚。
[CmdletBinding()]
param(
  [string]$DshHome,
  [string]$RepoPath = "C:\Users\wx\whale-breath"   # 本地鲸息源仓库
)

$ErrorActionPreference = 'Stop'
# PS7.4+ 下防止 git 等非零退出码触发终止错误（PS5.1 无此变量，赋值无害）
$global:PSNativeCommandUseErrorActionPreference = $false

function Step($m) { Write-Host "[jingxi update] $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "  OK  $m" -ForegroundColor Green }
function Warn($m) { Write-Host "  !!  $m" -ForegroundColor Yellow }

# 镜像复制目录（robocopy /MIR 等效：先清后拷；纯 PowerShell，PS5.1 兼容）
function Copy-Mirror($src, $dst) {
  if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $dst | Out-Null
  Copy-Item (Join-Path $src '*') $dst -Recurse -Force
}

Step "开始升级鲸息自身…"

if (-not (Test-Path $RepoPath)) {
  throw "鲸息源仓库不存在: $RepoPath（暂不支持自动拉取，先手动更新源仓库）"
}
if (-not (Test-Path (Join-Path $RepoPath '.git'))) {
  throw "源仓库不是 git 仓库: $RepoPath"
}

# ———— 1. 更新前版本信息 ————
$beforeCommit = (git -C $RepoPath log -1 --format=%h 2>$null)
if ($LASTEXITCODE -ne 0) { throw "读取 git commit 失败（exit $LASTEXITCODE）" }
$beforeVersion = (Get-Content (Join-Path $RepoPath 'package.json') -Raw | ConvertFrom-Json).version
Step "更新前: v$beforeVersion @ $beforeCommit"

# ———— 2. git pull --ff-only（显式检查退出码，失败即终止） ————
Step "git pull --ff-only…"
git -C $RepoPath pull --ff-only 2>&1 | ForEach-Object { Write-Host "    $_" }
if ($LASTEXITCODE -ne 0) { throw "git pull 失败（exit $LASTEXITCODE），终止更新，未改动任何部署" }

$afterCommit = (git -C $RepoPath log -1 --format=%h 2>$null)
if ($LASTEXITCODE -ne 0) { throw "读取 git commit 失败（exit $LASTEXITCODE）" }
$afterVersion = (Get-Content (Join-Path $RepoPath 'package.json') -Raw | ConvertFrom-Json).version
Step "更新后: v$afterVersion @ $afterCommit"

# ———— 3. 目标探测（与 install.ps1 同规则） ————
$targets = @()
if ($DshHome) {
  if (-not (Test-Path $DshHome)) { throw "指定的 DshHome 不存在: $DshHome" }
  $targets += $DshHome
} else {
  $cliHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { 'C:\Users\wx\.dsh' }
  $desktopHome = Join-Path $env:APPDATA 'dsh-desktop\harness'
  if (Test-Path $cliHome)     { $targets += $cliHome }
  if (Test-Path $desktopHome) { $targets += $desktopHome }
  if ($targets.Count -eq 0) { throw "未发现任何 DSH home，无可更新的部署" }
}
Step "更新目标: $($targets -join ' ; ')"

$installScript = Join-Path $RepoPath 'skill\jingxi\scripts\install.ps1'
if (-not (Test-Path $installScript)) { throw "仓库内 install.ps1 不存在: $installScript" }

# ———— 4. 逐目标：备份 → 部署 → 失败回滚 ————
foreach ($targetHome in $targets) {
  $pkgDst = Join-Path $targetHome 'profiles\node_modules\dsh-jingxi'
  $backupDir = $null

  if (Test-Path $pkgDst) {
    $deployedVersion = 'unknown'
    $deployedPkg = Join-Path $pkgDst 'package.json'
    if (Test-Path $deployedPkg) {
      $deployedVersion = (Get-Content $deployedPkg -Raw | ConvertFrom-Json).version
    }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupDir = Join-Path $targetHome "jingxi\backups\$deployedVersion-$stamp"
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    Copy-Mirror $pkgDst (Join-Path $backupDir 'dsh-jingxi')
    Ok "已备份现部署（v$deployedVersion）到 $backupDir"
  } else {
    Warn "$targetHome 尚无 dsh-jingxi 部署，直接安装（无备份）"
  }

  try {
    Step "从仓库执行 install.ps1（$targetHome）…"
    & $installScript -DshHome $targetHome -SkipDoctor
    if ($LASTEXITCODE -ne 0) { throw "install.ps1 退出码 $LASTEXITCODE" }
  } catch {
    if ($backupDir -and (Test-Path (Join-Path $backupDir 'dsh-jingxi'))) {
      Warn "部署失败，回滚 $targetHome …"
      try {
        Copy-Mirror (Join-Path $backupDir 'dsh-jingxi') $pkgDst
        Ok "回滚完成"
      } catch {
        throw "回滚也失败！备份保留在 $backupDir，请手动恢复。回滚错误: $_；原始错误见上"
      }
    }
    throw "更新失败: $_"
  }
}

# ———— 5. doctor ————
foreach ($targetHome in $targets) {
  Step "运行 doctor（$targetHome）…"
  & (Join-Path $PSScriptRoot 'doctor.ps1') -DshHome $targetHome
}

Write-Host ""
Write-Host "[jingxi update] 完成: v$beforeVersion @ $beforeCommit -> v$afterVersion @ $afterCommit"
Write-Host "若插件代码变化，需重启 DSH web 生效（外部 watchdog/用户处理）。"
Write-Host "注意：这不是 DSH 官方更新。"
