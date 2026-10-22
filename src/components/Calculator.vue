<template>
  <div class="app">
    <DisclaimerModal v-if="showDisclaimer" @close="showDisclaimer = false" />
    <div class="header">
      <div>
        <h1>装备计算器</h1>
        <p class="header-sub">选择鱼竿与渔轮，设定磨损与摩擦，计算实际可承受拉力</p>
      </div>
    </div>

    <!-- 工具行：计算规则 + 全局磨损 + 清空 -->
    <div class="toolbar">
      <div class="toolbar-group">
        <span class="toolbar-label">计算规则</span>
        <div class="segmented">
          <button
            v-for="rule in CALC_RULE_OPTIONS"
            :key="rule.value"
            :class="['segment-btn', { active: calculationRule === rule.value }]"
            @click="calculationRule = rule.value"
          >{{ rule.label }}</button>
        </div>
      </div>
      <div class="toolbar-spacer"></div>
      <button
        v-if="selectedEquipmentList.length"
        class="danger-btn"
        title="清空全部装备选择（保留计算规则与摩擦值）"
        @click="clearAll"
      >清空重选</button>
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
        <h3 class="gear-title"><span class="gear-icon">🎣</span> 鱼竿
          <span class="status-badge" :class="rod ? 'ok' : 'none'">{{ rod ? '已选择' : '未选择' }}</span>
        </h3>
        <template v-if="rod">
          <div class="gear-name-row">
            <span class="gear-name">{{ toSafeDisplay(rod.model || rod.equipmentName) }}</span>
            <span v-if="rod.category || rod.subCategory" class="selected-category-tag">{{ toSafeDisplay(rod.category || rod.subCategory) }}</span>
            <span v-if="rod.ratingAlias && rod.ratingAlias !== '常规'" class="selected-rating-tag">{{ toSafeDisplay(rod.ratingAlias) }}</span>
          </div>
          <div class="gear-meta">
            <span class="selected-tension">面板拉力: {{ toSafeNumber(rod.panelTension || rod.lockTension) }} kN</span>
            <span v-if="getMergedAdaptWeight(rod, '鱼竿')" class="selected-tension">适配重: {{ getMergedAdaptWeight(rod, '鱼竿') }}</span>
          </div>
          <div class="param-block">
            <div class="param-label">磨损设定 <span class="param-hint">影响拉力（×0.7 系数）</span></div>
            <div class="wear-input-wrapper">
              <input type="number" class="wear-input" v-model.number="rod.wear" min="0" max="100" />
              <span class="wear-unit">%</span>
            </div>
          </div>
          <div class="gear-result">
            <div class="gear-result-row">
              <span class="gear-result-label">面板拉力</span>
              <span class="tension-compare">
                <span class="before">{{ formatTension(rodPanelRaw) }}</span>
                <span class="arrow">→</span>
                <span class="after">{{ formatTension(rodPanel) }}</span>
                <span class="unit">kN</span>
              </span>
            </div>
            <div class="gear-result-row">
              <span class="gear-result-label">锁轮拉力</span>
              <span class="tension-compare">
                <span class="before">{{ formatTension(rodLockRaw) }}</span>
                <span class="arrow">→</span>
                <span class="after">{{ formatTension(rodLock) }}</span>
                <span class="unit">kN</span>
              </span>
            </div>
          </div>
          <div class="gear-actions">
            <button class="select-btn" @click="selectType('鱼竿')">更换装备</button>
            <button class="clear-btn" title="移除鱼竿" @click="clearGear('鱼竿')">×</button>
          </div>
        </template>
        <template v-else>
          <div class="empty-hint">从装备库中选择一支鱼竿开始计算</div>
          <button class="select-btn" @click="selectType('鱼竿')">选择鱼竿</button>
        </template>
        <EquipmentSearchDropdown
          v-if="selectedType === '鱼竿'"
          :equipment-list="equipmentOfSelectedType"
          @select="selectEquipment"
        />
      </section>

      <!-- 右：渔轮 -->
      <section class="gear-panel" :class="{ disabled: !calculationRule, active: selectedType === '渔轮' }">
        <h3 class="gear-title"><span class="gear-icon">🌀</span> 渔轮
          <span class="status-badge" :class="reel ? 'ok' : 'none'">{{ reel ? '已选择' : '未选择' }}</span>
        </h3>
        <template v-if="reel">
          <div class="gear-name-row">
            <span class="gear-name">{{ toSafeDisplay(reel.model || reel.equipmentName) }}</span>
            <span v-if="reel.category || reel.subCategory" class="selected-category-tag">{{ toSafeDisplay(reel.category || reel.subCategory) }}</span>
            <span v-if="reel.ratingAlias && reel.ratingAlias !== '常规'" class="selected-rating-tag">{{ toSafeDisplay(reel.ratingAlias) }}</span>
          </div>
          <div class="gear-meta">
            <span class="selected-tension">面板: {{ toSafeNumber(reel.panelTension || reel.lockTension || 0) }} kN</span>
            <span class="selected-tension">锁轮: {{ toSafeNumber(reel.lockTension) }} kN</span>
          </div>
          <div class="param-block">
            <div class="param-label">摩擦设定 <span class="param-hint">影响常规（面板）拉力</span></div>
            <div class="friction-input-wrapper">
              <input
                type="number"
                class="friction-input"
                :value="toSafeNumber(friction)"
                @change="onFrictionChange"
                min="0"
                :max="toSafeNumber(frictionMax)"
              />
              <span class="wear-unit">/ {{ toSafeNumber(frictionMax) }}</span>
              <button
                v-for="f in frictionPresets"
                :key="'f' + f"
                type="button"
                class="friction-preset-btn"
                :title="'设为摩擦值 ' + f"
                @click="setFriction(f)"
              >{{ f }}</button>
            </div>
          </div>
          <div class="param-block">
            <div class="param-label">磨损设定
              <span class="param-hint">摩擦制动器磨损 → 锁轮拉力 · 装备磨损 → 面板拉力</span>
            </div>
            <div class="wear-grid">
              <div class="wear-field">
                <span class="wear-label">摩擦制动器</span>
                <input type="number" class="wear-input" v-model.number="reel.lockWear" min="0" max="100" />
                <span class="wear-unit">%</span>
              </div>
              <div class="wear-field">
                <span class="wear-label">装备</span>
                <input type="number" class="wear-input" v-model.number="reel.panelWear" min="0" max="100" />
                <span class="wear-unit">%</span>
              </div>
            </div>
          </div>
          <div class="gear-result">
            <div class="gear-result-row">
              <span class="gear-result-label">锁轮拉力 <small>摩擦制动器磨损</small></span>
              <span class="tension-compare">
                <span class="before">{{ formatTension(reelLockRaw) }}</span>
                <span class="arrow">→</span>
                <span class="after">{{ formatTension(reelLock) }}</span>
                <span class="unit">kN</span>
              </span>
            </div>
            <div class="gear-result-row">
              <span class="gear-result-label">面板拉力 <small>装备磨损 · 摩擦 {{ toSafeNumber(friction) }}</small></span>
              <span class="tension-compare">
                <span class="before">{{ formatTension(reelPanelRaw) }}</span>
                <span class="arrow">→</span>
                <span class="after">{{ formatTension(reelPanel) }}</span>
                <span class="unit">kN</span>
              </span>
            </div>
          </div>
          <div class="gear-actions">
            <button class="select-btn" @click="selectType('渔轮')">更换装备</button>
            <button class="clear-btn" title="移除渔轮" @click="clearGear('渔轮')">×</button>
          </div>
        </template>
        <template v-else>
          <div class="empty-hint">选择与鱼竿兼容的渔轮</div>
          <button class="select-btn" @click="selectType('渔轮')">选择渔轮</button>
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

    <!-- 磨损-拉力衰减曲线 -->
    <WearCurveChart
      v-if="wearCurveCandidates.length"
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
      calculationRule: CALC_RULES.GUIDE,
      justApplied: false,
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
    /** 无磨损副本：用于「磨损前」拉力对照（面板拉力仍按当前摩擦值折算） */
    rodWearFree() { return this.rod ? { ...this.rod, wear: 0, lockWear: 0, panelWear: 0 } : null },
    reelWearFree() { return this.reel ? { ...this.reel, wear: 0, lockWear: 0, panelWear: 0 } : null },
    rodLockRaw() { return this.rodWearFree ? calculateActualLockTension(this.rodWearFree, this.calculationRule) : 0 },
    rodPanelRaw() { return this.rodWearFree ? calculateActualPanelTension(this.rodWearFree, this.calculationRule, this.friction) : 0 },
    reelLockRaw() { return this.reelWearFree ? calculateActualLockTension(this.reelWearFree, this.calculationRule) : 0 },
    reelPanelRaw() { return this.reelWearFree ? calculateActualPanelTension(this.reelWearFree, this.calculationRule, this.friction) : 0 }
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
    /** 防抖持久化当前计算状态（刷新页面可恢复） */
    scheduleSaveState() {
      if (this._stateSaveTimer) clearTimeout(this._stateSaveTimer)
      this._stateSaveTimer = setTimeout(() => {
        try {
          writeStorage(STORAGE_KEYS.calcState, this.buildStateSnapshot())
        } catch (e) { /* 存储不可用时静默降级 */ }
      }, 400)
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
/* ── 页头 ── */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.header h1 {
  font-size: 24px;
  color: var(--text-heading);
}

.header-sub {
  font-size: 13px;
  color: var(--text-hint);
  margin-top: 4px;
}

/* ── 工具行：规则 + 全局磨损 + 清空 ── */
.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 14px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.toolbar-spacer {
  flex: 1;
}

.segmented {
  display: inline-flex;
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}

.segment-btn {
  padding: 5px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.segment-btn.active {
  background: var(--color-surface);
  color: var(--color-primary);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.danger-btn {
  padding: 7px 16px;
  border: 1px solid var(--color-danger);
  border-radius: 8px;
  background: transparent;
  color: var(--color-danger);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.danger-btn:hover {
  background: var(--color-danger-bg);
}

/* ── 状态提示 ── */
.rule-warning {
  background: var(--color-warning-bg);
  color: var(--color-warning-strong);
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 12px;
}

.rule-warning--error {
  background: var(--color-danger-bg);
  color: var(--color-danger-strong);
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

/* ── 左右装备面板 ── */
.calc-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.gear-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px 18px;
  position: relative;
  transition: border-color 0.15s;
}

.gear-panel.active {
  border-color: var(--color-primary);
}

.gear-panel.disabled {
  opacity: 0.55;
  pointer-events: none;
}

.gear-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: var(--text-main);
  margin-bottom: 12px;
  font-weight: 600;
}

.gear-icon {
  font-size: 17px;
}

.status-badge {
  margin-left: auto;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 10px;
}

.status-badge.ok {
  background: var(--color-success-bg);
  color: var(--color-success-text);
}

.status-badge.none {
  background: var(--bg-secondary);
  color: var(--text-hint);
}

.gear-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.gear-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-heading);
  word-break: break-all;
}

.selected-category-tag,
.selected-rating-tag {
  display: inline-block;
  font-size: 11px;
  padding: 2px 9px;
  border-radius: 10px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  white-space: nowrap;
}

.selected-rating-tag {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.gear-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.selected-tension {
  display: inline-block;
  font-size: 12px;
  background: var(--color-tension-bg);
  color: var(--color-tension-text);
  padding: 3px 10px;
  border-radius: 6px;
}

.empty-hint {
  color: var(--text-hint);
  font-size: 13px;
  margin-bottom: 14px;
}

/* ── 参数分组 ── */
.param-block {
  border-top: 1px dashed var(--color-divider);
  padding: 12px 0 4px;
  margin-top: 12px;
}

.param-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 8px;
}

.param-hint {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-hint);
  margin-left: 6px;
}

