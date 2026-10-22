#!/usr/bin/env node
/**
 * 渔获速查爬虫：抓取 RF4-STAT 最新渔获流 → D1 fishing_feed 表。
 *
 * 背景：Worker 直连 rf4-stat 会被 Cloudflare 盾拦截（数据中心出口），
 * 改为定时任务抓取入库、前端查库（数据延迟约 30 分钟）。
 *
 * 合规：robots Crawl-delay 5s，仅抓 /fishing/ 无参列表页，GET only。
 * 建议频率：每 30 分钟（GitHub Actions cron）。
 *
 * 用法：
 *   node scripts/crawl-fishing-feed.mjs --dry-run
 *   CF_ACCOUNT_ID=xxx CF_D1_TOKEN=yyy node scripts/crawl-fishing-feed.mjs
 */
import { parseFishingFeed } from './stats-parser.mjs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const FEED_URL = 'https://cn.rf4-stat.com/fishing/'
const D1_DATABASE_ID = 'bead5b3b-5a98-4fd3-82fa-c63115544ccd'
const KEEP_ROWS = 1000
const DRY_RUN = process.argv.includes('--dry-run')
const CF_ACCOUNT_ID = (process.env.CF_ACCOUNT_ID || '').trim()
const CF_D1_TOKEN = (process.env.CF_D1_TOKEN || '').trim()
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/** curl 子进程抓取（Node fetch 的 TLS 指纹会被 CF 质询） */
async function getHtml(url) {
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
  console.log(`== 渔获速查爬取开始 ${DRY_RUN ? '（dry-run）' : ''} ==`)
  if (!DRY_RUN) {
    await d1Query([{ sql: 'SELECT 1 AS ok' }])
    console.log('D1 连通性验证通过')
  }

  const html = await getHtml(FEED_URL)
  if (html.includes('Just a moment')) throw new Error('命中 Cloudflare 质询页，本次放弃')
  const rows = parseFishingFeed(html)
  console.log(`解析到 ${rows.length} 条渔获`)
  if (!rows.length) throw new Error('渔获流解析为空——页面结构可能变更')
  console.log('样例:', JSON.stringify(rows[0]))

  if (!DRY_RUN) {
    const BATCH = 30
    for (let i = 0; i < rows.length; i += BATCH) {
      await d1Query(rows.slice(i, i + BATCH).map(r => ({
        sql: `INSERT INTO fishing_feed (share_id, time_text, location, fish_name, weight_text, bait, method, fetched_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT(share_id) DO UPDATE SET
                time_text=excluded.time_text, location=excluded.location, fish_name=excluded.fish_name,
                weight_text=excluded.weight_text, bait=excluded.bait, method=excluded.method,
                fetched_at=datetime('now')`,
        params: [r.share_id, r.time_text, r.location, r.fish_name, r.weight_text, r.bait, r.method]
      })))
    }
    // 只保留最近 KEEP_ROWS 条，防无限增长
    await d1Query([{
      sql: `DELETE FROM fishing_feed WHERE id NOT IN (SELECT id FROM fishing_feed ORDER BY id DESC LIMIT ?)`,
      params: [KEEP_ROWS]
    }])
    console.log(`已入库 ${rows.length} 条（保留最近 ${KEEP_ROWS} 条）`)
  }
  console.log('== 完成 ==')
}

main().catch((e) => {
  console.error('爬取失败:', e.message)
  process.exit(1)
})
