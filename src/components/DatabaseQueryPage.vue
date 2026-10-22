<template>
  <div class="app">
    <div class="page-header">
      <h1>数据查询</h1>
      <p class="page-desc">数据库全量数据检索：鱼竿 / 渔轮 / 鱼线 / 鱼钩 / 鱼种 / 图鉴全字段 · 渔获速查（实时）</p>
    </div>

    <!-- 分类 Tab -->
    <div class="tab-bar">
      <button
        v-for="t in tabs"
        :key="t.key"
        :class="['tab-btn', { active: activeTab === t.key }]"
        @click="switchTab(t.key)"
      >{{ t.label }}</button>
    </div>

    <!-- 渔获速查：专用 UI -->
    <template v-if="activeTab === 'fishing'">
      <div class="search-bar">
        <input
          v-model="fishingQuery"
          type="text"
          class="search-input"
          placeholder="输入地图或鱼种关键字，如：铜湖 / 锦鲤"
          @keyup.enter="searchFishing"
        />
        <button class="search-btn" :disabled="fishingLoading" @click="searchFishing">
          {{ fishingLoading ? '查询中...' : '查询' }}
        </button>
      </div>
      <p class="fishing-note">查询 rf4-stat 最新渔获流（最近约 100 条，按关键字过滤地图/鱼种）</p>
      <div v-if="fishingError" class="query-error">{{ fishingError }}</div>
      <div v-if="fishingRows.length" class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>时间</th><th>地图</th><th>鱼种</th><th>重量</th><th>饵料</th><th>钓法</th></tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in fishingRows" :key="i">
              <td>{{ r.time }}</td>
              <td>{{ r.location }}</td>
              <td>{{ r.fish }}</td>
              <td>{{ r.weight }}</td>
              <td>{{ r.bait }}</td>
              <td>{{ r.method }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="!fishingLoading && fishingSearched" class="query-empty">没有匹配的渔获记录</div>
    </template>

    <!-- 通用数据表 -->
    <template v-else>
      <div class="search-bar">
        <input
          v-model="keyword"
          type="text"
          class="search-input"
          :placeholder="activeConf.searchPlaceholder"
          @input="debouncedSearch"
        />
      </div>

      <div v-if="loading" class="query-loading">查询中...</div>
      <div v-else-if="error" class="query-error">{{ error }}</div>
      <template v-else>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th v-for="col in activeConf.columns" :key="col.prop">{{ col.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in rows" :key="i">
                <td v-for="col in activeConf.columns" :key="col.prop">{{ fmt(row, col) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pager">
          <span class="pager-info">共 {{ total }} 条 · 第 {{ page }}/{{ totalPages }} 页</span>
          <button :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
          <button :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
        </div>
      </template>
    </template>
  </div>
</template>

<script>
import { fetchWithTimeout } from '../utils/fetch.js'

const PAGE_SIZE = 50

/** 每类数据的列定义（prop 与后端字段一致） */
const TABS = [
  {
    key: 'rods', label: '鱼竿', table: 'rods',
    searchPlaceholder: '搜索型号 / 名称 / 分类',
    columns: [
      { prop: 'model', label: '型号' },
      { prop: 'equipmentName', label: '名称' },
      { prop: 'category', label: '分类' },
      { prop: 'panelTension', label: '面板拉力' },
      { prop: 'lockTension', label: '锁轮拉力' },
      { prop: 'testG', label: '测试克重' },
      { prop: 'silverPrice', label: '银币' },
      { prop: 'goldPrice', label: '金币' },
      { prop: 'levelReq', label: '等级' }
    ]
  },
  {
    key: 'reels', label: '渔轮', table: 'reels',
    searchPlaceholder: '搜索型号 / 名称 / 分类',
    columns: [
      { prop: 'model', label: '型号' },
      { prop: 'equipmentName', label: '名称' },
      { prop: 'category', label: '分类' },
      { prop: 'size', label: '大小' },
      { prop: 'lockTension', label: '锁轮拉力' },
      { prop: 'frictionForce', label: '摩擦制动力' },
      { prop: 'transmissionRatio', label: '传动比' },
      { prop: 'silverPrice', label: '银币' },
      { prop: 'goldPrice', label: '金币' },
      { prop: 'levelReq', label: '等级' }
    ]
  },
  {
    key: 'fishing_lines', label: '鱼线', table: 'fishing_lines',
    searchPlaceholder: '搜索型号 / 材质 / 颜色 / 线径(如 0.18)',
    columns: [
      { prop: 'name', label: '型号' },
      { prop: 'type', label: '材质' },
      { prop: 'diameter_mm', label: '线径(mm)' },
      { prop: 'strength_kg', label: '拉力(kg)' },
      { prop: 'length_m', label: '长度(m)' },
      { prop: 'price', label: '价格' },
      { prop: 'color', label: '颜色' }
    ]
  },
  {
    key: 'fishing_hooks', label: '鱼钩', table: 'fishing_hooks',
    searchPlaceholder: '搜索型号 / 钩型',
    columns: [
      { prop: 'name', label: '型号' },
      { prop: 'type', label: '钩型' },
      { prop: 'max_strength', label: '最大钩号拉力(kg)' },
      { prop: 'strength_summary', label: '钩号-拉力' }
    ]
  },
  {
    key: 'fish_species', label: '鱼种', table: 'fish_species',
    searchPlaceholder: '搜索鱼种名称 / 描述',
    columns: [
      { prop: 'display_name', label: '鱼种' },
      { prop: 'difficulty', label: '难度' },
      { prop: 'min_tension', label: '推荐拉力下限' },
      { prop: 'max_tension', label: '推荐拉力上限' },
      { prop: 'trophy_weight', label: '奖杯重量(g)' },
      { prop: 'max_record_weight', label: '最大纪录(g)' },
      { prop: 'rarity', label: '稀有性' }
    ]
  },
  {
    key: 'fishing', label: '渔获速查'
  },
  {
    key: 'gamekee_items', label: '图鉴全字段', table: 'gamekee_items',
    searchPlaceholder: '搜索名称 / 分区 / 描述 / 属性关键字',
    columns: [
      { prop: 'section', label: '分区' },
      { prop: 'name', label: '名称' },
      { prop: 'category_path', label: '分类路径' },
      { prop: 'description', label: '描述' }
    ]
  }
]

/** 鱼钩 strength_json → 摘要 */
function hookStrengthSummary(json) {
  try {
    const arr = JSON.parse(json || '[]')
    if (!arr.length) return '-'
    const max = arr.reduce((a, b) => (b.kg > a.kg ? b : a))
    return `最大 ${max.size} ${max.kg}kg（${arr.length} 个钩号）`
  } catch {
    return '-'
  }
}

export default {
  name: 'DatabaseQueryPage',
  data() {
    return {
      tabs: TABS,
      activeTab: 'rods',
      keyword: '',
      rows: [],
      total: 0,
      page: 1,
      pageSize: PAGE_SIZE,
      loading: false,
      error: '',
      fishingQuery: '',
      fishingRows: [],
      fishingLoading: false,
      fishingError: '',
      fishingSearched: false
    }
  },
  computed: {
    activeConf() {
      return TABS.find(t => t.key === this.activeTab) || TABS[0]
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.total / this.pageSize))
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    /** 鱼钩/特殊列格式化 */
    fmt(row, col) {
      const v = row[col.prop]
      if (col.prop === 'strength_summary') return hookStrengthSummary(row.strength_json)
      if (col.prop === 'max_strength') {
        try {
          const arr = JSON.parse(row.strength_json || '[]')
          if (!arr.length) return '-'
          const max = arr.reduce((a, b) => (b.kg > a.kg ? b : a))
          return `${max.kg}`
        } catch {
          return '-'
        }
      }
      if (v == null || v === '') return '-'
      return String(v).length > 80 ? String(v).slice(0, 80) + '…' : String(v)
    },
    switchTab(key) {
      if (this.activeTab === key) return
      this.activeTab = key
      this.keyword = ''
      this.page = 1
      this.rows = []
      this.error = ''
      if (key !== 'fishing') this.loadData()
    },
    debouncedSearch() {
      if (this._searchTimer) clearTimeout(this._searchTimer)
      this._searchTimer = setTimeout(() => {
        this.page = 1
        this.loadData()
      }, 300)
    },
    goPage(p) {
      this.page = p
      this.loadData()
    },
    async loadData() {
      this.loading = true
      this.error = ''
      try {
        const conf = this.activeConf
        const params = new URLSearchParams({
          table: conf.table,
          page: String(this.page),
          pageSize: String(this.pageSize)
        })
        if (this.keyword) params.set('q', this.keyword)
        const res = await fetchWithTimeout(`/api/query_data?${params}`)
        const result = await res.json()
        if (!result.success) throw new Error(result.message || '查询失败')
        this.rows = result.data || []
        this.total = result.total || 0
      } catch (e) {
        this.error = '查询失败：' + e.message
        this.rows = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },
    /** 渔获速查：后端代理抓取 rf4-stat 最新渔获流并按关键字过滤 */
    async searchFishing() {
      const q = this.fishingQuery.trim()
      if (!q) {
        this.fishingError = '请输入地图或鱼种关键字'
        return
      }
      this.fishingLoading = true
      this.fishingError = ''
      this.fishingSearched = true
      try {
        const res = await fetchWithTimeout(`/api/rf4stat_fishing?q=${encodeURIComponent(q)}`)
        const result = await res.json()
        if (!result.success) throw new Error(result.message || '查询失败')
        this.fishingRows = result.data || []
      } catch (e) {
        this.fishingError = '查询失败：' + e.message
        this.fishingRows = []
      } finally {
        this.fishingLoading = false
      }
    }
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: 16px;
}

.page-header h1 {
  font-size: 22px;
  color: var(--text-heading);
  margin-bottom: 4px;
}

.page-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.tab-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.tab-btn {
  padding: 7px 16px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-surface);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: white;
}

.search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.search-input {
  flex: 1;
  max-width: 420px;
  padding: 9px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--text-main);
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.search-btn {
  padding: 9px 20px;
  border: none;
  border-radius: 6px;
  background: var(--color-primary);
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.fishing-note {
  font-size: 12px;
  color: var(--text-hint);
  margin-bottom: 10px;
}

.query-loading {
  padding: 30px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.query-error {
  background: var(--color-danger-bg);
  color: var(--color-danger-strong);
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 10px;
}

.query-empty {
  padding: 30px;
  text-align: center;
  color: var(--text-hint);
  font-size: 14px;
}

.data-table-wrap {
  overflow-x: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  text-align: left;
  padding: 10px 12px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-weight: 600;
  white-space: nowrap;
  position: sticky;
  top: 0;
}

.data-table td {
  padding: 9px 12px;
  border-top: 1px solid var(--color-divider);
  color: var(--text-main);
  word-break: break-all;
}

.data-table tbody tr:hover {
  background: var(--color-primary-bg);
}

.pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.pager-info {
  font-size: 13px;
  color: var(--text-secondary);
  margin-right: auto;
}

.pager button {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--text-main);
  font-size: 13px;
  cursor: pointer;
}

.pager button:disabled {
  opacity: 0.4;
  cursor: default;
}

.pager button:not(:disabled):hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
</style>
