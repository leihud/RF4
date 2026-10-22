// 一次性巡检脚本：检查生产库各表是否有异常写入
const account = process.env.CF_ACCOUNT_ID
const token = process.env.CF_D1_TOKEN
const DB = 'bead5b3b-5a98-4fd3-82fa-c63115544ccd'

const checks = [
  ['鱼线总数/零线径/零拉力/空名称',
   `SELECT COUNT(*) AS total,
           SUM(CASE WHEN diameter_mm = 0 THEN 1 ELSE 0 END) AS zero_diam,
           SUM(CASE WHEN strength_kg = 0 THEN 1 ELSE 0 END) AS zero_str,
           SUM(CASE WHEN name = '' THEN 1 ELSE 0 END) AS empty_name,
           SUM(CASE WHEN length_m = 0 THEN 1 ELSE 0 END) AS zero_len
    FROM fishing_lines`],
  ['鱼线异常值（线径>5mm 或 拉力>500kg）',
   `SELECT name, diameter_mm, strength_kg FROM fishing_lines
    WHERE diameter_mm > 5 OR strength_kg > 500 LIMIT 10`],
  ['鱼线重复组（name+diameter+strength 应=0）',
   `SELECT name, diameter_mm, strength_kg, COUNT(*) AS c FROM fishing_lines
    GROUP BY name, diameter_mm, strength_kg HAVING c > 1 LIMIT 10`],
  ['鱼钩总数/空矩阵',
   `SELECT COUNT(*) AS total,
           SUM(CASE WHEN strength_json = '[]' THEN 1 ELSE 0 END) AS empty_matrix
    FROM fishing_hooks`],
  ['渔轮强度总数/零强度/空型号',
   `SELECT COUNT(*) AS total,
           SUM(CASE WHEN strength_kg = 0 THEN 1 ELSE 0 END) AS zero_str,
           SUM(CASE WHEN model = '' THEN 1 ELSE 0 END) AS empty_model
    FROM reel_strength`],
  ['鱼种奖杯：奖杯>超奖 的异常行',
   `SELECT display_name, trophy_weight, super_trophy_weight FROM fish_species
    WHERE trophy_weight > 0 AND super_trophy_weight > 0 AND trophy_weight > super_trophy_weight LIMIT 10`],
  ['鱼种奖杯：最大纪录 < 奖杯 的异常行',
   `SELECT display_name, trophy_weight, max_record_weight FROM fish_species
    WHERE trophy_weight > 0 AND max_record_weight > 0 AND max_record_weight < trophy_weight LIMIT 10`],
  ['鱼种奖杯：已填充/零值统计',
   `SELECT COUNT(*) AS total,
           SUM(CASE WHEN trophy_weight > 0 THEN 1 ELSE 0 END) AS has_trophy,
           SUM(CASE WHEN max_record_weight > 0 THEN 1 ELSE 0 END) AS has_record
    FROM fish_species`],
  ['鱼竿：空型号/空名称/爬取标记',
   `SELECT COUNT(*) AS total,
           SUM(CASE WHEN model = '' OR model IS NULL THEN 1 ELSE 0 END) AS empty_model,
           SUM(CASE WHEN gamekee_entry_id > 0 THEN 1 ELSE 0 END) AS synced
    FROM rods`],
  ['渔轮：空型号/爬取标记/双磨损字段异常（>100）',
   `SELECT COUNT(*) AS total,
           SUM(CASE WHEN model = '' OR model IS NULL THEN 1 ELSE 0 END) AS empty_model,
           SUM(CASE WHEN gamekee_entry_id > 0 THEN 1 ELSE 0 END) AS synced
    FROM reels`],
  ['gamekee_items 总数/空名/attrs 空',
   `SELECT COUNT(*) AS total,
           SUM(CASE WHEN name = '' THEN 1 ELSE 0 END) AS empty_name,
           SUM(CASE WHEN attrs_json = '[]' THEN 1 ELSE 0 END) AS empty_attrs
    FROM gamekee_items`],
  ['meta 表（数据新鲜度标记）',
   `SELECT key, value, updated_at FROM meta`],
  ['爬取日志最近 3 条',
   `SELECT id, ran_at, items_inserted, rods_upserted, reels_upserted, errors FROM gamekee_sync_log ORDER BY id DESC LIMIT 3`]
]

async function main() {
  const batch = checks.map(([label, sql]) => ({ sql }))
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${DB}/raw`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch: batch.map(b => ({ sql: b.sql })) })
  })
  const json = await res.json()
  if (!json.success) { console.log('API 失败:', JSON.stringify(json.errors)); return }
  json.result.forEach((r, i) => {
    console.log(`\n【${checks[i][0]}】`)
    if (r.success === false) { console.log('  查询失败:', JSON.stringify(r.meta?.error || '')); return }
    const { columns, rows } = r.results
    if (!rows || !rows.length) { console.log('  （无数据）'); return }
    for (const row of rows) {
      console.log('  ' + columns.map((c, j) => `${c}=${row[j]}`).join(' | '))
    }
  })
}
main().catch(e => { console.error(e.message); process.exit(1) })

