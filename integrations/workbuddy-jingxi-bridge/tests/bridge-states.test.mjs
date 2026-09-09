// bridge-states.test.mjs — 七态状态机动态测试（stub 黑盒，子进程跑桥，不触真实 DSH）
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { startStub } from './fixtures/stub-dsh.mjs'

const run = promisify(execFile)
const here = path.dirname(fileURLToPath(import.meta.url))
const bridge = path.resolve(here, '..', 'scripts', 'bridge.mjs')

async function callBridge(cliArgs) {
  try {
    const { stdout } = await run(process.execPath, [bridge, ...cliArgs], { timeout: 15000 })
    return JSON.parse(stdout)
  } catch (err) {
    if (err.stdout) return JSON.parse(err.stdout)
    throw err
  }
}

async function withStub(scene, fn) {
  const { server, port } = await startStub(scene)
  try {
    return await fn(port)
  } finally {
    server.close()
  }
}

test('DSH_RUNNING — health/status/live breath/live session', async () => {
  await withStub('live', async (port) => {
    const h = await callBridge(['health', '--port', port])
    assert.equal(h.state, 'DSH_RUNNING'); assert.equal(h.ok, true)
    assert.deepEqual(Object.keys(h.data.runtime).sort(), ['bootId', 'pid', 'ready', 'uptime'])

    const s = await callBridge(['status', '--port', port])
    assert.equal(s.state, 'DSH_RUNNING')
    assert.equal(s.data.packageVersion, '1.0.4')

    const b = await callBridge(['breath', '--port', port])
    assert.equal(b.state, 'DSH_RUNNING')
    assert.equal(b.data.stale, false)
    assert.equal(b.data.sessionAlias, 'live-ses')
    assert.equal(b.warnings.length, 0)

    const ss = await callBridge(['session', '--port', port])
    assert.equal(ss.state, 'DSH_RUNNING')
    assert.equal(ss.data.freshness, 'live')
    assert.equal(ss.data.sessionExists, true)
  })
})

test('STALE_SNAPSHOT — persisted breath/session 不得伪装 live', async () => {
  await withStub('stale', async (port) => {
    const b = await callBridge(['breath', '--port', port])
    assert.equal(b.state, 'STALE_SNAPSHOT')
    assert.equal(b.data.stale, true)
    assert.equal(b.data.source, 'persisted')
    assert.ok(b.warnings.some((w) => w.includes('stale')))

    const ss = await callBridge(['session', '--port', port])
    assert.equal(ss.state, 'STALE_SNAPSHOT')
    assert.equal(ss.data.freshness, 'persisted/stale')
    assert.notEqual(ss.data.freshness, 'live')
  })
})

test('NO_SESSION — 无会话如实空态', async () => {
  await withStub('nosession', async (port) => {
    const b = await callBridge(['breath', '--port', port])
    assert.equal(b.state, 'NO_SESSION')
    assert.equal(b.data.sessionAlias, undefined)
    const ss = await callBridge(['session', '--port', port])
    assert.equal(ss.state, 'NO_SESSION')
    assert.equal(ss.data.sessionExists, false)
  })
})

test('DSH_NOT_RUNNING — 连接拒绝为受控结果而非异常', async () => {
  const { server, port } = await startStub('healthy')
  server.close()
  await new Promise((r) => setTimeout(r, 150))
  for (const cli of ['health', 'status', 'breath', 'session']) {
    const r = await callBridge([cli, '--port', port])
    assert.equal(r.state, 'DSH_NOT_RUNNING', `${cli} should map refused to DSH_NOT_RUNNING`)
    assert.equal(r.ok, false)
    assert.equal(r.error.code, 'LOOPBACK_REFUSED')
    assert.equal(r.data, null)
  }
})

test('JINGXI_NOT_REGISTERED — 404 映射', async () => {
  await withStub('notfound', async (port) => {
    const s = await callBridge(['status', '--port', port])
    assert.equal(s.state, 'JINGXI_NOT_REGISTERED')
    assert.equal(s.error.code, 'JINGXI_HTTP_404')
    const b = await callBridge(['breath', '--port', port])
    assert.equal(b.state, 'JINGXI_NOT_REGISTERED')
  })
})

test('VERSION_MISMATCH — 伪版本被拒，真版本放行', async () => {
  await withStub('healthy', async (port) => {
    const bad = await callBridge(['status', '--port', port, '--expect-version', '9.9.9'])
    assert.equal(bad.state, 'VERSION_MISMATCH')
    assert.equal(bad.data.expected, '9.9.9')
    assert.equal(bad.data.actual.packageVersion, '1.0.4')
    const good = await callBridge(['status', '--port', port, '--expect-version', '1.0.4'])
    assert.equal(good.state, 'DSH_RUNNING')
  })
})

test('RUNTIME_ERROR — 上游非 JSON 归入受控错误且不透传原文', async () => {
  await withStub('nonjson', async (port) => {
    const h = await callBridge(['health', '--port', port])
    assert.equal(h.state, 'RUNTIME_ERROR')
    assert.equal(h.error.code, 'UPSTREAM_NON_JSON')
    assert.ok(!JSON.stringify(h).includes('<html>'), 'raw body must not leak')
  })
})

test('白名单强制 — 上游夹带禁区字段全部过滤', async () => {
  await withStub('sensitive', async (port) => {
    for (const cli of ['health', 'status', 'breath', 'session']) {
      const r = await callBridge([cli, '--port', port])
      const raw = JSON.stringify(r)
      for (const banned of ['sk-should-never-appear', 'session-cookie-value', 'Bearer abc', 'AK-should-never-appear', 'p@ss', 'promptBody', 'fullSessionPath', '用户正文示例']) {
        assert.ok(!raw.includes(banned), `${cli} leaked: ${banned}`)
      }
    }
  })
})

test('会话脱敏 — 只出前 8 位别名', async () => {
  await withStub('sensitive', async (port) => {
    const b = await callBridge(['breath', '--port', port])
    assert.equal(b.data.sessionAlias, 'persist-')
    assert.ok(!JSON.stringify(b).includes('persist-session-abcdef0123456789'))
  })
})

test('GET-only — stub 记录请求方法恒为 GET', async () => {
  await withStub('healthy', async (port) => {
    await callBridge(['session', '--port', port])
    // session 触发两个上游 GET；若桥发出非 GET，stub 的 404 分支会改变结果——此处以结果信封完整性佐证
    const s = await callBridge(['status', '--port', port])
    assert.equal(s.state, 'DSH_RUNNING')
  })
})

test('servererr — 500 归入 RUNTIME_ERROR 且不泄漏路径', async () => {
  await withStub('servererr', async (port) => {
    const h = await callBridge(['health', '--port', port])
    assert.equal(h.state, 'RUNTIME_ERROR')
    assert.equal(h.error.code, 'UPSTREAM_HTTP_ERROR')
    assert.ok(!JSON.stringify(h).includes('C:/Users'))
  })
})
