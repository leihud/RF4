<template>
  <div class="app">
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

    <div v-if="isLoading" class="loading-wrapper">
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
                  <span class="selected-name">{{ selectedEquipmentMap[type].model || selectedEquipmentMap[type].equipmentName }}</span>
                <template v-if="type === '鱼竿'">
                  <span class="selected-tension">
                    拉力:{{ selectedEquipmentMap[type].panelTension || selectedEquipmentMap[type].lockTension }} kN
                  </span>
                </template>
                <template v-else>
                  <span class="selected-tension">
                    面板:{{ selectedEquipmentMap[type].panelTension || selectedEquipmentMap[type].lockTension || 0 }} kN
                  </span>
                  <span class="selected-tension">
                    锁轮:{{ selectedEquipmentMap[type].lockTension }} kN
                  </span>
                  <span v-if="selectedEquipmentMap[type].price > 0" class="selected-price">
                    价格:¥{{ selectedEquipmentMap[type].price }}
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
                    :value="friction"
                    @change="onFrictionChange"
                    placeholder="0"
                    min="0"
                    :max="frictionMax"
                  />
                  <span class="friction-unit">{{ frictionPercent }}%</span>
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
            <div v-if="isDropdownOpen" class="tension-filter-wrapper">
              <input
                type="number"
                class="tension-filter-input"
                v-model="minTensionFilter"
                placeholder="最小拉力"
                min="0"
              />
              <span class="tension-filter-separator">-</span>
              <input
                type="number"
                class="tension-filter-input"
                v-model="maxTensionFilter"
                placeholder="最大拉力"
                min="0"
              />
              <span class="tension-filter-unit">kN</span>
            </div>
            <div v-if="isDropdownOpen" class="dropdown-list">
              <div
                v-for="equipment in filteredEquipment"
                :key="equipment.model || equipment.equipmentName"
                class="dropdown-item"
                @click.stop="selectEquipment(equipment)"
              >
                <span class="dropdown-name">{{ equipment.model || equipment.equipmentName }}</span>
                <span class="dropdown-tension">{{ equipment.panelTension }} kN</span>
                <span v-if="equipment.equipmentType !== '鱼竿'" class="dropdown-price">{{ equipment.price > 0 ? '¥' + equipment.price : '' }}</span>
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
        <div class="summary-row">
          <span class="summary-label">装备总价值:</span>
          <span class="summary-value">¥{{ equipmentTotalPrice }}</span>
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

