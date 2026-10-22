#!/usr/bin/env node
/**
 * Potryasov Game 数据爬虫：鱼线 CSV、鱼钩 CSV、渔轮强度表 → D1。
 *
 * 数据源：
 *  - 鱼线/鱼钩 = 公开 Google Sheets CSV（站长更新表格我们自动拿到新版）
 *  - 渔轮强度 = 强度计算器主子页 <option value="型号 = 数值"> 枚举
 *
 * 用法：
 *   node scripts/crawl-potryasov.mjs --dry-run   # 解析打印摘要，不写库
 *   CF_ACCOUNT_ID=xxx CF_D1_TOKEN=yyy node scripts/crawl-potryasov.mjs
 *
 * 环境：Node >= 18，零第三方依赖。请求间隔 2s，温和限频（该站偶发 403，重试即可）。
 */
import { parseLinesCsv, parseHooksCsv, parseCalcOptions } from './stats-parser.mjs'

const CALC_MAIN_URL = 'https://potryasovgame.ru/page114271846.html'
const LINES_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRlGuvbmIjJBh9DHH8xwK6wHX9U7PCTP_Q8ph8LA_2UAivTWZ_I8ecMAxHN9Gqt4aSO-NWgsDQ-8rG8/pub?gid=1858081774&single=true&output=csv'
const HOOKS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCg4Kub9JmDlErMa-FtRYhmuIZCi52_tqTSKpAB4kxLvJOZE8xlha6yL8l3_LVmTtFg2u-qzboiSog/pub?gid=908719338&single=true&output=csv'

const D1_DATABASE_ID = 'bead5b3b-5a98-4fd3-82fa-c63115544ccd'
const DRY_RUN = process.argv.includes('--dry-run')
const CF_ACCOUNT_ID = (process.env.CF_ACCOUNT_ID || '').trim()
const CF_D1_TOKEN = (process.env.CF_D1_TOKEN || '').trim()
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getText(url) {
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      await sleep(2000)
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': '*/*' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (e) {
      if (attempt === 2) throw new Error(`[${url.slice(0, 60)}] ${e.message}`)
      console.warn(`  retry ${attempt + 1}: ${e.message}`)
      await sleep(4000)
    }
  }
}

/** D1 HTTP API（/raw batch 格式） */
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
  console.log(`== Potryasov 数据爬取开始 ${DRY_RUN ? '（dry-run）' : ''} ==`)
  if (!DRY_RUN) {
    await d1Query([{ sql: 'SELECT 1 AS ok' }])
    console.log('D1 连通性验证通过')
  }

  // 1) 鱼线 CSV
  const linesCsv = await getText(LINES_CSV_URL)
  const lines = parseLinesCsv(linesCsv)
  console.log(`鱼线: ${lines.length} 行`)
  if (!lines.length) throw new Error('鱼线 CSV 解析为空——表头或数据结构可能变更')

  // 2) 鱼钩 CSV
  const hooksCsv = await getText(HOOKS_CSV_URL)
  const hooks = parseHooksCsv(hooksCsv)
  console.log(`鱼钩: ${hooks.length} 行`)
  if (!hooks.length) throw new Error('鱼钩 CSV 解析为空')

  // 3) 渔轮强度：主计算器页 → 子页链接 → option 枚举
  const calcHtml = await getText(CALC_MAIN_URL)
  const subLinks = [...new Set([...calcHtml.matchAll(/href="(\/page\d+\.html)"/g)].map(m => m[1]))]
    .filter(p => p !== '/page114271846.html')
  console.log(`强度计算器子页: ${subLinks.length} 个`)
  const reelStrength = []
  const seen = new Set()
  for (const link of subLinks) {
    try {
      const html = await getText(`https://potryasovgame.ru${link}`)
      const opts = parseCalcOptions(html)
      let fresh = 0
      for (const o of opts) {
        const key = o.model.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        reelStrength.push({ ...o, category: link })
        fresh++
      }
      console.log(`  ${link}: ${opts.length} option（新增 ${fresh}）`)
    } catch (e) {
      console.warn(`  子页失败 ${link}: ${e.message}`)
    }
  }
  console.log(`渔轮强度: ${reelStrength.length} 条（去重后）`)

  // 4) 落库
  if (!DRY_RUN) {
    const BATCH = 40
    // 鱼线 UPSERT
    for (let i = 0; i < lines.length; i += BATCH) {
      await d1Query(lines.slice(i, i + BATCH).map(r => ({
        sql: `INSERT INTO fishing_lines (name, type, strength_kg, diameter_mm, length_m, price, color, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT(name, diameter_mm, strength_kg) DO UPDATE SET
                type=excluded.type, length_m=excluded.length_m, price=excluded.price,
                color=excluded.color, updated_at=datetime('now')`,
        params: [r.name, r.type, r.strength_kg, r.diameter_mm, r.length_m, r.price, r.color]
      })))
    }
    // 鱼钩 UPSERT
    for (let i = 0; i < hooks.length; i += BATCH) {
      await d1Query(hooks.slice(i, i + BATCH).map(r => ({
        sql: `INSERT INTO fishing_hooks (name, type, strength_json, updated_at)
              VALUES (?, ?, ?, datetime('now'))
              ON CONFLICT(name) DO UPDATE SET
                type=excluded.type, strength_json=excluded.strength_json, updated_at=datetime('now')`,
        params: [r.name, r.type, JSON.stringify(r.strength)]
      })))
    }
    // 渔轮强度 UPSERT
    for (let i = 0; i < reelStrength.length; i += BATCH) {
      await d1Query(reelStrength.slice(i, i + BATCH).map(r => ({
        sql: `INSERT INTO reel_strength (model, strength_kg, category, updated_at)
              VALUES (?, ?, ?, datetime('now'))
              ON CONFLICT(model) DO UPDATE SET
                strength_kg=excluded.strength_kg, category=excluded.category, updated_at=datetime('now')`,
        params: [r.model, r.strength_kg, r.category]
      })))
    }
    // 渔轮强度交叉校验：与 reels.lockTension 比对，记录差异条数
    try {
      const existing = await d1Query([{ sql: 'SELECT id, model, lockTension FROM reels' }])
      const rawRes = existing[0].results
      if (rawRes && Array.isArray(rawRes.rows)) {
        const cols = rawRes.columns
        const strengthMap = new Map(reelStrength.map(r => [r.model.toLowerCase(), r.strength_kg]))
        let matched = 0, mismatched = 0
        for (const row of rawRes.rows) {
          const obj = Object.fromEntries(cols.map((c, i) => [c, row[i]]))
          const kg = strengthMap.get(String(obj.model || '').toLowerCase().trim())
          if (kg == null) continue
          matched++
          const lockNum = parseFloat(String(obj.lockTension || '').replace(',', '.'))
          if (Number.isFinite(lockNum) && Math.abs(lockNum - kg) / Math.max(kg, 1) > 0.15) mismatched++
        }
        console.log(`交叉校验: 渔轮强度表匹配 ${matched}/${rawRes.rows.length}，拉力差异>15% 的 ${mismatched} 条（仅记录，不改动）`)
      }
    } catch (e) { console.warn(`交叉校验失败（不影响主流程）: ${e.message}`) }
  }

  console.log('== 摘要 ==')
  console.log(`鱼线 ${lines.length}、鱼钩 ${hooks.length}、渔轮强度 ${reelStrength.length}${DRY_RUN ? '（dry-run 未写库）' : ' 已落库'}`)
}

main().catch((e) => {
  console.error('爬取失败:', e.message)
  process.exit(1)
})
