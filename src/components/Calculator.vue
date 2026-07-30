<template>
  <div class="app">
    <DisclaimerModal v-if="showDisclaimer" @close="showDisclaimer = false" />
    <div class="header">
      <h1>装备计算器</h1>
      <div class="header-buttons">
        <button class="compare-nav-btn" @click="goToCompare">参数对比</button>
        <button class="import-nav-btn" @click="goToImport">数据导入</button>
        <button class="rf4-stat-btn" @click="openRf4Stat" rel="noopener noreferrer" target="_blank">RF4 数据站</button>
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
                    <span
                      v-if="selectedEquipmentMap[type].ratingAlias && selectedEquipmentMap[type].ratingAlias !== '常规'"
                      class="selected-rating-tag"
                    >{{ toSafeDisplay(selectedEquipmentMap[type].ratingAlias) }}</span>
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

          <EquipmentSearchDropdown
            v-if="isSearchableType(type) && selectedType === type"
            :equipment-list="equipmentOfSelectedType"
            :equipment-filter="type === '渔轮' ? reelEquipmentFilter : null"
            @select="selectEquipment"
          />

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

    <EquipmentSummary
      v-if="allEquipmentSelected"
      :selected-equipment-list="selectedEquipmentList"
      :custom-equipment="customEquipment"
      :actual-lock-tension-map="actualLockTensionMap"
      :actual-panel-tension-map="actualPanelTensionMap"
    />
  </div>
</template>

<script>
import {
  EQUIPMENT_TYPES,
  CUSTOM_INPUT_TYPES,
  SEARCHABLE_TYPES,
  CALC_RULE_OPTIONS,
  DEFAULT_FRICTION,
  CALC_RULES,
  getRatingAlias,
  getCompatibleReelTypes,
  isRodReelCompatible
} from '../constants/equipment.js'
import { ROUTES } from '../constants/routes.js'
import {
  calculateActualLockTension,
  calculateActualPanelTension,
  calculateCustomActualTension,
  clampFriction,
  getFrictionMax,
  formatTension
} from '../utils/tension.js'
import { getMergedAdaptWeight } from '../utils/display.js'
import { sanitizeEquipmentFields, sanitizeEquipmentList, safeToNumber, safeToString } from '../utils/sanitize.js'
import DisclaimerModal from './calculator/DisclaimerModal.vue'
import EquipmentSearchDropdown from './calculator/EquipmentSearchDropdown.vue'
import EquipmentSummary from './calculator/EquipmentSummary.vue'

export default {
  name: 'Calculator',
  components: {
    DisclaimerModal,
    EquipmentSearchDropdown,
    EquipmentSummary
  },
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
  },
  watch: {
    calculationRule(val) {
      if (val) {
        this.friction = clampFriction(this.friction, val)
      }
    },
    /** 鱼竿切换时，若已选渔轮不兼容则自动清除 */
    'selectedEquipmentMap.鱼竿'(newRod) {
      const reel = this.selectedEquipmentMap['渔轮']
      if (newRod && reel && !isRodReelCompatible(newRod, reel)) {
        this.clearEquipmentByType('渔轮')
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
        if (item.equipmentType === '鱼竿' || item.equipmentType === '渔轮') {
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
    /** 当前展开搜索的装备类型对应的装备列表（供下拉子组件使用） */
    equipmentOfSelectedType() {
      if (!Array.isArray(this.equipmentData)) return []
      return this.equipmentData.filter(item => item.equipmentType === this.selectedType)
    },
    /** 当前鱼竿兼容的渔轮分类列表（null 表示不限制） */
    compatibleReelTypes() {
      const rod = this.selectedEquipmentMap['鱼竿']
      if (!rod) return null
      return getCompatibleReelTypes(rod.category)
    },
    /** 传给渔轮下拉的过滤函数：根据当前鱼竿过滤不兼容渔轮 */
    reelEquipmentFilter() {
      const compatible = this.compatibleReelTypes
      if (compatible === null) return null
      return (item) => compatible.includes(item.category)
    },
    allEquipmentSelected() {
      return !!(this.selectedEquipmentMap['鱼竿'] && this.selectedEquipmentMap['渔轮'])
    }
  },
  methods: {
    /**
     * 安全转数值：薄包装 sanitize.js/safeToNumber
     *  - 兜底 fallback（默认 0）
     *  - 防止隐式转换报错（safeToNumber 内部会处理对象/字符串提取数字）
     */
    toSafeNumber(v, fallback = 0) {
      const n = safeToNumber(v, fallback)
      return n == null ? fallback : n
    },
    /**
     * 安全显示值：薄包装 sanitize.js/safeToString
     *  - 兜底 fallback（默认 ''）
     *  - 防止模板插值对象触发隐式 toString 报错
     */
    toSafeDisplay(v, fallback = '') {
      const s = safeToString(v, fallback)
      return s == null ? fallback : s
    },
    getMergedAdaptWeight,
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
          maxTension: item.panelTension ?? item.maxTension ?? null,
          ratingAlias: getRatingAlias(item.rating)
        }))
        console.log('装备数据加载成功:', this.equipmentData.length, '条')
      } catch (error) {
        // 加载失败只提示错误，不再注入演示用假数据（避免误导用户按假参数计算）
        console.error('加载装备数据失败:', error)
        this.dataLoadError = true
        this.equipmentData = []
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
    },
    selectEquipment(equipment) {
      // 【入口二次清洗】防止装备对象中残留未清洗的对象字段
      const safe = sanitizeEquipmentFields(equipment || {})
      // 渔轮兼容性检查：与当前鱼竿不兼容时拒绝选择
      if (safe.equipmentType === '渔轮') {
        const rod = this.selectedEquipmentMap['鱼竿']
        if (rod && !isRodReelCompatible(rod, safe)) {
          alert('当前鱼竿无法装备此类型渔轮')
          return
        }
      }
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
      // 其他点击都视为外部点击：收起下拉（子组件随 selectedType 置空卸载）
      if (this.selectedType) this.selectedType = null
    },
    goToCompare() {
      this.$router.push(ROUTES.COMPARE)
    },
    goToImport() {
      this.$router.push(ROUTES.IMPORT)
    },
    openRf4Stat() {
      // 打开 RF4 中文数据站（新标签页，noopener 防反跟踪，noreferrer 防来源泄露）
      if (typeof window !== 'undefined' && typeof window.open === 'function') {
        window.open('https://cn.rf4-stat.ru/', '_blank', 'noopener,noreferrer')
      }
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

/* 顶部 header 第三个按钮：外链打开 RF4 中文数据站 */
.rf4-stat-btn {
  padding: 10px 24px;
  border: 2px solid #2e7d32;
  background-color: white;
  color: #2e7d32;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s;
  white-space: nowrap;
}

.rf4-stat-btn:hover {
  background-color: #e8f5e9;
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

.selected-rating-tag {
  display: inline-block;
  padding: 4px 12px;
  background-color: #fff7ed;
  color: #c2410c;
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

  .selected-name {
    min-width: 100%;
  }

  .selected-tension {
    font-size: 12px;
  }

  .actual-tension,
  .actual-panel-tension {
    font-size: 12px;
    padding: 3px 8px;
    margin-left: 0;
  }

  .wear-input,
  .friction-input,
  .tension-input {
    width: 45px;
  }
}
</style>
