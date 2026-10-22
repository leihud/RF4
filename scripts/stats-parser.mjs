/**
 * Potryasov / RF4-STAT 数据解析模块（纯函数，爬虫与测试共用）。
 *
 * Potryasov Game（potryasovgame.ru）：
 *  - 鱼线/鱼钩数据源是公开 Google Sheets CSV（逗号小数，RFC4180 引号包裹）
 *  - 渔轮强度表硬编码在 Tilda 计算器页 <option value="型号 = 数值"> 中
 * RF4-STAT（cn.rf4-stat.com/weight/）：
 *  - 服务端渲染单表，行内含 fish/<slug> 链接、鱼种名、奖杯/超级奖杯/最大重量、稀有性
 */

/** RFC4180 CSV 行解析（处理引号包裹的逗号） */
export function parseCsvLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else inQuotes = false
      } else cur += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      out.push(cur); cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

/** "6,8" / "19" / "0,18" → 数字；空/非法 → null */
export function parseRuNumber(text) {
  const s = String(text == null ? '' : text).trim().replace(/\s/g, '')
  if (!s || s === '?' || s === '-') return null
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * 鱼线 CSV → 行对象数组。
 * 表头（俄文）：Название, Тип, Прочность заявлена, Ø мм, Длина, Цена, Цвет
 */
export function parseLinesCsv(csvText) {
  const lines = String(csvText || '').split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const header = parseCsvLine(lines[0]).map(h => h.trim())
  const idx = {
    name: header.findIndex(h => /назван/i.test(h)),
    type: header.findIndex(h => /тип/i.test(h)),
    strength: header.findIndex(h => /прочность/i.test(h)),
    diameter: header.findIndex(h => /Ø|мм/i.test(h) && !/длина/i.test(h)),
    length: header.findIndex(h => /длина/i.test(h)),
    price: header.findIndex(h => /цена/i.test(h)),
    color: header.findIndex(h => /цвет/i.test(h))
  }
  const out = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    const row = {
      name: (cells[idx.name] || '').trim(),
      type: (cells[idx.type] || '').trim(),
      strength_kg: parseRuNumber(idx.strength >= 0 ? cells[idx.strength] : null) ?? 0,
      diameter_mm: parseRuNumber(idx.diameter >= 0 ? cells[idx.diameter] : null) ?? 0,
      length_m: parseRuNumber(idx.length >= 0 ? cells[idx.length] : null) ?? 0,
      price: parseRuNumber(idx.price >= 0 ? cells[idx.price] : null) ?? 0,
      color: (idx.color >= 0 ? cells[idx.color] : '').trim()
    }
    if (row.name) out.push(row)
  }
  return out
}

/**
 * 鱼钩 CSV → 行对象数组。
 * 表头：Название, Тип, S8, S7, ..., 16/0（20 个钩号列）
 * 输出 strength_json 结构 [{size, kg}]，空格值跳过。
 */
export function parseHooksCsv(csvText) {
  const lines = String(csvText || '').split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const header = parseCsvLine(lines[0]).map(h => h.trim())
  const sizeCols = []
  for (let i = 2; i < header.length; i++) sizeCols.push({ size: header[i], idx: i })
  const out = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    const name = (cells[0] || '').trim()
    if (!name) continue
    const strength = []
    for (const { size, idx } of sizeCols) {
      const kg = parseRuNumber(cells[idx])
      if (kg != null) strength.push({ size, kg })
    }
    out.push({ name, type: (cells[1] || '').trim(), strength })
  }
  return out
}

/**
 * Tilda 强度计算器页 HTML → [{model, strength_kg}]。
 * 数据在 <option value="Admiral 1000s = 9.00"> 中；"?" 表示未知（跳过）。
 *
 * 注意：计算器页还内嵌「齿轮磨损 0-100% → 0.00-1.00 系数」的 option，
 * 形如 value="50% = 0.5"，会被同一正则命中——必须过滤：
 * 型号必须含字母且不含百分号，否则视为磨损系数行丢弃。
 */
export function parseCalcOptions(html) {
  const out = []
  const re = /<option[^>]*value="([^"]+?)\s*=\s*([\d.,?]+)"[^>]*>/g
  let m
  while ((m = re.exec(html)) !== null) {
    const model = m[1].trim()
    const kg = parseRuNumber(m[2])
    if (!model || kg == null) continue
    // 排除磨损系数行：含 % 或纯数字（无字母）的都不是型号名
    if (model.includes('%') || !/[A-Za-z\u0400-\u04FF]/.test(model)) continue
    out.push({ model, strength_kg: kg })
  }
  return out
}

/** 从子页 HTML 提取页面标题（作轮型分类名），失败返回空串 */
export function extractPageTitle(html) {
  const m = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!m) return ''
  return m[1]
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*[|–—-]\s*Potryasov.*$/i, '')
    .trim()
}

/**
 * RF4-STAT /weight/ 页 HTML → 鱼种奖杯数据数组。
 * 每行：fish/<slug> 链接、中文名、奖杯重量、超级奖杯重量、最大重量(<a>数值克 + small 日期 (玩家))、稀有性。
 */
export function parseWeightTable(html) {
  const htmlText = String(html || '')
  const rowRe = /<tr>\s*<td class="mobile-clear fish-icon"[\s\S]*?<\/tr>/g
  const out = []
  const numFromText = (s) => {
    const m = String(s || '').replace(/\s|&nbsp;/g, '').match(/([\d.,]+)/)
    if (!m) return 0
    const n = Number(m[1].replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  const cellText = (cell) => cell
    .replace(/<span[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  let m
  while ((m = rowRe.exec(htmlText)) !== null) {
    const row = m[0]
    const slugMatch = row.match(/href="fish\/([^"]+)"/)
    const cells = row.match(/<td[\s\S]*?<\/td>/g) || []
    if (!slugMatch || cells.length < 5) continue
    const name = cellText(cells[1])
    if (!name) continue
    const trophy = numFromText(cellText(cells[2]))
    const superTrophy = numFromText(cellText(cells[3]))
    // 最大重量格：<a>49 820</a> 克 <small>2025-02-24 (Anpaer)</small>
    const maxCell = cells[4]
    const maxWeight = numFromText(cellText(maxCell))
    const metaMatch = maxCell.match(/(\d{4}-\d{2}-\d{2})\s*\(([^)]+)\)/)
    out.push({
      slug: slugMatch[1],
      name,
      trophy_weight: trophy,
      super_trophy_weight: superTrophy,
      max_record_weight: maxWeight,
      max_record_date: metaMatch ? metaMatch[1] : '',
      max_record_player: metaMatch ? metaMatch[2].trim() : '',
      rarity: cellText(cells[5] || cells[cells.length - 1] || '')
    })
  }
  return out
}
