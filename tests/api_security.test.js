// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  getClientIP,
  isValidUserAgent,
  errorResponse,
  isIPBlacklisted
} from '../functions/api/_shared.js'
import {
  onRequestGet as getRecommendedBuilds,
  onRequestPost as submitBuild,
  onRequestDelete as deleteBuild
} from '../functions/api/recommended_builds.js'
import { onRequestPost as postLike } from '../functions/api/recommended_builds/like.js'

const TOKEN_A = 'a'.repeat(64)
const TOKEN_B = 'b'.repeat(64)

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

function makeRequest(path, { method = 'GET', headers = {}, body } = {}) {
  return new Request(`https://rf4.test${path}`, {
    method,
    headers: { 'user-agent': BROWSER_UA, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
}

describe('functions/api/_shared.js 反扒工具', () => {
  it('getClientIP 只信任 CF-Connecting-IP', () => {
    const real = new Request('https://rf4.test/x', {
      headers: { 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' }
    })
    expect(getClientIP(real)).toBe('1.2.3.4')

    // 仅有可伪造的 X-Forwarded-For 时不得回退，返回 unknown
    const spoofed = new Request('https://rf4.test/x', {
      headers: { 'x-forwarded-for': '6.6.6.6' }
    })
    expect(getClientIP(spoofed)).toBe('unknown')
  })

  it('isValidUserAgent 放行浏览器、拒绝脚本与空 UA', () => {
    expect(isValidUserAgent(new Request('https://rf4.test/x'))).toBe(false)
    const withUA = (ua) =>
      isValidUserAgent(new Request('https://rf4.test/x', { headers: { 'user-agent': ua } }))

    expect(withUA(BROWSER_UA)).toBe(true)
    expect(withUA('curl/8.5.0')).toBe(false)
    expect(withUA('Python-urllib/3.11')).toBe(false)
    expect(withUA('node-fetch/2.6.9')).toBe(false)
    expect(withUA('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe(false)
    // 仅伪造 Mozilla 前缀但含脚本关键词也拒绝
    expect(withUA(`Mozilla/5.0 curl/8.5.0`)).toBe(false)
  })

  it('errorResponse 统一契约且不泄露内部错误细节', async () => {
    const res = errorResponse(new Error('UNIQUE constraint failed: recommended_builds.name'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.message).not.toContain('constraint')
    expect(body.message).toContain('失败')
  })

  it('isIPBlacklisted 对超过解封期的黑名单自动解除', async () => {
    const calls = []
    const query = {
      bind: () => query,
      first: async () => ({ id: 5, last_request_at: new Date(Date.now() - 8 * 86400000).toISOString() }),
      run: async () => ({ meta: { changes: 1 } }),
      all: async () => ({ results: [] })
    }
    const db = {
      prepare(sql) {
        calls.push(sql)
        return query
      }
    }
    expect(await isIPBlacklisted('1.2.3.4', db)).toBe(false)
    expect(calls.length).toBe(2)
    expect(calls[1]).toContain('is_blacklisted = 0')
  })
})

describe('functions/api/recommended_builds.js 管理视图鉴权', () => {
  const row = { id: 1, name: '测试方案', is_approved: 0, reject_reason: '待人工复核', likes: 0, owner_token: TOKEN_A }
  const approvedRow = { id: 2, name: '已过审', is_approved: 1, reject_reason: '', likes: 1, owner_token: TOKEN_B }

  function dbStub(rows) {
    const queries = []
    const q = {
      bind: () => q,
      all: async () => ({ results: rows }),
      first: async () => rows[0] || null,
      run: async () => ({ meta: { changes: 1, last_row_id: 1 } })
    }
    return {
      db: {
        prepare(sql) {
          queries.push(sql)
          return q
        }
      },
      queries
    }
  }

  const envWithPassword = (db) => ({ DB: db, IMPORT_PASSWORD: 's3cret-pass' })

  it('admin=true 无密码返回 401 且不执行查询', async () => {
    const { db, queries } = dbStub([row])
    const res = await getRecommendedBuilds({
      request: makeRequest('/api/recommended_builds?admin=true'),
      env: envWithPassword(db)
    })
    expect(res.status).toBe(401)
    expect(queries.length).toBe(0)
  })

  it('admin=true 密码错误返回 401', async () => {
    const { db, queries } = dbStub([row])
    const res = await getRecommendedBuilds({
      request: makeRequest('/api/recommended_builds?admin=true', {
        headers: { 'x-admin-password': 'wrong' }
      }),
      env: envWithPassword(db)
    })
    expect(res.status).toBe(401)
    expect(queries.length).toBe(0)
  })

  it('admin=true 带正确密码可查看未审核数据且不被过滤', async () => {
    const { db, queries } = dbStub([row])
    const res = await getRecommendedBuilds({
      request: makeRequest('/api/recommended_builds?admin=true&limit=200', {
        headers: { 'x-admin-password': 's3cret-pass' }
      }),
      env: envWithPassword(db)
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(queries[0]).not.toContain('is_approved = 1')
    expect(queries[0]).toContain('LIMIT ? OFFSET ?')
    expect(body.data[0].reject_reason).toBe('待人工复核')
    // 管理视图也不回传 owner_token，避免令牌泄漏
    expect(body.data[0].owner_token).toBeUndefined()
  })

  it('公开列表仅返回已审核数据且剥离管理字段', async () => {
    const { db, queries } = dbStub([approvedRow])
    const res = await getRecommendedBuilds({
      request: makeRequest('/api/recommended_builds?admin=false&limit=20'),
      env: envWithPassword(db)
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(queries[0]).toContain('is_approved = 1')
    // 公开行保留 is_approved（页面模板依赖其判断标签显隐），但剥离 reject_reason 与 owner_token
    expect(body.data[0].reject_reason).toBeUndefined()
    expect(body.data[0].owner_token).toBeUndefined()
    expect(body.data[0].is_approved).toBe(1)
    expect(body.data[0].likes).toBe(1)
  })
})

describe('functions/api/recommended_builds.js 我的提交(owner_token)', () => {
  const mineRow = { id: 11, name: '我的方案', is_approved: 0, reject_reason: '请补充说明', likes: 0, owner_token: TOKEN_A }
  const otherRow = { id: 22, name: '别人的方案', is_approved: 1, reject_reason: '', likes: 3, owner_token: TOKEN_B }

  function dbStub(rows) {
    const queries = []
    let lastBinds = []
    const q = {
      bind: (...args) => {
        lastBinds = args
        return q
      },
      all: async () => {
        const sql = queries[queries.length - 1]
        let out = rows
        // 模拟 SQL 过滤语义：按 owner_token 列表 / is_approved 过滤，与真实 DB 行为一致
        if (sql.includes('owner_token IN')) {
          const tokens = lastBinds.filter(t => typeof t === 'string' && /^[0-9a-f]{64}$/.test(t))
          out = rows.filter(r => tokens.includes(r.owner_token))
        }
        if (sql.includes('is_approved = 1')) {
          out = out.filter(r => r.is_approved === 1)
        }
        return { results: out }
      },
      first: async () => rows[0] || null,
      run: async () => ({ meta: { changes: 1, last_row_id: 11 } })
    }
    return {
      db: {
        prepare(sql) {
          queries.push(sql)
          return q
        }
      },
      queries
    }
  }

  const envWithPassword = (db) => ({ DB: db, IMPORT_PASSWORD: 's3cret-pass' })

  it('POST 提交返回 64 位十六进制 owner_token 且写入数据', async () => {
    const { db, queries } = dbStub([])
    const res = await submitBuild({
      request: makeRequest('/api/recommended_builds', {
        method: 'POST',
        body: { build: { name: '新方案', rodModel: 'R1' } }
      }),
      env: envWithPassword(db)
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.ownerToken).toMatch(/^[0-9a-f]{64}$/)
    const insertSql = queries.find((sql) => sql.includes('INSERT INTO recommended_builds'))
    expect(insertSql).toContain('owner_token')
  })

  it('GET mine=token 仅返回本人方案并保留驳回原因、剥离 owner_token', async () => {
    const { db, queries } = dbStub([mineRow, otherRow])
    const res = await getRecommendedBuilds({
      request: makeRequest(`/api/recommended_builds?mine=${TOKEN_A}&limit=200`),
      env: envWithPassword(db)
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(queries[0]).toContain('owner_token IN (?)')
    expect(queries[0]).not.toContain('is_approved = 1')
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe(11)
    // 提交者需要看到自己的审核状态与驳回原因
    expect(body.data[0].is_approved).toBe(0)
    expect(body.data[0].reject_reason).toBe('请补充说明')
    expect(body.data[0].owner_token).toBeUndefined()
  })

  it('GET mine 非法 token 返回 400 且不执行查询', async () => {
    const { db, queries } = dbStub([])
    const res = await getRecommendedBuilds({
      request: makeRequest('/api/recommended_builds?mine=bad-token!'),
      env: envWithPassword(db)
    })
    expect(res.status).toBe(400)
    expect(queries.length).toBe(0)
  })

  it('DELETE 凭正确 owner_token 可删除自己的方案', async () => {
    const { db, queries } = dbStub([mineRow])
    const res = await deleteBuild({
      request: makeRequest('/api/recommended_builds', {
        method: 'DELETE',
        body: { id: 11, ownerToken: TOKEN_A }
      }),
      env: envWithPassword(db)
    })
    expect(res.status).toBe(200)
    expect(queries.some((sql) => sql.includes('DELETE FROM recommended_builds'))).toBe(true)
  })

  it('DELETE owner_token 不匹配时返回 403', async () => {
    const { db, queries } = dbStub([otherRow])
    const res = await deleteBuild({
      request: makeRequest('/api/recommended_builds', {
        method: 'DELETE',
        body: { id: 22, ownerToken: TOKEN_A }
      }),
      env: envWithPassword(db)
    })
    expect(res.status).toBe(403)
    expect(queries.some((sql) => sql.includes('DELETE FROM recommended_builds'))).toBe(false)
  })
})

describe('functions/api/recommended_builds/like.js 点赞校验', () => {
  function likeDb({ build, existingLike }) {
    const queries = []
    const db = {
      prepare(sql) {
        queries.push(sql)
        const isBuildQuery = sql.includes('FROM recommended_builds')
        const isLikeQuery = sql.includes('FROM build_likes')
        const q = {
          bind: () => q,
          all: async () => ({ results: [] }),
          run: async () => ({ meta: { changes: 1 } }),
          first: async () => {
            if (isBuildQuery) return build
            if (isLikeQuery) return existingLike ? { id: 7 } : null
            return null
          }
        }
        return q
      },
      queries
    }
    return db
  }

  const env = (db) => ({ DB: db })

  it('缺少参数返回 400', async () => {
    const res = await postLike({
      request: makeRequest('/api/recommended_builds/like', { method: 'POST', body: {} }),
      env: env(likeDb({ build: { id: 1, is_approved: 1 } }))
    })
    expect(res.status).toBe(400)
  })

  it('非法 client_id 返回 400', async () => {
    const res = await postLike({
      request: makeRequest('/api/recommended_builds/like', {
        method: 'POST',
        body: { id: 1, clientId: 'ab!' }
      }),
      env: env(likeDb({ build: { id: 1, is_approved: 1 } }))
    })
    expect(res.status).toBe(400)
  })

  it('方案不存在或未过审返回 404', async () => {
    const notFound = await postLike({
      request: makeRequest('/api/recommended_builds/like', {
        method: 'POST',
        body: { id: 999, clientId: 'client_test_001' }
      }),
      env: env(likeDb({ build: null }))
    })
    expect(notFound.status).toBe(404)

    const unapproved = await postLike({
      request: makeRequest('/api/recommended_builds/like', {
        method: 'POST',
        body: { id: 1, clientId: 'client_test_001' }
      }),
      env: env(likeDb({ build: { id: 1, is_approved: 0 } }))
    })
    expect(unapproved.status).toBe(404)
  })

  it('正常点赞成功后写入并自增', async () => {
    const db = likeDb({ build: { id: 1, is_approved: 1 }, existingLike: false })
    const res = await postLike({
      request: makeRequest('/api/recommended_builds/like', {
        method: 'POST',
        body: { id: 1, clientId: 'client_test_001' }
      }),
      env: env(db)
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.liked).toBe(true)
    expect(db.queries.some((sql) => sql.includes('INSERT INTO build_likes'))).toBe(true)
    expect(db.queries.some((sql) => sql.includes('likes = likes + 1'))).toBe(true)
  })

  it('重复点赞视为取消', async () => {
    const db = likeDb({ build: { id: 1, is_approved: 1 }, existingLike: true })
    const res = await postLike({
      request: makeRequest('/api/recommended_builds/like', {
        method: 'POST',
        body: { id: 1, clientId: 'client_test_001', unlike: true }
      }),
      env: env(db)
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.liked).toBe(false)
    expect(db.queries.some((sql) => sql.includes('DELETE FROM build_likes'))).toBe(true)
  })
})
