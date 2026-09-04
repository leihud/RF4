<template>
  <div class="compare-page">
    <div class="compare-header">
      <h1>参数对比</h1>
      <button class="back-btn" @click="goBack">返回计算器</button>
    </div>

    <div class="compare-type-selector">
      <button
        v-for="opt in typeOptions"
        :key="opt.value"
        :class="['type-btn', { active: compareType === opt.value }]"
        @click="switchType(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <div class="compare-search-section">
      <div class="search-input-wrapper">
        <input
          type="text"
          class="search-input"
          v-model="searchQuery"
          placeholder="搜索型号/分组..."
        />
        <span class="search-icon">🔍</span>
      </div>
      <div class="category-filter">
        <select v-model="selectedCategory" class="category-select">
          <option value="">全部分类</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>
    </div>

    <div v-if="isLoading && rodData.length === 0 && reelData.length === 0" class="loading-wrapper">
      <div class="loading-spinner"></div>
      <span class="loading-text">正在加载装备数据...</span>
      <AppSkeleton :rows="6" />
    </div>

    <div v-if="dataLoadError" class="error-wrapper">
      <span class="error-icon">❌</span>
      <span class="error-text">装备对比数据加载失败，请刷新页面重试</span>
    </div>

    <div v-if="!isLoading && !dataLoadError" class="compare-content">
      <div class="equipment-list">
        <div class="list-header-row">
          <h3>装备列表(点击添加到对比)</h3>
          <button class="quick-add-btn" @click="addTopStrength" title="将当前列表中强度前 3 的装备加入对比">+ 强度前3</button>
        </div>
        <div class="list-container">
          <div
            v-for="equipment in filteredEquipment"
            :key="getItemKey(equipment)"
            :class="['equipment-item', { selected: isInCompareList(equipment) }]"
            @click="toggleCompareItem(equipment)"
          >
            <span class="equipment-category-tag">{{ formatValue(equipment.category) }}</span>
            <span
              v-if="equipment.ratingAlias && equipment.ratingAlias !== '常规'"
              class="equipment-rating-tag"
            >{{ formatValue(equipment.ratingAlias) }}</span>
            <span
              class="equipment-name"
              :title="formatValue(equipment.model || equipment.equipmentName, '')"
            >{{ formatValue(equipment.model || equipment.equipmentName) }}</span>
            <button
              class="detail-btn-inline"
              title="查看该装备的参数详情"
              aria-label="查看参数详情"
              @click.stop="openDetail(equipment)"
            >详情</button>
          </div>
          <div v-if="filteredEquipment.length === 0" class="list-empty">
            未找到匹配的装备
          </div>
        </div>
      </div>

      <div v-if="compareEquipmentList.length > 0" class="compare-panel">
        <div class="panel-header">
          <h3>对比面板 ({{ compareEquipmentList.length }})</h3>
          <div class="panel-actions">
            <button class="export-btn" @click="exportCompare" :disabled="compareEquipmentList.length === 0">导出文本</button>
            <button class="clear-btn" @click="clearCompareList">清空</button>
          </div>
        </div>
        <div
          class="compare-grid"
          :style="{ gridTemplateColumns: gridCols }"
          @mouseover="onGridMouseOver"
          @mouseleave="onGridMouseLeave"
        >
          <div class="grid-row grid-header-row">
            <div class="grid-cell grid-label-cell">参数</div>
            <div
              v-for="(equipment, colIdx) in compareEquipmentList"
              :key="getItemKey(equipment)"
              :data-col="colIdx"
              class="grid-cell grid-equipment-cell"
            >
              <span
                class="equipment-name-inline"
                :title="formatValue(equipment.model || equipment.equipmentName)"
              >{{ formatValue(equipment.model || equipment.equipmentName) }}</span>
              <button
                class="remove-btn-inline"
                aria-label="移除对比项"
                :title="`移除 ${formatValue(equipment.model || equipment.equipmentName)}`"
                @click.stop="removeCompareItem(equipment)"
              >×</button>
              <span class="equipment-category-inline">{{ formatValue(equipment.subCategory || equipment.category) }}</span>
            </div>
          </div>
          <div
            v-for="(row, idx) in currentCompareRows"
            :key="row.key || row.field || row.label"
            :class="['grid-row', { 'diff-row': isRowDifferent(row), 'grid-row-striped': idx % 2 === 1 }]"
          >
            <div class="grid-cell grid-label-cell" :title="row.label">{{ row.label }}</div>
            <div
              v-for="(equipment, colIdx) in compareEquipmentList"
              :key="getItemKey(equipment)"
              :data-col="colIdx"
              :class="['grid-cell', { 'max-value': row.highlight && isFieldMax(equipment, row), 'col-hover': hoverColumn === colIdx }]"
            >
              {{ formatCellValue(equipment, row) }}
              <span
                v-if="row.highlight && !isFieldMax(equipment, row) && formatDelta(equipment, row)"
                class="diff-delta"
                title="与最优值的差距"
              >{{ formatDelta(equipment, row) }}</span>
            </div>
          </div>
          <div
            v-for="(row, idx) in costEffectivenessRows"
            :key="row.field"
            :class="['grid-row', { 'grid-row-striped': (currentCompareRows.length + idx) % 2 === 1 }]"
          >
            <div class="grid-cell grid-label-cell" :title="row.label">{{ row.label }}</div>
            <div
              v-for="(equipment, colIdx) in compareEquipmentList"
              :key="getItemKey(equipment)"
              :data-col="colIdx"
              :class="['grid-cell', { 'max-value': isBestCostEffectiveness(equipment, row.field), 'col-hover': hoverColumn === colIdx }]"
            >
              {{ formatCostEffectiveness(equipment, row.field) }}
            </div>
          </div>
        </div>
      </div>

      <div v-else class="compare-panel empty-panel">
        <div class="empty-hint">
          <span class="hint-icon">📋</span>
          <p>点击左侧装备添加到对比</p>
          <p>支持选择多个装备进行参数对比</p>
        </div>
      </div>
    </div>

    <!-- 装备详情弹窗：点击列表中的装备名称打开 -->
    <div v-if="detailEquipment" class="detail-mask" @click.self="closeDetailModal">
      <div class="detail-modal" role="dialog" aria-modal="true" aria-label="装备详情">
        <button class="detail-close-btn" aria-label="关闭详情" @click="closeDetailModal">×</button>
        <div class="detail-head">
          <span class="equipment-category-tag">{{ formatValue(detailEquipment.category) }}</span>
          <span
            v-if="detailEquipment.ratingAlias && detailEquipment.ratingAlias !== '常规'"
            class="equipment-rating-tag"
          >{{ formatValue(detailEquipment.ratingAlias) }}</span>
          <h3 class="detail-title">{{ formatValue(detailEquipment.model || detailEquipment.equipmentName) }}</h3>
        </div>
        <div class="detail-rows">
          <div v-for="row in detailRows" :key="row.key || row.field || row.label" class="detail-row">
            <span class="detail-row-label">{{ row.label }}</span>
            <span class="detail-row-value">{{ formatCellValue(detailEquipment, row) }}</span>
          </div>
        </div>
        <div class="detail-footer">
          <button
            class="detail-toggle-btn"
            :class="{ active: isInCompareList(detailEquipment) }"
            @click="toggleCompareItem(detailEquipment)"
          >
            {{ isInCompareList(detailEquipment) ? '已在对比中，点击移除' : '加入对比' }}
          </button>
          <button class="detail-close-ok" @click="closeDetailModal">关闭</button>
        </div>
      </div>
    </div>

    <!-- Toast 提示（共享组件，自管定时器） -->
    <AppToast ref="toast" />
  </div>
