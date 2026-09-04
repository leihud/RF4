import {
  clientGuard,
  jsonResponse,
  errorResponse,
  enforceBodyLimit,
  sanitizeEquipmentData,
  buildSearchWhere
} from './_shared.js'

/** 默认视觉识别模型：使用 Workers AI 上的 Moondream（轻量 OCR/看图能力，适合读取截图文字）
 *  其他可选模型（支持图片输入）：
 *    @cf/meta/llama-4-scout-17b-16e-instruct
 *    @cf/mistral/mistral-small-3.1-24b-instruct
 *    @cf/qwen/qwen2.5-vl-7b-instruct
 *  可在 Cloudflare Dashboard > Pages > Functions 中添加变量 RECOGNITION_MODEL 覆盖
 */
const DEFAULT_MODEL = '@cf/moondream/moondream3.1-9B-A2B'

/** 单次识别最多返回的装备项数（控制输出与匹配成本） */
const MAX_ITEMS = 15

/** 请求体最大 4MB：压缩后截图约为 1.5~3MB */
const MAX_BODY_BYTES = 4_000_000

/** 候选匹配阈值：低于此分数视为未匹配 */
const MATCH_THRESHOLD = 0.55

/**
 * 处理截图上传，识别图中装备并返回候选装备价值对象。
 * 依赖 Cloudflare Workers AI binding：env.AI
 * 若未配置，前端会收到 code=AI_NOT_CONFIGURED，并提示用户前往控制台开启。
 */
export async function onRequestPost(context) {
  const { request, env } = context

  const guard = await clientGuard(request, env.DB)
  if (!guard.allowed) {
    return jsonResponse({ success: false, message: guard.message }, guard.status)
  }

  const limit = enforceBodyLimit(request, MAX_BODY_BYTES)
  if (!limit.ok) return limit.response

  if (!env.AI) {
    return jsonResponse(
      {
        success: false,
        code: 'AI_NOT_CONFIGURED',
        message:
          '截图识别服务未配置。请在 Cloudflare Dashboard > Pages > 项目 > Functions > Bindings 中绑定 Workers AI（AI binding）。'
      },
      503
    )
  }

  let body
  try {
    body = await request.json()
  } catch (err) {
    console.error('recognize body parse error:', err)
    return jsonResponse({ success: false, message: '请求体 JSON 解析失败' }, 400)
  }

  const imageBase64 = body?.image
  if (typeof imageBase64 !== 'string' || imageBase64.trim().length < 100) {
    return jsonResponse({ success: false, message: '缺少有效的图片数据' }, 400)
  }

  let imageBytes
  try {
    imageBytes = base64ToUint8Array(imageBase64)
  } catch (err) {
    console.error('base64 decode error:', err)
    return jsonResponse({ success: false, message: '图片 Base64 解码失败' }, 400)
  }

  // 模型可用字节数组或 ArrayBuffer；这里直接传 Uint8Array，Cloudflare 运行时会自动处理
  const model = env.RECOGNITION_MODEL?.trim() || DEFAULT_MODEL
  const prompt = buildPrompt()

  let aiText
  try {
    const result = await env.AI.run(model, {
      prompt,
      image: imageBytes,
      max_tokens: 900,
      temperature: 0.1
    })
    aiText = extractAiText(result)
  } catch (err) {
    console.error('AI recognition failed:', err)
    return jsonResponse(
      {
        success: false,
        code: 'AI_CALL_FAILED',
        message: 'AI 识别服务暂时不可用，请稍后重试。如果一直失败，请确认 Workers AI 已启用且模型 ID 正确。'
      },
      502
    )
  }

  if (!aiText) {
    return jsonResponse({ success: false, message: 'AI 未返回识别结果，请换一张更清晰的截图重试' }, 502)
  }

  const rawItems = parseItemsText(aiText)
  const items = rawItems.slice(0, MAX_ITEMS).map(cleanItem)

  const resultItems = []
  for (const item of items) {
    if (!item.name) continue
    const matches = await findEquipmentCandidates(env.DB, item.name)
    resultItems.push({
      name: item.name,
      quantity: item.quantity,
      matches
    })
  }

  return jsonResponse({ success: true, items: resultItems })
}

/** 构建识别 prompt：要求只输出 JSON，避免模型废话 */
function buildPrompt() {
  return `识别这张《俄罗斯钓鱼4》游戏截图里的装备。截图中每件装备通常是一张卡片，卡片的底部（标题区域）会显示装备的完整英文型号，例如 "TeleStick TL16"、"Model One T700"、"Spark 2 2000S"、"Tagara II 6000"。请逐张提取卡片底部出现的英文完整型号，保持原样，不要翻译，不要加入卡片上方的中文说明文字。

只输出一个 JSON 对象，不要输出任何解释或 Markdown 代码块。格式如下：
{"items":[{"name":"Blackwood Picker PSL98MH","quantity":1}]}

如果同一件装备在截图中出现多次，请合并并用 quantity 记录数量；如果没有识别到任何装备，输出 {"items":[]}。`
}

/** 把 AI 可能的返回结构统一成字符串 */
function extractAiText(result) {
  if (typeof result === 'string') return result
  if (result == null) return ''
  if (typeof result.response === 'string') return result.response
  if (typeof result.text === 'string') return result.text
  if (Array.isArray(result.outputs) && typeof result.outputs[0]?.text === 'string') {
    return result.outputs[0].text
  }
  return ''
}

