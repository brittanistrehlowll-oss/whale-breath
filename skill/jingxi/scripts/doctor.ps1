# doctor.ps1 — 鲸息 V1.0.3 诊断（jingxi Skill 动作之一）
#
# 只校验真实部署物：包文件齐全 + 注册行存在 + 版本一致。
# 只读诊断：不做任何修改。
[CmdletBinding()]
param(
  [string]$DshHome
)

$ErrorActionPreference = 'Continue'

function Section($t) { Write-Host ""; Write-Host "=== $t ===" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "  [PASS] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "  [WARN] $m" -ForegroundColor Yellow }
function Fail($m) { Write-Host "  [FAIL] $m" -ForegroundColor Red }
function Info($m) { Write-Host "  [info] $m" -ForegroundColor Gray }

# ———— 目标探测（与 install.ps1 同规则） ————
$targets = @()
if ($DshHome) {
  $targets += $DshHome
} else {
  $cliHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { 'C:\Users\wx\.dsh' }
  $desktopHome = Join-Path $env:APPDATA 'dsh-desktop\harness'
  if (Test-Path $cliHome)     { $targets += $cliHome }
  if (Test-Path $desktopHome) { $targets += $desktopHome }
}

Section "DSH homes"
if ($targets.Count -eq 0) {
  Fail "未发现任何 DSH home（CLI/Desktop）"
} else {
  foreach ($t in $targets) { Ok "发现: $t" }
}

# ———— DSH 运行状态（只读） ————
Section "DSH Runtime"
try {
  $h = Invoke-RestMethod -Uri 'http://127.0.0.1:3080/api/system/health' -TimeoutSec 4
  if ($h.ready) { Ok "DSH ready (bootId=$($h.bootId), pid=$($h.pid))" }
  else { Warn "DSH 可达但未 ready" }
} catch {
  Info "DSH :3080 不可达（可能已关闭，不影响部署校验）"
}

$keyFiles = @('lib\index.js', 'lib\client.js', 'package.json', 'cordis.patch.yml')

foreach ($targetHome in $targets) {
  Section "部署校验: $targetHome"

  if (-not (Test-Path $targetHome)) { Fail "home 不存在: $targetHome"; continue }

  # 包文件齐全
  $pkgDst = Join-Path $targetHome 'profiles\node_modules\dsh-jingxi'
  if (Test-Path $pkgDst) {
    $missing = @()
    foreach ($rel in $keyFiles) {
      $p = Join-Path $pkgDst $rel
      if (-not (Test-Path $p) -or (Get-Item $p).Length -eq 0) { $missing += $rel }
    }
    if ($missing.Count -eq 0) { Ok "包文件齐全（$($keyFiles -join ', ')）" }
    else { Fail "包文件缺失或为空: $($missing -join ', ')" }
  } else {
    Fail "dsh-jingxi 包未部署: $pkgDst"
  }

  # 注册行存在
  $patchPath = Join-Path $targetHome 'profiles\web\cordis.patch.yml'
  if (Test-Path $patchPath) {
    $content = Get-Content $patchPath -Raw
    if ($content -match 'name:\s*dsh-jingxi') { Ok "web profile cordis.patch.yml 含 dsh-jingxi 注册行" }
    else { Warn "web profile 未注册 dsh-jingxi 插件" }
  } else {
    Warn "web profile cordis.patch.yml 不存在: $patchPath"
  }

  # 版本一致（部署包 vs manifest）
  $manifestPath = Join-Path $targetHome 'jingxi\manifest.json'
  $pkgJsonPath = Join-Path $pkgDst 'package.json'
  if ((Test-Path $manifestPath) -and (Test-Path $pkgJsonPath)) {
    $mVer = (Get-Content $manifestPath -Raw | ConvertFrom-Json).version
    $pVer = (Get-Content $pkgJsonPath -Raw | ConvertFrom-Json).version
    if ($mVer -eq $pVer) { Ok "版本一致: manifest=$mVer, package=$pVer" }
    else { Fail "版本不一致: manifest=$mVer, package=$pVer（建议重跑 install/update）" }
  } elseif (Test-Path $pkgJsonPath) {
    Warn "manifest 不存在（可能非本 skill 安装）: $manifestPath"
  } else {
    Info "无部署可比对版本"
  }
}

Write-Host ""
Write-Host "doctor 完成。"
