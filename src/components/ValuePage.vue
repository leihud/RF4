<template>
  <div class="value-page">
    <div class="page-header">
      <h1>装备价值统计</h1>
      <button class="back-btn" @click="$router.back()">← 返回计算器</button>
    </div>

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
import { lockScroll, bindEscape } from '../utils/modal.js'

export default {
  name: 'ValuePage',
  components: {
    AppToast
  },
  data() {
    return {
      rodList: [],
      reelList: [],
      rodEntries: [],
      reelEntries: [],
      showClearModal: false
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
    /** 清单总件数（按数量累加） */
    totalItems() {
      return [...this.rodEntries, ...this.reelEntries].reduce(
        (sum, e) => sum + (e.equipment ? (e.quantity || 1) : 0), 0
      )
    }
  },
  async mounted() {
    await Promise.all([this.loadRods(), this.loadReels()])
    // 优先从分享链接恢复，其次恢复上次本地清单，再开启持久化
    if (!this.restoreFromShareUrl()) {
      this.restoreEntries()
    }
    this._entriesReady = true
  },
  watch: {
    // 清单持久化：装备/数量变化后防抖写入 localStorage，刷新不丢
    rodEntries: {
      deep: true,
      handler() { this.scheduleSaveEntries() }
    },
    reelEntries: {
      deep: true,
      handler() { this.scheduleSaveEntries() }
    },
    // 清空确认弹窗：打开锁定 body 滚动并支持 Esc 关闭
    showClearModal(open) {
      if (open) {
        lockScroll(true)
        this._escOff = bindEscape(this.closeClearModal)
      } else {
        lockScroll(false)
        if (this._escOff) {
          this._escOff()
          this._escOff = null
        }
      }
    }
  },
  beforeUnmount() {
    // 清理所有 entry 的搜索防抖计时器
    for (const entry of this.rodEntries) {
      if (entry.searchTimer) clearTimeout(entry.searchTimer)
    }
    for (const entry of this.reelEntries) {
      if (entry.searchTimer) clearTimeout(entry.searchTimer)
    }
    if (this._entrySaveTimer) clearTimeout(this._entrySaveTimer)
    if (this._escOff) {
      this._escOff()
      this._escOff = null
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
      if (!this._entriesReady) return
      if (this._entrySaveTimer) clearTimeout(this._entrySaveTimer)
      this._entrySaveTimer = setTimeout(() => {
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
    formatPrice(price) {
      return formatPriceDisplay(price)
    },
    parsePrice
  }
}
</script>

<style scoped>
.value-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 30px;
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  color: var(--text-main);
  margin: 0;
}

.back-btn {
  padding: 8px 16px;
  border: 1px solid var(--color-primary);
  background-color: var(--color-surface);
  color: var(--color-primary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.back-btn:hover {
  background-color: var(--color-primary-bg);
}

.equipment-section {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 18px;
  color: var(--text-main);
  margin: 0;
}

.add-btn {
  padding: 8px 16px;
  border: 1px solid var(--color-success-strong);
  background-color: var(--color-surface);
  color: var(--color-success-strong);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.add-btn:hover {
  background-color: var(--color-success-bg);
}

.entry-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  align-items: center;
}

.entry-row:last-child {
  margin-bottom: 0;
}

.search-dropdown {
  position: relative;
  flex: 1;
  min-width: 0;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.selected-tags {
  display: flex;
  gap: 6px;
  margin-left: 8px;
  flex-shrink: 0;
}

.tag-type {
  padding: 3px 10px;
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
  border: 1px solid var(--color-primary-light);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.tag-rating {
  padding: 3px 10px;
  background-color: var(--color-success-bg-light);
  color: var(--color-success-text);
  border: 1px solid var(--color-success-border);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  border: 1px solid var(--color-success-accent);
  border-radius: 4px;
  font-size: 14px;
  color: var(--text-heading);
  background-color: var(--color-surface);
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.3);
}

.search-input::placeholder {
  color: var(--text-hint);
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
  background-color: var(--color-success-bg-light);
  border-bottom: 1px solid var(--color-success-border);
}

.category-toggle-btn {
  padding: 4px 12px;
  border: none;
  background-color: transparent;
  color: var(--color-success-text);
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.category-toggle-btn:hover {
  color: var(--color-success-strong);
}

.category-filter-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 15px;
  background-color: var(--color-success-bg-light);
  border-bottom: 1px solid var(--color-success-border);
}

.category-filter-btn {
  padding: 4px 12px;
  border: 1px solid var(--color-success-border);
  background-color: var(--color-surface);
  color: var(--color-success-text);
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-filter-btn:hover {
  background-color: var(--color-success-border);
}

.category-filter-btn.active {
  background-color: var(--color-success-strong);
  color: white;
  border-color: var(--color-success-strong);
}

.dropdown-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
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
  border-bottom: 1px solid var(--bg-page);
  transition: background-color 0.2s;
  gap: 18px;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: var(--color-success-bg);
}

.dropdown-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-heading);
  line-height: 1.4;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.dropdown-type {
  flex: 0 0 80px;
  padding: 4px 12px;
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
  border: 1px solid var(--color-primary-light);
  border-radius: 14px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-category {
  flex: 0 0 80px;
  padding: 4px 12px;
  background-color: var(--color-success-bg-light);
  color: var(--color-success-text);
  border: 1px solid var(--color-success-border);
  border-radius: 14px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-rating {
  flex: 0 0 80px;
  padding: 4px 12px;
  background-color: var(--color-warning-bg-light);
  color: var(--color-warning-strong);
  border: 1px solid var(--color-warning-border);
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
  color: var(--text-hint);
  font-size: 14px;
}

.quantity-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  flex-shrink: 0;
}

.quantity-input-wrapper label {
  color: var(--text-secondary);
  font-size: 14px;
  white-space: nowrap;
}

.quantity-input {
  width: 60px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
}

.quantity-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.entry-subtotal {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 150px;
  flex-shrink: 0;
}

.subtotal-silver {
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 600;
}

.subtotal-gold {
  color: var(--color-warning);
  font-size: 13px;
  font-weight: 600;
}

.subtotal-placeholder {
  color: var(--color-border-light);
  font-size: 13px;
  min-height: 18px;
}

.remove-entry-btn {
  padding: 6px 10px;
  border: 1px solid var(--color-danger);
  background-color: var(--color-surface);
  color: var(--color-danger);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.remove-entry-btn:hover {
  background-color: var(--color-danger);
  color: white;
}

.empty-hint {
  text-align: center;
  color: var(--text-hint);
  padding: 20px;
  font-size: 14px;
}

.value-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  /* 底部固定汇总条：滚动时始终可见总价 */
  position: sticky;
  bottom: 0;
  z-index: 20;
  background-color: var(--bg-page);
  padding: 10px 0;
  flex-wrap: wrap;
}

.summary-card {
  flex: 1;
  background: var(--color-surface);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.total-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.total-card .summary-label {
  color: rgba(255, 255, 255, 0.9);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
}

.summary-value.silver {
  color: var(--color-primary);
}

.summary-value.gold {
  color: var(--color-warning);
}

.summary-value.total {
  font-size: 20px;
}

.total-card .summary-value.silver,
.total-card .summary-value.gold {
  color: white;
}

@media (max-width: 768px) {
  .entry-row {
    flex-wrap: wrap;
  }

  .search-dropdown {
    min-width: 100%;
  }

  .quantity-input-wrapper {
    min-width: auto;
  }

  .entry-subtotal {
    min-width: auto;
    flex-direction: row;
    gap: 12px;
  }

  .value-summary {
    flex-direction: column;
  }
}

/* 数量步进按钮 */
.qty-step-btn {
  width: 26px;
  height: 26px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--text-main);
  border-radius: 6px;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.qty-step-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.qty-step-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 清单操作区 */
.summary-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.summary-action-btn {
  padding: 8px 16px;
  border: 1px solid var(--color-primary);
  background: var(--color-surface);
  color: var(--color-primary);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.summary-action-btn:hover {
  background: var(--color-primary);
  color: white;
}

.summary-action-btn.danger {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.summary-action-btn.danger:hover {
  background: var(--color-danger);
  color: white;
}

/* 清空确认弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 16px;
}

.modal-box {
  background: var(--color-surface);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  max-width: 400px;
  width: 100%;
  padding: 24px 28px;
  animation: value-modal-in 0.2s ease;
}

@keyframes value-modal-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-title {
  font-size: 17px;
  color: var(--text-main);
  margin-bottom: 12px;
}

.modal-desc {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-cancel-btn,
.modal-confirm-btn {
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-cancel-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--text-secondary);
}

.modal-cancel-btn:hover {
  background: var(--bg-secondary);
}

.modal-confirm-btn {
  border: 1px solid var(--color-danger);
  background: var(--color-danger);
  color: white;
}

.modal-confirm-btn:hover {
  opacity: 0.9;
}

/* 深色主题下筛选激活态保持白字可读 */
:root[data-theme="dark"] .category-filter-btn.active {
  background-color: var(--color-success);
  border-color: var(--color-success);
}
</style>
