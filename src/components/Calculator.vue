<template>
  <div class="app">
    <div v-if="showDisclaimer" class="disclaimer-overlay" @click="closeDisclaimer">
      <div class="disclaimer-modal" @click.stop>
        <div class="disclaimer-header">
          <h3>免责声明</h3>
          <button class="disclaimer-close" @click="closeDisclaimer">×</button>
        </div>
        <div class="disclaimer-content">
          <p>本网站提供的装备计算器及参数对比工具仅供个人使用，非商业盈利行为。</p>
          <p>所有装备数据仅供参考，实际数值请以游戏内为准。</p>
          <p>使用本网站即表示您同意上述条款。</p>
        </div>
        <div class="disclaimer-footer">
          <button class="disclaimer-accept" @click="closeDisclaimer">我知道了</button>
        </div>
      </div>
    </div>
    <div class="header">
      <h1>装备计算器</h1>
      <div class="header-buttons">
        <button class="compare-nav-btn" @click="goToCompare">参数对比</button>
        <button class="import-nav-btn" @click="goToImport">数据导入</button>
      </div>
    </div>

    <div class="rule-selector">
      <span class="rule-label">计算规则:</span>
      <button
        v-for="rule in CALC_RULE_OPTIONS"
        :key="rule.value"
        :class="['rule-btn', { active: calculationRule === rule.value }]"
        @click="calculationRule = rule.value"
      >
        {{ rule.label }}
      </button>
    </div>

    <div v-if="!calculationRule" class="rule-warning">
      请先选择计算规则
    </div>

    <div v-if="dataLoadError" class="rule-warning" style="background-color: #ffebee; color: #c62828;">
      装备数据加载失败
    </div>

    <div v-if="isLoading && equipmentData.length === 0" class="loading-wrapper">
      <div class="loading-spinner"></div>
      <span class="loading-text">正在加载装备数据...</span>
    </div>

    <div class="equipment-selector" :class="{ disabled: !calculationRule }">
      <h2>选择装备类型</h2>
      <div class="type-buttons">
        <div
          v-for="type in equipmentTypes"
          :key="type"
          :class="{ active: selectedType === type }"
          class="type-item"
        >
          <span class="type-label">{{ type }}</span>
          <div class="type-value">
            <template v-if="isCustomInputType(type)">
              <div class="custom-input-group">
                <span class="input-label">拉力:</span>
                <input
                  type="number"
                  class="tension-input"
                  v-model.number="customEquipment[type].maxTension"
                  placeholder="0"
                  min="0"
                />
                <span class="input-unit">kN</span>
                <span class="input-label">磨损:</span>
                <input
                  type="number"
                  class="wear-input"
                  v-model.number="customEquipment[type].wear"
                  placeholder="0"
                  min="0"
                  max="100"
                />
                <span class="input-unit">%</span>
                <span class="actual-tension">
                  实际拉力:{{ formatTension(calculateCustomActualTension(customEquipment[type])) }} kN
                </span>
              </div>
            </template>
            <template v-else>
              <template v-if="selectedEquipmentMap[type]">
                  <span
                    v-if="selectedEquipmentMap[type].category || selectedEquipmentMap[type].subCategory"
                    class="selected-category-tag"
                  >{{ toSafeDisplay(selectedEquipmentMap[type].category || selectedEquipmentMap[type].subCategory) }}</span>
                  <span class="selected-name">{{ toSafeDisplay(selectedEquipmentMap[type].model || selectedEquipmentMap[type].equipmentName) }}</span>
                <template v-if="type === '鱼竿'">
                  <span class="selected-tension">
                    拉力:{{ toSafeNumber(selectedEquipmentMap[type].panelTension || selectedEquipmentMap[type].lockTension) }} kN
                  </span>
                </template>
                <template v-else>
                  <span class="selected-tension">
                    面板:{{ toSafeNumber(selectedEquipmentMap[type].panelTension || selectedEquipmentMap[type].lockTension || 0) }} kN
                  </span>
                  <span class="selected-tension">
                    锁轮:{{ toSafeNumber(selectedEquipmentMap[type].lockTension) }} kN
                  </span>
                </template>
                <div class="wear-input-wrapper">
                  <span class="wear-label">磨损:</span>
                  <input
                    type="number"
                    class="wear-input"
                    v-model.number="selectedEquipmentMap[type].wear"
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                  <span class="wear-unit">%</span>
                </div>
                <span v-if="type === '渔轮'" class="friction-input-wrapper">
                  <span class="friction-label">摩擦:</span>
                  <input
                    type="number"
                    class="friction-input"
                    :value="toSafeNumber(friction)"
                    @change="onFrictionChange"
                    placeholder="0"
                    min="0"
                    :max="toSafeNumber(frictionMax)"
                  />
                </span>
                <span v-if="type === '鱼竿'" class="actual-tension">
                  实际拉力:{{ formatTension(actualPanelTensionMap[type]) }} kN
                </span>
                <span v-if="type === '渔轮'" class="actual-panel-tension">
                  实际拉力:{{ formatTension(actualPanelTensionMap[type]) }} kN
                </span>
                <span v-if="type === '渔轮'" class="actual-tension">
                  实际锁轮:{{ formatTension(actualLockTensionMap[type]) }} kN
                </span>
                <span
                  v-if="getMergedAdaptWeight(selectedEquipmentMap[type], type)"
                  class="actual-tension adapt-weight-tag"
                >
                  适配重:{{ getMergedAdaptWeight(selectedEquipmentMap[type], type) }}
                </span>
                <button class="clear-btn" @click.stop="clearEquipmentByType(type)">×</button>
              </template>
              <span v-else class="placeholder">未选择</span>
            </template>
          </div>

          <div
            v-if="isSearchableType(type) && selectedType === type"
            class="search-dropdown"
          >
            <div class="search-input-wrapper">
              <input
                type="text"
                class="search-input"
                v-model="searchQuery"
                placeholder="搜索装备名称..."
                @click.stop="isDropdownOpen = !isDropdownOpen"
              />
              <span class="search-icon">🔍</span>
            </div>
            <div v-if="isDropdownOpen && categoryOptions.length > 0" class="category-filter-header">
              <button class="category-toggle-btn" @click.stop="showCategoryFilter = !showCategoryFilter">
                {{ showCategoryFilter ? '▼' : '▲' }} 装备类型
              </button>
            </div>
            <div v-if="isDropdownOpen && showCategoryFilter && categoryOptions.length > 0" class="category-filter-wrapper">
              <button
                v-for="cat in categoryOptions"
                :key="cat"
                :class="['category-filter-btn', { active: selectedCategory === cat }]"
                @click.stop="selectedCategory = cat"
              >
                {{ cat }}
              </button>
            </div>
            <div v-if="isDropdownOpen" class="dropdown-list">
              <div
                v-for="(equipment, eqIdx) in filteredEquipment"
                :key="toSafeDisplay(equipment.model || equipment.equipmentName, String(equipment.id || eqIdx))"
                class="dropdown-item"
                @click.stop="selectEquipment(equipment)"
              >
                <span class="dropdown-name">{{ toSafeDisplay(equipment.model || equipment.equipmentName, '-') }}</span>
                <span class="dropdown-category">{{ toSafeDisplay(equipment.category || equipment.subCategory, '') }}</span>
              </div>
              <div v-if="filteredEquipment.length === 0" class="dropdown-empty">
                未找到匹配的装备
              </div>
            </div>
          </div>

          <button
            v-if="isSearchableType(type) && selectedType !== type"
            class="select-btn"
            @click.stop="selectType(type)"
          >
            {{ selectedEquipmentMap[type] ? '更换装备' : '选择装备' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="allEquipmentSelected" class="summary-section">
      <h2>装备组合总览</h2>
      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">装备组合:</span>
          <span class="summary-value">{{ equipmentSummaryText }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">最小锁轮拉力限制:</span>
          <span class="summary-value">{{ formatTension(minTension) }} kN</span>
        </div>
        <div
          v-for="item in summaryAdaptWeightRows"
          :key="'adapt-' + item.type"
          class="summary-row"
        >
          <span class="summary-label">{{ item.label }}:</span>
          <span class="summary-value" :class="{ 'empty-value': !item.value }">
            {{ item.value || '未设置' }}
          </span>
        </div>
        <div v-for="item in selectedEquipmentList" :key="item.equipmentType" class="summary-row price-row">
          <span class="summary-label">{{ item.equipmentType }}价格:</span>
          <span class="summary-value">
            <span v-if="item.silverPrice" class="silver-price">银币：{{ formatPrice(item.silverPrice, 2) }}</span>
            <span v-if="item.goldPrice" class="gold-price">金币：{{ formatPrice(item.goldPrice, 2) }}</span>
            <span v-if="!item.silverPrice && !item.goldPrice">无</span>
          </span>
        </div>
        <div class="summary-row total-price-row">
          <span class="summary-label">总价格:</span>
          <span class="summary-value">
            <span v-if="totalSilverPrice" class="silver-price">银币：{{ formatPrice(totalSilverPrice, 2) }}</span>
            <span v-if="totalGoldPrice" class="gold-price">金币：{{ formatPrice(totalGoldPrice, 2) }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  EQUIPMENT_TYPES,
  CUSTOM_INPUT_TYPES,
  SEARCHABLE_TYPES,
  CALC_RULE_OPTIONS,
  DEFAULT_FRICTION,
  CALC_RULES
} from '../constants/equipment.js'
import {
  calculateActualLockTension,
  calculateActualPanelTension,
  calculateCustomActualTension,
  clampFriction,
  getFrictionMax,
  formatTension
} from '../utils/tension.js'
import { searchAndRankEquipment } from '../utils/search.js'
import { sanitizeEquipmentFields, sanitizeEquipmentList } from '../utils/sanitize.js'

export default {
  name: 'Calculator',
  data() {
    return {
      selectedType: null,
      equipmentData: [],
      dataLoadError: false,
      isLoading: false,
      showDisclaimer: false,
      customEquipment: {
        '主线': { maxTension: 0, wear: 0 },
        '引线': { maxTension: 0, wear: 0 }
      },
      friction: DEFAULT_FRICTION,
      selectedEquipmentList: [],
      calculationRule: CALC_RULES.GUIDE,
      searchQuery: '',
      debouncedSearchQuery: '',
      isDropdownOpen: false,
      selectedCategory: '',
      showCategoryFilter: false,
      searchTimeout: null,
      CALC_RULE_OPTIONS,
      formatTension
    }
  },
  mounted() {
    this.loadEquipmentData()
    document.addEventListener('click', this.handleClickOutside)
    this.showDisclaimer = true
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
    if (this.searchTimeout) clearTimeout(this.searchTimeout)
  },
  watch: {
    searchQuery(val) {
      if (this.searchTimeout) clearTimeout(this.searchTimeout)
      this.searchTimeout = setTimeout(() => {
        this.debouncedSearchQuery = val
      }, 200)
    },
    calculationRule(val) {
      if (val) {
        this.friction = clampFriction(this.friction, val)
      }
    }
  },
  computed: {
    equipmentTypes() {
      return EQUIPMENT_TYPES
    },
    frictionMax() {
      return getFrictionMax(this.calculationRule)
    },
    frictionPercent() {
      if (!this.calculationRule) return 0
      return Math.round((this.friction / this.frictionMax) * 100)
    },
    selectedEquipmentMap() {
      const map = {}
      for (const item of this.selectedEquipmentList) {
        map[item.equipmentType] = item
      }
      return map
    },
    actualLockTensionMap() {
      const map = {}
      for (const item of this.selectedEquipmentList) {
        if (item.equipmentType === '渔轮') {
          map[item.equipmentType] = calculateActualLockTension(item, this.calculationRule)
        }
      }
      return map
    },
    actualPanelTensionMap() {
      const map = {}
      for (const item of this.selectedEquipmentList) {
        if (item.equipmentType === '鱼竿' || item.equipmentType === '渔轮') {
          map[item.equipmentType] = calculateActualPanelTension(
            item,
            this.calculationRule,
            this.friction
          )
        }
      }
      return map
    },
    categoryOptions() {
      if (!Array.isArray(this.equipmentData)) return ['全部']
      const equipment = this.equipmentData.filter(item => item.equipmentType === this.selectedType)
      const categories = [...new Set(equipment.map(item => item.category))].filter(Boolean)
      return ['全部', ...categories]
    },
    filteredEquipment() {
      if (!Array.isArray(this.equipmentData)) return []
      const equipment = this.equipmentData.filter(item => item.equipmentType === this.selectedType)
      let filtered = equipment

      if (this.selectedCategory && this.selectedCategory !== '全部') {
        filtered = filtered.filter(item => item.category === this.selectedCategory)
      }

      if (this.debouncedSearchQuery.trim()) {
        filtered = searchAndRankEquipment(filtered, this.debouncedSearchQuery, ['model', 'equipmentName'])
      } else {
        // 强制 Number 转换，NaN 兜底 0，避免对象型数值参与减法抛 Cannot convert object to primitive value
        filtered = [...filtered].sort((a, b) => {
          const av = Number(a.panelTension)
          const bv = Number(b.panelTension)
          return (Number.isFinite(av) ? av : 0) - (Number.isFinite(bv) ? bv : 0)
        })
      }

      return filtered
    },
    allEquipmentSelected() {
      return !!(this.selectedEquipmentMap['鱼竿'] && this.selectedEquipmentMap['渔轮'])
    },
    equipmentSummaryText() {
      const rod = this.selectedEquipmentMap['鱼竿']
      const reel = this.selectedEquipmentMap['渔轮']
      const pickName = (eq) => {
        if (!eq) return '未选择'
        const s = this.toSafeDisplay(eq.model || eq.equipmentName, '')
        return s || '未选择'
      }
      const rodName = pickName(rod)
      const reelName = pickName(reel)
      const mainLine = this.customEquipment['主线']
      const leader = this.customEquipment['引线']
      const fmt = (t) => {
        const mt = this.toSafeNumber(t.value && t.value.maxTension, 0)
        return mt > 0 ? `${this.toSafeDisplay(t.label || '')}(${mt}kN)` : '未设置'
      }
      return [
        rodName,
        reelName,
        fmt({ label: '主线', value: mainLine }),
        fmt({ label: '引线', value: leader })
      ].join(' + ')
    },
    totalSilverPrice() {
      return this.selectedEquipmentList.reduce((sum, item) => {
        const price = this.parsePrice(item.silverPrice)
        return sum + price
      }, 0)
    },
    totalGoldPrice() {
      return this.selectedEquipmentList.reduce((sum, item) => {
        const price = this.parsePrice(item.goldPrice)
        return sum + price
      }, 0)
    },
    minTension() {
      const tensions = []
      const rodT = this.actualPanelTensionMap['鱼竿']
      if (rodT !== undefined) tensions.push(rodT)
      const reelLockT = this.actualLockTensionMap['渔轮']
      if (reelLockT !== undefined) tensions.push(reelLockT)
      const mainT = this.customEquipment['主线'].maxTension > 0
        ? calculateCustomActualTension(this.customEquipment['主线'])
        : 0
      if (mainT > 0) tensions.push(mainT)
      const leaderT = this.customEquipment['引线'].maxTension > 0
        ? calculateCustomActualTension(this.customEquipment['引线'])
        : 0
      if (leaderT > 0) tensions.push(leaderT)
      return tensions.length ? Math.min(...tensions) : 0
    },
    /**
     * 装备组合总览：鱼竿/渔轮各自的适配重展示行（合并后）
     */
    summaryAdaptWeightRows() {
      const rows = []
      const rod = this.selectedEquipmentMap['鱼竿']
      if (rod) {
        rows.push({
          type: '鱼竿',
          label: '鱼竿适配重',
          value: this.getMergedAdaptWeight(rod, '鱼竿')
        })
      }
      const reel = this.selectedEquipmentMap['渔轮']
      if (reel) {
        rows.push({
          type: '渔轮',
          label: '渔轮适配重',
          value: this.getMergedAdaptWeight(reel, '渔轮')
        })
      }
      return rows
    }
  },
  methods: {
    /**
     * 安全转数值：对象/非数值一律兜底为 fallback（默认 0）
     * 防止 "Cannot convert object to primitive value"
     */
    toSafeNumber(v, fallback = 0) {
      if (typeof v === 'number') return Number.isFinite(v) ? v : fallback
      if (v == null) return fallback
      if (typeof v === 'object') return fallback
      const n = Number(v)
      return Number.isFinite(n) ? n : fallback
    },
    /**
     * 安全显示值：若为对象（无法安全转字符串/数值），兜底为空或 fallback
     * 防止模板 {{ obj }} 插值触发隐式 toString 报错
     */
    toSafeDisplay(v, fallback = '') {
      if (typeof v === 'number') return String(v)
      if (typeof v === 'string') return v
      if (v == null) return fallback
      if (typeof v === 'object') return fallback
      try { return String(v) } catch (_) { return fallback }
    },
    parsePrice(str) {
      if (str == null) return 0
      // 对象直接兜底 0，禁止隐式转字符串报错
      if (typeof str === 'object') return 0
      const cleaned = String(str).replace(/,/g, '')
      const match = cleaned.match(/[\d.]+/)
      return match ? parseFloat(match[0]) : 0
    },
    /**
     * 格式化金额显示：
     * 1. 修正浮点精度（通过 Math.round(x * 10^n) / 10^n 去除 62801.520000000004 这类误差
     * 2. 固定小数位（银币默认2位，金币默认2位）
     * 3. 添加千分位逗号
     */
    formatPrice(val, decimals = 2) {
      if (val == null) return ''
      const num = typeof val === 'number' ? val : this.parsePrice(val)
      if (!isFinite(num)) return ''
      const factor = Math.pow(10, decimals)
      const fixed = Math.round(num * factor) / factor
      // 固定小数位后再分千位，避免 40999.5 显示成 40,999.5
      const str = fixed.toFixed(decimals)
      const [intPart, decPart] = str.split('.')
      const intWithCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      return decPart ? `${intWithCommas}.${decPart}` : intWithCommas
    },
    /**
     * 合并展示适配重：
     *  - 优先级 1：文本型 adaptWeight（范围描述，如 5-25g），竿/轮通用
     *  - 优先级 2：适配重星级/补充 adaptWeightStar（文本/数字，不强制加单位），竿/轮通用
     *  - 优先级 3：数字型 adaptWeightG（克重，自动加 g 单位），竿/轮通用
     *  - 优先级 4：鱼竿 testG / 渔轮 test（兜底）
     * 都为空返回 ''（调用方用 v-if 判断是否展示）
     */
    getMergedAdaptWeight(equipment, type) {
      if (!equipment) return ''
      // 优先级 1：文本型 adaptWeight（范围描述，如 5-25g），竿/轮通用
      if (equipment.adaptWeight != null && equipment.adaptWeight !== '') {
        return equipment.adaptWeight
      }
      // 优先级 2：适配重星级/补充 adaptWeightStar（文本/数字，原样展示）
      if (equipment.adaptWeightStar != null && equipment.adaptWeightStar !== '' && equipment.adaptWeightStar !== 0) {
        return equipment.adaptWeightStar
      }
      // 优先级 3：数字型 adaptWeightG（克重，自动加 g 单位），竿/轮通用
      if (equipment.adaptWeightG != null && equipment.adaptWeightG !== '' && equipment.adaptWeightG !== 0) {
        return typeof equipment.adaptWeightG === 'number' ? `${equipment.adaptWeightG} g` : equipment.adaptWeightG
      }
      if (type === '鱼竿') {
        // 优先级 4：鱼竿测试克重 testG（兜底）
        if (equipment.testG != null && equipment.testG !== '' && equipment.testG !== 0) {
          return typeof equipment.testG === 'number' ? `${equipment.testG} g` : equipment.testG
        }
      } else if (type === '渔轮') {
        // 优先级 4：渔轮测试文本 test（兜底）
        if (equipment.test != null && equipment.test !== '') {
          return equipment.test
        }
      }
      return ''
    },
    isCustomInputType(type) {
      return CUSTOM_INPUT_TYPES.includes(type)
    },
    isSearchableType(type) {
      return SEARCHABLE_TYPES.includes(type)
    },
    async loadEquipmentData() {
      this.equipmentData = []
      this.isLoading = true
      try {
        const response = await fetch('/api/equipment')
        if (!response.ok) {
          const errorText = await response.text()
          console.error('API响应错误:', response.status, errorText)
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }
        const result = await response.json()
        // 【源头清洗】把所有字段对象型转为 primitive，从入口根除
        // "Cannot convert object to primitive value"
        const sanitized = sanitizeEquipmentList(
          Array.isArray(result) ? result : []
        )
        this.equipmentData = sanitized.map(item => ({
          ...item,
          maxTension: item.panelTension ?? item.maxTension ?? null
        }))
        console.log('装备数据加载成功:', this.equipmentData.length, '条')
      } catch (error) {
        console.error('加载装备数据失败:', error)
        this.dataLoadError = true
        this.equipmentData = [
          { equipmentType: '鱼竿', equipmentName: 'FD360', maxTension: 13, panelTension: 13 },
          { equipmentType: '渔轮', equipmentName: 'TAII', maxTension: 64, panelTension: 64, lockTension: 64 },
          { equipmentType: '主线', equipmentName: 'CAIHONG100', maxTension: 60 },
          { equipmentType: '引线', equipmentName: 'NINONG23', maxTension: 60 }
        ]
      } finally {
        this.isLoading = false
      }
    },
    calculateCustomActualTension(item) {
      return calculateCustomActualTension(item)
    },
    onFrictionChange(event) {
      this.friction = clampFriction(parseFloat(event.target.value), this.calculationRule)
    },
    selectType(type) {
      this.selectedType = type
      this.searchQuery = ''
      this.minTensionFilter = ''
      this.maxTensionFilter = ''
      this.isDropdownOpen = false
    },
    selectEquipment(equipment) {
      // 【入口二次清洗】防止装备对象中残留未清洗的对象字段
      const safe = sanitizeEquipmentFields(equipment || {})
      const existingIndex = this.selectedEquipmentList.findIndex(
        item => item.equipmentType === safe.equipmentType
      )
      const next = { ...safe, wear: 0 }
      if (existingIndex >= 0) {
        next.wear = this.toSafeNumber(this.selectedEquipmentList[existingIndex].wear, 0)
        this.selectedEquipmentList.splice(existingIndex, 1, next)
      } else {
        this.selectedEquipmentList.push(next)
      }
      this.searchQuery = ''
      this.isDropdownOpen = false
      this.selectedType = null
    },
    clearEquipmentByType(type) {
      const index = this.selectedEquipmentList.findIndex(item => item.equipmentType === type)
      if (index >= 0) this.selectedEquipmentList.splice(index, 1)
    },
    handleClickOutside(event) {
      // 组件已卸载或根元素未挂载，直接返回，避免 this.$el 非 HTMLElement
      const el = this.$el
      if (!el || typeof el.querySelector !== 'function' || typeof el.querySelectorAll !== 'function') {
        return
      }
      // 点击免责声明区域时不处理
      const disclaimers = document.querySelectorAll('.disclaimer-mask, .disclaimer-popup, .disclaimer-footer')
      for (const el2 of disclaimers) {
        if (el2 && el2.contains && el2.contains(event.target)) return
      }
      const activeRow = el.querySelector('.type-item.active')
      const selectBtns = el.querySelectorAll('.select-btn')
      // 点击在激活行（参数+搜索框+下拉）内部，不处理
      if (activeRow && activeRow.contains && activeRow.contains(event.target)) return
      // 点击在其他行的更换装备按钮上（这些按钮会自己切 selectedType），不处理
      for (const btn of selectBtns) {
        if (btn && btn.contains && btn.contains(event.target)) return
      }
      // 点击在类型 tab（.type-label）或输入控件上，不处理，避免误清空
      const typeLabels = el.querySelectorAll('.type-label, .custom-input-group input, .wear-input-wrapper input')
      for (const el2 of typeLabels) {
        if (el2 && el2.contains && el2.contains(event.target)) return
      }
      // 其他点击都视为外部点击：收起下拉 + 恢复更换装备按钮
      this.isDropdownOpen = false
      if (this.selectedType) this.selectedType = null
    },
    goToCompare() {
      this.$router.push('/compare')
    },
    goToImport() {
      this.$router.push('/import')
    },
    closeDisclaimer() {
      this.showDisclaimer = false
    }
  }
}
</script>

<style scoped>
.app {
  max-width: 1600px;
  margin: 0 auto;
  padding: 30px;
  width: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e3f2fd;
}

h1 {
  color: #1565c0;
  font-size: 28px;
  margin: 0;
}

.compare-nav-btn {
  padding: 10px 24px;
  border: 2px solid #1565c0;
  background-color: white;
  color: #1565c0;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s;
}

.compare-nav-btn:hover {
  background-color: #e3f2fd;
}

.header-buttons {
  display: flex;
  gap: 10px;
}

.import-nav-btn {
  padding: 10px 24px;
  border: 2px solid #1565c0;
  background-color: white;
  color: #1565c0;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s;
}

.import-nav-btn:hover {
  background-color: #fff3e0;
}

h2 {
  color: #2c3e50;
  margin-bottom: 15px;
}

.rule-selector {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  padding: 15px;
  background-color: #e8f5e9;
  border-radius: 8px;
}

.rule-label {
  font-weight: bold;
  color: #333;
}

.rule-btn {
  padding: 8px 20px;
  border: 2px solid #4caf50;
  background-color: white;
  color: #4caf50;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.rule-btn:hover {
  background-color: #e8f5e9;
}

.rule-btn.active {
  background-color: #4caf50;
  color: white;
}

.rule-warning {
  text-align: center;
  padding: 15px;
  background-color: #fff3e0;
  color: #ff9800;
  border-radius: 8px;
  margin-bottom: 15px;
  font-weight: bold;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  margin-bottom: 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #42b983;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 15px;
  color: #666;
  font-size: 14px;
}

.equipment-selector {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  transition: opacity 0.3s;
}

.equipment-selector.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.type-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.type-item {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  border: 2px solid #ddd;
  background-color: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  gap: 20px;
  flex-wrap: nowrap;
}

.type-item:hover {
  border-color: #42b983;
  background-color: #f0f8f0;
}

.type-item.active {
  border-color: #42b983;
  background-color: #e8f5e9;
}

.type-label {
  min-width: 80px;
  font-weight: bold;
  color: #2c3e50;
  font-size: 16px;
}

.type-value {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 16px;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
}

.placeholder {
  color: #999;
  font-style: italic;
}

.selected-category-tag {
  display: inline-block;
  padding: 4px 12px;
  background-color: #e0f2fe;
  color: #0369a1;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.selected-name {
  font-weight: bold;
  color: #2c3e50;
  font-size: 14px;
  min-width: 140px;
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
}

.selected-tension {
  color: #9b59b6;
  padding: 4px 12px;
  background-color: #f5f0fa;
  border-radius: 4px;
  font-size: 13px;
  white-space: nowrap;
}

.selected-price {
  color: #e67e22;
  font-size: 12px;
  font-weight: bold;
  white-space: nowrap;
}

.friction-input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.friction-label {
  font-size: 12px;
  color: #666;
}

.friction-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
}

.friction-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.friction-unit {
  font-size: 14px;
  color: #666;
}

.summary-section {
  background-color: #e8f5e9;
  padding: 20px;
  border-radius: 8px;
  border: 2px solid #42b983;
}

.summary-card {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #eee;
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-label {
  font-weight: bold;
  color: #2c3e50;
  font-size: 16px;
}

.summary-value {
  color: #42b983;
  font-weight: bold;
  font-size: 16px;
  flex: 1;
  text-align: right;
}

.price-row {
  background-color: #f8fafc;
}

.total-price-row {
  background-color: #fffbeb;
  font-size: 18px;
}

.total-price-row .summary-label {
  font-size: 18px;
  color: #d97706;
}

.total-price-row .summary-value {
  font-size: 18px;
  color: #d97706;
}

.silver-price {
  margin-right: 12px;
  color: #94a3b8;
}

.gold-price {
  color: #eab308;
}

.adapt-weight-hint-row {
  background-color: #f8f9fb;
}

.adapt-weight-hint {
  font-size: 14px;
  line-height: 1.5;
  white-space: normal;
}

.hint-success {
  color: #27ae60;
  font-weight: 600;
}

.hint-warning {
  color: #e67e22;
  font-weight: 600;
}

.hint-info {
  color: #2980b9;
  font-weight: 500;
}

.summary-value.empty-value {
  color: #95a5a6;
  font-weight: normal;
}

.custom-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-label {
  font-size: 14px;
  color: #666;
}

.tension-input {
  width: 70px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.tension-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.input-unit {
  font-size: 14px;
  color: #666;
}

.select-btn {
  padding: 8px 16px;
  border: 1px solid #42b983;
  border-radius: 4px;
  background-color: white;
  color: #42b983;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.select-btn:hover {
  background-color: #42b983;
  color: white;
}

.search-dropdown {
  position: relative;
  /* 固定宽度，确保搜索框/装备类型筛选/结果下拉列表三部分永远等宽对齐，不随筛选按钮多少而缩放 */
  width: 520px;
  flex: 0 0 auto;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  border: 1px solid #42b983;
  border-radius: 4px;
  font-size: 14px;
  color: #2c3e50;
  background-color: white;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.search-input::placeholder {
  color: #999;
}

.search-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
}

.category-filter-header {
  padding: 8px 15px;
  background-color: #f0fdf4;
  border-bottom: 1px solid #dcfce7;
}

.category-toggle-btn {
  padding: 4px 12px;
  border: none;
  background-color: transparent;
  color: #16a34a;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.category-toggle-btn:hover {
  color: #22c55e;
}

.category-filter-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 15px;
  background-color: #f0fdf4;
  border-bottom: 1px solid #dcfce7;
}

.category-filter-btn {
  padding: 4px 12px;
  border: 1px solid #bbf7d0;
  background-color: white;
  color: #16a34a;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-filter-btn:hover {
  background-color: #dcfce7;
}

.category-filter-btn.active {
  background-color: #22c55e;
  color: white;
  border-color: #22c55e;
}

.dropdown-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 12px 18px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
  transition: background-color 0.2s;
  gap: 18px;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: #e8f5e9;
}

.dropdown-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.4;
  /* 允许换行显示完整名称，不再强制单行省略 */
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.dropdown-category {
  flex: 0 0 auto;
  min-width: 68px;
  max-width: 120px;
  padding: 4px 12px;
  background-color: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-empty {
  padding: 15px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.dropdown-loading {
  padding: 10px;
  text-align: center;
  color: #1565c0;
  font-size: 13px;
}

.dropdown-no-more {
  padding: 10px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.wear-input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.wear-label {
  font-size: 12px;
  color: #666;
}

.wear-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
}

.wear-input:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.wear-unit {
  font-size: 14px;
  color: #666;
}

.clear-btn {
  width: 28px;
  height: 28px;
  border: none;
  background-color: #e74c3c;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.clear-btn:hover {
  background-color: #c0392b;
}

.actual-tension {
  color: #27ae60;
  font-weight: bold;
  padding: 4px 10px;
  background-color: #e8f5e9;
  border-radius: 4px;
  font-size: 14px;
  margin-left: 10px;
}

.actual-panel-tension {
  color: #2980b9;
  font-weight: bold;
  padding: 4px 10px;
  background-color: #e8f5fa;
  border-radius: 4px;
  font-size: 14px;
  margin-left: 10px;
}

.adapt-weight-tag {
  color: #8e44ad;
  background-color: #f3e9fa;
}

@media (min-width: 768px) and (max-width: 1200px) {
  .app {
    padding: 15px;
    max-width: 900px;
  }

  h1 {
    font-size: 22px;
  }

  .type-item {
    padding: 15px 20px;
    gap: 15px;
  }

  .type-label {
    min-width: 60px;
    font-size: 14px;
  }

  .type-value {
    flex-wrap: nowrap;
    gap: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .search-dropdown {
    /* 中等屏也使用固定宽度，避免筛选按钮多少导致宽度缩放不一致 */
    width: 440px;
    min-width: auto;
    max-width: none;
  }

  .summary-row {
    padding: 12px 0;
  }

  .summary-label,
  .summary-value {
    font-size: 14px;
  }
}

@media (max-width: 768px) {
  .app {
    padding: 10px;
    max-width: 100%;
  }

  h1 {
    font-size: 18px;
    text-align: center;
  }

  h2 {
    font-size: 16px;
    margin-bottom: 10px;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .rule-selector {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
  }

  .type-item {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px 15px;
    gap: 10px;
  }

  .type-label {
    min-width: auto;
    font-size: 14px;
  }

  .type-value {
    flex-wrap: nowrap;
    gap: 6px;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .custom-input-group {
    flex-wrap: wrap;
    gap: 6px;
  }

  .wear-input-wrapper,
  .friction-input-wrapper {
    margin-left: 0;
  }

  .search-dropdown {
    min-width: 100%;
    width: 100%;
  }

  .tension-filter-wrapper {
    flex-wrap: wrap;
  }

  .tension-filter-input {
    width: 70px;
  }

  .dropdown-item {
    flex-wrap: wrap;
    padding: 10px 14px;
    gap: 10px;
  }

  .dropdown-name {
    flex: 1 1 100%;
    min-width: 100%;
    font-size: 15px;
    margin-right: 0;
    margin-bottom: 2px;
  }

  .dropdown-category {
    min-width: 56px;
    max-width: 96px;
    padding: 3px 10px;
    font-size: 12px;
  }

  .selected-name {
    min-width: 100%;
  }

  .selected-tension {
    font-size: 12px;
  }

  .selected-price {
    font-size: 12px;
  }

  .actual-tension,
  .actual-panel-tension {
    font-size: 12px;
    padding: 3px 8px;
    margin-left: 0;
  }

  .summary-card {
    padding: 15px;
  }

  .summary-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    padding: 10px 0;
  }

  .summary-label,
  .summary-value {
    font-size: 13px;
  }

  .summary-value {
    text-align: left;
    flex: none;
  }

  .advice-text {
    font-size: 13px;
    line-height: 1.6;
  }

  .wear-input,
  .friction-input,
  .tension-input {
    width: 45px;
  }
}

.disclaimer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.disclaimer-modal {
  background-color: white;
  border-radius: 12px;
  width: 100%;
  max-width: 620px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.disclaimer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 28px;
  background-color: #e3f2fd;
  border-bottom: 1px solid #bbdefb;
}

.disclaimer-header h3 {
  margin: 0;
  color: #1565c0;
  font-size: 20px;
  letter-spacing: 2px;
}

.disclaimer-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.disclaimer-close:hover {
  color: #1565c0;
}

.disclaimer-content {
  padding: 28px 32px;
}

.disclaimer-content p {
  margin: 0 0 18px 0;
  color: #333;
  font-size: 15px;
  line-height: 1.9;
  text-align: justify;
  text-justify: inter-ideograph;
  text-indent: 2em;
  widows: 3;
  orphans: 3;
}

.disclaimer-content p:last-child {
  margin-bottom: 0;
}

.disclaimer-footer {
  padding: 18px 32px;
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
}

.disclaimer-accept {
  padding: 12px 40px;
  background-color: #1565c0;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  letter-spacing: 2px;
}

.disclaimer-accept:hover {
  background-color: #0d47a1;
}
</style>