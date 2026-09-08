# uninstall.ps1 — 卸载鲸息（jingxi Skill 动作之一）
#
# 只移除真实部署物：dsh-jingxi 包目录 + cordis.patch.yml 注册行 + manifest。
# 幂等；不碰未知文件；DSH 数据、设置、会话、官方文件一律不动。
# 备份目录（jingxi/backups）为用户历史数据，默认保留。
[CmdletBinding()]
param(
  [string]$DshHome,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

Write-Host "[jingxi uninstall] 开始卸载…" -ForegroundColor Cyan

# ———— 目标探测（与 install.ps1 同规则） ————
$targets = @()
if ($DshHome) {
  if (-not (Test-Path $DshHome)) { throw "指定的 DshHome 不存在: $DshHome" }
  $targets += $DshHome
} else {
  $cliHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { 'C:\Users\wx\.dsh' }
  $desktopHome = Join-Path $env:APPDATA 'dsh-desktop\harness'
  if (Test-Path $cliHome)     { $targets += $cliHome }
  if (Test-Path $desktopHome) { $targets += $desktopHome }
  if ($targets.Count -eq 0) { Write-Warning "未发现任何 DSH home，无需卸载"; exit 0 }
}
Write-Host "  卸载目标: $($targets -join ' ; ')"

foreach ($targetHome in $targets) {
  Write-Host "[jingxi uninstall] $targetHome" -ForegroundColor Cyan

  # 1. 移除 web profile 插件注册行（整块移除：注释 + - insert: 块）
  $patchPath = Join-Path $targetHome 'profiles\web\cordis.patch.yml'
  if (Test-Path $patchPath) {
    $patch = Get-Content $patchPath -Raw
    if ($patch -match 'dsh-jingxi' -or $patch -match 'id:\s*jingxi') {
      $lines = $patch -split "`n"
      $out = New-Object System.Collections.Generic.List[string]
      $i = 0
      while ($i -lt $lines.Count) {
        $line = $lines[$i]
        # 跳过安装时写入的注释行
        if ($line -match 'installed by jingxi skill') { $i++; continue }
        # insert 块：收集后续缩进行，整块含 jingxi 则整块移除
        if ($line -match '^\s*-\s*insert:\s*$') {
          $block = @($line); $j = $i + 1
          while ($j -lt $lines.Count -and $lines[$j] -match '^\s+\S') { $block += $lines[$j]; $j++ }
          if (($block -join "`n") -match 'jingxi') { $i = $j; continue }
          foreach ($b in $block) { $out.Add($b) }; $i = $j; continue
        }
        $out.Add($line); $i++
      }
      # 压缩 3 个以上连续空行
      $result = ($out -join "`n") -replace "(`n[ \t]*){3,}", "`n`n"
      Set-Content -Path $patchPath -Value $result -Encoding UTF8
      Write-Host "  已从 cordis.patch.yml 移除 dsh-jingxi 注册块"
    } else {
      Write-Host "  cordis.patch.yml 无 dsh-jingxi 注册行（幂等跳过）"
    }
  }

  # 2. 删除 dsh-jingxi 包目录
  $pkgDst = Join-Path $targetHome 'profiles\node_modules\dsh-jingxi'
  if (Test-Path $pkgDst) {
    Remove-Item $pkgDst -Recurse -Force
    Write-Host "  已删除包目录: $pkgDst"
  } else {
    Write-Host "  包目录不存在（幂等跳过）"
  }

  # 3. 删除 manifest；jingxi 目录仅在为空时移除（保留 backups 等用户数据）
  $jxHome = Join-Path $targetHome 'jingxi'
  $manifestPath = Join-Path $jxHome 'manifest.json'
  if (Test-Path $manifestPath) {
    Remove-Item $manifestPath -Force
    Write-Host "  已删除 manifest: $manifestPath"
  }
  if (Test-Path $jxHome) {
    $rest = Get-ChildItem $jxHome -Force -ErrorAction SilentlyContinue
    if (-not $rest) {
      Remove-Item $jxHome -Force
      Write-Host "  已删除空目录: $jxHome"
    } else {
      Write-Host "  保留 $jxHome（含 $($rest.Name -join ', ') 等非本清单内容）"
    }
  }
}

Write-Host ""
Write-Host "uninstall 完成。DSH 数据/设置/会话未受影响。若插件代码已加载，重启 DSH web 后完全移除。"
