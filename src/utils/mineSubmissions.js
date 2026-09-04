/**
 * “我的提交”本地凭据管理。
 * 提交方案成功后，把服务器返回的 owner_token 与方案 id 记在本地（仅存浏览器，
 * 不对外泄露）；方案汇总页据此 token 调 /api/recommended_builds?mine=xxx
 * 查回自己全部方案的审核状态与驳回原因，并支持删除。
 */
const STORAGE_KEY = 'rf4_my_submissions'
/** 本地最多保留的提交记录条数，防止无上限膨胀 */
const MAX_RECORDS = 100
/** 与后端一致：64 位小写十六进制 */
const TOKEN_RE = /^[0-9a-f]{64}$/

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    if (!Array.isArray(list)) return []
    return list.filter(item => {
      if (!item || typeof item.token !== 'string' || !TOKEN_RE.test(item.token)) return false
      return Number.isFinite(Number(item.id)) && Number(item.id) > 0
    })
  } catch (e) {
    return []
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    /* 存储不可用（隐私模式/超配额）时静默降级，不影响主流程 */
  }
}

/** 读取全部“我的提交”记录 */
export function getMySubmissions() {
  return readAll()
}

/** 新增/更新一条提交记录（同 id 去重，超出上限丢弃最旧） */
export function addMySubmission(record) {
  if (!record || typeof record.token !== 'string' || !TOKEN_RE.test(record.token)) return
  const id = Number(record.id)
  if (!Number.isFinite(id) || id <= 0) return
  const next = [
    {
      id,
      token: record.token,
      name: String(record.name || '').slice(0, 80),
      submittedAt: record.submittedAt || new Date().toISOString()
    },
    ...readAll().filter(item => Number(item.id) !== id)
  ]
  writeAll(next.slice(0, MAX_RECORDS))
}

/** 删除一条本地提交记录（id 为数字或数字字符串） */
export function removeMySubmission(id) {
  writeAll(readAll().filter(item => Number(item.id) !== Number(id)))
}

/** 本地记录中所有去重后的 owner_token */
export function getMineTokens() {
  const seen = new Set()
  const tokens = []
  for (const item of readAll()) {
    if (!seen.has(item.token)) {
      seen.add(item.token)
      tokens.push(item.token)
    }
  }
  return tokens
}
