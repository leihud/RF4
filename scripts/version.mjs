#!/usr/bin/env node
/**
 * 版本管理脚本
 * 用法：node scripts/version.mjs [版本描述...]
 * 
 * 功能：
 * 1. 自动生成版本号（VYYYYMMDD-NN）
 * 2. 更新 src/version-info.js（唯一数据源）
 * 3. 更新 package.json
 * 
 * 示例：
 *   node scripts/version.mjs 新增：版本展示功能 优化：编辑弹窗体验
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// 解析命令行参数
const changes = process.argv.slice(2)
if (changes.length === 0) {
  console.error('请提供版本变更描述，例如：')
  console.error('  node scripts/version.mjs 新增：版本展示功能 优化：编辑弹窗体验')
  process.exit(1)
}

// 生成版本号
function generateVersion() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`
  
  // 读取当前版本，检查今天是否已有发布
  const versionInfoPath = join(ROOT, 'src', 'version-info.js')
  const content = readFileSync(versionInfoPath, 'utf-8')
  const currentVersionMatch = content.match(/currentVersion:\s*'([^']+)'/)
  const currentVersion = currentVersionMatch ? currentVersionMatch[1] : ''
  
  let sequence = 1
  if (currentVersion.startsWith(`V${dateStr}`)) {
    // 同一天再次发布，序号递增
    const seqMatch = currentVersion.match(/-(\d+)$/)
    if (seqMatch) {
      sequence = parseInt(seqMatch[1]) + 1
    }
  }
  
  return `V${dateStr}-${String(sequence).padStart(2, '0')}`
}

// 更新 version-info.js
function updateVersionInfo(version, date, changes) {
  const filePath = join(ROOT, 'src', 'version-info.js')
  let content = readFileSync(filePath, 'utf-8')
  
  // 构建新的 changelog 条目
  const changesStr = changes.map(c => `        '${c}'`).join(',\n')
  const newEntry = `    {
      version: '${version}',
      date: '${date}',
      changes: [
${changesStr}
      ]
    }`
  
  // 在 changelog 数组开头插入新条目
  content = content.replace(
    /changelog:\s*\[/,
    `changelog: [\n${newEntry},`
  )
  
  // 更新 currentVersion 和 buildTime
  content = content.replace(
    /currentVersion:\s*'[^']*'/,
    `currentVersion: '${version}'`
  )
  content = content.replace(
    /buildTime:\s*'[^']*'/,
    `buildTime: '${date}'`
  )
  
  writeFileSync(filePath, content, 'utf-8')
  console.log(`✓ 更新 src/version-info.js`)
}

// 更新 package.json
function updatePackageJson(version) {
  const filePath = join(ROOT, 'package.json')
  const content = readFileSync(filePath, 'utf-8')
  const pkg = JSON.parse(content)
  pkg.version = version
  writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
  console.log(`✓ 更新 package.json`)
}



// 主流程
const version = generateVersion()
const date = new Date().toISOString().split('T')[0]

console.log(`\n📦 发布版本：${version}`)
console.log(`📅 发布日期：${date}`)
console.log(`📝 变更内容：`)
changes.forEach(c => console.log(`   • ${c}`))
console.log('')

updateVersionInfo(version, date, changes)
updatePackageJson(version)

console.log(`\n✅ 版本信息已更新完成！`)
console.log(`\n下一步：`)
console.log(`  git add -A`)
console.log(`  git commit -m "发布 ${version}: ${changes[0]}"`)
console.log(`  git push origin main`)
