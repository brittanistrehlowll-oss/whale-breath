// bridge-contract.test.mjs — 合同一致性静态测试（不触真实 DSH）
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const contract = JSON.parse(readFileSync(path.join(root, 'bridge-contract.json'), 'utf8'))
const bridgeSrc = readFileSync(path.join(root, 'scripts', 'bridge.mjs'), 'utf8')

test('contract parses and declares 4 methods / 7 states', () => {
  assert.equal(contract.version, '0.1.0')
  assert.deepEqual(contract.methods.map((m) => m.name), [
    'jingxi.runtime.health', 'jingxi.status', 'jingxi.breath.current', 'jingxi.session.summary',
  ])
  assert.deepEqual(contract.states.map((s) => s.name), [
    'DSH_RUNNING', 'STALE_SNAPSHOT', 'NO_SESSION', 'DSH_NOT_RUNNING',
    'JINGXI_NOT_REGISTERED', 'VERSION_MISMATCH', 'RUNTIME_ERROR',
  ])
})

test('transport is GET-only, loopback-only, no retry, short timeout', () => {
  assert.deepEqual(contract.transport.methods, ['GET'])
  assert.ok(contract.transport.timeoutMs <= 5000)
  assert.equal(contract.transport.retry, 'none')
  assert.deepEqual(contract.hostPolicy.allowedHosts, ['127.0.0.1', 'localhost', '[::1]'])
  assert.equal(contract.hostPolicy.externalNetwork, 'forbidden')
})

test('implementation hardcodes the same host policy', () => {
  assert.match(bridgeSrc, /ALLOWED_HOSTS = new Set\(\['127\.0\.0\.1', 'localhost', '\[::1\]'\]\)/)
  assert.match(bridgeSrc, /const BASE = `http:\/\/\$\{HOST\}:\$\{port\}`/)
})

test('implementation allowlists match contract for health/status', () => {
  for (const m of contract.methods) {
    if (m.name === 'jingxi.runtime.health') {
      for (const f of m.allowlist) assert.ok(bridgeSrc.includes(`'${f}'`), `health allowlist missing ${f}`)
    }
    if (m.name === 'jingxi.status') {
      for (const f of m.allowlist) assert.ok(bridgeSrc.includes(`'${f}'`), `status allowlist missing ${f}`)
    }
  }
})

test('session alias is redacted to 8 chars and full ids never returned', () => {
  assert.match(bridgeSrc, /slice\(0, 8\)/)
  assert.doesNotMatch(bridgeSrc, /pick\([^)]*sessionId/, 'sessionId must never enter pick()/output')
  assert.match(bridgeSrc, /alias\(j\?\.sessionId \?\? view\?\.sessionId\)/)
})

test('implementation contains no write/http-verb usage and no external URLs', () => {
  assert.doesNotMatch(bridgeSrc, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i)
  assert.doesNotMatch(bridgeSrc, /https?:\/\/(?!127\.0\.0\.1|\$\{HOST\})/, 'no literal non-loopback URL')
  assert.doesNotMatch(bridgeSrc, /writeFileSync|createWriteStream|appendFileSync/)
  assert.doesNotMatch(bridgeSrc, /execSync|spawnSync|Invoke-Expression/)
})

test('implementation never touches credentials material', () => {
  const forbiddenRefs = ['authorization', 'apikey', 'api_key', 'bearer', 'password']
  const lower = bridgeSrc.toLowerCase()
  for (const word of ['token', 'cookie', 'secret']) {
    const hits = lower.split(word).length - 1
    assert.equal(hits, 0, `bridge.mjs must not reference ${word}`)
  }
  for (const word of forbiddenRefs) assert.equal(lower.includes(word), false, `bridge.mjs must not reference ${word}`)
})

test('envelope declares required keys incl. error code/message shape', () => {
  for (const key of ['ok', 'state', 'method', 'observedAt', 'runtime', 'data', 'warnings', 'error']) {
    assert.ok(bridgeSrc.includes(`${key}:`), `envelope missing ${key}`)
  }
  assert.match(bridgeSrc, /code, message/)
  for (const code of contract.envelope.errorCodes) assert.ok(bridgeSrc.includes(`'${code}'`), `missing error code ${code}`)
})

test('non-goals and denylist are documented in contract', () => {
  for (const banned of ['POST/PUT/PATCH/DELETE of any kind', 'model requests or provider calls', 'credit/token consumption']) {
    assert.ok(contract.nonGoals.includes(banned), `nonGoals missing: ${banned}`)
  }
  for (const field of ['Token', 'Cookie', 'Authorization', 'apiKey', 'secret', 'password', 'full sessionId']) {
    assert.ok(contract.denylist.includes(field), `denylist missing: ${field}`)
  }
})
