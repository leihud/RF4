<template>
  <div class="app">
    <DisclaimerModal v-if="showDisclaimer" @close="showDisclaimer = false" />
    <div class="header">
      <h1>装备计算器</h1>
      <div class="header-buttons">
        <button
          v-if="selectedEquipmentList.length"
          class="share-btn"
          title="清空全部装备选择（保留计算规则与摩擦值）"
          @click="clearAll"
        >清空</button>
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

    <!-- 最近搭配历史：一键恢复（竿/轮/磨损/摩擦/规则整套状态） -->
    <div v-if="calcHistory.length" class="calc-history">
      <span class="history-label">最近搭配:</span>
      <div class="history-chips">
        <button
          v-for="(h, i) in calcHistory"
          :key="i"
          type="button"
          class="history-chip"
          :title="`恢复搭配：${h.rodName} + ${h.reelName}`"
          @click="applyHistoryEntry(i)"
        >{{ h.rodName }} × {{ h.reelName }}</button>
      </div>
    </div>

    <div v-if="dataLoadError" class="rule-warning rule-warning--error">
      装备数据加载失败
    </div>

    <div v-if="isLoading && equipmentData.length === 0" class="loading-wrapper">
      <div class="loading-spinner"></div>
      <span class="loading-text">正在加载装备数据...</span>
      <AppSkeleton :rows="6" />
    </div>

    <!-- 左右结构：左竿右轮 -->
    <div class="calc-layout">
      <!-- 左：鱼竿 -->
      <section class="gear-panel" :class="{ disabled: !calculationRule, active: selectedType === '鱼竿' }">
        <h3 class="gear-title">鱼竿</h3>
        <template v-if="rod">
          <span v-if="rod.category || rod.subCategory" class="selected-category-tag">{{ toSafeDisplay(rod.category || rod.subCategory) }}</span>
          <span v-if="rod.ratingAlias && rod.ratingAlias !== '常规'" class="selected-rating-tag">{{ toSafeDisplay(rod.ratingAlias) }}</span>
          <span class="selected-name">{{ toSafeDisplay(rod.model || rod.equipmentName) }}</span>
          <span class="selected-tension">拉力: {{ toSafeNumber(rod.panelTension || rod.lockTension) }} kN</span>
          <div class="wear-input-wrapper">
            <span class="wear-label">磨损:</span>
            <input type="number" class="wear-input" v-model.number="rod.wear" min="0" max="100" />
            <span class="wear-unit">%</span>
            <button
              v-for="p in WEAR_PRESETS"
              :key="'r' + p"
              type="button"
              class="wear-preset-btn"
              :title="'设为' + p + '% 磨损'"
              @click="rod.wear = p"
            >{{ p }}</button>
          </div>
          <span v-if="getMergedAdaptWeight(rod, '鱼竿')" class="actual-tension adapt-weight-tag">适配重: {{ getMergedAdaptWeight(rod, '鱼竿') }}</span>
          <div class="gear-actions">
            <button class="select-btn" @click="selectType('鱼竿')">更换装备</button>
            <button class="clear-btn" title="移除鱼竿" @click="clearGear('鱼竿')">×</button>
          </div>
        </template>
        <template v-else>
          <span class="placeholder">未选择</span>
          <button class="select-btn" @click="selectType('鱼竿')">选择装备</button>
        </template>
        <EquipmentSearchDropdown
          v-if="selectedType === '鱼竿'"
          :equipment-list="equipmentOfSelectedType"
          @select="selectEquipment"
        />
      </section>

      <!-- 右：渔轮 -->
      <section class="gear-panel" :class="{ disabled: !calculationRule, active: selectedType === '渔轮' }">
        <h3 class="gear-title">渔轮</h3>
        <template v-if="reel">
          <span v-if="reel.category || reel.subCategory" class="selected-category-tag">{{ toSafeDisplay(reel.category || reel.subCategory) }}</span>
          <span v-if="reel.ratingAlias && reel.ratingAlias !== '常规'" class="selected-rating-tag">{{ toSafeDisplay(reel.ratingAlias) }}</span>
          <span class="selected-name">{{ toSafeDisplay(reel.model || reel.equipmentName) }}</span>
          <span class="selected-tension">面板: {{ toSafeNumber(reel.panelTension || reel.lockTension || 0) }} kN</span>
          <span class="selected-tension">锁轮: {{ toSafeNumber(reel.lockTension) }} kN</span>
          <div class="wear-input-wrapper">
            <span class="wear-label" title="影响锁轮拉力">摩擦制动器磨损:</span>
            <input type="number" class="wear-input" v-model.number="reel.lockWear" min="0" max="100" />
            <span class="wear-unit">%</span>
            <span class="wear-label" title="影响面板拉力">装备磨损:</span>
            <input type="number" class="wear-input" v-model.number="reel.panelWear" min="0" max="100" />
            <span class="wear-unit">%</span>
            <button
              v-for="p in WEAR_PRESETS"
              :key="'lk' + p"
              type="button"
              class="wear-preset-btn"
              :title="'摩擦制动器磨损设为' + p + '%'"
              @click="reel.lockWear = p"
            >{{ p }}</button>
            <button
              v-for="p in WEAR_PRESETS"
              :key="'pw' + p"
              type="button"
              class="wear-preset-btn"
              :title="'装备磨损设为' + p + '%'"
              @click="reel.panelWear = p"
            >{{ p }}</button>
          </div>
          <div class="friction-input-wrapper">
            <span class="friction-label">摩擦:</span>
            <input
              type="number"
              class="friction-input"
              :value="toSafeNumber(friction)"
              @change="onFrictionChange"
              min="0"
              :max="toSafeNumber(frictionMax)"
            />
            <button
              v-for="f in frictionPresets"
              :key="'f' + f"
              type="button"
              class="friction-preset-btn"
              :title="'设为摩擦值 ' + f"
              @click="setFriction(f)"
            >{{ f }}</button>
          </div>
          <div class="gear-actions">
            <button class="select-btn" @click="selectType('渔轮')">更换装备</button>
            <button class="clear-btn" title="移除渔轮" @click="clearGear('渔轮')">×</button>
          </div>
        </template>
        <template v-else>
          <span class="placeholder">未选择</span>
          <button class="select-btn" @click="selectType('渔轮')">选择装备</button>
        </template>
        <EquipmentSearchDropdown
          v-if="selectedType === '渔轮'"
          :equipment-list="equipmentOfSelectedType"
          :equipment-filter="reelEquipmentFilter"
          :compatible-categories="compatibleReelTypes"
          :empty-hint="compatibleReelTypes !== null && compatibleReelTypes.length === 0 ? '当前鱼竿无法装备任何渔轮' : null"
          @select="selectEquipment"
        />
      </section>
    </div>

    <!-- 全局磨损预设 -->
    <div class="global-wear-bar">
      <span class="global-wear-label">全部磨损:</span>
      <button
        v-for="p in WEAR_PRESETS"
        :key="'gw' + p"
        type="button"
        class="wear-preset-btn"
        :title="`竿/轮全部磨损设为 ${p}%`"
        @click="setAllWear(p)"
      >{{ p }}%</button>
    </div>

    <!-- 计算结果 -->
    <div v-if="allSelected" class="result-card">
      <div class="result-group">
        <h4 class="result-title">锁轮拉力</h4>
        <div class="result-row"><span>鱼竿</span><span>{{ formatTension(rodLock) }} kN</span></div>
        <div class="result-row"><span>渔轮</span><span>{{ formatTension(reelLock) }} kN</span></div>
        <div class="result-row result-min"><span>最小拉力（木桶）</span><span>{{ formatTension(minLock) }} kN</span></div>
      </div>
      <div class="result-group">
        <h4 class="result-title">常规拉力（面板）</h4>
        <div class="result-row"><span>鱼竿</span><span>{{ formatTension(rodPanel) }} kN</span></div>
        <div class="result-row"><span>渔轮</span><span>{{ formatTension(reelPanel) }} kN</span></div>
        <div class="result-row result-min"><span>最小拉力（木桶）</span><span>{{ formatTension(minPanel) }} kN</span></div>
      </div>
    </div>

    <!-- 磨损-拉力衰减曲线 -->
    <WearCurveChart
      v-if="allSelected && wearCurveCandidates.length"
      :candidates="wearCurveCandidates"
      :calc-rule="calculationRule"
      :friction="friction"
      mode="lock"
    />

    <AppToast ref="toast" />
  </div>
