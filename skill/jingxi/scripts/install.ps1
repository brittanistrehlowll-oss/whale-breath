# install.ps1 — 鲸息 V1.0.2 安装（jingxi Skill 动作之一）
#
# 部署：从仓库根目录部署 dsh-jingxi 插件包到各 DSH home 的
#       profiles/node_modules/dsh-jingxi，并注册 cordis 插件行。
# 目标：自动探测 CLI home（$env:DSH_HOME，缺省 C:\Users\wx\.dsh）与
#       Desktop harness（$env:APPDATA\dsh-desktop\harness）；存在的才部署。
#       -DshHome 显式指定时只装该处。
# 幂等：重复运行不产生重复条目/重复配置。
# 安全：源文件缺失在任何写动作之前 throw；任何一步失败即终止，不留"假完成"。
#       不修改 DSH 官方源码；不 kill 进程；不覆盖未知用户文件。
[CmdletBinding()]
param(
  [string]$DshHome,
  [switch]$SkipDoctor
)

$ErrorActionPreference = 'Stop'

function Step($m) { Write-Host "[jingxi install] $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "  OK  $m" -ForegroundColor Green }
function Warn($m) { Write-Host "  !!  $m" -ForegroundColor Yellow }

# 镜像复制目录（robocopy /MIR 等效：先清后拷，幂等；纯 PowerShell，PS5.1 兼容）
function Copy-Mirror($src, $dst) {
  if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $dst | Out-Null
  Copy-Item (Join-Path $src '*') $dst -Recurse -Force
}

# ———— 0. 定位源仓库 ————
# scripts -> jingxi -> skill -> repo root
$repoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Step "REPO ROOT = $repoRoot"

# ———— 1. 源校验（任何写动作之前） ————
$requiredSrc = @('lib\client.js', 'lib\index.js', 'package.json', 'cordis.patch.yml')
foreach ($rel in $requiredSrc) {
  $p = Join-Path $repoRoot $rel
  if (-not (Test-Path $p)) { throw "源文件缺失: $p（仓库不完整，终止安装，未做任何改动）" }
  if ((Get-Item $p).Length -eq 0) { throw "源文件为空: $p（仓库不完整，终止安装，未做任何改动）" }
}
$pkgVersion = (Get-Content (Join-Path $repoRoot 'package.json') -Raw | ConvertFrom-Json).version
Ok "源校验通过（dsh-jingxi v$pkgVersion）"

# ———— 2. 目标探测 ————
$targets = @()
if ($DshHome) {
  if (-not (Test-Path $DshHome)) { throw "指定的 DshHome 不存在: $DshHome" }
  $targets += $DshHome
} else {
  $cliHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { 'C:\Users\wx\.dsh' }
  $desktopHome = Join-Path $env:APPDATA 'dsh-desktop\harness'
  if (Test-Path $cliHome)    { $targets += $cliHome }
  if (Test-Path $desktopHome) { $targets += $desktopHome }
  if ($targets.Count -eq 0) {
    throw "未发现任何 DSH home（CLI: $cliHome；Desktop: $desktopHome）。请先安装 DSH，或用 -DshHome 显式指定。"
  }
}
Step "部署目标: $($targets -join ' ; ')"

# ———— 3. 部署清单 ————
$deployDirs  = @('lib', 'assets\icons', 'test')
$deployFiles = @('package.json', 'cordis.patch.yml', 'README.md')
$keyFiles    = @('lib\index.js', 'lib\client.js', 'package.json', 'cordis.patch.yml')

foreach ($targetHome in $targets) {
  Step "部署到 $targetHome"
  $pkgDst = Join-Path $targetHome 'profiles\node_modules\dsh-jingxi'
  New-Item -ItemType Directory -Force -Path $pkgDst | Out-Null

  # 目录：镜像复制（robocopy /MIR 等效）
  foreach ($d in $deployDirs) {
    $src = Join-Path $repoRoot $d
    $dst = Join-Path $pkgDst $d
    if (Test-Path $src) {
      Copy-Mirror $src $dst
    } else {
      Warn "源目录不存在（跳过）: $src"
    }
  }
  # 单文件
  foreach ($f in $deployFiles) {
    $src = Join-Path $repoRoot $f
    if (Test-Path $src) {
      Copy-Item $src (Join-Path $pkgDst $f) -Force
    } else {
      Warn "源文件不存在（跳过）: $src"
    }
  }

  # ———— 部署物校验（关键文件存在且非零） ————
  foreach ($rel in $keyFiles) {
    $p = Join-Path $pkgDst $rel
    if (-not (Test-Path $p)) { throw "部署校验失败: $p 不存在" }
    if ((Get-Item $p).Length -eq 0) { throw "部署校验失败: $p 为空文件" }
  }
  Ok "dsh-jingxi 包已部署并校验（$pkgDst）"

  # ———— 注册 cordis 插件行（幂等） ————
  $patchPath = Join-Path $targetHome 'profiles\web\cordis.patch.yml'
  if (Test-Path $patchPath) {
    $patch = Get-Content $patchPath -Raw
    if ($patch -match 'name:\s*dsh-jingxi') {
      Ok "web profile 已注册 dsh-jingxi（幂等）"
    } else {
      $patch += "`n# dsh-jingxi V1.0.2 Pure Breath (installed by jingxi skill)`n- insert:`n    - id: jingxi`n      name: dsh-jingxi`n      inject: [webServer]`n"
      Set-Content -Path $patchPath -Value $patch -Encoding UTF8
      Ok "cordis.patch.yml 已写入 dsh-jingxi 包式行（inject: [webServer]）"
    }
  } else {
    Warn "web profile cordis.patch.yml 不存在（跳过插件注册）: $patchPath"
  }

  # ———— manifest（只记真实部署的文件） ————
  $jxHome = Join-Path $targetHome 'jingxi'
  New-Item -ItemType Directory -Force -Path $jxHome | Out-Null
  $manifestPath = Join-Path $jxHome 'manifest.json'
  if (Test-Path $manifestPath) {
    $old = Get-Content $manifestPath -Raw | ConvertFrom-Json
    if ($old.version -eq $pkgVersion) { Warn "manifest 已存在且版本一致（幂等安装，刷新）" }
    else { Warn "manifest 版本不同 ($($old.version) -> $pkgVersion)，升级式安装" }
  }
  $deployed = @(Get-ChildItem $pkgDst -Recurse -File | ForEach-Object {
    ($_.FullName.Substring($targetHome.Length + 1)) -replace '\\', '/'
  } | Sort-Object)
  $manifest = @{
    name = 'jingxi'
    version = $pkgVersion
    installedAt = (Get-Date -Format o)
    source = $repoRoot
    home = $targetHome
    packageDir = 'profiles/node_modules/dsh-jingxi'
    files = $deployed
  }
  $manifest | ConvertTo-Json -Depth 4 | Set-Content -Path $manifestPath -Encoding UTF8
  Ok "manifest 已保存（$($deployed.Count) 个文件）: $manifestPath"

  # ———— doctor ————
  if (-not $SkipDoctor) {
    Step "运行 doctor（$targetHome）…"
    & (Join-Path $PSScriptRoot 'doctor.ps1') -DshHome $targetHome
  }
}

Write-Host ""
Write-Host "install 完成。插件生效需重启 DSH web（由外部 watchdog/用户处理，绝不在会话内直接重启）。"