</template>

<script>
import { searchAndRankEquipment, sortByPanelTension, EQUIPMENT_SEARCH_FIELDS } from '../utils/search.js'
import { sanitizeEquipmentFields } from '../utils/sanitize.js'
import { loadRodAndReelData } from '../utils/equipmentLoader.js'
import { getMergedAdaptWeight, parsePrice } from '../utils/display.js'
import AppSkeleton from './common/AppSkeleton.vue'
import AppToast from './common/AppToast.vue'
import { lockScroll, bindEscape } from '../utils/modal.js'

const COMPARE_ROWS = {
  rod: [
    { label: '强度', field: 'strengthKg', highlight: true },
    { label: '长度', field: 'lengthM', highlight: true },
    { label: '质量', field: 'weightG', highlight: true },
    {
      label: '适配重',
      key: 'adaptWeightMerged',
      merge: ['adaptWeight', 'adaptWeightStar', 'adaptWeightG', 'testG'],
      format: (raw, equipment) => {
        if (equipment.adaptWeight != null && equipment.adaptWeight !== '') return equipment.adaptWeight
        if (equipment.adaptWeightStar != null && equipment.adaptWeightStar !== '' && equipment.adaptWeightStar !== 0) {
          return equipment.adaptWeightStar
        }
        if (equipment.adaptWeightG != null && equipment.adaptWeightG !== '' && equipment.adaptWeightG !== 0) {
          return typeof equipment.adaptWeightG === 'number' ? `${equipment.adaptWeightG} g` : equipment.adaptWeightG
        }
        if (equipment.testG != null && equipment.testG !== '' && equipment.testG !== 0) {
          return typeof equipment.testG === 'number' ? `${equipment.testG} g` : equipment.testG
        }
        return '-'
      },
      highlight: true
    },
    { label: '灵敏度', field: 'sensitivity', highlight: true },
    { label: '硬度', field: 'hardness' },
    { label: '形式', field: 'form' },
    { label: '结构', field: 'structure' },
    { label: '能力', field: 'ability', fallback: '-' },
    { label: '评级', field: 'rating' },
    { label: '等级要求', field: 'levelReq', format: v => (v == null || v === '') ? '' : `Lv.${v}` },
    { label: '银币价格', field: 'silverPrice', fallback: '-', format: v => (v == null || v === '') ? '' : `银币：${v}` },
    { label: '金币价格', field: 'goldPrice', fallback: '-', format: v => (v == null || v === '') ? '' : `金币：${v}` },
    { label: '描述', field: 'description', fallback: '-' }
  ],
  reel: [
    { label: '锁轮拉力', field: 'lockTension', highlight: true, format: (v, eq) => v || eq.lockTensionStar || '-' },
    { label: '摩擦制动力', field: 'frictionForce', highlight: true, format: (v, eq) => v || eq.frictionForceStar || '-' },
    { label: '传动比', field: 'transmissionRatio', highlight: true, format: (v, eq) => v || eq.transmissionRatioStar || '-' },
    { label: '回线速度', field: 'lineSpeed', highlight: true, format: (v, eq) => v || eq.lineSpeedStar || '-' },
    { label: '收线速度', field: 'windingSpeed', highlight: true },
    { label: '大小', field: 'size' },
    { label: '形式', field: 'form' },
    {
      label: '适配重',
      key: 'adaptWeightMerged',
      merge: ['adaptWeight', 'adaptWeightStar', 'adaptWeightG', 'test'],
      format: (raw, equipment) => {
        if (equipment.adaptWeight != null && equipment.adaptWeight !== '') return equipment.adaptWeight
        if (equipment.adaptWeightStar != null && equipment.adaptWeightStar !== '' && equipment.adaptWeightStar !== 0) {
          return equipment.adaptWeightStar
        }
        if (equipment.adaptWeightG != null && equipment.adaptWeightG !== '' && equipment.adaptWeightG !== 0) {
          return typeof equipment.adaptWeightG === 'number' ? `${equipment.adaptWeightG} g` : equipment.adaptWeightG
        }
        if (equipment.test != null && equipment.test !== '') return equipment.test
        return '-'
      }
    },
    { label: '评级', field: 'rating' },
    { label: '等级要求', field: 'levelReq', format: v => (v == null || v === '') ? '' : `Lv.${v}` },
    { label: '线轴容量', field: 'spoolCapacity', fallback: '-' },
    { label: '防海水', field: 'saltwaterResistant', fallback: '-' },
    { label: '银币价格', field: 'silverPrice', fallback: '-', format: v => (v == null || v === '') ? '' : `银币：${v}` },
    { label: '金币价格', field: 'goldPrice', fallback: '-', format: v => (v == null || v === '') ? '' : `金币：${v}` },
    { label: '描述', field: 'description', fallback: '-' }
  ]
}

