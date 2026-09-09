#!/usr/bin/env node
// workbuddy-jingxi-bridge — WorkBuddy → Jingxi Bridge → DSH Runtime（只读，仓库正式组件）
// 用法: node bridge.mjs <health|status|breath|session> [--port N] [--expect-version X] [--runtime desktop|cli]
// 纪律: 仅回环（127.0.0.1/localhost/[::1]）；仅 GET；字段白名单；会话脱敏（前 8 位别名）；
//       零凭据接触；零写操作；零重试；短超时；不回传原始 HTTP 错误体。
// 合同: ../bridge-contract.json（tests 强制校验本实现与合同一致）

const CONTRACT_VERSION = '0.1.0'
const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]'])
const DEFAULT_PORT = 3080
const TIMEOUT_MS = 3500

const args = process.argv.slice(2)
const cli = args[0]
const port = Number(argValue('--port') ?? DEFAULT_PORT)
const expectVersion = argValue('--expect-version') ?? null
const runtimeHint = argValue('--runtime') ?? null

function argValue(name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}

const CLI_TO_METHOD = {
  health: 'jingxi.runtime.health',
  status: 'jingxi.status',
  breath: 'jingxi.breath.current',
  session: 'jingxi.session.summary',
}

// —— 字段白名单（与 bridge-contract.json 保持同步；tests 强制校验）——
const ALLOWLIST = {
  health: ['ready', 'bootId', 'pid', 'uptime'],
  status: ['jingxiVersion', 'packageVersion', 'designVersion', 'projectionRegistered', 'realListening'],
  breath: ['real', 'demo', 'source', 'stale', 'sessionAlias', 'kind', 'lastTurn', 'updatedAt'],
  breathLastTurn: ['turn', 'status', 'durationMs', 'curveQuality', 'toolWorkMs', 'llmMs'],
  session: ['version', 'sessionExists', 'sessionAlias', 'kind', 'freshness', 'real', 'demo', 'source', 'stale', 'roundCount', 'stepCount', 'turns', 'statusSummary', 'updatedAt'],
}

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]))
const alias = (sid) => (typeof sid === 'string' && sid.length >= 8 ? sid.slice(0, 8) : undefined)

let exitCode = 0
function emit(method, state, data, error, warnings = [], extra = {}) {
  const ok = error == null
  const envelope = {
    ok: ok,
    state: state,
    method: method,
    observedAt: new Date().toISOString(),
    runtime: ok || state === 'STALE_SNAPSHOT' || state === 'NO_SESSION' ? (runtimeHint ?? 'cli') : null,
    data: data ?? null,
    warnings: warnings,
    error: error ?? null,
    meta: { bridge: `workbuddy-jingxi-bridge/${CONTRACT_VERSION}`, contractVersion: CONTRACT_VERSION, cli, port, ...extra },
  }
  process.stdout.write(JSON.stringify(envelope, null, 2) + '\n')
  process.exit(exitCode)
}

function fail(method, state, code, message, extra = {}) {
  if (state === 'RUNTIME_ERROR') exitCode = 2
  emit(method, state, null, { code, message }, [], extra)
}

if (!CLI_TO_METHOD[cli]) {
  fail('(unknown)', 'RUNTIME_ERROR', 'BRIDGE_INTERNAL_ERROR', `unknown method: ${String(cli)}; expected health|status|breath|session`)
}
const METHOD = CLI_TO_METHOD[cli]

// —— 回环硬约束：host 只允许白名单等价形式，杜绝任何外部请求面 ——
const HOST = '127.0.0.1'
if (!ALLOWED_HOSTS.has(HOST)) fail(METHOD, 'RUNTIME_ERROR', 'BRIDGE_INTERNAL_ERROR', `host not allowed: ${HOST}`)
if (!Number.isInteger(port) || port <= 0 || port > 65535) fail(METHOD, 'RUNTIME_ERROR', 'BRIDGE_INTERNAL_ERROR', `invalid port: ${String(port)}`)
const BASE = `http://${HOST}:${port}`

async function getJson(path) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  const started = Date.now()
  try {
    const res = await fetch(BASE + path, { signal: ctrl.signal, headers: { accept: 'application/json' } })
    const latencyMs = Date.now() - started
    if (res.status === 404) return { http: 404, latencyMs }
    if (res.status >= 500) return { http: res.status, latencyMs, serverError: true }
    const text = await res.text()
    try {
      return { http: res.status, latencyMs, json: JSON.parse(text) }
    } catch {
      return { http: res.status, latencyMs, nonJson: true }
    }
  } catch (err) {
    const code = err?.name === 'AbortError' ? 'LOOPBACK_TIMEOUT' : 'LOOPBACK_REFUSED'
    return { error: code }
  } finally {
    clearTimeout(timer)
  }
}

async function jingxiStatus() {
  const r = await getJson('/api/jingxi/status')
  if (r.error) return { down: r.error }
  if (r.http === 404) return { notRegistered: true }
  if (r.serverError) return { bad: r.http }
  if (r.nonJson) return { nonJson: true }
  return { json: r.json, latencyMs: r.latencyMs }
}

async function jingxiBreath() {
  const r = await getJson('/api/jingxi/breath/current')
  if (r.error) return { down: r.error }
  if (r.http === 404) return { notRegistered: true }
  if (r.serverError) return { bad: r.http }
  if (r.nonJson) return { nonJson: true }
  return { json: r.json, latencyMs: r.latencyMs }
}

const downState = (code) => (code === 'LOOPBACK_TIMEOUT' ? 'DSH_NOT_RUNNING' : 'DSH_NOT_RUNNING')

