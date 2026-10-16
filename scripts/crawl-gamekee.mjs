#!/usr/bin/env node
/**
 * GameKee RF4 图鉴爬虫：全分区抓取 → 清洗整合 → D1 落库。
 *
 * 流程：
 *  1. GET /v1/wiki/entry（头 game-alias: rf4）→ 目录树
 *  2. GET /v1/entry/query-entry-list-from-cdn → entry_id → c_id 全量映射（一次拉全）
 *  3. 逐叶子 GET /v1/content/detail/{c_id} → character-profile → 清洗解析
 *  4. 落库（D1 HTTP API，分批）：
 *     - 全部条目 → gamekee_items（全字段 JSON，UPSERT by entry_id）
 *     - 渔竿/渔轮 → rods/reels 按 model 补齐现有列（存在则 UPDATE 补空/更新差异，不存在则 INSERT）
 *       并带 gamekee_entry_id 追踪；未映射属性暂不入结构化列（保留在 gamekee_items.attrs_json）
 *
 * 用法：
 *   node scripts/crawl-gamekee.mjs --dry-run            # 只抓取解析打印 diff 摘要，不写库
 *   CF_ACCOUNT_ID=xxx CF_D1_TOKEN=yyy node scripts/crawl-gamekee.mjs   # 真实写库
 *
 * 环境：Node >= 18（原生 fetch），零第三方依赖。
 */
import {
  flattenTree,
  extractProfile,
  parseProfile,
  mapAttrsToColumns,
  ROD_ATTR_COLUMNS,
  REEL_ATTR_COLUMNS
} from './gamekee-parser.mjs'

const GAME_ALIAS = 'rf4'
const BASE = 'https://www.gamekee.com/v1'
const D1_DATABASE_ID = 'bead5b3b-5a98-4fd3-82fa-c63115544ccd' // wrangler.toml rf4-db
const REQUEST_INTERVAL_MS = 1200
const RETRY_TIMES = 2
const BATCH_SIZE = 20

// 目标顶层分区（用户指定 11 个；鱼种图鉴/攻略类不入库）
const TARGET_SECTIONS = [
  '渔竿图鉴', '渔轮图鉴', '鱼线图鉴', '钓钩图鉴', '拟饵图鉴',
  '鱼饵图鉴', '钓组图鉴', '诱饵图鉴', '食品图鉴', '工业品商店', '辅助用品'
]

const DRY_RUN = process.argv.includes('--dry-run')
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID
const CF_D1_TOKEN = process.env.CF_D1_TOKEN
// --limit N：只抓前 N 个叶子（冒烟测试用）
const limitIdx = process.argv.indexOf('--limit')
const CRAWL_LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 带重试与限频的 GET JSON */
async function getJson(url, label) {
  for (let attempt = 0; attempt <= RETRY_TIMES; attempt++) {
    try {
      await sleep(REQUEST_INTERVAL_MS)
      const res = await fetch(url, {
        headers: {
          'game-alias': GAME_ALIAS,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RF4-Crawler/1.0',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.code !== 0) throw new Error(`api code=${json.code} msg=${json.msg}`)
      return json.data
    } catch (e) {
      if (attempt === RETRY_TIMES) throw new Error(`[${label}] ${e.message}`)
      console.warn(`  retry ${attempt + 1}/${RETRY_TIMES} ${label}: ${e.message}`)
      await sleep(3000)
    }
  }
}

/** D1 HTTP API 查询：statements=[{sql, params}] */
async function d1Query(statements) {
  if (!CF_ACCOUNT_ID || !CF_D1_TOKEN) {
    throw new Error('缺少 CF_ACCOUNT_ID / CF_D1_TOKEN 环境变量（真实写库需要）')
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_D1_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ statements })
  })
  const json = await res.json()
  if (!json.success) throw new Error(`D1 API 失败: ${JSON.stringify(json.errors)}`)
  return json.result
}

