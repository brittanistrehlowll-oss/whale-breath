# open.ps1 — 打开鲸息（jingxi Skill 动作之一）
#
# 只打开 DSH 内的鲸息页（/jingxi）。V1.0.1 起无独立离线 Host。
[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'

$url = 'http://127.0.0.1:3080/jingxi'
try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3080/api/system/health' -TimeoutSec 2 -UseBasicParsing
  if ($r.StatusCode -ne 200) { throw "HTTP $($r.StatusCode)" }
} catch {
  Write-Host "[jingxi open] DSH :3080 不可达。请先启动 DSH，再访问 $url" -ForegroundColor Yellow
  exit 1
}

Write-Host "[jingxi open] 打开 $url"
Start-Process $url