const main = async () => {
  if (cli === 'health') {
    const r = await getJson('/api/system/health')
    if (r.error) return fail(METHOD, downState(r.error), r.error, 'DSH loopback endpoint is not reachable.')
    if (r.serverError) return fail(METHOD, 'RUNTIME_ERROR', 'UPSTREAM_HTTP_ERROR', `health http ${r.http}`)
    if (r.nonJson || !r.json) return fail(METHOD, 'RUNTIME_ERROR', 'UPSTREAM_NON_JSON', `health returned non-JSON (http ${r.http})`)
    return emit(METHOD, 'DSH_RUNNING', { runtime: pick(r.json, ['ready', 'bootId', 'pid', 'uptime']) }, null, [], { latencyMs: r.latencyMs })
  }

  if (cli === 'status') {
    const s = await jingxiStatus()
    if (s.down) return fail(METHOD, 'DSH_NOT_RUNNING', s.down, 'DSH loopback endpoint is not reachable.')
    if (s.notRegistered) return fail(METHOD, 'JINGXI_NOT_REGISTERED', 'JINGXI_HTTP_404', 'jingxi status endpoint returned 404 (plugin not registered).')
    if (s.nonJson) return fail(METHOD, 'RUNTIME_ERROR', 'UPSTREAM_NON_JSON', 'status returned non-JSON')
    if (s.bad) return fail(METHOD, 'RUNTIME_ERROR', 'UPSTREAM_HTTP_ERROR', `status http ${s.bad}`)
    const data = pick(s.json, ALLOWLIST.status)
    if (expectVersion && data.packageVersion && data.packageVersion !== expectVersion) {
      return emit(METHOD, 'VERSION_MISMATCH', { expected: expectVersion, actual: data }, { code: 'VERSION_MISMATCH', message: `expected ${expectVersion}, got ${data.packageVersion}` }, [], { latencyMs: s.latencyMs })
    }
    return emit(METHOD, 'DSH_RUNNING', data, null, [], { latencyMs: s.latencyMs })
  }

  if (cli === 'breath') {
    const b = await jingxiBreath()
    if (b.down) return fail(METHOD, 'DSH_NOT_RUNNING', b.down, 'DSH loopback endpoint is not reachable.')
    if (b.notRegistered) return fail(METHOD, 'JINGXI_NOT_REGISTERED', 'JINGXI_HTTP_404', 'jingxi breath endpoint returned 404 (plugin not registered).')
    if (b.nonJson) return fail(METHOD, 'RUNTIME_ERROR', 'UPSTREAM_NON_JSON', 'breath returned non-JSON')
    if (b.bad) return fail(METHOD, 'RUNTIME_ERROR', 'UPSTREAM_HTTP_ERROR', `breath http ${b.bad}`)
    const j = b.json
    const view = j?.view ?? {}
    const sessionAlias = alias(j?.sessionId ?? view?.sessionId)
    const last = pick(view?.last ?? {}, ALLOWLIST.breathLastTurn)
    const stale = view?.kind !== 'live' || j?.source === 'persisted' || view?.stale === true
    const data = {
      ...pick({ ...j, sessionAlias, kind: view?.kind, updatedAt: view?.updatedAt ?? j?.updatedAt }, ['real', 'demo', 'source', 'sessionAlias', 'kind', 'updatedAt']),
      stale,
      ...(Object.keys(last).length ? { lastTurn: last } : {}),
    }
    if (!sessionAlias) return emit(METHOD, 'NO_SESSION', data, null, ['no real session present'])
    return emit(METHOD, stale ? 'STALE_SNAPSHOT' : 'DSH_RUNNING', data, null, stale ? ['persisted/stale snapshot; not live'] : [], { latencyMs: b.latencyMs })
  }

  if (cli === 'session') {
    const [s, b] = await Promise.all([jingxiStatus(), jingxiBreath()])
    if (s.down || b.down) return fail(METHOD, 'DSH_NOT_RUNNING', s.down ?? b.down, 'DSH loopback endpoint is not reachable.')
    if (s.notRegistered || b.notRegistered) return fail(METHOD, 'JINGXI_NOT_REGISTERED', 'JINGXI_HTTP_404', 'jingxi endpoints returned 404 (plugin not registered).')
    if (s.nonJson || b.nonJson) return fail(METHOD, 'RUNTIME_ERROR', 'UPSTREAM_NON_JSON', 'upstream returned non-JSON')
    if (s.bad || b.bad) return fail(METHOD, 'RUNTIME_ERROR', 'UPSTREAM_HTTP_ERROR', `http status=${s.bad ?? 200} breath=${b.bad ?? 200}`)
    const j = b.json
    const view = j?.view ?? {}
    const sessionAlias = alias(j?.sessionId ?? view?.sessionId)
    const stale = view?.kind !== 'live' || j?.source === 'persisted' || view?.stale === true
    const data = {
      version: pick(s.json, ['packageVersion', 'designVersion']),
      sessionExists: Boolean(sessionAlias),
      ...(sessionAlias ? { sessionAlias } : {}),
      kind: view?.kind,
      freshness: stale ? 'persisted/stale' : 'live',
      stale,
      ...pick(j, ['real', 'demo', 'source']),
      ...(view?.last?.turn !== undefined ? { turns: { lastTurn: view.last.turn, status: view.last.status } } : {}),
      ...(view?.updatedAt ?? j?.updatedAt ? { updatedAt: view?.updatedAt ?? j?.updatedAt } : {}),
    }
    if (!sessionAlias) return emit(METHOD, 'NO_SESSION', data, null, ['no real session present'])
    return emit(METHOD, stale ? 'STALE_SNAPSHOT' : 'DSH_RUNNING', data, null, stale ? ['persisted/stale snapshot; not live'] : [])
  }
}

main().catch((err) => fail(METHOD, 'RUNTIME_ERROR', 'BRIDGE_INTERNAL_ERROR', String(err?.message ?? err)))
