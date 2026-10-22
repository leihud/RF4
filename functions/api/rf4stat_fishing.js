import { jsonResponse, errorResponse } from './_shared.js'

/**
 * 渔获速查：代理抓取 RF4-STAT 最新渔获流（/fishing/ 无参列表页，robots 合规），
 * 服务端解析并按地图/鱼种关键字过滤。
 *
 * 说明：Node/Worker fetch 的 TLS 指纹可能被对方 Cloudflare 质询，
 * 质询时返回友好错误提示（不重试轰炸）。
 */
const FEED_URL = 'https://cn.rf4-stat.com/fishing/'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/** 解析 /fishing/ 列表 HTML → 行数组 */
export function parseFishingFeed(html) {
  const rows = []
  const rowRe = /<tr[^>]*class="[^"]*load-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/g
  const stripTags = (s) => s
    .replace(/<span[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  let m
  while ((m = rowRe.exec(html)) !== null) {
    const row = m[1]
    const time = stripTags(row.match(/<td[^>]*class="[^"]*time[^"]*"[^>]*>([\s\S]*?)<\/td>/)?.[1] || '')
    const location = stripTags(row.match(/<td[^>]*class="[^"]*mobile-location[^"]*"[^>]*>([\s\S]*?)<\/td>/)?.[1] || '')
    const fishCell = row.match(/<td[^>]*class="[^"]*fish[^"]*"[^>]*>([\s\S]*?)<\/td>/)?.[1] || ''
    const fishName = stripTags(fishCell)
    const weightMatch = fishCell.match(/([\d\s.,]+)\s*克/)
    const weight = weightMatch ? weightMatch[1].replace(/\s/g, '') + '克' : ''
    const bait = stripTags(row.match(/<td[^>]*class="[^"]*bait[^"]*"[^>]*>([\s\S]*?)<\/td>/)?.[1] || '')
    const methodMatch = row.match(/title="钓法:\s*([^"]+)"/)
    const method = methodMatch ? methodMatch[1] : ''
    if (!fishName && !location) continue
    rows.push({
      time,
      location,
      fish: fishName,
      weight,
      bait: bait || '-',
      method: method || '-'
    })
  }
  return rows
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const q = (url.searchParams.get('q') || '').trim()

  try {
    const res = await fetch(FEED_URL, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip'
      }
    })
    if (res.status === 403 || res.status === 503) {
      return jsonResponse({ success: false, message: '数据源暂时拒绝访问（Cloudflare 防护），请稍后重试' }, 502)
    }
    if (!res.ok) {
      return jsonResponse({ success: false, message: `数据源返回 ${res.status}` }, 502)
    }
    const html = await res.text()
    if (html.includes('Just a moment')) {
      return jsonResponse({ success: false, message: '数据源触发人机验证，请稍后重试' }, 502)
    }
    const rows = parseFishingFeed(html)
    const filtered = q
      ? rows.filter(r => r.location.includes(q) || r.fish.includes(q))
      : rows
    return jsonResponse({ success: true, data: filtered, total: filtered.length, source: 'RF4-STAT' })
  } catch (error) {
    console.error('渔获速查失败:', error)
    return errorResponse(error)
  }
}