.wear-input-wrapper,
.friction-input-wrapper {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.wear-label {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 72px;
}

.wear-input,
.friction-input {
  width: 64px;
  padding: 6px 9px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--text-main);
  font-size: 14px;
  text-align: center;
}

.wear-input:focus,
.friction-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.wear-unit {
  font-size: 12px;
  color: var(--text-hint);
}

.friction-preset-btn {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.friction-preset-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* 渔轮双磨损网格 */
.wear-grid {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.wear-field {
  display: flex;
  align-items: center;
  gap: 6px;
}

.gear-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.select-btn {
  padding: 7px 16px;
  border: 1px solid var(--color-primary);
  border-radius: 8px;
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

/* ── 卡片内结果：磨损前 → 磨损后（各算各的，不联动） ── */
.gear-result {
  background: var(--color-tension-bg);
  border-radius: 10px;
  padding: 10px 14px;
  margin-top: 14px;
}

.gear-result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
}

.gear-result-row + .gear-result-row {
  border-top: 1px dashed var(--color-border);
}

.gear-result-label {
  font-size: 12px;
  color: var(--color-tension-text);
}

.gear-result-label small {
  font-size: 10px;
  color: var(--text-hint);
  margin-left: 4px;
}

/* 磨损前 → 磨损后 对照 */
.tension-compare {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}

.tension-compare .before {
  color: var(--text-hint);
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}

.tension-compare .arrow {
  color: var(--text-hint);
  font-size: 12px;
}

.tension-compare .after {
  color: var(--color-tension-text);
  font-weight: 700;
  font-size: 16px;
}

.tension-compare .unit {
  color: var(--text-hint);
  font-size: 11px;
}

/* ── 移动端 ── */
@media (max-width: 768px) {
  .calc-layout {
    grid-template-columns: 1fr;
  }

  .header h1 {
    font-size: 20px;
  }

  .toolbar {
    gap: 10px;
  }

  .toolbar-group {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
