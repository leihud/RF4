#!/usr/bin/env node
/**
 * Git pre-push hook
 * 在 git push 时自动从 commit message 提取变更并更新版本号
 *
 * Windows 兼容说明：
 * - 一律使用 spawnSync 数组传参执行 node，不经 cmd.exe，避免中文在 shell
 *   往返时被转成乱码导致 version.mjs 解析失败 / 版本号漏更新。
 * - git commit 的说明文字写入 UTF-8 临时文件再以 -F 提交，避免 -m 编码问题。
 */

import { execSync, spawnSync } from 'child_process'
import { join, dirname } from 'path'
import { writeFileSync, rmSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MSG_TMP = join(ROOT, '.version-commit-msg.tmp')

try {
  // 获取自上次 push 以来的所有 commit message（不含 merge commit）
  const commits = execSync('git log origin/main..HEAD --no-merges --pretty=format:"%s"', {
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  }).trim()

  // 如果没有新 commit，跳过
  if (!commits) {
    process.exit(0)
  }

  // 提取有意义的变更（以 新增/优化/修复/删除 开头的 message）
  const changes = commits
    .split('\n')
    .map(msg => msg.trim())
    .filter(msg => /^(新增|优化|修复|删除)[：:]/.test(msg))

  // 如果没有符合规范的 commit message，跳过自动版本更新
  if (changes.length === 0) {
    console.log('ℹ️  未检测到规范的变更描述（新增/优化/修复/删除），跳过版本更新')
    process.exit(0)
  }

  console.log('📦 检测到变更，正在更新版本...')

  // 执行版本更新脚本：数组传参绕过 shell，规避 Windows 中文参数乱码
  const result = spawnSync(process.execPath, ['scripts/version.mjs', ...changes], {
    cwd: ROOT,
    stdio: 'inherit'
  })
  if (result.status !== 0) {
    throw new Error(`version.mjs 执行失败，退出码 ${result.status}`)
  }

  // 将版本更新加入暂存区并提交（说明文字经 UTF-8 临时文件传入）
  execSync('git add -A', { cwd: ROOT, stdio: 'inherit' })
  writeFileSync(MSG_TMP, 'chore: 自动更新版本信息\n', 'utf-8')
  try {
    execSync(`git commit -F "${MSG_TMP}" --no-verify`, { cwd: ROOT, stdio: 'inherit' })
  } finally {
    rmSync(MSG_TMP, { force: true })
  }

  console.log('✅ 版本信息已自动更新并提交')
} catch (error) {
  console.error('⚠️  版本自动更新失败:', error.message)
  rmSync(MSG_TMP, { force: true })
  // 不阻塞 push
  process.exit(0)
}