const TYPE_OPTIONS = [
  { value: 'rod', label: '鱼竿对比' },
  { value: 'reel', label: '渔轮对比' }
]

export default {
  name: 'ComparePage',
  components: {
    AppSkeleton,
    AppToast
  },
  data() {
    return {
      typeOptions: TYPE_OPTIONS,
      compareType: 'rod',
      searchQuery: '',
      debouncedSearchQuery: '',
      selectedCategory: '',
      rodData: [],
      reelData: [],
      compareEquipmentList: [],
      isLoading: false,
      dataLoadError: false,
      searchTimeout: null,
      hoverColumn: -1,
      detailEquipment: null
    }
  },
  mounted() {
    this.loadData()
  },
  beforeUnmount() {
    if (this.searchTimeout) clearTimeout(this.searchTimeout)
    if (this._compareSaveTimer) clearTimeout(this._compareSaveTimer)
  },
  watch: {
    searchQuery(val) {
      if (this.searchTimeout) clearTimeout(this.searchTimeout)
      this.searchTimeout = setTimeout(() => {
        this.debouncedSearchQuery = val
      }, 200)
    },
    // 对比列表持久化：刷新/跨会话后自动恢复上次对比项
    compareEquipmentList: {
      deep: true,
      handler() { this.scheduleCompareSave() }
    },
    compareType() { this.scheduleCompareSave() },
    /** 详情弹窗：打开时锁定 body 滚动并支持 Esc 关闭 */
    detailEquipment(equipment) {
      if (equipment) {
        lockScroll(true)
        this._escOff = bindEscape(this.closeDetailModal)
      } else {
        lockScroll(false)
        if (this._escOff) {
          this._escOff()
          this._escOff = null
        }
      }
    }
  },
  computed: {
    gridCols() {
      const n = this.compareEquipmentList.length || 1
      // 参数列最小 140px，避免长标签溢出；装备列共享剩余空间
      return `minmax(140px, 15%) repeat(${n}, 1fr)`
    },
    categories() {
      const data = this.compareType === 'rod' ? this.rodData : this.reelData
      if (!Array.isArray(data)) return []
      // category 若为对象类型，String(category) 隐式转换会在 Array.sort 中抛错
      return [...new Set(
        data.map(item => this.formatValue(item.category, '')).filter(c => c && c !== '')
      )].sort((a, b) => {
        const sa = String(a)
        const sb = String(b)
        return sa < sb ? -1 : sa > sb ? 1 : 0
      })
    },
    filteredEquipment() {
      const data = this.compareType === 'rod' ? this.rodData : this.reelData
      if (!Array.isArray(data)) return []
      let filtered = data
      if (this.selectedCategory) {
        filtered = filtered.filter(item => item.category === this.selectedCategory)
      }
      if (this.debouncedSearchQuery.trim()) {
        // 搜索字段与计算器统一（EQUIPMENT_SEARCH_FIELDS），支持按分类/评级别名搜索
        filtered = searchAndRankEquipment(filtered, this.debouncedSearchQuery, EQUIPMENT_SEARCH_FIELDS)
      } else {
        // 无搜索词时与计算器下拉一致：按 panelTension 升序
        filtered = sortByPanelTension(filtered)
      }
      const seen = new Set()
      return filtered.filter(item => {
        const key = this.getItemKey(item)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    },
    currentCompareRows() {
      return COMPARE_ROWS[this.compareType] || []
    },
    /** 详情弹窗参数行：直接复用对比表的参数行定义，保持口径一致 */
    detailRows() {
      return this.currentCompareRows
    },
    costEffectivenessRows() {
      if (this.compareEquipmentList.length === 0) return []
      if (this.compareType === 'rod') {
        return [{ label: '强度性价比(每100银币)', field: 'strengthKg' }]
      }
      return [
        { label: '锁轮拉力性价比(每100银币)', field: 'lockTension' },
        { label: '摩擦制动力性价比(每100银币)', field: 'frictionForce' }
      ]
    },
    fieldMaxValues() {
      const result = {}
      const rows = Array.isArray(this.currentCompareRows) ? this.currentCompareRows : []
      const eqs = Array.isArray(this.compareEquipmentList) ? this.compareEquipmentList : []
      for (const row of rows) {
        if (!row.highlight) continue
        const key = row.key || row.field
        let max = -Infinity
        for (const eq of eqs) {
          const v = this.getRowNumericalValue(eq, row)
          if (!Number.isNaN(v) && v > max) max = v
        }
        result[key] = max === -Infinity ? null : max
      }
      return result
    },
    costEffectivenessValues() {
      const result = {}
      const eqs = Array.isArray(this.compareEquipmentList) ? this.compareEquipmentList : []
      const fields = this.compareType === 'rod' ? ['strengthKg'] : ['lockTension', 'frictionForce']
      for (const field of fields) {
        let max = -Infinity
        for (const eq of eqs) {
          const price = this.extractNumber(eq.silverPrice)
          let value = this.extractNumber(eq[field])
          // 文本字段为空时，回退到 Star 字段
          if (Number.isNaN(value) || value === 0) {
            const starField = field + 'Star'
            if (eq[starField] != null && eq[starField] !== '' && eq[starField] !== 0) {
              value = this.extractNumber(eq[starField])
            }
          }
          if (!Number.isNaN(price) && price > 0 && !Number.isNaN(value) && value > 0) {
            const ce = (value / price) * 100
            if (ce > max) max = ce
          }
        }
        result[field] = max === -Infinity ? null : max
      }
      return result
    }
  },
  methods: {
    extractNumber(str) {
      // 复用 display.js 的 parsePrice（含逗号清洗与对象兜底）；
      // 无有效数字时返回 NaN 以区分“无值”（各调用点已按 0/NaN 同样处理）
      const n = parsePrice(str)
      return n > 0 ? n : NaN
    },
    async loadData() {
      this.isLoading = true
      this.dataLoadError = false
      const { rodData, reelData, error } = await loadRodAndReelData()
      this.rodData = rodData
      this.reelData = reelData
      this.dataLoadError = error
      this.isLoading = false
      this.restoreCompareList()
    },
    /** 快捷添加：当前筛选列表中强度（panelTension）前 3 的装备加入对比 */
    addTopStrength() {
      const sorted = [...this.filteredEquipment].sort((a, b) =>
        (this.extractNumber(b.panelTension) || 0) - (this.extractNumber(a.panelTension) || 0)
      )
      let added = 0
      for (const item of sorted) {
        if (added >= 3) break
        if (!this.isInCompareList(item)) {
          this.toggleCompareItem(item)
          added++
        }
      }
      if (added === 0) this.showToast('强度前 3 已在对比列表中', 'info')
    },
    /** 防抖保存对比列表（只存型号，恢复时重新匹配） */
    scheduleCompareSave() {
      if (this._compareSaveTimer) clearTimeout(this._compareSaveTimer)
      this._compareSaveTimer = setTimeout(() => {
        try {
          const payload = {
            type: this.compareType,
            items: this.compareEquipmentList.map(item => item.model || item.equipmentName)
          }
          localStorage.setItem('compare_list_v1', JSON.stringify(payload))
        } catch (e) { /* 存储不可用时静默降级 */ }
      }, 300)
    },
    /** 数据加载完成后恢复上次对比列表 */
    restoreCompareList() {
      try {
        const raw = localStorage.getItem('compare_list_v1')
        if (!raw) return
        const payload = JSON.parse(raw)
        if (payload.type === 'rod' || payload.type === 'reel') this.compareType = payload.type
        if (!Array.isArray(payload.items)) return
        const pool = this.compareType === 'rod' ? this.rodData : this.reelData
        for (const model of payload.items) {
          const item = pool.find(d => d.model === model || d.equipmentName === model)
          if (item && !this.isInCompareList(item)) this.toggleCompareItem(item)
        }
      } catch (e) {
        console.error('恢复对比列表失败:', e)
      }
    },
    switchType(type) {
      if (this.compareType === type) return
      this.compareType = type
      this.compareEquipmentList = []
      this.searchQuery = ''
      this.selectedCategory = ''
    },
    getItemKey(equipment) {
      if (!equipment) return ''
      const m = equipment.model
      const n = equipment.equipmentName
      // 避免对象类型 model/equipmentName 导致 key 为对象
      const pick = (v) => {
        if (v == null) return ''
        const t = typeof v
        if (t === 'string' || t === 'number') return String(v)
        return ''
      }
      return pick(m) || pick(n) || String(equipment.id || Math.random())
    },
    toggleCompareItem(equipment) {
      const safe = sanitizeEquipmentFields(equipment || {})
      const key = this.getItemKey(safe)
      const index = this.compareEquipmentList.findIndex(item => this.getItemKey(item) === key)
      if (index >= 0) {
        this.compareEquipmentList.splice(index, 1)
      } else {
        this.compareEquipmentList.push(safe)
      }
    },
    isInCompareList(equipment) {
      const key = this.getItemKey(equipment)
      return this.compareEquipmentList.some(item => this.getItemKey(item) === key)
    },
    /**
     * 取行用于数值比较的有效值：
     * - 合并行：按 merge 优先级 adaptWeight > testG/test 取数字
     * - 普通字段：直接 extractNumber(equipment[row.field])
     */
    getRowNumericalValue(equipment, row) {
      if (row.merge && row.merge.length) {
        for (const f of row.merge) {
          const raw = equipment[f]
          if (raw == null || raw === '' || raw === 0) continue
          const n = this.extractNumber(raw)
          if (!Number.isNaN(n) && n > 0) return n
        }
        return NaN
      }
      const raw = equipment[row.field]
      if (raw != null && raw !== '') return this.extractNumber(raw)
      // 文本字段为空时，回退到对应的 Star 字段
      const starField = row.field + 'Star'
      if (equipment[starField] != null && equipment[starField] !== '' && equipment[starField] !== 0) {
        return this.extractNumber(equipment[starField])
      }
      return NaN
    },
    /**
     * 合并展示适配重：委托给 display.js 共享实现，
     * compareType ('rod'/'reel') 映射为中文类型名。
     */
    getMergedAdaptWeightDisplay(equipment) {
      return getMergedAdaptWeight(equipment, this.compareType === 'rod' ? '鱼竿' : '渔轮')
    },
    isFieldMax(equipment, row) {
      const key = row.key || row.field
      const max = this.fieldMaxValues[key]
      if (max === null || max === undefined) return false
      const v = this.getRowNumericalValue(equipment, row)
      return !Number.isNaN(v) && v === max
    },
    /** 差值提示：非最优值时显示与最优值的差距，如 (-7.5) */
    formatDelta(equipment, row) {
      const key = row.key || row.field
      const max = this.fieldMaxValues[key]
      if (max === null || max === undefined) return ''
      const v = this.getRowNumericalValue(equipment, row)
      if (Number.isNaN(v)) return ''
      const delta = v - max
      if (delta >= 0) return ''
      return `(${Math.round(delta * 100) / 100})`
    },
    /** 差异行检测：对比≥ 2 个装备且此项展示值不完全相同时，标记 ≠ 供用户快速定位差异 */
    isRowDifferent(row) {
      const eqs = Array.isArray(this.compareEquipmentList) ? this.compareEquipmentList : []
      if (eqs.length < 2) return false
      let first = null
      for (const eq of eqs) {
        const display = String(this.formatCellValue(eq, row))
        if (first === null) {
          first = display
        } else if (display !== first) {
          return true
        }
      }
      return false
    },
    formatValue(value, fallback = '-') {
      if (value === null || value === undefined || value === '') return fallback
      // 对象禁止直接返回：避免 Vue 模板 {{ obj }} 隐式 toString 抛 Cannot convert object to primitive value
      if (typeof value === 'object') return fallback
      return value
    },
    formatCellValue(equipment, row) {
      // 合并行（适配重）优先走自定义 format，函数签名为 format(raw, equipment)
      if (typeof row.format === 'function') {
        // merge行可能没有 row.field，传 undefined 即可，format 内部直接使用 equipment 读取所需字段
        const raw = row.field ? equipment[row.field] : undefined
        const formatted = row.format(raw, equipment)
        if (formatted != null && formatted !== '') {
          // format 返回对象时兜底 fallback
          return typeof formatted === 'object' ? (row.fallback || '-') : formatted
        }
      }
      // 普通字段行
      if (row.field) {
        const raw = equipment[row.field]
        if (raw === null || raw === undefined || raw === '') {
          return row.fallback || '-'
        }
        // 对象禁止直接返回：避免隐式 toString 报错
        if (typeof raw === 'object') return row.fallback || '-'
        return raw
      }
      // merge行且无 format 返回值（如自定义format返回空）
      if (row.merge && row.merge.length) {
        const merged = this.getMergedAdaptWeightDisplay(equipment)
        if (merged != null && merged !== '' && typeof merged !== 'object') return merged
        return row.fallback || '-'
      }
      return row.fallback || '-'
    },
    clearCompareList() {
      this.compareEquipmentList = []
    },
    showToast(message, type = 'info') {
      this.$refs.toast.show(message, type)
    },
    /** 表格列 hover：事件委托定位所在列，仅当移动到含 data-col 的单元格时更新 */
    onGridMouseOver(e) {
      const cell = e.target && e.target.closest ? e.target.closest('.grid-cell[data-col]') : null
      if (cell) this.hoverColumn = Number(cell.dataset.col)
    },
    onGridMouseLeave() {
      this.hoverColumn = -1
    },
    openDetail(equipment) {
      this.detailEquipment = equipment
    },
    closeDetailModal() {
      this.detailEquipment = null
    },
    /** 将对比表格导出为文本并复制到剪贴板 */
    async exportCompare() {
      if (this.compareEquipmentList.length === 0) return
      const rows = this.currentCompareRows
      const names = this.compareEquipmentList.map(eq =>
        this.formatValue(eq.model || eq.equipmentName, '未知')
      )
      const lines = []
      lines.push(`RF4 装备对比 (${this.compareType === 'rod' ? '鱼竿' : '渔轮'})`)
      lines.push('装备: ' + names.join(' | '))
      lines.push('─'.repeat(50))

      for (const row of rows) {
        const values = this.compareEquipmentList.map(eq => {
          const formatted = this.formatCellValue(eq, row)
          const isMax = row.highlight && this.isFieldMax(eq, row)
          return isMax ? `★${formatted}` : formatted
        })
        lines.push(`${row.label}: ${values.join(' | ')}`)
      }

      // 性价比
      for (const row of this.costEffectivenessRows) {
        const values = this.compareEquipmentList.map(eq => this.formatCostEffectiveness(eq, row.field))
        lines.push(`${row.label}: ${values.join(' | ')}`)
      }

      const text = lines.join('\n')
      try {
        await navigator.clipboard.writeText(text)
        this.showToast('对比文本已复制到剪贴板', 'success')
      } catch (_) {
        this.showToast('复制失败，请手动复制', 'error')
      }
    },
    removeCompareItem(equipment) {
      const key = this.getItemKey(equipment)
      const index = this.compareEquipmentList.findIndex(item => this.getItemKey(item) === key)
      if (index >= 0) this.compareEquipmentList.splice(index, 1)
    },
    goBack() {
      this.$router.push('/')
    },
    formatCostEffectiveness(equipment, field) {
      if (!equipment) return '-'
      const price = this.extractNumber(equipment.silverPrice)
      const value = this.extractNumber(equipment[field])
      if (Number.isNaN(price) || price <= 0 || Number.isNaN(value) || value <= 0) {
        return '-'
      }
      return ((value / price) * 100).toFixed(4)
    },
    isBestCostEffectiveness(equipment, field) {
      if (!equipment) return false
      const max = this.costEffectivenessValues[field]
      if (max === null || max === undefined) return false
      const price = this.extractNumber(equipment.silverPrice)
      const value = this.extractNumber(equipment[field])
      if (Number.isNaN(price) || price <= 0 || Number.isNaN(value) || value <= 0) {
        return false
      }
      return Math.abs(((value / price) * 100) - max) < 0.0001
    }
  }
}
</script>

<style scoped>
.compare-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

.compare-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--color-primary-bg);
}

