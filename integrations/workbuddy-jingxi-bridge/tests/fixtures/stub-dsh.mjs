// stub-dsh.mjs — 可控 DSH stub（仅测试用；127.0.0.1 临时端口；不触真实 DSH）
// 场景键：healthy / live / stale / nosession / notfound / servererr / nonjson / sensitive
import http from 'node:http'

const ok = { ok: true, ready: true, bootId: 'stub-boot', pid: 424242, uptime: 12.3 }
const status = {
  ok: true,
  jingxiVersion: '1.0.4',
  packageVersion: '1.0.4',
  designVersion: 'V1.0.4',
  projectionRegistered: true,
  realListening: true,
}
const breathBase = { ok: true, real: true, demo: false }

const breathFor = (scene) => {
  if (scene === 'nosession') return { ...breathBase, source: 'none', view: { kind: 'none' } }
  if (scene === 'live') {
    return {
      ...breathBase, source: 'live', sessionId: 'live-session-0123456789',
      view: { kind: 'live', sessionId: 'live-session-0123456789', last: { turn: 5, status: 'generating', durationMs: 8000, curveQuality: 'real', toolWorkMs: 1000, llmMs: 6000 } },
    }
  }
  return {
    ...breathBase, source: 'persisted', sessionId: 'persist-session-abcdef0123456789',
    view: { kind: 'idle', sessionId: 'persist-session-abcdef0123456789', last: { turn: 4, status: 'completed', durationMs: 475442, curveQuality: 'estimated-final', toolWorkMs: 107151, llmMs: 371836 } },
  }
}

// 敏感场景：上游夹带合同禁区字段，桥必须过滤
const sensitiveExtras = {
  token: 'sk-should-never-appear',
  cookie: 'session-cookie-value',
  authorization: 'Bearer abc',
  apiKey: 'AK-should-never-appear',
  password: 'p@ss',
  fullSessionPath: 'C:/Users/someone/private/sessions/x.jsonl',
  promptBody: '用户正文示例',
}

export function startStub(scene, { port = 0 } = {}) {
  const server = http.createServer((req, res) => {
    const send = (code, obj, raw = false) => {
      res.writeHead(code, { 'content-type': raw ? 'text/plain' : 'application/json' })
      res.end(raw ? String(obj) : JSON.stringify(obj))
    }
    if (scene === 'nonjson') return send(200, '<html>not json</html>', true)
    if (scene === 'servererr') return send(500, { error: 'boom', stack: sensitiveExtras.fullSessionPath })
    if (scene === 'notfound' && req.url.startsWith('/api/jingxi/')) return send(404, { error: 'not found' })

    if (req.url === '/api/system/health') return send(200, scene === 'sensitive' ? { ...ok, ...sensitiveExtras } : ok)
    if (req.url === '/api/jingxi/status') return send(200, scene === 'sensitive' ? { ...status, ...sensitiveExtras } : status)
    if (req.url === '/api/jingxi/breath/current') {
      const base = breathFor(scene === 'sensitive' ? 'stale' : scene)
      return send(200, scene === 'sensitive' ? { ...base, ...sensitiveExtras } : base)
    }
    return send(404, { error: 'not found' })
  })
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}
