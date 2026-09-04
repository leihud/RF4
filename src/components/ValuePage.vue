<template>
  <div class="value-page">
    <div class="page-header">
      <h1>装备价值统计</h1>
      <button class="back-btn" @click="$router.back()">← 返回计算器</button>
    </div>

    <!-- 截图识别装备 -->
    <EquipmentRecognition @add="onRecognizedAdd" />

    <!-- 鱼竿列表 -->
    <div class="equipment-section">
      <div class="section-header">
        <h2>🎣 鱼竿</h2>
        <button class="add-btn" @click="addRodEntry">+ 添加鱼竿</button>
      </div>
      <div v-for="(entry, index) in rodEntries" :key="'rod-' + index" class="entry-row">
        <div class="search-dropdown">
          <div class="search-row">
            <div class="search-input-wrapper">
              <input
                type="text"
                class="search-input"
                v-model="entry.search"
                @input="onSearchInput(entry)"
                placeholder="搜索鱼竿..."
                @focus="entry.isDropdownOpen = true"
                @blur="onSearchBlur(entry, 'rod', index)"
              />
              <span class="search-icon">🔍</span>
            </div>
            <div class="selected-tags" v-if="entry.equipment">
              <span class="tag-type">{{ entry.equipment.category }}</span>
              <span class="tag-rating" v-if="getRatingAlias(entry.equipment.rating) !== '常规'">{{ getRatingAlias(entry.equipment.rating) }}</span>
            </div>
          </div>
          <div v-if="entry.isDropdownOpen && getRodCategoryOptions().length > 0" class="category-filter-header">
            <button class="category-toggle-btn" @mousedown.prevent="entry.showCategoryFilter = !entry.showCategoryFilter">
              {{ entry.showCategoryFilter ? '▼' : '▲' }} 装备类型
            </button>
          </div>
          <div v-if="entry.isDropdownOpen && entry.showCategoryFilter" class="category-filter-wrapper">
            <button
              v-for="cat in getRodCategoryOptions()"
              :key="cat"
              :class="['category-filter-btn', { active: entry.selectedCategory === cat }]"
              @mousedown.prevent="entry.selectedCategory = cat"
            >
              {{ cat }}
            </button>
          </div>
          <div v-if="entry.isDropdownOpen" class="dropdown-list">
            <div
              v-for="rod in getFilteredRodList(entry)"
              :key="rod.id"
              class="dropdown-item"
              @mousedown.prevent="selectEquipment(index, 'rod', rod, entry)"
            >
              <span class="dropdown-name">{{ rod.model }}</span>
              <span class="dropdown-type">{{ rod.category }}</span>
              <span class="dropdown-category" v-if="getRatingAlias(rod.rating) !== '常规'">{{ getRatingAlias(rod.rating) }}</span>
              <span v-if="rod.ratingAlias && rod.ratingAlias !== '常规'" class="dropdown-rating">{{ rod.ratingAlias }}</span>
            </div>
            <div v-if="getFilteredRodList(entry).length === 0" class="dropdown-empty">未找到匹配的装备</div>
          </div>
        </div>
        <div class="quantity-input-wrapper">
          <label>数量:</label>
          <button type="button" class="qty-step-btn" :disabled="entry.quantity <= 1" aria-label="减少数量" @click="stepQuantity(entry, -1)">−</button>
          <input type="number" v-model.number="entry.quantity" min="1" class="quantity-input" />
          <button type="button" class="qty-step-btn" aria-label="增加数量" @click="stepQuantity(entry, 1)">＋</button>
        </div>
        <div class="entry-subtotal">
          <template v-if="entry.equipment">
            <span class="subtotal-silver">{{ formatPrice((parsePrice(entry.equipment.silverPrice) ?? 0) * entry.quantity) }} 银币</span>
            <span class="subtotal-gold">{{ formatPrice((parsePrice(entry.equipment.goldPrice) ?? 0) * entry.quantity) }} 金币</span>
          </template>
          <template v-else>
            <span class="subtotal-placeholder">-</span>
            <span class="subtotal-placeholder">-</span>
          </template>
        </div>
        <button class="remove-entry-btn" @click="removeRodEntry(index)" title="删除" aria-label="删除该鱼竿条目">✕</button>
      </div>
      <div v-if="rodEntries.length === 0" class="empty-hint">点击「添加鱼竿」开始统计</div>
    </div>

    <!-- 渔轮列表 -->
    <div class="equipment-section">
      <div class="section-header">
        <h2>🎡 渔轮</h2>
        <button class="add-btn" @click="addReelEntry">+ 添加渔轮</button>
      </div>
      <div v-for="(entry, index) in reelEntries" :key="'reel-' + index" class="entry-row">
        <div class="search-dropdown">
          <div class="search-row">
            <div class="search-input-wrapper">
              <input
                type="text"
                class="search-input"
                v-model="entry.search"
                @input="onSearchInput(entry)"
                placeholder="搜索渔轮..."
                @focus="entry.isDropdownOpen = true"
                @blur="onSearchBlur(entry, 'reel', index)"
              />
              <span class="search-icon">🔍</span>
            </div>
            <div class="selected-tags" v-if="entry.equipment">
              <span class="tag-type">{{ entry.equipment.category }}</span>
              <span class="tag-rating" v-if="getRatingAlias(entry.equipment.rating) !== '常规'">{{ getRatingAlias(entry.equipment.rating) }}</span>
            </div>
          </div>
          <div v-if="entry.isDropdownOpen && getReelCategoryOptions().length > 0" class="category-filter-header">
            <button class="category-toggle-btn" @mousedown.prevent="entry.showCategoryFilter = !entry.showCategoryFilter">
              {{ entry.showCategoryFilter ? '▼' : '▲' }} 装备类型
            </button>
          </div>
          <div v-if="entry.isDropdownOpen && entry.showCategoryFilter" class="category-filter-wrapper">
            <button
              v-for="cat in getReelCategoryOptions()"
              :key="cat"
              :class="['category-filter-btn', { active: entry.selectedCategory === cat }]"
              @mousedown.prevent="entry.selectedCategory = cat"
            >
              {{ cat }}
            </button>
          </div>
          <div v-if="entry.isDropdownOpen" class="dropdown-list">
            <div
              v-for="reel in getFilteredReelList(entry)"
              :key="reel.id"
              class="dropdown-item"
              @mousedown.prevent="selectEquipment(index, 'reel', reel, entry)"
            >
              <span class="dropdown-name">{{ reel.model }}</span>
              <span class="dropdown-type">{{ reel.category }}</span>
              <span class="dropdown-category" v-if="getRatingAlias(reel.rating) !== '常规'">{{ getRatingAlias(reel.rating) }}</span>
              <span v-if="reel.ratingAlias && reel.ratingAlias !== '常规'" class="dropdown-rating">{{ reel.ratingAlias }}</span>
            </div>
            <div v-if="getFilteredReelList(entry).length === 0" class="dropdown-empty">未找到匹配的装备</div>
          </div>
        </div>
        <div class="quantity-input-wrapper">
          <label>数量:</label>
          <button type="button" class="qty-step-btn" :disabled="entry.quantity <= 1" aria-label="减少数量" @click="stepQuantity(entry, -1)">−</button>
          <input type="number" v-model.number="entry.quantity" min="1" class="quantity-input" />
          <button type="button" class="qty-step-btn" aria-label="增加数量" @click="stepQuantity(entry, 1)">＋</button>
        </div>
        <div class="entry-subtotal">
          <template v-if="entry.equipment">
            <span class="subtotal-silver">{{ formatPrice((parsePrice(entry.equipment.silverPrice) ?? 0) * entry.quantity) }} 银币</span>
            <span class="subtotal-gold">{{ formatPrice((parsePrice(entry.equipment.goldPrice) ?? 0) * entry.quantity) }} 金币</span>
          </template>
          <template v-else>
            <span class="subtotal-placeholder">-</span>
            <span class="subtotal-placeholder">-</span>
          </template>
        </div>
        <button class="remove-entry-btn" @click="removeReelEntry(index)" title="删除" aria-label="删除该渔轮条目">✕</button>
      </div>
      <div v-if="reelEntries.length === 0" class="empty-hint">点击「添加渔轮」开始统计</div>
    </div>

    <!-- 价值统计 -->
    <div class="value-summary">
      <div class="summary-card">
        <div class="summary-item">
          <span class="summary-label">鱼竿总价</span>
          <span class="summary-value silver">{{ formatPrice(rodTotalSilver) }} 银币</span>
        </div>
        <div class="summary-item">
          <span class="summary-label"></span>
          <span class="summary-value gold">{{ formatPrice(rodTotalGold) }} 金币</span>
        </div>
      </div>

      <div class="summary-card">
        <div class="summary-item">
          <span class="summary-label">渔轮总价</span>
          <span class="summary-value silver">{{ formatPrice(reelTotalSilver) }} 银币</span>
        </div>
        <div class="summary-item">
          <span class="summary-label"></span>
          <span class="summary-value gold">{{ formatPrice(reelTotalGold) }} 金币</span>
        </div>
      </div>

      <div class="summary-card total-card">
        <div class="summary-item">
          <span class="summary-label">总计（{{ totalItems }} 件）</span>
          <span class="summary-value silver total">{{ formatPrice(totalSilver) }} 银币</span>
        </div>
        <div class="summary-item">
          <span class="summary-label"></span>
          <span class="summary-value gold total">{{ formatPrice(totalGold) }} 金币</span>
        </div>
      </div>

      <!-- 清单操作：复制/分享/清空 -->
      <div class="summary-actions">
        <button class="summary-action-btn" @click="copyList">📋 复制清单</button>
        <button class="summary-action-btn" @click="copyShareLink">🔗 分享链接</button>
        <button class="summary-action-btn danger" @click="clearAllEntries">🗑 清空清单</button>
      </div>
    </div>

    <!-- 清空清单确认弹窗 -->
    <div v-if="showClearModal" class="modal-mask" @click.self="closeClearModal">
      <div class="modal-box" role="dialog" aria-modal="true" aria-label="清空清单确认">
        <h3 class="modal-title">清空清单</h3>
        <p class="modal-desc">确定清空当前统计清单吗？清空后不可恢复。</p>
        <div class="modal-footer">
          <button class="modal-cancel-btn" @click="closeClearModal">取消</button>
          <button class="modal-confirm-btn danger" @click="confirmClearEntries">确认清空</button>
        </div>
      </div>
    </div>

    <!-- Toast 提示（共享组件，自管定时器） -->
    <AppToast ref="toast" />
  </div>
