#!/usr/bin/env node
/**
 * Git pre-push hook
 * 在 git push 时自动从 commit message 提取变更并更新版本号
 */

import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

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

  // 执行版本更新脚本
  const args = changes.map(c => `"${c}"`).join(' ')
  execSync(`node scripts/version.mjs ${args}`, {
    cwd: ROOT,
    stdio: 'inherit'
  })

  // 将版本更新加入暂存区并提交
  execSync('git add -A', { cwd: ROOT, stdio: 'inherit' })
  execSync('git commit -m "chore: 自动更新版本信息" --no-verify', { cwd: ROOT, stdio: 'inherit' })

  console.log('✅ 版本信息已自动更新并提交')
} catch (error) {
  console.error('⚠️  版本自动更新失败:', error.message)
  // 不阻塞 push
  process.exit(0)
}
