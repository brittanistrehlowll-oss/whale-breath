#!/usr/bin/env node
// deploy-check.mjs — 仓库源与本机部署副本（~/.workbuddy/skills/jingxi-bridge/）一致性检查
// 用法: node deploy-check.mjs   （exit 1 = 不一致或副本缺失）
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const deployDir = path.join(homedir(), '.workbuddy', 'skills', 'jingxi-bridge')

// 部署副本应含有的文件集合（仅正式 Skill 所需；不含 tests/docs/扫描器/检查器自身）
const EXPECTED = ['SKILL.md', 'bridge-contract.json', path.join('scripts', 'bridge.mjs')]
// 部署副本中禁止出现的项
const FORBIDDEN_PATTERNS = [/node_modules/, /\.log$/, /test-output/, /\.png$/, /\.lock$/, /sessions?/i, /credential/i]

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')
const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

let fail = false
const report = { deployDir, checkedAt: new Date().toISOString(), files: [], missing: [], extra: [], forbidden: [], mismatch: [] }

if (!existsSync(deployDir)) {
  console.log(`DEPLOY_MISSING: ${deployDir}（尚未部署）`)
  process.exit(1)
}

for (const rel of EXPECTED) {
  const src = path.join(root, rel)
  const dst = path.join(deployDir, rel)
  if (!existsSync(dst)) {
    report.missing.push(rel)
    fail = true
    continue
  }
  const a = sha(src)
  const b = sha(dst)
  report.files.push({ rel, srcSha256: a, dstSha256: b, match: a === b })
  if (a !== b) {
    report.mismatch.push(rel)
    fail = true
  }
}

const deployedFiles = walk(deployDir).map((p) => path.relative(deployDir, p))
for (const rel of deployedFiles) {
  if (FORBIDDEN_PATTERNS.some((re) => re.test(rel))) {
    report.forbidden.push(rel)
    fail = true
  }
  if (!EXPECTED.includes(rel) && rel !== 'manifest.json') {
    report.extra.push(rel)
  }
}

console.log(JSON.stringify(report, null, 2))
if (report.forbidden.length) console.log('DEPLOY_FORBIDDEN_FILES:', report.forbidden.join(', '))
if (report.mismatch.length) console.log('DEPLOY_MISMATCH:', report.mismatch.join(', '))
if (report.missing.length) console.log('DEPLOY_MISSING_FILES:', report.missing.join(', '))
if (!fail) console.log('DEPLOY_CONSISTENT: 仓库源与部署副本一致')
process.exit(fail ? 1 : 0)