async function main() {
  console.log(`== GameKee RF4 爬取开始 ${DRY_RUN ? '（dry-run，不写库）' : ''} ==`)

  // 1) 目录树
  const tree = await getJson(`${BASE}/wiki/entry`, '目录树')
  const leaves = flattenTree(tree.entry_list, TARGET_SECTIONS)
  const finalLeaves = CRAWL_LIMIT > 0 ? leaves.slice(0, CRAWL_LIMIT) : leaves
  const bySection = {}
  for (const l of finalLeaves) bySection[l.section] = (bySection[l.section] || 0) + 1
  console.log('叶子条目分布:', JSON.stringify(bySection))
  if (finalLeaves.length === 0) throw new Error('目录树为空或分区名变更——请检查 TARGET_SECTIONS')

  // 2) c_id 全量映射（entry_ids 传空即可拉全量 dict）
  const dict = await getJson(`${BASE}/entry/query-entry-list-from-cdn?entry_ids=`, 'c_id映射')
  const cidMap = new Map((dict.dict || []).map((d) => [d.id, d.c_id]))
  console.log(`c_id 映射: ${cidMap.size} 条`)

  // 3) 逐条抓取解析
  const items = [] // {leaf, profile解析结果, detailVersion}
  let failed = 0
  for (let i = 0; i < finalLeaves.length; i++) {
    const leaf = finalLeaves[i]
    const cId = cidMap.get(leaf.entryId)
    if (!cId) { console.warn(`  [${i + 1}/${finalLeaves.length}] 无 c_id: ${leaf.name}#${leaf.entryId}`); failed++; continue }
    try {
      const detail = await getJson(`${BASE}/content/detail/${cId}`, `${leaf.name}`)
      const profile = parseProfile(extractProfile(detail.content_json))
      if (!profile || !profile.name) {
        // 富文本文章类条目（无图鉴 profile）：仅记录条目本身
        items.push({ leaf, parsed: null, version: String(detail.updated_at || '') })
        continue
      }
      items.push({ leaf, parsed: profile, version: String(detail.updated_at || '') })
    } catch (e) {
      console.warn(`  抓取失败 ${leaf.name}#${leaf.entryId}: ${e.message}`)
      failed++
    }
    if ((i + 1) % 50 === 0) console.log(`  进度 ${i + 1}/${finalLeaves.length}`)
  }
  console.log(`抓取完成: ${items.length} 条（失败 ${failed}）`)
  if (items.length === 0) throw new Error('没有抓到任何条目')

  // 4) 落库
  let inserted = 0, updated = 0, rodsUpsert = 0, reelsUpsert = 0

  if (!DRY_RUN) {
    // 4a) gamekee_items 全量 UPSERT（分批）
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE)
      const statements = batch.map(({ leaf, parsed, version }) => ({
        sql: `INSERT INTO gamekee_items (entry_id, section, category_path, name, entry_name, desc_title, description, attrs_json, content_version, synced_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT(entry_id) DO UPDATE SET
                section=excluded.section, category_path=excluded.category_path,
                name=excluded.name, entry_name=excluded.entry_name,
                desc_title=excluded.desc_title, description=excluded.description,
                attrs_json=excluded.attrs_json, content_version=excluded.content_version,
                synced_at=datetime('now')`,
        params: [
          leaf.entryId, leaf.section, leaf.path,
          parsed ? parsed.name : '', leaf.name,
          parsed ? parsed.descTitle : '', parsed ? parsed.description : '',
          parsed ? JSON.stringify(parsed.attrs) : '[]',
          version
        ]
      }))
      await d1Query(statements)
    }

    // 4b) 渔竿/渔轮 → rods/reels 补齐现有列
    for (const tableType of [['渔竿图鉴', 'rods', ROD_ATTR_COLUMNS], ['渔轮图鉴', 'reels', REEL_ATTR_COLUMNS]]) {
      const [section, table, colMap] = tableType
      const sectionItems = items.filter((it) => it.leaf.section === section && it.parsed)
      // 现有 model → id
      const existing = await d1Query([{ sql: `SELECT id, model FROM ${table}` }])
      const modelMap = new Map((existing[0].results || []).map((r) => [String(r.model).trim(), r.id]))
      for (const { leaf, parsed } of sectionItems) {
        const { columns } = mapAttrsToColumns(parsed, colMap)
        const model = parsed.name || leaf.name
        const cols = { model, equipmentName: model, ...columns }
        const id = modelMap.get(String(model).trim())
        if (id) {
          // UPDATE：全字段以爬取结果为准（值非空才覆盖）
          const sets = Object.entries(cols).filter(([, v]) => v != null && v !== '')
          sets.push(['gamekee_entry_id', leaf.entryId])
          await d1Query([{
            sql: `UPDATE ${table} SET ${sets.map(([c]) => `${c} = ?`).join(', ')} WHERE id = ?`,
            params: [...sets.map(([, v]) => v), id]
          }])
        } else {
          const names = Object.keys(cols)
          const vals = names.map((c) => cols[c])
          await d1Query([{
            sql: `INSERT INTO ${table} (equipmentType, ${names.join(', ')}, gamekee_entry_id)
                  VALUES (?, ${names.map(() => '?').join(', ')}, ?)`,
            params: [section === '渔竿图鉴' ? '鱼竿' : '渔轮', ...vals, leaf.entryId]
          }])
        }
        if (table === 'rods') rodsUpsert++; else reelsUpsert++
      }
    }

    await d1Query([{
      sql: `INSERT INTO gamekee_sync_log (section_counts, items_inserted, items_updated, rods_upserted, reels_upserted, errors)
            VALUES (?, ?, 0, ?, ?, ?)`,
      params: [JSON.stringify(bySection), items.length, rodsUpsert, reelsUpsert, failed ? `抓取失败 ${failed} 条` : '']
    }])
  }

  console.log('== 摘要 ==')
  console.log(`条目: ${items.length}（竿/轮之外 ${items.length - items.filter((i) => i.parsed && (i.leaf.section === '渔竿图鉴' || i.leaf.section === '渔轮图鉴')).length}）`)
  console.log(`rods upsert: ${DRY_RUN ? items.filter((i) => i.leaf.section === '渔竿图鉴' && i.parsed).length : rodsUpsert}`)
  console.log(`reels upsert: ${DRY_RUN ? items.filter((i) => i.leaf.section === '渔轮图鉴' && i.parsed).length : reelsUpsert}`)
  if (failed) console.warn(`失败 ${failed} 条，详见上方日志`)
}

main().catch((e) => {
  console.error('爬取失败:', e.message)
  process.exit(1)
})