</template>

<script>
import { searchAndRankEquipment, sortByPanelTension, EQUIPMENT_SEARCH_FIELDS } from '../utils/search.js'
import { getRatingAlias } from '../constants/equipment.js'
import { formatPrice as formatPriceDisplay, parsePrice } from '../utils/display.js'
import { loadRodAndReelData } from '../utils/equipmentLoader.js'
import AppToast from './common/AppToast.vue'
import EquipmentRecognition from './EquipmentRecognition.vue'
import { lockScroll, bindEscape } from '../utils/modal.js'

export default {
  name: 'ValuePage',
  components: {
    AppToast,
    EquipmentRecognition
  },
  data() {
    return {
      rodList: [],
      reelList: [],
      rodEntries: [],
      reelEntries: [],
      showClearModal: false,
      entriesReady: false,
      entrySaveTimer: null,
      escOff: null
    }
  },
  computed: {
    rodTotalSilver() {
      return this.rodEntries.reduce((sum, entry) => {
        return sum + (entry.equipment ? (parsePrice(entry.equipment.silverPrice) ?? 0) * entry.quantity : 0)
      }, 0)
    },
    rodTotalGold() {
      return this.rodEntries.reduce((sum, entry) => {
        return sum + (entry.equipment ? (parsePrice(entry.equipment.goldPrice) ?? 0) * entry.quantity : 0)
      }, 0)
    },
    reelTotalSilver() {
      return this.reelEntries.reduce((sum, entry) => {
        return sum + (entry.equipment ? (parsePrice(entry.equipment.silverPrice) ?? 0) * entry.quantity : 0)
      }, 0)
    },
    reelTotalGold() {
      return this.reelEntries.reduce((sum, entry) => {
        return sum + (entry.equipment ? (parsePrice(entry.equipment.goldPrice) ?? 0) * entry.quantity : 0)
      }, 0)
    },
    totalSilver() {
      return this.rodTotalSilver + this.reelTotalSilver
    },
    totalGold() {
      return this.rodTotalGold + this.reelTotalGold
    },
    totalItems() {
      return [...this.rodEntries, ...this.reelEntries].reduce(
        (sum, e) => sum + (e.equipment ? (e.quantity || 1) : 0), 0
      )
    }
  },
  watch: {
    // 清单持久化：装备/数量变化后防抖写入 localStorage，刷新不丢
    rodEntries: {
      deep: true,
      handler() {
        this.scheduleSaveEntries()
      }
    },
    reelEntries: {
      deep: true,
      handler() {
        this.scheduleSaveEntries()
      }
    }
  },
  async mounted() {
    await Promise.all([this.loadRods(), this.loadReels()])
    this.entriesReady = true

    // 优先从分享链接恢复，其次从本地存储恢复
    if (!this.restoreFromShareUrl()) {
      this.restoreEntries()
    }

    this.$watch('showClearModal', (val) => {
      if (val) {
        lockScroll(true)
        this.escOff = bindEscape(this.closeClearModal)
      } else {
        lockScroll(false)
        if (this.escOff) {
          this.escOff()
          this.escOff = null
        }
      }
    })
  },
  beforeUnmount() {
    // 清理所有 entry 的搜索防抖计时器
    for (const entry of this.rodEntries) {
      if (entry.searchTimer) clearTimeout(entry.searchTimer)
    }
    for (const entry of this.reelEntries) {
      if (entry.searchTimer) clearTimeout(entry.searchTimer)
    }
    if (this.entrySaveTimer) clearTimeout(this.entrySaveTimer)
    if (this.escOff) {
      this.escOff()
      this.escOff = null
    }
    if (this.showClearModal) lockScroll(false)
  },
  methods: {
    getRatingAlias,
    /** 数量步进（最小 1） */
    stepQuantity(entry, delta) {
      entry.quantity = Math.max(1, (Number(entry.quantity) || 1) + delta)
    },
    /** 构建 entry，支持预填装备与数量（恢复清单用） */
    createEntry(equipment, quantity) {
      return {
        equipment: equipment || null,
        quantity: quantity || 1,
        search: equipment ? equipment.model : '',
        debouncedSearch: '',
        searchTimer: null,
        isDropdownOpen: false,
        selectedCategory: '',
        showCategoryFilter: false
      }
    },
    /** 防抖持久化清单（只存型号与数量，恢复时重新匹配） */
    scheduleSaveEntries() {
      if (!this.entriesReady) return
      if (this.entrySaveTimer) clearTimeout(this.entrySaveTimer)
      this.entrySaveTimer = setTimeout(() => {
        try {
          const payload = {
            rods: this.rodEntries.filter(e => e.equipment).map(e => ({ model: e.equipment.model || e.equipment.equipmentName, quantity: e.quantity || 1 })),
            reels: this.reelEntries.filter(e => e.equipment).map(e => ({ model: e.equipment.model || e.equipment.equipmentName, quantity: e.quantity || 1 }))
          }
          localStorage.setItem('value_list_v1', JSON.stringify(payload))
        } catch (e) { /* 存储不可用时静默降级 */ }
      }, 300)
    },
    /** 恢复上次统计清单 */
    restoreEntries() {
      try {
        const raw = localStorage.getItem('value_list_v1')
        if (!raw) return
        const payload = JSON.parse(raw)
        for (const saved of payload.rods || []) {
          const item = this.rodList.find(d => d.model === saved.model || d.equipmentName === saved.model)
          if (item) this.rodEntries.push(this.createEntry(item, saved.quantity))
        }
        for (const saved of payload.reels || []) {
          const item = this.reelList.find(d => d.model === saved.model || d.equipmentName === saved.model)
          if (item) this.reelEntries.push(this.createEntry(item, saved.quantity))
        }
      } catch (e) {
        console.error('恢复价值清单失败:', e)
      }
    },
    /** 清空整个清单：先弹出二次确认弹窗 */
    clearAllEntries() {
      if (this.rodEntries.length === 0 && this.reelEntries.length === 0) {
        this.showToast('清单已是空的', 'info')
        return
      }
      this.showClearModal = true
    },
    closeClearModal() {
      this.showClearModal = false
    },
    confirmClearEntries() {
      this.rodEntries = []
      this.reelEntries = []
      this.closeClearModal()
      this.showToast('清单已清空', 'success')
    },
    showToast(message, type = 'info') {
      this.$refs.toast.show(message, type)
    },
    /** 生成分享链接：清单编码进 URL 参数 vl */
    buildShareUrl() {
      const payload = {
        r: this.rodEntries.filter(e => e.equipment).map(e => [e.equipment.model || e.equipment.equipmentName, e.quantity || 1]),
        l: this.reelEntries.filter(e => e.equipment).map(e => [e.equipment.model || e.equipment.equipmentName, e.quantity || 1])
      }
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      return `${window.location.origin}${window.location.pathname}?vl=${encoded}`
    },
    /** 复制分享链接到剪贴板 */
    async copyShareLink() {
      try {
        await navigator.clipboard.writeText(this.buildShareUrl())
        this.showToast('分享链接已复制', 'success')
      } catch (_) {
        this.showToast('复制失败，请手动复制', 'error')
      }
    },
    /** 从分享链接恢复清单（成功后清除 URL 参数），无参数返回 false */
    restoreFromShareUrl() {
      try {
        const params = new URLSearchParams(window.location.search)
        const encoded = params.get('vl')
        if (!encoded) return false
        const json = decodeURIComponent(escape(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))))
        const payload = JSON.parse(json)
        this.rodEntries = []
        this.reelEntries = []
        for (const [model, qty] of payload.r || []) {
          const item = this.rodList.find(d => d.model === model || d.equipmentName === model)
          if (item) this.rodEntries.push(this.createEntry(item, qty))
        }
        for (const [model, qty] of payload.l || []) {
          const item = this.reelList.find(d => d.model === model || d.equipmentName === model)
          if (item) this.reelEntries.push(this.createEntry(item, qty))
        }
        window.history.replaceState({}, '', window.location.pathname)
        return true
      } catch (e) {
        console.error('恢复分享清单失败:', e)
        return false
      }
    },
    /** 复制清单文本到剪贴板 */
    async copyList() {
      const lines = ['RF4 装备价值清单', '─'.repeat(30)]
      const pushEntries = (label, entries) => {
        for (const e of entries) {
          if (!e.equipment) continue
          const silver = (parsePrice(e.equipment.silverPrice) ?? 0) * (e.quantity || 1)
          lines.push(`${label} ${e.equipment.model || e.equipment.equipmentName} ×${e.quantity || 1} = ${this.formatPrice(silver)} 银币`)
        }
      }
      pushEntries('鱼竿', this.rodEntries)
      pushEntries('渔轮', this.reelEntries)
      lines.push('─'.repeat(30))
      lines.push(`共 ${this.totalItems} 件，总计 ${this.formatPrice(this.totalSilver)} 银币 / ${this.formatPrice(this.totalGold)} 金币`)
      try {
        await navigator.clipboard.writeText(lines.join('\n'))
        this.showToast('清单已复制到剪贴板', 'success')
      } catch (_) {
        this.showToast('复制失败，请手动复制', 'error')
      }
    },
    async loadRods() {
      try {
        const { rodData } = await loadRodAndReelData()
        this.rodList = rodData
      } catch (e) { console.error('加载鱼竿失败:', e) }
    },
    async loadReels() {
      try {
        const { reelData } = await loadRodAndReelData()
        this.reelList = reelData
      } catch (e) { console.error('加载渔轮失败:', e) }
    },
    getRodCategoryOptions() {
      if (!Array.isArray(this.rodList)) return []
      const categories = [...new Set(this.rodList.map(item => item.form))].filter(Boolean)
      return ['全部', ...categories]
    },
    getReelCategoryOptions() {
      if (!Array.isArray(this.reelList)) return []
      const categories = [...new Set(this.reelList.map(item => item.form))].filter(Boolean)
      return ['全部', ...categories]
    },
    getFilteredRodList(entry) {
      if (!Array.isArray(this.rodList)) return []
      let filtered = this.rodList

      if (entry.selectedCategory && entry.selectedCategory !== '全部') {
        filtered = filtered.filter(item => item.form === entry.selectedCategory)
      }

      if (entry.debouncedSearch && entry.debouncedSearch.trim()) {
        filtered = searchAndRankEquipment(filtered, entry.debouncedSearch, EQUIPMENT_SEARCH_FIELDS)
      } else {
        filtered = sortByPanelTension(filtered)
      }

      return filtered
    },
    getFilteredReelList(entry) {
      if (!Array.isArray(this.reelList)) return []
      let filtered = this.reelList

      if (entry.selectedCategory && entry.selectedCategory !== '全部') {
        filtered = filtered.filter(item => item.form === entry.selectedCategory)
      }

      if (entry.debouncedSearch && entry.debouncedSearch.trim()) {
        filtered = searchAndRankEquipment(filtered, entry.debouncedSearch, EQUIPMENT_SEARCH_FIELDS)
      } else {
        filtered = sortByPanelTension(filtered)
      }

      return filtered
    },
    addRodEntry() {
      this.rodEntries.push({
        equipment: null,
        quantity: 1,
        search: '',
        debouncedSearch: '',
        searchTimer: null,
        isDropdownOpen: false,
        selectedCategory: '',
        showCategoryFilter: false
      })
    },
    addReelEntry() {
      this.reelEntries.push({
        equipment: null,
        quantity: 1,
        search: '',
        debouncedSearch: '',
        searchTimer: null,
        isDropdownOpen: false,
        selectedCategory: '',
        showCategoryFilter: false
      })
    },
    removeRodEntry(index) {
      this.rodEntries.splice(index, 1)
    },
    removeReelEntry(index) {
      this.reelEntries.splice(index, 1)
    },
    selectEquipment(index, type, equipment, entry) {
      if (type === 'rod') {
        this.rodEntries[index].equipment = equipment
        this.rodEntries[index].search = equipment.model
      } else {
        this.reelEntries[index].equipment = equipment
        this.reelEntries[index].search = equipment.model
      }
      entry.isDropdownOpen = false
    },
    onSearchInput(entry) {
      if (entry.searchTimer) clearTimeout(entry.searchTimer)
      entry.searchTimer = setTimeout(() => {
        entry.debouncedSearch = entry.search
      }, 200)
    },
    onSearchBlur(entry, _type, _index) {
      // 延迟关闭，让点击事件先触发
      setTimeout(() => {
        entry.isDropdownOpen = false
        // 如果已选择装备，恢复显示model
        if (entry.equipment) {
          entry.search = entry.equipment.model
        }
      }, 200)
    },
    onRecognizedAdd({ type, equipment, quantity }) {
      const list = type === 'rod' ? this.rodEntries : this.reelEntries
      const existing = list.find(
        (e) => e.equipment && (e.equipment.model === equipment.model || e.equipment.equipmentName === equipment.equipmentName)
      )
      if (existing) {
        existing.quantity = Math.max(1, (Number(existing.quantity) || 1) + (Number(quantity) || 1))
        this.showToast(`${equipment.model} 数量已累加`, 'success')
      } else {
        list.push(this.createEntry(equipment, quantity))
        this.showToast(`${equipment.model} 已加入清单`, 'success')
      }
    },
    formatPrice(price) {
      return formatPriceDisplay(price)
    },
    parsePrice
  }
}
</script>

