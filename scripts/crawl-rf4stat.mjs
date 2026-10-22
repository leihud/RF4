#!/usr/bin/env node
/**
 * RF4-STAT 奖杯重量爬虫：/weight/ 全量表 → fish_species 表奖杯列。
 *
 * 合规约束（robots.txt）：Crawl-delay 5 秒；仅抓无参列表页；GET only。
 * 建议频率：每周 1 次（奖杯门槛极少变化）。
 *
 * 用法：
 *   node scripts/crawl-rf4stat.mjs --dry-run
 *   CF_ACCOUNT_ID=xxx CF_D1_TOKEN=yyy node scripts/crawl-rf4stat.mjs
 */
import { parseWeightTable } from './stats-parser.mjs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const WEIGHT_URL = 'https://cn.rf4-stat.com/weight/'
const D1_DATABASE_ID = 'bead5b3b-5a98-4fd3-82fa-c63115544ccd'
const DRY_RUN = process.argv.includes('--dry-run')
const CF_ACCOUNT_ID = (process.env.CF_ACCOUNT_ID || '').trim()
const CF_D1_TOKEN = (process.env.CF_D1_TOKEN || '').trim()
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * 用 curl 子进程抓取：Node fetch 的 TLS 指纹会被 Cloudflare 403，
 * curl（完整浏览器头 + gzip）实测可通过。
 */
async function getText(url) {
  const { stdout } = await execFileAsync('curl', [
    '-s', '--compressed', '--max-time', '60',
    '-A', UA,
    '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    '-H', 'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
    '-H', 'Sec-Fetch-Dest: document',
    '-H', 'Sec-Fetch-Mode: navigate',
    '-H', 'Upgrade-Insecure-Requests: 1',
    url
  ], { maxBuffer: 20 * 1024 * 1024 })
  if (!stdout) throw new Error('空响应')
  return stdout
}

async function d1Query(statements) {
  if (DRY_RUN) return []
  if (!CF_ACCOUNT_ID || !CF_D1_TOKEN) throw new Error('缺少 CF_ACCOUNT_ID / CF_D1_TOKEN')
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/raw`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${CF_D1_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch: statements.map(s => ({ sql: s.sql, params: s.params || [] })) })
  })
  const json = await res.json()
  if (!json.success) throw new Error(`D1 API 失败: ${JSON.stringify(json.errors)}`)
  return json.result
}

async function main() {
  console.log(`== RF4-STAT 奖杯数据爬取开始 ${DRY_RUN ? '（dry-run）' : ''} ==`)
  if (!DRY_RUN) {
    await d1Query([{ sql: 'SELECT 1 AS ok' }])
    console.log('D1 连通性验证通过')
  }

  // robots Crawl-delay: 5 —— 先等再抓
  await sleep(5000)
  const html = await getText(WEIGHT_URL)
  if (html.includes('Just a moment')) {
    throw new Error('命中 Cloudflare 质询页，本次放弃（不应高频重试）')
  }
  const rows = parseWeightTable(html)
  console.log(`解析到 ${rows.length} 个鱼种的奖杯数据`)
  if (!rows.length) throw new Error('weight 表解析为空——页面结构可能变更')

  // 与库内鱼种按显示名/名称匹配
  let matchedCount = 0
  const unmatched = []
  if (!DRY_RUN) {
    const existing = await d1Query([{ sql: 'SELECT id, name, display_name FROM fish_species' }])
    const rawRes = existing[0].results
    const nameMap = new Map()
    if (rawRes && Array.isArray(rawRes.rows)) {
      const cols = rawRes.columns
      for (const row of rawRes.rows) {
        const obj = Object.fromEntries(cols.map((c, i) => [c, row[i]]))
        nameMap.set(obj.display_name, obj.id)
        nameMap.set(obj.name, obj.id)
      }
    }
    const BATCH = 40
    const updates = []
    for (const r of rows) {
      const id = nameMap.get(r.name)
      if (!id) { unmatched.push(r.name); continue }
      matchedCount++
      updates.push({
        sql: `UPDATE fish_species SET trophy_weight = ?, super_trophy_weight = ?,
              max_record_weight = ?, max_record_date = ?, rarity = ? WHERE id = ?`,
        params: [r.trophy_weight, r.super_trophy_weight, r.max_record_weight, r.max_record_date, r.rarity, id]
      })
    }
    for (let i = 0; i < updates.length; i += BATCH) {
      await d1Query(updates.slice(i, i + BATCH))
    }
    await d1Query([{
      sql: `INSERT INTO gamekee_sync_log (section_counts, items_inserted, items_updated, rods_upserted, reels_upserted, errors)
            VALUES ('{"rf4stat_weight": ' || ? || '}', 0, 0, 0, 0, ?)`,
      params: [String(rows.length), unmatched.length ? `未匹配鱼种 ${unmatched.length} 个` : '']
    }])
  }

  console.log(`匹配 ${DRY_RUN ? '（dry-run 未实际匹配）' : matchedCount}/${rows.length} 个鱼种`)
  if (unmatched.length) {
    console.warn(`未匹配 ${unmatched.length} 个（库内无同名鱼种，前 10 个）: ${unmatched.slice(0, 10).join('、')}`)
  }
  console.log('== 完成 ==')
}

main().catch((e) => {
  console.error('爬取失败:', e.message)
  process.exit(1)
})
