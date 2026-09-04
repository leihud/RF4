// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  getClientIP,
  isValidUserAgent,
  errorResponse,
  isIPBlacklisted
} from '../functions/api/_shared.js'
import { onRequestGet as getRecommendedBuilds } from '../functions/api/recommended_builds.js'
import { onRequestPost as postLike } from '../functions/api/recommended_builds/like.js'

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
  const row = { id: 1, name: '测试方案', is_approved: 0, reject_reason: '待人工复核', likes: 0 }
  const approvedRow = { id: 2, name: '已过审', is_approved: 1, reject_reason: '', likes: 1 }

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
    // 公开行保留 is_approved（页面模板依赖其判断标签显隐），但剥离 reject_reason
    expect(body.data[0].reject_reason).toBeUndefined()
    expect(body.data[0].is_approved).toBe(1)
    expect(body.data[0].likes).toBe(1)
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