export default {
  name: 'Calculator',
  data() {
    return {
      selectedType: null,
      equipmentData: [],
      dataLoadError: false,
      isLoading: false,
      customEquipment: {
        '主线': { maxTension: 0, wear: 0 },
        '引线': { maxTension: 0, wear: 0 }
      },
      friction: DEFAULT_FRICTION,
      selectedEquipmentList: [],
      calculationRule: '',
      searchQuery: '',
      debouncedSearchQuery: '',
      isDropdownOpen: false,
      minTensionFilter: '',
      maxTensionFilter: '',
      searchTimeout: null,
      CALC_RULE_OPTIONS,
      formatTension
    }
  },
  mounted() {
    this.loadEquipmentData()
    document.addEventListener('click', this.handleClickOutside)
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
    filteredEquipment() {
      const equipment = this.equipmentData.filter(item => item.equipmentType === this.selectedType)
      let filtered = equipment

      if (this.debouncedSearchQuery.trim()) {
        const q = this.debouncedSearchQuery.toLowerCase()
        filtered = filtered.filter(item => 
          (item.equipmentName && item.equipmentName.toLowerCase().includes(q)) ||
          (item.model && item.model.toLowerCase().includes(q))
        )
      }

      const min = parseFloat(this.minTensionFilter) || 0
      const max = parseFloat(this.maxTensionFilter) || Infinity
      filtered = filtered.filter(item => item.panelTension >= min && item.panelTension <= max)

      return [...filtered].sort((a, b) => a.panelTension - b.panelTension)
    },
    allEquipmentSelected() {
      return !!(this.selectedEquipmentMap['鱼竿'] && this.selectedEquipmentMap['渔轮'])
    },
    equipmentSummaryText() {
      const rodName = this.selectedEquipmentMap['鱼竿']?.model || this.selectedEquipmentMap['鱼竿']?.equipmentName || '未选择'
      const reelName = this.selectedEquipmentMap['渔轮']?.model || this.selectedEquipmentMap['渔轮']?.equipmentName || '未选择'
      const mainLine = this.customEquipment['主线']
      const leader = this.customEquipment['引线']
      const fmt = (t) => (t.maxTension > 0 ? `${t.label}(${t.value.maxTension}kN)` : '未设置')
      return [
        rodName,
        reelName,
        fmt({ label: '主线', value: mainLine }),
        fmt({ label: '引线', value: leader })
      ].join(' + ')
    },
    equipmentTotalPrice() {
      let total = 0
      for (const item of this.selectedEquipmentList) {
        if (item.price > 0) total += item.price
      }
      return total
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
    }
  },
  methods: {
    isCustomInputType(type) {
      return CUSTOM_INPUT_TYPES.includes(type)
    },
    isSearchableType(type) {
      return SEARCHABLE_TYPES.includes(type)
    },
    async loadEquipmentData() {
      this.isLoading = true
      try {
        const response = await fetch('/api/equipment')
        if (!response.ok) {
          const errorText = await response.text()
          console.error('API响应错误:', response.status, errorText)
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }
        const data = await response.json()
        console.log('装备数据加载成功:', data.length, '条')
        this.equipmentData = data.map(item => ({
          ...item,
          maxTension: item.panelTension
        }))
      } catch (error) {
        console.error('加载装备数据失败:', error)
        this.dataLoadError = true
        this.equipmentData = [
          { equipmentType: '鱼竿', equipmentName: 'FD360', maxTension: 13 },
          { equipmentType: '渔轮', equipmentName: 'TAII', maxTension: 64 },
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
      const existingIndex = this.selectedEquipmentList.findIndex(
        item => item.equipmentType === equipment.equipmentType
      )
      const next = { ...equipment, wear: 0 }
      if (existingIndex >= 0) {
        next.wear = this.selectedEquipmentList[existingIndex].wear || 0
        this.selectedEquipmentList.splice(existingIndex, 1, next)
      } else {
        this.selectedEquipmentList.push(next)
      }
      this.searchQuery = ''
      this.minTensionFilter = ''
      this.maxTensionFilter = ''
      this.isDropdownOpen = false
      this.selectedType = null
    },
    clearEquipmentByType(type) {
      const index = this.selectedEquipmentList.findIndex(item => item.equipmentType === type)
      if (index >= 0) this.selectedEquipmentList.splice(index, 1)
    },
    handleClickOutside(event) {
      const dropdown = this.$el.querySelector('.search-dropdown')
      if (dropdown && !dropdown.contains(event.target)) {
        this.isDropdownOpen = false
      }
    },
    goToCompare() {
      this.$router.push('/compare')
    },
    goToImport() {
      this.$router.push('/import')
    }
  }
}
</script>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
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
  padding: 12px 20px;
  border: 2px solid #ddd;
  background-color: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  gap: 12px;
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
  gap: 10px;
  flex: 1;
  overflow: hidden;
}

.placeholder {
  color: #999;
  font-style: italic;
}

.selected-name {
  font-weight: bold;
  color: #2c3e50;
  font-size: 13px;
  min-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-tension {
  color: #9b59b6;
  padding: 2px 8px;
  background-color: #f5f0fa;
  border-radius: 4px;
  font-size: 12px;
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
  width: 45px;
  padding: 2px 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
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
  min-width: 400px;
  flex: 1;
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

.tension-filter-wrapper {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px 15px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #eee;
}

.tension-filter-input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
}

.tension-filter-input:focus {
  outline: none;
  border-color: #42b983;
}

.tension-filter-separator {
  color: #999;
}

.tension-filter-unit {
  font-size: 13px;
  color: #666;
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
  padding: 10px 15px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
  transition: background-color 0.2s;
}

.dropdown-item .dropdown-name {
  flex: 1;
  min-width: 0;
  margin-right: 20px;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: #e8f5e9;
}

.dropdown-name {
  flex: 1;
  font-size: 14px;
  color: #2c3e50;
  overflow: hidden;
  white-space: normal;
  word-break: break-all;
}

.dropdown-tension {
  font-size: 13px;
  color: #42b983;
  font-weight: bold;
  margin-left: 20px;
  min-width: 60px;
  text-align: right;
}

.dropdown-price {
  font-size: 13px;
  color: #e74c3c;
  font-weight: bold;
  margin-left: 20px;
  min-width: 60px;
  text-align: right;
}

.dropdown-empty {
  padding: 15px;
  text-align: center;
  color: #999;
  font-size: 14px;
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
  width: 45px;
  padding: 2px 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
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
    flex-wrap: wrap;
    gap: 8px;
  }

  .search-dropdown {
    min-width: 300px;
  }

  .dropdown-tension,
  .dropdown-price {
    margin-left: 15px;
    min-width: 50px;
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
    flex-wrap: wrap;
    gap: 6px;
    width: 100%;
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
    padding: 8px 12px;
  }

  .dropdown-name {
    flex: 1;
    min-width: 100%;
    margin-right: 0;
    margin-bottom: 4px;
  }

  .dropdown-tension,
  .dropdown-price {
    margin-left: 0;
    min-width: auto;
    text-align: left;
    margin-right: 15px;
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
</style>