</template>

<script>
import {
  CALC_RULES,
  CALC_RULE_OPTIONS,
  DEFAULT_FRICTION,
  getCompatibleReelTypes,
  isRodReelCompatible,
  getRatingAlias
} from '../constants/equipment.js'
import {
  calculateActualLockTension,
  calculateActualPanelTension,
  getFrictionMax,
  clampFriction,
  formatTension
} from '../utils/tension.js'
import { sanitizeEquipmentFields, toSafeNumber, toSafeDisplay } from '../utils/sanitize.js'
import { getMergedAdaptWeight } from '../utils/display.js'
import { loadRodAndReelData } from '../utils/equipmentLoader.js'
import { readStorage, writeStorage, STORAGE_KEYS } from '../utils/storage.js'
import DisclaimerModal from './calculator/DisclaimerModal.vue'
import EquipmentSearchDropdown from './calculator/EquipmentSearchDropdown.vue'
import WearCurveChart from './calculator/WearCurveChart.vue'
import AppToast from './common/AppToast.vue'
import AppSkeleton from './common/AppSkeleton.vue'

export default {
  name: 'Calculator',
  components: {
    DisclaimerModal,
    EquipmentSearchDropdown,
    WearCurveChart,
    AppToast,
    AppSkeleton
  },
  data() {
    return {
      selectedType: null,
      equipmentData: [],
      dataLoadError: false,
      isLoading: false,
      showDisclaimer: false,
      friction: DEFAULT_FRICTION,
      selectedEquipmentList: [],
      /** 最近搭配历史（localStorage 持久化，最多 5 条） */
      calcHistory: [],
      calculationRule: CALC_RULES.GUIDE,
      justApplied: false,
      WEAR_PRESETS: [0, 50, 100],
      CALC_RULE_OPTIONS
    }
  },
  computed: {
    rod() { return this.selectedEquipmentMap['鱼竿'] || null },
    reel() { return this.selectedEquipmentMap['渔轮'] || null },
    selectedEquipmentMap() {
      const map = {}
      for (const item of this.selectedEquipmentList) map[item.equipmentType] = item
      return map
    },
    allSelected() { return !!(this.rod && this.reel) },
    frictionMax() { return getFrictionMax(this.calculationRule) },
    frictionPresets() {
      const max = this.frictionMax
      return [...new Set([10, 25, max].filter(v => v > 0 && v <= max))]
    },
    equipmentOfSelectedType() {
      if (!Array.isArray(this.equipmentData)) return []
      return this.equipmentData.filter(item => item.equipmentType === this.selectedType)
    },
    /** 当前鱼竿兼容的渔轮分类（null=不限制） */
    compatibleReelTypes() {
      if (!this.rod) return null
      return getCompatibleReelTypes(this.rod.category)
    },
    reelEquipmentFilter() {
      const compatible = this.compatibleReelTypes
      if (compatible === null) return null
      return (item) => compatible.includes(item.category)
    },
    wearCurveCandidates() {
      const out = []
      if (this.rod) out.push({ key: 'rod', name: this.rod.model || this.rod.equipmentName || '鱼竿', type: 'rod', item: this.rod })
      if (this.reel) out.push({ key: 'reel', name: this.reel.model || this.reel.equipmentName || '渔轮', type: 'reel', item: this.reel })
      return out
    },
    rodLock() { return this.rod ? calculateActualLockTension(this.rod, this.calculationRule) : 0 },
    rodPanel() { return this.rod ? calculateActualPanelTension(this.rod, this.calculationRule, this.friction) : 0 },
    reelLock() { return this.reel ? calculateActualLockTension(this.reel, this.calculationRule) : 0 },
    reelPanel() { return this.reel ? calculateActualPanelTension(this.reel, this.calculationRule, this.friction) : 0 },
    minLock() { return this.allSelected ? Math.min(this.rodLock, this.reelLock) : 0 },
    minPanel() { return this.allSelected ? Math.min(this.rodPanel, this.reelPanel) : 0 }
  },
  watch: {
    calculationRule(val) {
      if (val) this.friction = clampFriction(this.friction, val)
      if (this._stateReady) this.scheduleSaveState()
    },
    selectedEquipmentList: {
      deep: true,
      handler() { if (this._stateReady) this.scheduleSaveState() }
    },
    friction() {
      if (this._stateReady) this.scheduleSaveState()
    },
    /** 鱼竿切换时，不兼容渔轮自动清除 */
    rod(newRod) {
      const reel = this.reel
      if (newRod && reel && !isRodReelCompatible(newRod, reel)) {
        this.clearGear('渔轮')
        this.showToast('当前鱼竿无法装备此渔轮，已移除', 'error')
      }
    }
  },
  mounted() {
    this.calcHistory = readStorage(STORAGE_KEYS.calcHistory, [])
    this.loadEquipmentData()
    document.addEventListener('click', this.handleClickOutside)
    if (!sessionStorage.getItem('disclaimer_shown')) {
      this.showDisclaimer = true
      sessionStorage.setItem('disclaimer_shown', '1')
    }
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  },
  methods: {
    toSafeNumber,
    toSafeDisplay,
    getMergedAdaptWeight,
    formatTension,
    showToast(message, type = 'info') {
      this.$refs.toast.show(message, type)
    },
    selectType(type) {
      this.selectedType = type
    },
    selectEquipment(equipment) {
      // 【入口二次清洗】防止装备对象残留未清洗的对象字段
      const safe = sanitizeEquipmentFields(equipment || {})
      if (safe.equipmentType === '渔轮') {
        if (this.rod && !isRodReelCompatible(this.rod, safe)) {
          this.showToast('当前鱼竿无法装备此类型渔轮', 'error')
          return
        }
      }
      const existingIndex = this.selectedEquipmentList.findIndex(
        item => item.equipmentType === safe.equipmentType
      )
      // 渔轮双磨损：lockWear=摩擦制动器磨损（锁轮拉力）、panelWear=装备磨损（面板拉力）
      const next = safe.equipmentType === '渔轮'
        ? { ...safe, wear: 0, lockWear: 0, panelWear: 0, ratingAlias: getRatingAlias(safe.rating) }
        : { ...safe, wear: 0, ratingAlias: getRatingAlias(safe.rating) }
      if (existingIndex >= 0) {
        const prev = this.selectedEquipmentList[existingIndex]
        next.wear = toSafeNumber(prev.wear, 0)
        if (safe.equipmentType === '渔轮') {
          next.lockWear = toSafeNumber(prev.lockWear, 0)
          next.panelWear = toSafeNumber(prev.panelWear, 0)
        }
        this.selectedEquipmentList.splice(existingIndex, 1, next)
      } else {
        this.selectedEquipmentList.push(next)
      }
      this.selectedType = null
    },
    clearGear(type) {
      const index = this.selectedEquipmentList.findIndex(item => item.equipmentType === type)
      if (index >= 0) this.selectedEquipmentList.splice(index, 1)
    },
    clearAll() {
      this.selectedEquipmentList = []
      this.selectedType = null
      this.showToast('已清空全部选择', 'success')
    },
    setAllWear(value) {
      const v = Math.max(0, Math.min(100, toSafeNumber(value, 0)))
      for (const item of this.selectedEquipmentList) {
        item.wear = v
        if (item.equipmentType === '渔轮') {
          item.lockWear = v
          item.panelWear = v
        }
      }
      this.showToast(`全部磨损已设为 ${v}%`, 'success')
    },
    setFriction(value) {
      this.friction = clampFriction(value, this.calculationRule)
    },
    onFrictionChange(event) {
      this.friction = clampFriction(parseFloat(event.target.value), this.calculationRule)
    },
    /** 构造当前搭配快照（含渔轮双磨损） */
    buildStateSnapshot() {
      return {
        equipment: this.selectedEquipmentList.map(item => ({
          type: item.equipmentType,
          model: item.model || item.equipmentName,
          wear: item.wear || 0,
          lockWear: item.lockWear != null ? item.lockWear : (item.wear || 0),
          panelWear: item.panelWear != null ? item.panelWear : (item.wear || 0)
        })),
        friction: this.friction,
        rule: this.calculationRule
      }
    },
    /** 防抖持久化当前计算状态 + 写入最近搭配历史 */
    scheduleSaveState() {
      if (this._stateSaveTimer) clearTimeout(this._stateSaveTimer)
      this._stateSaveTimer = setTimeout(() => {
        try {
          const state = this.buildStateSnapshot()
          writeStorage(STORAGE_KEYS.calcState, state)
          this.pushHistorySnapshot(state)
        } catch (e) { /* 存储不可用时静默降级 */ }
      }, 400)
    },
    /** 最近搭配历史：竿+轮齐备时入档，去重刷新，保留最近 5 条 */
    pushHistorySnapshot(state) {
      const rod = state.equipment.find(e => e.type === '鱼竿')
      const reel = state.equipment.find(e => e.type === '渔轮')
      if (!rod || !reel) return
      const key = `${rod.model}|${reel.model}`
      const list = this.calcHistory.filter(h => h.key !== key)
      list.unshift({ key, at: Date.now(), rodName: rod.model, reelName: reel.model, state })
      this.calcHistory = list.slice(0, 5)
      writeStorage(STORAGE_KEYS.calcHistory, this.calcHistory)
    },
    /** 点击历史胶囊：整体替换当前搭配 */
    applyHistoryEntry(index) {
      const entry = this.calcHistory[index]
      if (!entry) return
      if (!this.equipmentData.length) {
        this.showToast('装备数据尚未加载完成，请稍后再试', 'error')
        return
      }
      this.applyStateSnapshot(entry.state)
      this.showToast('已恢复最近搭配', 'success')
    },
    /** 应用一套完整快照：清空当前选择后整体替换 */
    applyStateSnapshot(state) {
      this.selectedEquipmentList = []
      if (state.rule) this.calculationRule = state.rule
      if (state.friction != null) this.friction = clampFriction(state.friction, this.calculationRule)
      if (Array.isArray(state.equipment)) {
        for (const saved of state.equipment) {
          const item = this.equipmentData.find(d =>
            d.equipmentType === saved.type &&
            (d.model === saved.model || d.equipmentName === saved.model)
          )
          if (!item) continue
          const restored = { ...item, wear: saved.wear || 0, ratingAlias: getRatingAlias(item.rating) }
          if (saved.type === '渔轮') {
            restored.lockWear = saved.lockWear != null ? saved.lockWear : (saved.wear || 0)
            restored.panelWear = saved.panelWear != null ? saved.panelWear : (saved.wear || 0)
          }
          this.selectedEquipmentList.push(restored)
        }
      }
    },
    /** 从 localStorage 恢复上次计算状态 */
    restoreFromSavedState() {
      try {
        const state = readStorage(STORAGE_KEYS.calcState)
        if (!state) return
        this.applyStateSnapshot(state)
      } catch (e) {
        console.error('恢复本地状态失败:', e)
      }
    },
    async loadEquipmentData() {
      this.equipmentData = []
      this.isLoading = true
      const { rodData, reelData, error } = await loadRodAndReelData()
      this.equipmentData = [...rodData, ...reelData]
      this.dataLoadError = error
      this.isLoading = false
      // 无外部恢复时，恢复上次本地状态；之后开启持久化
      if (!this._hadExternalRestore) {
        this.restoreFromSavedState()
      }
      this._stateReady = true
    },
    handleClickOutside(event) {
      const el = this.$el
      if (!el || typeof el.querySelector !== 'function') return
      // 点击在其他行的更换装备按钮上（会自行切 selectedType），不收起
      const activeRow = el.querySelector('.gear-panel.active, .type-item.active')
      if (activeRow && activeRow.contains && activeRow.contains(event.target)) return
      if (this.selectedType) this.selectedType = null
    }
  }
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header h1 {
  font-size: 22px;
  color: var(--text-heading);
}

.header-buttons {
  display: flex;
  gap: 8px;
}

.share-btn {
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.share-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.rule-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.rule-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.rule-btn {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.rule-btn.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.rule-warning {
  background: var(--color-warning-bg);
  color: var(--color-warning-strong);
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 12px;
}

.rule-warning--error {
  background: var(--color-danger-bg);
  color: var(--color-danger-strong);
}

/* 最近搭配历史 */
.calc-history {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.history-label {
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.history-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.history-chip {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--text-main);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.loading-wrapper {
  text-align: center;
  padding: 30px 0;
}

.loading-text {
  display: block;
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 28px;
  height: 28px;
  margin: 0 auto;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 左右布局：左竿右轮 */
.calc-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.gear-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 14px 16px;
  position: relative;
}

.gear-panel.disabled {
  opacity: 0.55;
  pointer-events: none;
}

.gear-title {
  font-size: 15px;
  color: var(--text-main);
  margin-bottom: 10px;
  font-weight: 600;
}

.gear-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.select-btn {
  padding: 7px 14px;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.select-btn:hover {
  background: var(--color-primary);
  color: white;
}

.clear-btn {
  border: none;
  background: transparent;
  color: var(--text-hint);
  font-size: 18px;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  line-height: 1;
}

.clear-btn:hover {
  color: var(--color-danger);
  background: var(--color-danger-bg);
}

.placeholder {
  color: var(--text-hint);
  font-size: 13px;
  margin-right: 12px;
}

.selected-category-tag,
.selected-rating-tag {
  display: inline-block;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  margin-right: 6px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.selected-rating-tag {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.selected-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
  margin: 6px 0;
  word-break: break-all;
}

.selected-tension {
  display: inline-block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-right: 12px;
  background: var(--color-tension-bg);
  color: var(--color-tension-text);
  padding: 2px 8px;
  border-radius: 4px;
}

.wear-input-wrapper,
.friction-input-wrapper {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.wear-label,
.friction-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.wear-input,
.friction-input {
  width: 60px;
  padding: 5px 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--text-main);
  font-size: 13px;
}

.wear-input:focus,
.friction-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.wear-unit {
  font-size: 12px;
  color: var(--text-hint);
  margin-right: 8px;
}

.wear-preset-btn,
.friction-preset-btn {
  padding: 3px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-surface);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.wear-preset-btn:hover,
.friction-preset-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.actual-tension {
  display: inline-block;
  font-size: 12px;
  margin-top: 8px;
  color: var(--color-tension-text);
  background: var(--color-tension-bg);
  padding: 3px 10px;
  border-radius: 4px;
}

/* 全局磨损条 */
.global-wear-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.global-wear-label {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 计算结果卡 */
.result-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.result-title {
  font-size: 14px;
  color: var(--text-main);
  margin-bottom: 10px;
  font-weight: 600;
}

.result-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
  padding: 5px 0;
}

.result-row.result-min {
  border-top: 1px solid var(--color-divider);
  margin-top: 4px;
  padding-top: 8px;
  color: var(--color-tension-text);
  font-weight: 600;
  font-size: 14px;
}

/* 移动端：单列 */
@media (max-width: 768px) {
  .calc-layout,
  .result-card {
    grid-template-columns: 1fr;
  }

  .header h1 {
    font-size: 18px;
  }

  .rule-selector {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
  }
}
</style>