/** 从 AI 返回文本中解析 items 数组（兼容 JSON、Markdown fence、数组包裹等） */
export function parseItemsText(text) {
  if (typeof text !== 'string') return []

  // 去掉 Markdown 代码块
  let cleaned = text.trim()
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence && fence[1]) cleaned = fence[1].trim()

  // 优先解析对象 { items: [...] }
  const objStart = cleaned.indexOf('{')
  const objEnd = cleaned.lastIndexOf('}')
  if (objStart !== -1 && objEnd > objStart) {
    try {
      const obj = JSON.parse(cleaned.slice(objStart, objEnd + 1))
      if (Array.isArray(obj?.items)) return obj.items
    } catch (_) {
      // 继续尝试数组
    }
  }

  // 兜底：直接解析数组
  const arrStart = cleaned.indexOf('[')
  const arrEnd = cleaned.lastIndexOf(']')
  if (arrStart !== -1 && arrEnd > arrStart) {
    try {
      const arr = JSON.parse(cleaned.slice(arrStart, arrEnd + 1))
      return Array.isArray(arr) ? arr : []
    } catch (_) {}
  }

  return []
}

/** 清洗单个识别项：名称截断、数量归一 */
export function cleanItem(item) {
  const rawName = String(item?.name || '')
    .replace(/\s+/g, ' ')
    .trim()
  const name = rawName.length > 120 ? rawName.slice(0, 120) : rawName
  let quantity = parseInt(item?.quantity, 10)
  if (!Number.isFinite(quantity) || quantity < 1) quantity = 1
  if (quantity > 999) quantity = 999
  return { name, quantity }
}

/** 在 rods + reels 表中为单个识别名寻找候选装备 */
async function findEquipmentCandidates(db, name) {
  if (!db) return []
  if (!name || name.length < 2) return []

  const allCandidates = []

  for (const table of ['rods', 'reels']) {
    const type = table === 'rods' ? 'rod' : 'reel'
    const binds = []
    // 仅使用 rods/reels 两表都存在的字段，避免 SQL 引用不存在的列
    const fields = ['model', 'equipmentName', 'category', 'rating', 'form']
    const where = buildSearchWhere(fields, name, binds)
    const sql = `SELECT id, equipmentName, model, category, rating, form, silverPrice, goldPrice, equipmentType FROM ${table} WHERE ${where} LIMIT 60`

    try {
      const { results = [] } = await db.prepare(sql).bind(...binds).all()
      for (const row of results) {
        allCandidates.push({ type, row })
      }
    } catch (err) {
      console.error(`recognize search ${table} failed for "${name}":`, err)
    }
  }

  const top = pickTopCandidates(allCandidates, name, 3)
  return top.map(({ type, row, score }) => ({
    type,
    score,
    ...sanitizeEquipmentData(row, type)
  }))
}

/** 从候选池中挑选最匹配的 topK */
export function pickTopCandidates(candidates, name, topK = 3) {
  const target = normalizeCompare(name)
  if (!target) return []

  const scored = candidates
    .map(({ type, row }) => {
      const modelNorm = normalizeCompare(row.model)
      const nameNorm = normalizeCompare(row.equipmentName)
      const modelScore = modelNorm ? similarity(target, modelNorm) : 0
      const nameScore = nameNorm ? similarity(target, nameNorm) * 0.98 : 0
      const score = Math.max(modelScore, nameScore)
      return { type, row, score }
    })
    .filter((c) => c.score >= MATCH_THRESHOLD)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      // 分数相同时优先更短的型号（更精确）
      const lenA = String(a.row.model || '').length
      const lenB = String(b.row.model || '').length
      return lenA - lenB
    })

  return scored.slice(0, topK)
}

/** 归一化：小写 + 去掉非字母数字与中文外的分隔符，便于比较英文型号 */
export function normalizeCompare(str) {
  if (!str) return ''
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '')
}

/** 相似度：完全相等 > 包含关系 > 编辑距离 */
export function similarity(a, b) {
  if (!a || !b) return 0
  if (a === b) return 1

  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 0

  let score = 0
  if (a.includes(b) || b.includes(a)) {
    const minLen = Math.min(a.length, b.length)
    score = 0.7 + (0.3 * minLen) / maxLen
  } else {
    const dist = levenshtein(a, b)
    score = Math.max(0, 1 - dist / maxLen) * 0.85
  }
  return score
}

/** 编辑距离（短字符串，内存 O(min)） */
function levenshtein(a, b) {
  if (a.length < b.length) [a, b] = [b, a]
  if (b.length === 0) return a.length

  let prev = new Array(b.length + 1).fill(0)
  for (let j = 0; j <= b.length; j++) prev[j] = j

  for (let i = 1; i <= a.length; i++) {
    const curr = new Array(b.length + 1).fill(0)
    curr[0] = i
    const ai = a[i - 1]
    for (let j = 1; j <= b.length; j++) {
      const cost = ai === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    prev = curr
  }
  return prev[b.length]
}

/** 解码 Base64/DataURL 为 Uint8Array */
function base64ToUint8Array(data) {
  let b64 = String(data).trim()
  if (b64.startsWith('data:')) {
    const comma = b64.indexOf(',')
    if (comma === -1) throw new Error('Invalid data URL')
    b64 = b64.slice(comma + 1)
  }
  b64 = b64.replace(/\s+/g, '')

  const binary = atob(b64)
  const len = binary.length
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}
