<template>
  <div class="app">
    <div class="header">
      <h1>最大拉力磨损计算器（非盈利商业行为，个人使用）</h1>
      <button class="compare-nav-btn" @click="goToCompare">装备参数对比</button>
    </div>

    <div class="rule-selector">
      <span class="rule-label">计算规则：</span>
      <button 
        v-for="rule in calculationRules" 
        :key="rule.value"
        :class="['rule-btn', { active: calculationRule === rule.value }]"
        @click="selectCalculationRule(rule.value)"
      >
        {{ rule.label }}
      </button>
    </div>
    
    <div v-if="!calculationRule" class="rule-warning">
      ⚠️ 请先选择计算规则
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
            <template v-if="type === '主线' || type === '引线'">
              <div class="custom-input-group">
                <span class="input-label">拉力：</span>
                <input
                  type="number"
                  class="tension-input"
                  v-model.number="customEquipment[type].maxTension"
                  placeholder="0"
                  min="0"
                />
                <span class="input-unit">kN</span>
                <span class="input-label">磨损度：</span>
                <input
                  type="number"
                  class="wear-input"
                  v-model.number="customEquipment[type].wear"
                  placeholder="0"
                  min="0"
                  max="100"
                />
                <span class="input-unit">%</span>
                <span class="actual-tension">实际拉力：{{ calculateCustomActualTension(type) }} kN</span>
              </div>
            </template>
            <template v-else>
              <template v-if="getSelectedEquipmentByType(type)">
                <span class="selected-name">{{ getSelectedEquipmentByType(type).equipmentName }}</span>
                <template v-if="type === '鱼竿'">
                  <span class="selected-tension">面板拉力：{{ getSelectedEquipmentByType(type).panelTension || getSelectedEquipmentByType(type).lockTension }} kN</span>
                  <span v-if="getSelectedEquipmentByType(type).price > 0" class="selected-price">价格：¥{{ getSelectedEquipmentByType(type).price }}</span>
                  <div class="wear-input-wrapper">
                    <span class="wear-label">磨损度：</span>
                    <input
                      type="number"
                      class="wear-input"
                      v-model.number="getSelectedEquipmentByType(type).wear"
                      placeholder="0"
                      min="0"
                      max="100"
                    />
                    <span class="wear-unit">%</span>
                  </div>
                  <span class="actual-tension">实际面板拉力：{{ calculateActualPanelTension(getSelectedEquipmentByType(type)) }} kN</span>
                </template>
                <template v-else>
                  <span class="selected-tension">面板拉力：{{ getSelectedEquipmentByType(type).panelTension || getSelectedEquipmentByType(type).lockTension || 0 }} kN</span>
                  <span class="selected-tension">锁轮拉力：{{ getSelectedEquipmentByType(type).lockTension }} kN</span>
                  <span v-if="getSelectedEquipmentByType(type).price > 0" class="selected-price">价格：¥{{ getSelectedEquipmentByType(type).price }}</span>
                  <div class="wear-input-wrapper">
                    <span class="wear-label">磨损度：</span>
                    <input
                      type="number"
                      class="wear-input"
                      v-model.number="getSelectedEquipmentByType(type).wear"
                      placeholder="0"
                      min="0"
                      max="100"
                    />
                    <span class="wear-unit">%</span>
                  </div>
                  <div v-if="type === '渔轮'" class="friction-input-wrapper">
                    <span class="friction-label">摩擦值：</span>
                    <input
                      type="number"
                      class="friction-input"
                      v-model.number="frictionValue['渔轮']"
                      placeholder="0"
                      min="0"
                      max="29"
                      @input="handleFrictionInput"
                    />
                    <span class="friction-unit">{{ (frictionValue['渔轮'] / 29 * 100).toFixed(0) }}%</span>
                  </div>
                  <span class="actual-panel-tension">实际面板拉力：{{ calculateActualPanelTension(getSelectedEquipmentByType(type)) }} kN</span>
                  <span class="actual-tension">实际锁轮拉力：{{ calculateActualLockTension(getSelectedEquipmentByType(type)) }} kN</span>
                </template>
                <button class="clear-btn" @click.stop="clearEquipmentByType(type)">×</button>
              </template>
              <template v-else>
                <span class="placeholder">未选择</span>
              </template>
            </template>
          </div>
          <div v-if="(type === '鱼竿' || type === '渔轮') && selectedType === type"
            class="search-dropdown"
            ref="dropdownRef"
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
            <div class="tension-filter-wrapper" v-if="isDropdownOpen">
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
                :key="equipment.equipmentName"
                class="dropdown-item"
                @click.stop="selectEquipment(equipment)"
              >
                <span class="dropdown-name">{{ equipment.equipmentName }}</span>
                <span class="dropdown-tension">{{ equipment.panelTension }} kN</span>
                <span class="dropdown-price">{{ equipment.price > 0 ? '¥' + equipment.price : '' }}</span>
              </div>
              <div v-if="filteredEquipment.length === 0" class="dropdown-empty">
                未找到匹配的装备
              </div>
            </div>
          </div>
          <button
            v-if="(type === '鱼竿' || type === '渔轮') && selectedType !== type"
            class="select-btn"
            @click.stop="selectType(type)"
          >
            {{ getSelectedEquipmentByType(type) ? '更换装备' : '选择装备' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="allEquipmentSelected" class="summary-section">
      <h2>装备组合总览</h2>
      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">装备组合：</span>
          <span class="summary-value">{{ equipmentSummaryText }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">最小锁轮拉力限制：</span>
          <span class="summary-value">{{ minTension }} kN</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">装备总价值：</span>
          <span class="summary-value">¥{{ equipmentTotalPrice }}</span>
        </div>
        <div v-if="equipmentAdvice" class="advice-section">
          <div class="advice-title">� 锁轮建议：</div>
          <div class="advice-item" :class="{ 'advice-warning': !equipmentAdvice.isOptimal }">
            <pre class="advice-text">{{ equipmentAdvice.message }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Calculator',
  data() {
    return {
      selectedType: null,
      selectedEquipment: '',
      selectedEquipmentList: [],
      equipmentData: [],
      customEquipment: {
        '主线': { maxTension: 0, wear: 0 },
        '引线': { maxTension: 0, wear: 0 }
      },
      frictionValue: {
        '渔轮': 15
      },
      calculationRule: '',
      searchQuery: '',
      isDropdownOpen: false,
      dropdownRef: null,
      minTensionFilter: '',
      maxTensionFilter: ''
    }
  },
  mounted() {
    this.loadEquipmentData()
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  },
  computed: {
    equipmentTypes() {
      return ['鱼竿', '渔轮', '主线', '引线']
    },
    calculationRules() {
      return [
        { value: 'guide', label: '宝典通用规则' },
        { value: 'forum', label: '论坛计算规则' }
      ]
    },
    filteredEquipment() {
      const equipment = this.getTypeEquipment(this.selectedType)
      let filtered = [...equipment]

      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(item => 
          item.equipmentName.toLowerCase().includes(query)
        )
      }

      const minTension = parseFloat(this.minTensionFilter) || 0
      const maxTension = parseFloat(this.maxTensionFilter) || Infinity
      
      filtered = filtered.filter(item => 
        item.panelTension >= minTension && item.panelTension <= maxTension
      )

      return filtered.sort((a, b) => a.panelTension - b.panelTension)
    },
    allEquipmentSelected() {
      const rod = this.getSelectedEquipmentByType('鱼竿')
      const reel = this.getSelectedEquipmentByType('渔轮')
      return rod && reel
    },
    equipmentSummaryText() {
      const rod = this.getSelectedEquipmentByType('鱼竿')?.equipmentName || '未选择'
      const reel = this.getSelectedEquipmentByType('渔轮')?.equipmentName || '未选择'
      const mainLine = this.customEquipment['主线'].maxTension > 0 ? `主线(${this.customEquipment['主线'].maxTension}kN)` : '未设置'
      const leader = this.customEquipment['引线'].maxTension > 0 ? `引线(${this.customEquipment['引线'].maxTension}kN)` : '未设置'
      return `${rod} + ${reel} + ${mainLine} + ${leader}`
    },
    equipmentTotalPrice() {
      let total = 0
      const rod = this.getSelectedEquipmentByType('鱼竿')
      const reel = this.getSelectedEquipmentByType('渔轮')
      if (rod && rod.price > 0) total += rod.price
      if (reel && reel.price > 0) total += reel.price
      return total
    },
    minTension() {
      const tensions = []
      
      const rod = this.getSelectedEquipmentByType('鱼竿')
      if (rod) {
        tensions.push(parseFloat(this.calculateActualPanelTension(rod)))
      }
      
      const reel = this.getSelectedEquipmentByType('渔轮')
      if (reel) {
        tensions.push(parseFloat(this.calculateActualLockTension(reel)))
      }
      
      if (this.customEquipment['主线'].maxTension > 0) {
        tensions.push(parseFloat(this.calculateCustomActualTension('主线')))
      }
      
      if (this.customEquipment['引线'].maxTension > 0) {
        tensions.push(parseFloat(this.calculateCustomActualTension('引线')))
      }
      
      return tensions.length > 0 ? Math.min(...tensions) : 0
    },
    equipmentAdvice() {
      const rod = this.getSelectedEquipmentByType('鱼竿')
      const reel = this.getSelectedEquipmentByType('渔轮')
      const mainLineTension = this.customEquipment['主线'].maxTension > 0 ? parseFloat(this.calculateCustomActualTension('主线')) : 0
      const leaderTension = this.customEquipment['引线'].maxTension > 0 ? parseFloat(this.calculateCustomActualTension('引线')) : 0

      if (!rod && !reel && mainLineTension === 0 && leaderTension === 0) return null

      const rodTension = rod ? parseFloat(this.calculateActualPanelTension(rod)) : 0
      const reelLockTension = reel ? parseFloat(this.calculateActualLockTension(reel)) : 0
      const reelPanelTension = reel ? parseFloat(this.calculateActualPanelTension(reel)) : 0

      const generateNormalAdvice = () => {
        if (!rod && !reel) return ''
        if (!rod) return `💡 请配置鱼竿来完成装备搭配。`
        if (!reel) return `💡 请配置渔轮来完成装备搭配。`
        if (mainLineTension <= 0) return `💡 请配置主线来完成装备搭配。`

        if (leaderTension > 0) {
          if (leaderTension > rodTension) {
            return '❌ 致命危险！引线拉力超过鱼竿极限，中大鱼直接爆竿，建议大幅降低引线拉力。'
          }
          if (reelPanelTension <= leaderTension && reelPanelTension <= mainLineTension && reelPanelTension <= rodTension) {
            return '❌ 高危！渔轮实际面板拉力为最小，大鱼猛冲会过载磨损渔轮，建议调整摩擦值或增大渔轮拉力。'
          }
          if (mainLineTension === leaderTension) {
            return '⚠️ 主线与引线拉力相等，过载可能同时断裂，建议降低引线或增大主线拉力。'
          }
          if (leaderTension <= mainLineTension && leaderTension <= reelPanelTension && leaderTension <= rodTension) {
            return '✅ 常态搭配合理，过载优先拉断低成本引线，保护主线、渔轮、鱼竿。'
          }
          if (mainLineTension <= leaderTension && mainLineTension <= reelPanelTension && mainLineTension <= rodTension) {
            return '✅ 常态搭配合理，过载优先拉断主线，保护渔轮、鱼竿；建议搭配低拉力引线降低损耗成本。'
          }
        } else {
          if (reelPanelTension <= mainLineTension && reelPanelTension <= rodTension) {
            return '❌ 高危！渔轮实际面板拉力为最小，会过载磨损渔轮，建议调整摩擦值或增大渔轮拉力。'
          }
          if (mainLineTension <= reelPanelTension && mainLineTension <= rodTension) {
            return '✅ 常态搭配合理，过载优先拉断主线，保护渔轮、鱼竿；建议搭配低拉力引线降低损耗。'
          }
          return '❌ 致命危险！鱼竿拉力为最小，中大鱼直接爆竿，请调整配置。'
        }
        return ''
      }

      const generateLockAdvice = () => {
        if (!rod && !reel) return ''
        if (!rod) return ''
        if (!reel) return ''
        if (mainLineTension <= 0) return ''

        if (leaderTension > 0) {
          if (leaderTension > rodTension) {
            return '❌ 致命危险！引线拉力超过鱼竿极限，中大鱼直接爆竿，建议大幅降低引线拉力。'
          }
          if (reelLockTension <= leaderTension && reelLockTension <= mainLineTension && reelLockTension <= rodTension) {
            return '❌ 高危！渔轮实际锁轮拉力为最小，大鱼猛冲会过载磨损渔轮，建议增大渔轮锁轮拉力或更换拉力更小的引线。'
          }
          if (mainLineTension === leaderTension) {
            return '⚠️ 主线与引线拉力相等，过载可能同时断裂，建议降低引线或增大主线拉力。'
          }
          if (leaderTension <= mainLineTension && leaderTension <= reelLockTension && leaderTension <= rodTension) {
            return '✅ 锁轮搭配合理，过载优先拉断低成本引线，保护主线、渔轮、鱼竿。'
          }
          if (mainLineTension <= leaderTension && mainLineTension <= reelLockTension && mainLineTension <= rodTension) {
            return '✅ 锁轮搭配合理，过载优先拉断主线，保护渔轮、鱼竿；建议搭配低拉力引线降低损耗成本。'
          }
        } else {
          if (reelLockTension <= mainLineTension && reelLockTension <= rodTension) {
            return '❌ 高危！渔轮实际锁轮拉力为最小，会过载磨损渔轮，建议增大渔轮锁轮拉力或增加引线。'
          }
          if (mainLineTension <= reelLockTension && mainLineTension <= rodTension) {
            return '✅ 锁轮搭配合理，过载优先拉断主线，保护渔轮、鱼竿；建议搭配低拉力引线降低损耗。'
          }
          return '❌ 致命危险！鱼竿拉力为最小，中大鱼直接爆竿，请调整配置。'
        }
        return ''
      }

      const normalAdvice = generateNormalAdvice()
      const lockAdvice = generateLockAdvice()

      let message = ''
      if (normalAdvice) {
        message += `【常态建议】${normalAdvice}`
      }
      if (lockAdvice && reel && reelLockTension !== reelPanelTension) {
        message += `\n\n【锁轮建议】${lockAdvice}`
      }

      const getFrictionAdvice = () => {
        if (!reel || mainLineTension <= 0) return ''
        
        const friction = this.frictionValue['渔轮'] || 0
        
        if (friction > 25) {
          return `\n\n💡 摩擦值建议：当前摩擦值(${friction})较高，建议适当降低以保护渔轮内部结构。`
        } else if (friction < 5) {
          return `\n\n💡 摩擦值建议：当前摩擦值(${friction})较低，可适当提高以获得更好的控鱼效果。`
        }
        return ''
      }

      message += getFrictionAdvice()

      if (!message) {
        message = '💡 请检查装备配置。'
      }

      return {
        isOptimal: message.includes('✅'),
        message: message
      }
    }
  },
  methods: {
    async loadEquipmentData() {
      try {
        const response = await fetch('/equipment.json?' + Date.now())
        
        if (!response.ok) {
          throw new Error('无法找到装备数据文件')
        }
        
        this.equipmentData = await response.json()
        console.log('装备数据加载成功:', this.equipmentData)
        
      } catch (error) {
        console.error('加载装备数据失败:', error)
        this.equipmentData = [
          { equipmentType: '鱼竿', equipmentName: 'FD360', maxTension: 13 },
          { equipmentType: '渔轮', equipmentName: 'TAII', maxTension: 64 },
          { equipmentType: '主线', equipmentName: 'CAIHONG100', maxTension: 60 },
          { equipmentType: '引线', equipmentName: 'NINONG23', maxTension: 60 }
        ]
      }
    },
    calculateActualLockTension(equipment) {
      const wear = equipment.wear || 0
      const lockTension = equipment.lockTension || equipment.maxTension || 0
      if (equipment.equipmentType === '鱼竿') {
        return (lockTension * (1 - 0.7 * wear / 100)).toFixed(2)
      } else if (equipment.equipmentType === '渔轮') {
        if (this.calculationRule === 'forum') {
          return (lockTension * 0.3 + lockTension * 0.7 * (1 - wear / 100)).toFixed(2)
        } else {
          return (lockTension * (1 - 0.7 * wear / 100)).toFixed(2)
        }
      } else {
        return (lockTension * (1 - wear / 100)).toFixed(2)
      }
    },
    calculateActualPanelTension(equipment) {
      const wear = equipment.wear || 0
      const panelTension = equipment.panelTension || equipment.lockTension || equipment.maxTension || 0
      if (equipment.equipmentType === '鱼竿') {
        return (panelTension * (1 - 0.7 * wear / 100)).toFixed(2)
      } else if (equipment.equipmentType === '渔轮') {
        const friction = this.frictionValue['渔轮'] || 0
        const wearRatio = wear / 100
        if (this.calculationRule === 'forum') {
          return (panelTension * (1 - wearRatio) / 30 * friction).toFixed(2)
        } else {
          const frictionRatio = friction / 29
          return (panelTension * (1 - wearRatio) * frictionRatio).toFixed(2)
        }
      }
      return panelTension.toFixed(2)
    },
    calculateCustomActualTension(type) {
      const equipment = this.customEquipment[type]
      const wear = equipment.wear || 0
      const actual = equipment.maxTension * (1 - wear / 100)
      return actual.toFixed(2)
    },
    handleFrictionInput() {
      let value = this.frictionValue['渔轮'] || 0
      value = Math.round(value)
      value = Math.max(0, Math.min(29, value))
      this.frictionValue['渔轮'] = value
    },
    selectCalculationRule(rule) {
      this.calculationRule = rule
    },
    selectType(type) {
      this.selectedType = type
      this.selectedEquipment = ''
      this.searchQuery = ''
      this.minTensionFilter = ''
      this.maxTensionFilter = ''
      this.isDropdownOpen = false
    },
    selectEquipment(equipment) {
      this.selectedEquipment = equipment.equipmentName
      this.addEquipment()
      this.searchQuery = ''
      this.minTensionFilter = ''
      this.maxTensionFilter = ''
      this.isDropdownOpen = false
    },
    getTypeEquipment(type) {
      return this.equipmentData.filter(item => item.equipmentType === type)
    },
    addEquipment() {
      if (!this.selectedEquipment) return

      const equipment = this.equipmentData.find(item => item.equipmentName === this.selectedEquipment)
      if (equipment) {
        const existingIndex = this.selectedEquipmentList.findIndex(item => item.equipmentType === equipment.equipmentType)
        if (existingIndex >= 0) {
          const existingWear = this.selectedEquipmentList[existingIndex].wear || 0
          this.selectedEquipmentList[existingIndex] = {...equipment, wear: existingWear}
        } else {
          this.selectedEquipmentList.push({...equipment, wear: 0})
        }
        this.selectedEquipment = ''
        this.selectedType = null
      }
    },
    removeEquipment(index) {
      this.selectedEquipmentList.splice(index, 1)
    },
    getSelectedEquipmentByType(type) {
      return this.selectedEquipmentList.find(item => item.equipmentType === type)
    },
    clearEquipmentByType(type) {
      const index = this.selectedEquipmentList.findIndex(item => item.equipmentType === type)
      if (index >= 0) {
        this.selectedEquipmentList.splice(index, 1)
      }
    },
    handleClickOutside(event) {
      const dropdown = this.$el.querySelector('.search-dropdown')
      if (dropdown && !dropdown.contains(event.target)) {
        this.isDropdownOpen = false
      }
    },
    goToCompare() {
      this.$router.push('/compare')
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  background-color: #f5f5f5;
  min-height: 100vh;
}

#app {
  width: 100%;
}
</style>

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
  margin-bottom: 30px;
}

h1 {
  color: #42b983;
  margin: 0;
}

.compare-nav-btn {
  padding: 8px 20px;
  border: 2px solid #2196f3;
  background-color: white;
  color: #2196f3;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s;
}

.compare-nav-btn:hover {
  background-color: #e3f2fd;
}

.refresh-btn {
  padding: 8px 16px;
  border: 1px solid #42b983;
  border-radius: 4px;
  background-color: white;
  color: #42b983;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background-color: #42b983;
  color: white;
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
  padding: 18px 25px;
  border: 2px solid #ddd;
  background-color: white;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
  gap: 20px;
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
  flex-wrap: wrap;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.placeholder {
  color: #999;
  font-style: italic;
}

.selected-name {
  font-weight: bold;
  color: #2c3e50;
  font-size: 14px;
  min-width: 150px;
}

.selected-tension {
  color: #9b59b6;
  margin-left: 10px;
  padding: 4px 10px;
  background-color: #f5f0fa;
  border-radius: 4px;
}

.selected-price {
  color: #e67e22;
  font-size: 14px;
  font-weight: bold;
}

.friction-input-wrapper {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: 10px;
}

.friction-label {
  font-size: 14px;
  color: #666;
}

.friction-input {
  width: 50px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
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

.advice-section {
  margin-top: 20px;
  padding: 15px;
  border-radius: 8px;
  background-color: #f8f9fa;
  border-left: 4px solid #42b983;
}

.advice-title {
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 16px;
}

.advice-item {
  padding: 12px;
  border-radius: 4px;
  background-color: white;
  color: #27ae60;
  font-size: 15px;
  line-height: 1.6;
}

.advice-warning {
  background-color: #fff3cd;
  color: #856404;
  border-left: 4px solid #ffc107;
}

.advice-text {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.8;
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
  gap: 5px;
  margin-left: 10px;
}

.wear-label {
  font-size: 14px;
  color: #666;
}

.wear-input {
  width: 50px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
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