.compare-header h1 {
  color: var(--color-primary);
  font-size: 28px;
  margin: 0;
}

.back-btn {
  padding: 10px 24px;
  border: 2px solid var(--color-primary);
  background-color: var(--color-surface);
  color: var(--color-primary);
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.back-btn:hover {
  background-color: var(--color-primary-bg);
}

.compare-type-selector {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.type-btn {
  padding: 12px 36px;
  border: 2px solid var(--color-primary);
  background-color: var(--color-surface);
  color: var(--color-primary);
  border-radius: 25px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s;
}

.type-btn:hover {
  background-color: var(--color-primary-bg);
}

.type-btn.active {
  background-color: var(--color-primary);
  color: white;
}

.compare-search-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  min-width: 250px;
  max-width: 450px;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 18px;
  border: 2px solid var(--color-primary);
  border-radius: 25px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(21, 101, 192, 0.2);
}

.search-icon {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
}

.category-select {
  padding: 10px 20px;
  border: 2px solid var(--color-primary-hover);
  border-radius: 25px;
  font-size: 14px;
  color: var(--text-main);
  background-color: var(--color-surface);
  cursor: pointer;
  outline: none;
  min-width: 140px;
}

.category-select:hover {
  border-color: var(--color-primary);
}

.loading-wrapper,
.error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  margin-bottom: 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 15px;
  color: var(--text-secondary);
  font-size: 14px;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.error-text {
  color: var(--color-danger-strong);
  font-size: 16px;
  font-weight: 500;
}

.compare-content {
  /* 高度由右侧对比面板内容决定；左侧装备列表绝对定位填满同高区域，
     避免列表内容把整行撑高、导致对比网格各行被 align-content 拉伸 */
  position: relative;
  min-height: 550px;
}

.equipment-list {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 360px;
  display: flex;
  flex-direction: column;
  background-color: var(--color-surface);
  border: 2px solid var(--color-primary-bg);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.equipment-list h3 {
  color: var(--color-primary);
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.list-container {
  background-color: var(--color-surface);
  /* 填满 equipment-list 卡片扣除头部后的剩余高度，与右侧对比面板等高；
     装备较少时留白为卡片底色，不再出现“列表到底、下方空一大块”的断层 */
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.equipment-item {
  padding: 14px 18px;
  border-bottom: 1px solid var(--bg-page);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.equipment-item:last-child {
  border-bottom: none;
}

.equipment-item:hover {
  background-color: var(--color-primary-bg);
}

.equipment-item.selected {
  background-color: var(--color-primary-bg);
  border-left: 4px solid var(--color-primary);
}

.equipment-category-tag {
  font-size: 11px;
  color: white;
  background-color: #64b5f6;
  padding: 3px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  margin-right: 10px;
  white-space: nowrap;
}

/* 评级标签：与计算器下拉的 dropdown-rating 同色系，展示数据库 rating 字段（经别名映射） */
.equipment-rating-tag {
  font-size: 11px;
  color: var(--color-warning-strong);
  background-color: var(--color-warning-bg-light);
  border: 1px solid var(--color-warning-border);
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  margin-right: 10px;
  white-space: nowrap;
}

.equipment-item .equipment-name {
  font-size: 13px;
  color: var(--text-main);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 0;
}

/* 详情按钮：行尾独立入口，点击查看参数详情（不影响整行单击加入对比） */
.detail-btn-inline {
  flex-shrink: 0;
  margin-left: 10px;
  padding: 3px 10px;
  font-size: 12px;
  line-height: 1.4;
  border: 1px solid var(--color-primary-light);
  background-color: var(--color-surface);
  color: var(--color-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.detail-btn-inline:hover {
  background-color: var(--color-primary);
  color: white;
}

.list-empty {
  padding: 40px;
  text-align: center;
  color: var(--text-hint);
}

.list-loading {
  padding: 15px;
  text-align: center;
  color: var(--color-primary);
  font-size: 14px;
}

.list-no-more {
  padding: 15px;
  text-align: center;
  color: var(--text-hint);
  font-size: 14px;
}

.compare-panel {
  /* 右侧面板主导整块高度：左边距为装备列表宽 + 间距 */
  margin-left: 384px;
  min-height: 100%;
  background-color: var(--color-surface);
  border: 2px solid var(--color-primary-bg);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: var(--color-primary-bg);
  border-bottom: 2px solid var(--color-primary);
  border-radius: 8px 8px 0 0;
}

.panel-header h3 {
  color: var(--color-primary);
  margin: 0;
  font-size: 16px;
}

.clear-btn {
  padding: 8px 16px;
  border: 1px solid var(--color-primary-light);
  background-color: var(--color-surface);
  color: var(--color-primary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.clear-btn:hover {
  background-color: var(--color-primary-light);
  color: white;
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.export-btn {
  padding: 8px 16px;
  border: 1px solid var(--color-success-strong);
  background-color: var(--color-surface);
  color: var(--color-success-strong);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.export-btn:hover:not(:disabled) {
  background-color: var(--color-success-strong);
  color: white;
}

.export-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.compare-grid {
  display: grid;
  flex: 1;
  /* 防止面板存在残余高度时将各行拉高导致比例失调 */
  align-content: flex-start;
  overflow-x: auto;
}

.grid-row {
  display: contents;
}

.grid-cell {
  padding: 12px 16px;
  font-size: 13px;
  text-align: center;
  border-bottom: 1px solid var(--color-border);
  min-height: 44px;
  word-break: break-word;
  display: block;
  line-height: 1.6;
}

.grid-label-cell {
  background-color: var(--bg-page);
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* 横向滚动时固定“参数”列，方便对照 */
  position: sticky;
  left: 0;
  z-index: 2;
  box-shadow: 1px 0 0 var(--color-border);
}

.grid-equipment-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  /* 给绝对定位的删除按钮留空 */
  padding-right: 28px;
}

.grid-header-row .grid-cell {
  background-color: var(--color-primary-hover);
  color: white;
  font-weight: bold;
  border-bottom: 2px solid var(--color-primary);
}

.grid-header-row .grid-label-cell {
  background-color: var(--color-primary-hover);
  color: white;
  z-index: 3;
}

.grid-row-striped .grid-cell {
  background-color: var(--bg-secondary);
}

.grid-row-striped .grid-label-cell {
  background-color: var(--bg-secondary);
}

.grid-row:not(.grid-header-row):hover .grid-cell {
  background-color: var(--bg-secondary);
}

/* 表头装备名称（内联，无嵌套div） */
.equipment-name-inline {
  display: block;
  width: 100%;
  font-weight: bold;
  color: white;
  font-size: 14px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 表头删除按钮（绝对定位，不影响table-cell宽度计算） */
.remove-btn-inline {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  border: none;
  background-color: #ef5350;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.remove-btn-inline:hover {
  background-color: var(--color-danger);
  transform: scale(1.1);
}

/* 表头分类（块级，换行显示） */
.equipment-category-inline {
  display: block;
  width: 100%;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 最优值：绿色高亮（含 ★ 语义，与导出文本的 ★ 标记对应） */
.max-value {
  color: var(--color-success);
  font-weight: bold;
  background-color: var(--color-success-bg);
}

/* 列 hover 高亮：内描边提示正在查看的装备列，不覆盖行背景色 */
.grid-cell.col-hover {
  box-shadow: inset 0 0 0 1.5px var(--color-primary-accent);
}

/* 与最优值的差距（非最优单元格内小字显示） */
.diff-delta {
  display: inline-block;
  margin-left: 4px;
  font-size: 11px;
  color: var(--color-danger);
  font-weight: normal;
}

/* 列表头部：标题 + 快捷添加（与对比面板 panel-header 顶部对齐） */
.list-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  background-color: var(--color-primary-bg);
  border-bottom: 2px solid var(--color-primary);
}

.list-header-row h3 {
  margin: 0;
}

.quick-add-btn {
  padding: 8px 14px;
  border: 1px solid var(--color-primary);
  background: var(--color-surface);
  color: var(--color-primary);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.quick-add-btn:hover {
  background: var(--color-primary);
  color: white;
}

/* 差异行：参数标签列淡橙背景，帮助用户快速定位不同项 */
.diff-row .compare-label-cell {
  background-color: var(--color-warning-bg-light);
}

.empty-panel {
  align-items: center;
  justify-content: center;
}

.empty-hint {
  text-align: center;
  color: var(--text-hint);
}

.hint-icon {
  font-size: 60px;
  display: block;
  margin-bottom: 15px;
}

.empty-hint p {
  margin: 5px 0;
  font-size: 14px;
}

@media (max-width: 768px) {
  /* 移动端上下堆叠：装备列表回归普通文档流，面板取消左侧留白 */
  .equipment-list {
    position: static;
    width: 100%;
    height: auto;
  }

  .list-container {
    flex: 0 1 auto;
    max-height: 300px;
  }

  .compare-panel {
    margin-left: 0;
    margin-top: 24px;
    min-height: 0;
  }

  .compare-header h1 {
    font-size: 22px;
  }

  .type-btn {
    padding: 8px 20px;
    font-size: 14px;
  }
}

/* ===== 装备详情弹窗 ===== */
.detail-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 16px;
}

.detail-modal {
  position: relative;
  background: var(--color-surface);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
  max-width: 520px;
  width: 100%;
  max-height: 86vh;
  overflow-y: auto;
  padding: 24px 28px;
  animation: detail-modal-in 0.2s ease;
}

@keyframes detail-modal-in {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.detail-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1;
}

.detail-close-btn:hover {
  background: var(--color-danger-bg);
  color: var(--color-danger-strong);
}

.detail-head {
  padding-right: 32px;
  margin-bottom: 14px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.detail-title {
  font-size: 18px;
  color: var(--text-main);
  margin: 6px 0 0;
  width: 100%;
  word-break: break-word;
}

.detail-rows {
  border-top: 1px solid var(--color-border);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 10px 2px;
  border-bottom: 1px solid var(--color-border);
  font-size: 14px;
}

.detail-row-label {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.detail-row-value {
  color: var(--text-main);
  font-weight: 500;
  text-align: right;
  word-break: break-word;
}

.detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.detail-toggle-btn,
.detail-close-ok {
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.detail-toggle-btn {
  border: 1px solid var(--color-primary);
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.detail-toggle-btn.active {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.detail-close-ok {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--text-secondary);
}

.detail-close-ok:hover {
  background: var(--bg-secondary);
}
</style>

<style>
/* 夜间模式专属覆盖（不受 scoped 限制） */
:root[data-theme="dark"] .grid-header-row .grid-cell {
  background-color: var(--color-primary-bg);
}

:root[data-theme="dark"] .grid-header-row .grid-label-cell {
  background-color: var(--color-primary-bg);
}

:root[data-theme="dark"] .grid-label-cell {
  background-color: var(--color-surface);
}

:root[data-theme="dark"] .search-input {
  background-color: var(--color-surface);
  color: var(--text-main);
  border-color: var(--color-border);
}

:root[data-theme="dark"] .category-select {
  background-color: var(--color-surface);
  color: var(--text-main);
  border-color: var(--color-border);
}
</style>