<style scoped>
.value-page {
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 22px;
  color: var(--text-main);
}

.back-btn {
  padding: 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.back-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.equipment-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-main);
}

.add-btn {
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.add-btn:hover {
  background: var(--color-primary);
  color: #fff;
}

.entry-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 8px;
  background: var(--bg-secondary);
}

.search-dropdown {
  position: relative;
  flex: 1;
  min-width: 260px;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 32px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--text-main);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--color-primary);
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-hint);
}

.selected-tags {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.tag-type,
.tag-rating {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.tag-rating {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.category-filter-header {
  margin-top: 6px;
}

.category-toggle-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.category-filter-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  padding: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.category-filter-btn {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.category-filter-btn:hover,
.category-filter-btn.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.dropdown-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  max-height: 240px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dropdown-item {
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--color-divider);
  font-size: 13px;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: var(--color-primary-bg);
}

.dropdown-name {
  flex: 1;
  font-weight: 500;
  color: var(--text-main);
}

.dropdown-type {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-size: 12px;
}

.dropdown-category,
.dropdown-rating {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
}

.dropdown-category {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.dropdown-rating {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.dropdown-empty {
  padding: 12px;
  text-align: center;
  color: var(--text-hint);
  font-size: 13px;
}

.quantity-input-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.quantity-input-wrapper label {
  font-size: 13px;
  color: var(--text-secondary);
}

.qty-step-btn {
  width: 26px;
  height: 26px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-main);
  font-size: 16px;
  line-height: 1;
}

.qty-step-btn:disabled {
  color: var(--text-hint);
  cursor: not-allowed;
}

.quantity-input {
  width: 50px;
  padding: 4px 6px;
  text-align: center;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--text-main);
  font-size: 14px;
}

.entry-subtotal {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 110px;
  flex-shrink: 0;
}

.subtotal-silver {
  font-weight: 600;
  color: var(--color-primary);
  font-size: 14px;
}

.subtotal-gold {
  color: var(--color-warning-strong);
  font-size: 13px;
}

.subtotal-placeholder {
  color: var(--text-hint);
  font-size: 14px;
}

.remove-entry-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-hint);
  cursor: pointer;
  font-size: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}

.remove-entry-btn:hover {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

.empty-hint {
  text-align: center;
  padding: 24px;
  color: var(--text-hint);
  font-size: 14px;
}

.value-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.summary-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.total-card {
  border-color: var(--color-primary);
  background: var(--color-total-bg);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.summary-value {
  font-size: 16px;
  font-weight: 700;
}

.summary-value.silver {
  color: var(--color-primary);
}

.summary-value.gold {
  color: var(--color-warning-strong);
}

.summary-value.total {
  font-size: 18px;
}

.summary-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.summary-action-btn {
  padding: 10px 18px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.summary-action-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.summary-action-btn.danger {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.summary-action-btn.danger:hover {
  background: var(--color-danger);
  color: white;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-box {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 20px;
  width: 90%;
  max-width: 380px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.modal-title {
  margin: 0 0 12px;
  font-size: 18px;
  color: var(--text-main);
}

.modal-desc {
  color: var(--text-secondary);
  margin-bottom: 20px;
  font-size: 14px;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-cancel-btn,
.modal-confirm-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.modal-cancel-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--text-secondary);
}

.modal-confirm-btn {
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: white;
}

.modal-confirm-btn.danger {
  border-color: var(--color-danger);
  background: var(--color-danger);
  color: white;
}

.modal-confirm-btn:hover {
  opacity: 0.9;
}

/* 深色主题下筛选激活态保持白字可读 */
::v-deep(:root[data-theme="dark"]) .category-filter-btn.active {
  background-color: var(--color-success);
  border-color: var(--color-success);
  color: var(--color-surface);
}

@media (max-width: 720px) {
  .entry-row {
    flex-wrap: wrap;
  }

  .search-dropdown {
    width: 100%;
    min-width: auto;
  }

  .quantity-input-wrapper,
  .entry-subtotal,
  .remove-entry-btn {
    flex: 1;
    justify-content: center;
  }

  .summary-actions {
    justify-content: center;
  }
}
</style>
