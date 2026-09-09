#!/usr/bin/env node
// security-scan.mjs — Bridge 防回归安全扫描（区分 executable / fixtures / docs 三作用域）
// 用法: node security-scan.mjs   （exit 1 = 发现违规）
// 口径：executable=交付运行码（scripts/，扫描器自身豁免）；fixtures=测试材料（允许禁区词作靶子）；
//       docs=文档与合同（禁区词为规则描述，只统计不判负）。
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SELF = fileURLToPath(import.meta.url)

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const scopes = {
  executable: walk(path.join(root, 'scripts')).filter((p) => p !== SELF),
  fixtures: walk(path.join(root, 'tests')),
  docs: walk(root).filter((p) => p.endsWith('.md') || p.endsWith('.json')),
}

const RULES = {
  executable: [
    { id: 'write-verb', re: /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i, msg: '非 GET 写动词' },
    { id: 'external-url', re: /https?:\/\/(?!127\.0\.0\.1|localhost|\[::1\]|\$\{HOST\})/, msg: '非回环 URL' },
    { id: 'cred-ref', re: /\b(authorization|apikey|api_key|bearer|password)\b/i, msg: '凭据相关引用' },
    { id: 'cred-token', re: /\b(token|cookie|secret)\b/i, msg: 'token/cookie/secret 引用', allow: [/禁区|脱敏|不允许|never|forbid/i] },
    { id: 'fs-write', re: /writeFileSync|createWriteStream|appendFileSync/, msg: '文件写操作' },
    { id: 'shell-exec', re: /execSync|spawnSync/, msg: '同步 shell 执行' },
    { id: 'full-session', re: /['"][0-9a-f]{16,}['"]/i, msg: '疑似完整会话 ID' },
    { id: 'user-path', re: /C:\\\\Users\\\\[a-z]/i, msg: '真实用户目录硬编码' },
  ],
  fixtures: [
    { id: 'external-url', re: /https?:\/\/(?!127\.0\.0\.1|localhost|\[::1\]|\$\{HOST\})/, msg: '非回环 URL' },
    { id: 'write-verb', re: /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i, msg: '非 GET 写动词' },
  ],
  docs: [], // 文档允许出现禁区词（规则描述需要），仅统计不判负
}

const results = {}
let fail = false
for (const [scope, files] of Object.entries(scopes)) {
  const violations = []
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    const lines = text.split('\n')
    for (const rule of RULES[scope]) {
      lines.forEach((line, i) => {
        if (rule.re.test(line)) {
          if (rule.allow && rule.allow.some((a) => a.test(line))) return
          violations.push(`${path.relative(root, file)}:${i + 1} [${rule.id}] ${rule.msg}`)
        }
      })
    }
  }
  results[scope] = violations
  if (scope !== 'docs' && violations.length) fail = true
}

for (const [scope, violations] of Object.entries(results)) {
  const label = { executable: '可执行代码扫描', fixtures: '测试夹具扫描', docs: '文档规则检查' }[scope]
  if (violations.length === 0) console.log(`${label}: PASS（${scopes[scope].length} 文件）`)
  else {
    console.log(`${label}: FAIL`)
    violations.forEach((v) => console.log('  -', v))
  }
}
process.exit(fail ? 1 : 0)
