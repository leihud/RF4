<template>
  <div class="builds-list-page">
    <div class="page-header">
      <h1>装备方案汇总</h1>
      <button class="back-btn" @click="$router.back()">← 返回计算器</button>
    </div>

    <!-- 搜索过滤区域 -->
    <div class="search-section">
      <div class="search-row">
        <input
          v-model="searchInput"
          @input="onSearchInput"
          type="text"
          class="search-input"
          placeholder="搜索方案名称..."
        />
        <!-- 鱼竿多选 -->
        <div class="multi-select-wrapper" ref="rodWrapper">
          <div class="multi-select-trigger" @click="toggleDropdown('rod')">
            <span v-if="searchQuery.rod.length === 0" class="placeholder-text">选择鱼竿...</span>
            <span v-else class="selected-count">{{ searchQuery.rod.length }} 个鱼竿</span>
            <span class="dropdown-arrow">{{ showDropdown === 'rod' ? '▲' : '▼' }}</span>
          </div>
          <div v-if="showDropdown === 'rod'" class="multi-select-dropdown">
            <input v-model="rodSearch" type="text" class="dropdown-search" placeholder="搜索鱼竿..." @click.stop />
            <div class="dropdown-list">
              <div v-for="rod in filteredRodList" :key="rod.model || rod.equipmentName" class="dropdown-item" :class="{ selected: searchQuery.rod.includes(rod.equipmentName || rod.model) }" @click.stop="toggleMultiSelect('rod', rod.equipmentName || rod.model)">
                <span class="checkbox-icon">{{ searchQuery.rod.includes(rod.equipmentName || rod.model) ? '☑' : '☐' }}</span>
                <span class="item-text">{{ rod.model }}</span>
                <span class="item-category">{{ rod.form || rod.category }}</span>
                <span v-if="rod.ratingAlias && rod.ratingAlias !== '常规'" class="item-rating">{{ rod.ratingAlias }}</span>
              </div>
            </div>
          </div>
        </div>
        <!-- 渔轮多选 -->
        <div class="multi-select-wrapper" ref="reelWrapper">
          <div class="multi-select-trigger" @click="toggleDropdown('reel')">
            <span v-if="searchQuery.reel.length === 0" class="placeholder-text">选择渔轮...</span>
            <span v-else class="selected-count">{{ searchQuery.reel.length }} 个渔轮</span>
            <span class="dropdown-arrow">{{ showDropdown === 'reel' ? '▲' : '▼' }}</span>
          </div>
          <div v-if="showDropdown === 'reel'" class="multi-select-dropdown">
            <input v-model="reelSearch" type="text" class="dropdown-search" placeholder="搜索渔轮..." @click.stop />
            <div class="dropdown-list">
              <div v-for="reel in filteredReelList" :key="reel.model || reel.equipmentName" class="dropdown-item" :class="{ selected: searchQuery.reel.includes(reel.equipmentName || reel.model) }" @click.stop="toggleMultiSelect('reel', reel.equipmentName || reel.model)">
                <span class="checkbox-icon">{{ searchQuery.reel.includes(reel.equipmentName || reel.model) ? '☑' : '☐' }}</span>
                <span class="item-text">{{ reel.model }}</span>
                <span class="item-category">{{ reel.form || reel.category }}</span>
                <span v-if="reel.ratingAlias && reel.ratingAlias !== '常规'" class="item-rating">{{ reel.ratingAlias }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="search-row">
        <!-- 鱼种多选 -->
        <div class="multi-select-wrapper" ref="fishWrapper">
          <div class="multi-select-trigger" @click="toggleDropdown('fish')">
            <span v-if="searchQuery.fish.length === 0" class="placeholder-text">选择鱼种...</span>
            <span v-else class="selected-count">{{ searchQuery.fish.length }} 个鱼种</span>
            <span class="dropdown-arrow">{{ showDropdown === 'fish' ? '▲' : '▼' }}</span>
          </div>
          <div v-if="showDropdown === 'fish'" class="multi-select-dropdown">
            <input v-model="fishSearch" type="text" class="dropdown-search" placeholder="搜索鱼种..." @click.stop />
            <div class="dropdown-list">
              <div v-for="fish in filteredFishList" :key="fish.display_name" class="dropdown-item" :class="{ selected: searchQuery.fish.includes(fish.display_name) }" @click.stop="toggleMultiSelect('fish', fish.display_name)">
                <span class="checkbox-icon">{{ searchQuery.fish.includes(fish.display_name) ? '☑' : '☐' }}</span>
                <span class="item-text">{{ fish.display_name }}</span>
              </div>
            </div>
          </div>
        </div>
        <!-- 地图多选 -->
        <div class="multi-select-wrapper" ref="mapWrapper">
          <div class="multi-select-trigger" @click="toggleDropdown('map')">
            <span v-if="searchQuery.map.length === 0" class="placeholder-text">选择地图...</span>
            <span v-else class="selected-count">{{ searchQuery.map.length }} 张地图</span>
            <span class="dropdown-arrow">{{ showDropdown === 'map' ? '▲' : '▼' }}</span>
          </div>
          <div v-if="showDropdown === 'map'" class="multi-select-dropdown">
            <input v-model="mapSearch" type="text" class="dropdown-search" placeholder="搜索地图..." @click.stop />
            <div class="dropdown-list">
              <div v-for="map in filteredMapList" :key="map.display_name" class="dropdown-item" :class="{ selected: searchQuery.map.includes(map.display_name) }" @click.stop="toggleMultiSelect('map', map.display_name)">
                <span class="checkbox-icon">{{ searchQuery.map.includes(map.display_name) ? '☑' : '☐' }}</span>
                <span class="item-text">{{ map.display_name }}</span>
              </div>
            </div>
          </div>
        </div>
        <select v-model="sortBy" class="sort-select">
          <option value="newest">最新优先</option>
          <option value="popular">最热优先</option>
          <option value="oldest">最早优先</option>
          <option value="name">按名称排序</option>
          <option value="price">按总价排序</option>
        </select>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-info">
      共找到 {{ filteredBuilds.length }} 个方案
    </div>

    <!-- 加载骨架屏 -->
    <div v-if="isLoading" class="skeleton-container">
      <div v-for="i in 3" :key="i" class="skeleton-card">
        <div class="skeleton-header">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-meta"></div>
        </div>
        <div class="skeleton-body">
          <div class="skeleton-line skeleton-chip"></div>
          <div class="skeleton-line skeleton-chip"></div>
          <div class="skeleton-line skeleton-chip"></div>
        </div>
      </div>
    </div>

    <!-- 方案列表 -->
    <div v-else class="builds-container">
      <div 
        v-for="build in filteredBuilds" 
        :key="build.id"
        class="build-card"
        :class="{ expanded: expandedIndex === build.id }"
      >
        <div class="build-header" @click="toggleExpand(build.id)">
          <div class="build-title">
            <span class="expand-icon">{{ expandedIndex === build.id ? '▼' : '▶' }}</span>
            <span class="build-name">{{ build.name || '未命名方案' }}</span>
          </div>
          <div class="build-meta">
            <span v-if="!build.is_approved" class="meta-item pending-tag" :class="{ rejected: build.reject_reason }" :title="build.reject_reason ? '驳回原因：' + build.reject_reason : '待审核'">{{ build.reject_reason ? '已驳回' : '待审核' }}</span>
            <span class="meta-item">🎣 {{ getFishCount(build.suitable_fish) }} 种鱼</span>
            <span class="meta-item">️ {{ getMapCount(build.suitable_map) }} 张地图</span>
            <span class="meta-item"> {{ formatDate(build.created_at) }}</span>
            <button class="like-btn" :class="{ liked: isLiked(build.id) }" :title="isLiked(build.id) ? '取消点赞' : '点赞方案'" :aria-label="isLiked(build.id) ? '取消点赞' : '点赞方案'" @click.stop="toggleLike(build)">❤ {{ build.likes || 0 }}</button>
            <button class="img-btn" title="生成分享图片" aria-label="生成分享图片" @click.stop="generateBuildImage(build)">🖼</button>
            <button class="apply-btn" @click.stop="applyToCalculator(build)" title="在计算器中应用此方案">▶ 应用</button>
            <button v-if="isAdminMode" class="edit-btn" @click.stop="openEditModal(build)" title="编辑方案">✎ 编辑</button>
            <button v-if="isAdminMode" class="approve-btn" @click.stop="approveBuild(build)" :title="build.is_approved ? '取消审核' : '通过审核'">{{ build.is_approved ? '✓ 已审核' : '审核' }}</button>
            <button v-if="showDeleteBtn" class="delete-btn" @click.stop="deleteBuild(build)" title="删除方案">️</button>
          </div>
        </div>

        <div v-if="expandedIndex === build.id" class="build-details">
          <!-- 驳回原因（管理员驳回时填写，提交者可见） -->
          <div v-if="!build.is_approved && build.reject_reason" class="reject-reason">
            ⚠ 驳回原因：{{ build.reject_reason }}
          </div>
          <!-- 装备搭配 -->
          <div class="equipment-row">
            <div v-if="build.rod_model" class="equip-chip">
              <span class="equip-chip-label">鱼竿</span>
              <span class="equip-chip-value">{{ build.rod_model || build.rod_name }}</span>
              <span class="equip-chip-sub">{{ build.rod_category || '' }}</span>
            </div>
            <div v-if="build.reel_model" class="equip-chip">
              <span class="equip-chip-label">渔轮</span>
              <span class="equip-chip-value">{{ build.reel_model || build.reel_name }}</span>
              <span class="equip-chip-sub">{{ build.reel_category || '' }}</span>
            </div>
            <div v-if="build.main_line_tension > 0" class="equip-chip">
              <span class="equip-chip-label">主线</span>
              <span class="equip-chip-value">
                {{ build.main_line_material ? build.main_line_material : '' }}{{ build.main_line_tension }}kN
                <span class="equip-chip-sub" v-if="build.main_line_wear > 0">磨损{{ build.main_line_wear }}%</span>
                <span class="equip-chip-sub" v-if="build.main_line_diameter > 0">{{ build.main_line_diameter }}mm</span>
                <span class="equip-chip-sub" v-if="build.main_line_length > 0">{{ build.main_line_length }}m</span>
              </span>
            </div>
            <div v-if="build.leader_line_tension > 0" class="equip-chip">
              <span class="equip-chip-label">引线</span>
              <span class="equip-chip-value">
                {{ build.leader_line_material ? build.leader_line_material : '' }}{{ build.leader_line_tension }}kN
                <span class="equip-chip-sub" v-if="build.leader_line_wear > 0">磨损{{ build.leader_line_wear }}%</span>
                <span class="equip-chip-sub" v-if="build.leader_line_diameter > 0">{{ build.leader_line_diameter }}mm</span>
                <span class="equip-chip-sub" v-if="build.leader_line_length > 0">{{ build.leader_line_length }}cm</span>
              </span>
            </div>
            <div v-if="build.hook_name" class="equip-chip">
              <span class="equip-chip-label">鱼钩</span>
              <span class="equip-chip-value">{{ build.hook_name }}</span>
            </div>
          </div>

          <!-- 装备分析 -->
          <div class="analysis-row">
            <div class="analysis-stat">
              <span class="stat-label">鱼竿拉力</span>
              <span class="stat-value stat-tension">{{ build.rod_tension || 0 }} kN</span>
            </div>
            <div class="analysis-stat">
              <span class="stat-label">渔轮拉力</span>
              <span class="stat-value stat-tension">{{ build.reel_tension || 0 }} kN</span>
            </div>
            <div class="analysis-divider"></div>
            <div class="analysis-stat">
              <span class="stat-label">鱼竿</span>
              <span class="stat-value stat-price">{{ formatPrice(parsePrice(build.rod_price)) }}</span>
            </div>
            <div class="analysis-stat">
              <span class="stat-label">渔轮</span>
              <span class="stat-value stat-price">{{ formatPrice(parsePrice(build.reel_price)) }}</span>
            </div>
            <div class="analysis-stat analysis-total">
              <span class="stat-label">总计</span>
              <span class="stat-value stat-price stat-total">{{ formatPrice((parsePrice(build.rod_price) ?? 0) + (parsePrice(build.reel_price) ?? 0)) }}</span>
            </div>
          </div>

          <!-- 适用鱼种和地图 -->
          <div class="meta-row" v-if="build.suitable_fish || build.suitable_map || build.description">
            <div v-if="build.suitable_fish" class="meta-group">
              <span class="meta-label">鱼种</span>
              <div class="tags">
                <span v-for="(fish, i) in build.suitable_fish.split(',')" :key="i" class="tag tag-fish">
                  {{ fish.trim() }}
                </span>
              </div>
            </div>
            <div v-if="build.suitable_map" class="meta-group">
              <span class="meta-label">地图</span>
              <div class="tags">
                <span v-for="(map, i) in build.suitable_map.split(',')" :key="i" class="tag tag-map">
                  {{ map.trim() }}
                </span>
              </div>
            </div>
            <div v-if="build.description" class="meta-group meta-desc">
              <span class="meta-label">说明</span>
              <span class="meta-desc-text">{{ build.description }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页加载更多 -->
    <div v-if="hasMore && !isLoading" class="load-more-wrap">
      <button class="load-more-builds-btn" :disabled="isLoadingMore" @click="loadMoreBuilds">
        {{ isLoadingMore ? '加载中...' : '加载更多方案' }}
      </button>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredBuilds.length === 0" class="empty-state">
      <p>暂无匹配的装备方案</p>
    </div>

    <!-- 创建方案按钮（常驻） -->
    <div class="create-section">
      <button class="create-btn" @click="$router.push('/')">+ 创建新方案</button>
    </div>

    <!-- 编辑方案弹窗 -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
      <div class="edit-modal">
        <div class="modal-header">
          <h3>编辑方案</h3>
          <button class="modal-close" @click="closeEditModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>方案名称</label>
            <input v-model="editForm.name" type="text" class="form-input" placeholder="输入方案名称" />
          </div>
          <div class="form-group">
            <label>说明</label>
            <textarea v-model="editForm.description" class="form-textarea" placeholder="输入方案说明" rows="3"></textarea>
          </div>
          <!-- 鱼种和地图左右布局 -->
          <div class="form-row">
            <div class="form-group form-col">
              <label>适用鱼种（可多选）</label>
              <!-- 已选标签 -->
              <div v-if="editForm.suitable_fish.length" class="selected-tags">
                <span v-for="(fish, i) in editForm.suitable_fish" :key="i" class="selected-tag">
                  {{ fish }}
                  <span class="tag-remove" @click="toggleEditFishSelection(fish)">✕</span>
                </span>
              </div>
              <!-- 搜索框 -->
              <input v-model="editFishSearch" type="text" class="form-input" placeholder="输入鱼种名称搜索..." />
              <!-- 多选列表 -->
              <div class="multi-select-container">
                <div 
                  v-for="fish in filteredEditFishList" 
                  :key="fish.name"
                  class="multi-select-item"
                  :class="{ selected: editForm.suitable_fish.includes(fish.display_name) }"
                  @click="toggleEditFishSelection(fish.display_name)"
                >
                  <span class="checkbox-icon">{{ editForm.suitable_fish.includes(fish.display_name) ? '☑' : '☐' }}</span>
                  <span class="item-text">{{ fish.display_name }}</span>
                </div>
              </div>
              <span class="select-hint">已选择 {{ editForm.suitable_fish.length }} 个鱼种</span>
            </div>
            <div class="form-group form-col">
              <label>适用地图（可多选）</label>
              <!-- 已选标签 -->
              <div v-if="editForm.suitable_map.length" class="selected-tags">
                <span v-for="(map, i) in editForm.suitable_map" :key="i" class="selected-tag">
                  {{ map }}
                  <span class="tag-remove" @click="toggleEditMapSelection(map)">✕</span>
                </span>
              </div>
              <!-- 搜索框 -->
              <input v-model="editMapSearch" type="text" class="form-input" placeholder="输入地图名称搜索..." />
              <!-- 多选列表 -->
              <div class="multi-select-container">
                <div 
                  v-for="map in filteredEditMapList" 
                  :key="map.name"
                  class="multi-select-item"
                  :class="{ selected: editForm.suitable_map.includes(map.display_name) }"
                  @click="toggleEditMapSelection(map.display_name)"
                >
                  <span class="checkbox-icon">{{ editForm.suitable_map.includes(map.display_name) ? '☑' : '☐' }}</span>
                  <span class="item-text">{{ map.display_name }}</span>
                </div>
              </div>
              <span class="select-hint">已选择 {{ editForm.suitable_map.length }} 张地图</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeEditModal">取消</button>
          <button class="btn-save" @click="saveEditBuild" :disabled="isSaving">{{ isSaving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- Toast 提示（共享组件，自管定时器） -->
    <AppToast ref="toast" />
  </div>
</template>

<script>
import { searchAndRankEquipment, EQUIPMENT_SEARCH_FIELDS } from '../utils/search.js'
import { formatPrice as formatPriceDisplay, parsePrice } from '../utils/display.js'
import { loadRodAndReelData } from '../utils/equipmentLoader.js'
import AppToast from './common/AppToast.vue'

export default {
  name: 'BuildsListPage',
  components: {
    AppToast
  },
  data() {
    return {
      builds: [],
      searchQuery: {
        name: '',
        rod: [],
        reel: [],
        fish: [],
        map: []
      },
      sortBy: 'newest',
      expandedIndex: null,
      showDeleteBtn: false,
      isAdminMode: false,
      hKeyTimer: null,
      showDropdown: null,
      rodList: [],
      reelList: [],
      fishList: [],
      mapList: [],
      rodSearch: '',
      reelSearch: '',
      fishSearch: '',
      mapSearch: '',
      isLoading: false,
      searchInput: '',
      searchDebounceTimer: null,
      showEditModal: false,
      editForm: { id: null, name: '', description: '', suitable_fish: [], suitable_map: [] },
      editFishSearch: '',
      editMapSearch: '',
      isSaving: false,
      hasMore: false,
      isLoadingMore: false,
      BUILDS_PAGE_SIZE: 30,
      likedIds: []
    }
  },
  computed: {
    filteredRodList() {
      if (!this.rodSearch.trim()) return this.rodList
      return searchAndRankEquipment(this.rodList, this.rodSearch, EQUIPMENT_SEARCH_FIELDS)
    },
    filteredReelList() {
      if (!this.reelSearch.trim()) return this.reelList
      return searchAndRankEquipment(this.reelList, this.reelSearch, EQUIPMENT_SEARCH_FIELDS)
    },
    filteredFishList() {
      if (!this.fishSearch.trim()) return this.fishList
      return searchAndRankEquipment(this.fishList, this.fishSearch, ['display_name'])
    },
    filteredMapList() {
      if (!this.mapSearch.trim()) return this.mapList
      return searchAndRankEquipment(this.mapList, this.mapSearch, ['display_name'])
    },
    // 编辑弹窗鱼种过滤
    filteredEditFishList() {
      if (!this.editFishSearch.trim()) return this.fishList
      return searchAndRankEquipment(this.fishList, this.editFishSearch, ['display_name'])
    },
    // 编辑弹窗地图过滤
    filteredEditMapList() {
      if (!this.editMapSearch.trim()) return this.mapList
      return searchAndRankEquipment(this.mapList, this.editMapSearch, ['display_name'])
    },
    filteredBuilds() {
      let result = this.builds.filter(build => {
        const q = this.searchQuery
        const matchName = !q.name || (build.name && build.name.toLowerCase().includes(q.name.toLowerCase()))
        const matchRod = q.rod.length === 0 || q.rod.some(v =>
          (build.rod_name && build.rod_name.includes(v)) || (build.rod_model && build.rod_model.includes(v))
        )
        const matchReel = q.reel.length === 0 || q.reel.some(v =>
          (build.reel_name && build.reel_name.includes(v)) || (build.reel_model && build.reel_model.includes(v))
        )
        const matchFish = q.fish.length === 0 || q.fish.some(v =>
          build.suitable_fish && build.suitable_fish.includes(v)
        )
        const matchMap = q.map.length === 0 || q.map.some(v =>
          build.suitable_map && build.suitable_map.includes(v)
        )
        return matchName && matchRod && matchReel && matchFish && matchMap
      })

      // 排序
      if (this.sortBy === 'newest') {
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      } else if (this.sortBy === 'popular') {
        result.sort((a, b) => (b.likes || 0) - (a.likes || 0))
      } else if (this.sortBy === 'oldest') {
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      } else if (this.sortBy === 'name') {
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      } else if (this.sortBy === 'price') {
        result.sort((a, b) => this.buildTotalPrice(b) - this.buildTotalPrice(a))
      }

      return result
    }
  },
  async mounted() {
    // 筛选记忆：先恢复上次筛选条件再加载数据
    this.restoreFilters()
    // 恢复本地点赞记录与客户端指纹
    try {
      this.likedIds = JSON.parse(localStorage.getItem('build_liked_ids') || '[]')
    } catch (e) {
      this.likedIds = []
    }
    this.isLoading = true
    await Promise.all([
      this.loadBuilds(),
      this.loadRods(),
      this.loadReels(),
      this.loadFishSpecies(),
      this.loadMaps()
    ])
    this.isLoading = false
    document.addEventListener('keydown', this.handleKeyDown)
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown)
    document.removeEventListener('click', this.handleClickOutside)
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer)
    if (this.hKeyTimer) clearTimeout(this.hKeyTimer)
    if (this._filterSaveTimer) clearTimeout(this._filterSaveTimer)
  },
  watch: {
    // 筛选记忆：筛选条件/排序变化后防抖写入 localStorage
    searchQuery: {
      deep: true,
      handler() { this.scheduleSaveFilters() }
    },
    sortBy() { this.scheduleSaveFilters() },
    searchInput() { this.scheduleSaveFilters() }
  },
  methods: {
    async loadBuilds(append = false) {
      try {
        const params = new URLSearchParams()
        if (this.isAdminMode) params.set('admin', 'true')
        params.set('limit', String(this.BUILDS_PAGE_SIZE))
        params.set('offset', append ? String(this.builds.length) : '0')
        const response = await fetch(`/api/recommended_builds?${params.toString()}`)
        const result = await response.json()
        if (result.success && result.data) {
          this.builds = append ? this.builds.concat(result.data) : result.data
          this.hasMore = !!result.hasMore
        }
      } catch (error) {
        console.error('加载装备方案失败:', error)
        this.showToast('加载失败：' + error.message, 'error')
      }
    },
    /** 分页加载更多方案 */
    async loadMoreBuilds() {
      this.isLoadingMore = true
      await this.loadBuilds(true)
      this.isLoadingMore = false
    },
    /** 获取/生成客户端指纹（点赞去重用） */
    getOrCreateClientId() {
      let id = localStorage.getItem('rf4_client_id')
      if (!id) {
        id = 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
        try { localStorage.setItem('rf4_client_id', id) } catch (e) { /* 存储不可用时每次新生成 */ }
      }
      return id
    },
    isLiked(buildId) {
      return this.likedIds.includes(buildId)
    },
    /** 点赞/取消点赞：乐观更新 + 后端同步，失败不回滚（下次加载以后端为准） */
    async toggleLike(build) {
      const wasLiked = this.isLiked(build.id)
      build.likes = Math.max(0, (build.likes || 0) + (wasLiked ? -1 : 1))
      this.likedIds = wasLiked
        ? this.likedIds.filter(id => id !== build.id)
        : [...this.likedIds, build.id]
      try { localStorage.setItem('build_liked_ids', JSON.stringify(this.likedIds)) } catch (e) { /* 忽略 */ }
      try {
        await fetch('/api/recommended_builds/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: build.id, clientId: this.getOrCreateClientId(), unlike: wasLiked })
        })
      } catch (error) {
        console.error('点赞操作失败:', error)
      }
    },
    /** canvas 绘制方案分享图片并下载 */
    generateBuildImage(build) {
      const scale = 2
      const w = 640
      const h = 380
      const canvas = document.createElement('canvas')
      canvas.width = w * scale
      canvas.height = h * scale
      const ctx = canvas.getContext('2d')
      ctx.scale(scale, scale)
      // 背景与标题栏
      ctx.fillStyle = '#f0f7ff'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#1565c0'
      ctx.fillRect(0, 0, w, 54)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 20px Arial, sans-serif'
      ctx.fillText('RF4 装备方案', 20, 34)
      // 方案名
      ctx.fillStyle = '#2c3e50'
      ctx.font = 'bold 18px Arial, sans-serif'
      ctx.fillText(build.name || '未命名方案', 20, 88)
      // 内容行
      const fish = build.suitable_fish ? build.suitable_fish.split(',').filter(s => s.trim()).join('、') : '无'
      const maps = build.suitable_map ? build.suitable_map.split(',').filter(s => s.trim()).join('、') : '无'
      const total = (parsePrice(build.rod_price) || 0) + (parsePrice(build.reel_price) || 0)
      const rows = [
        ['鱼竿', `${build.rod_model || build.rod_name || '无'}（${build.rod_tension || 0} kN）`],
        ['渔轮', `${build.reel_model || build.reel_name || '无'}（${build.reel_tension || 0} kN）`],
        ['主线', build.main_line_tension > 0 ? `${build.main_line_material || ''}${build.main_line_tension}kN` : '无'],
        ['引线', build.leader_line_tension > 0 ? `${build.leader_line_material || ''}${build.leader_line_tension}kN` : '无'],
        ['适用鱼种', fish],
        ['适用地图', maps],
        ['总价', `${this.formatPrice(total)} 银币`]
      ]
      let y = 120
      for (const [label, value] of rows) {
        ctx.fillStyle = '#666666'
        ctx.font = '14px Arial, sans-serif'
        ctx.fillText(label, 20, y)
        ctx.fillStyle = '#333333'
        ctx.font = 'bold 14px Arial, sans-serif'
        let text = String(value)
        while (ctx.measureText(text).width > w - 150 && text.length > 1) text = text.slice(0, -1)
        if (text !== String(value)) text += '…'
        ctx.fillText(text, 110, y)
        y += 30
      }
      // 页脚水印 + 下载
      ctx.fillStyle = '#999999'
      ctx.font = '12px Arial, sans-serif'
      ctx.fillText('由 RF4 装备计算器生成', 20, h - 16)
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `${(build.name || '装备方案').replace(/[\\/:*?"<>|]/g, '_')}.png`
      link.click()
      this.showToast('分享图片已生成并下载', 'success')
    },
    /** 方案总价（鱼竿 + 渔轮银价） */
    buildTotalPrice(build) {
      return (parsePrice(build.rod_price) || 0) + (parsePrice(build.reel_price) || 0)
    },
    /** 恢复上次筛选状态 */
    restoreFilters() {
      try {
        const raw = localStorage.getItem('builds_filters_v1')
        if (!raw) return
        const saved = JSON.parse(raw)
        if (typeof saved.searchInput === 'string') {
          this.searchInput = saved.searchInput
          this.searchQuery.name = saved.searchInput
        }
        if (saved.searchQuery) {
          for (const key of ['rod', 'reel', 'fish', 'map']) {
            if (Array.isArray(saved.searchQuery[key])) this.searchQuery[key] = saved.searchQuery[key]
          }
        }
        if (saved.sortBy) this.sortBy = saved.sortBy
      } catch (e) { /* 恢复失败时保持默认筛选 */ }
    },
    /** 防抖保存筛选状态 */
    scheduleSaveFilters() {
      if (this._filterSaveTimer) clearTimeout(this._filterSaveTimer)
      this._filterSaveTimer = setTimeout(() => {
        try {
          localStorage.setItem('builds_filters_v1', JSON.stringify({
            searchInput: this.searchInput,
            searchQuery: this.searchQuery,
            sortBy: this.sortBy
          }))
        } catch (e) { /* 存储不可用时静默降级 */ }
      }, 300)
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
    async loadFishSpecies() {
      try {
        const res = await fetch('/api/fish_species')
        const result = await res.json()
        this.fishList = Array.isArray(result) ? result : (result.data || [])
      } catch (e) { console.error('加载鱼种失败:', e) }
    },
    async loadMaps() {
      try {
        const res = await fetch('/api/maps')
        const result = await res.json()
        this.mapList = Array.isArray(result) ? result : (result.data || [])
      } catch (e) { console.error('加载地图失败:', e) }
    },
    toggleDropdown(type) {
      this.showDropdown = this.showDropdown === type ? null : type
    },
    toggleMultiSelect(type, value) {
      const arr = this.searchQuery[type]
      const idx = arr.indexOf(value)
      if (idx > -1) arr.splice(idx, 1)
      else arr.push(value)
    },
    handleClickOutside(e) {
      const wrappers = this.$el.querySelectorAll('.multi-select-wrapper')
      let inside = false
      for (const w of wrappers) {
        if (w.contains(e.target)) { inside = true; break }
      }
      if (!inside) this.showDropdown = null
    },
    toggleExpand(buildId) {
      this.expandedIndex = this.expandedIndex === buildId ? null : buildId
    },
    /** 一键应用：方案完整存暂 sessionStorage，跳转计算器后由其在装备数据就绪时应用 */
    applyToCalculator(build) {
      if (!build) return
      if (!build.rod_model && !build.reel_model && !(build.main_line_tension > 0)) {
        this.showToast('该方案没有可应用的装备数据', 'error')
        return
      }
      try {
        sessionStorage.setItem('apply_build_payload', JSON.stringify(build))
      } catch (e) {
        this.showToast('无法暂存方案数据：' + e.message, 'error')
        return
      }
      this.$router.push('/')
    },
    getFishCount(fishStr) {
      if (!fishStr) return 0
      return fishStr.split(',').filter(f => f.trim()).length
    },
    getMapCount(mapStr) {
      if (!mapStr) return 0
      return mapStr.split(',').filter(m => m.trim()).length
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    parsePrice,
    formatPrice(price) {
      const result = formatPriceDisplay(price)
      return result || '-'
    },
    handleKeyDown(e) {
      if (e.key === 'h' || e.key === 'H') {
        if (this.hKeyTimer) {
          // 第二次按下，切换管理员模式
          this.isAdminMode = !this.isAdminMode
          this.showDeleteBtn = this.isAdminMode
          clearTimeout(this.hKeyTimer)
          this.hKeyTimer = null
          // 重新加载数据
          this.loadBuilds()
          this.showToast(this.isAdminMode ? '已进入管理员模式' : '已退出管理员模式', 'info')
        } else {
          // 第一次按下，设置计时器
          this.hKeyTimer = setTimeout(() => {
            this.hKeyTimer = null
          }, 500)
        }
      }
    },
    async deleteBuild(build) {
      if (!confirm(`确定要删除方案 "${build.name || '未命名'}" 吗？`)) return
      const password = prompt('请输入管理员密码：')
      if (password === null) return
      try {
        const response = await fetch('/api/recommended_builds', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: build.id, password })
        })
        const result = await response.json()
        if (result.success) {
          this.builds.splice(this.builds.indexOf(build), 1)
          if (this.expandedIndex === build.id) {
            this.expandedIndex = null
          }
        } else {
          this.showToast('删除失败：' + (result.error || result.message || '未知错误'), 'error')
        }
      } catch (error) {
        this.showToast('删除失败：' + error.message, 'error')
      }
    },
    async approveBuild(build) {
      const password = prompt('请输入管理员密码：')
      if (password === null) return
      const newStatus = !build.is_approved
      // 驳回时必须填写原因，提交者可在卡片详情中看到
      let rejectReason = ''
      if (!newStatus) {
        rejectReason = prompt('请输入驳回原因（提交者可见）：')
        if (rejectReason === null) return
      }
      try {
        const response = await fetch('/api/recommended_builds', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: build.id, isApproved: newStatus, password, rejectReason })
        })
        const result = await response.json()
        if (result.success) {
          build.is_approved = newStatus ? 1 : 0
          build.reject_reason = newStatus ? '' : rejectReason
          this.showToast(newStatus ? '方案已通过审核' : '方案已驳回', 'success')
        } else {
          this.showToast('审核操作失败：' + (result.error || result.message || '未知错误'), 'error')
        }
      } catch (error) {
        this.showToast('审核操作失败：' + error.message, 'error')
      }
    },
    openEditModal(build) {
      this.editForm = {
        id: build.id,
        name: build.name || '',
        description: build.description || '',
        suitable_fish: build.suitable_fish ? build.suitable_fish.split(',').map(s => s.trim()).filter(Boolean) : [],
        suitable_map: build.suitable_map ? build.suitable_map.split(',').map(s => s.trim()).filter(Boolean) : []
      }
      this.editFishSearch = ''
      this.editMapSearch = ''
      this.showEditModal = true
    },
    closeEditModal() {
      this.showEditModal = false
      this.editForm = { id: null, name: '', description: '', suitable_fish: [], suitable_map: [] }
      this.editFishSearch = ''
      this.editMapSearch = ''
    },
    toggleEditFishSelection(fishName) {
      const arr = this.editForm.suitable_fish
      const idx = arr.indexOf(fishName)
      if (idx > -1) arr.splice(idx, 1)
      else arr.push(fishName)
    },
    toggleEditMapSelection(mapName) {
      const arr = this.editForm.suitable_map
      const idx = arr.indexOf(mapName)
      if (idx > -1) arr.splice(idx, 1)
      else arr.push(mapName)
    },
    async saveEditBuild() {
      const password = prompt('请输入管理员密码：')
      if (password === null) return
      this.isSaving = true
      try {
        const buildData = {
          name: this.editForm.name,
          description: this.editForm.description,
          suitable_fish: this.editForm.suitable_fish.join(','),
          suitable_map: this.editForm.suitable_map.join(',')
        }
        const response = await fetch('/api/recommended_builds', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: this.editForm.id, build: buildData, password })
        })
        const result = await response.json()
        if (result.success) {
          // 更新本地数据
          const idx = this.builds.findIndex(b => b.id === this.editForm.id)
          if (idx !== -1) {
            Object.assign(this.builds[idx], {
              name: this.editForm.name,
              description: this.editForm.description,
              suitable_fish: buildData.suitable_fish,
              suitable_map: buildData.suitable_map
            })
          }
          this.showToast('方案已更新', 'success')
          this.closeEditModal()
        } else {
          this.showToast('更新失败：' + (result.error || result.message || '未知错误'), 'error')
        }
      } catch (error) {
        this.showToast('更新失败：' + error.message, 'error')
      } finally {
        this.isSaving = false
      }
    },
    showToast(message, type = 'info') {
      this.$refs.toast.show(message, type)
    },
    onSearchInput() {
      if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer)
      this.searchDebounceTimer = setTimeout(() => {
        this.searchQuery.name = this.searchInput
      }, 300)
    },
  }
}
</script>

<style scoped>
.builds-list-page {
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
  padding-bottom: 16px;
  border-bottom: 2px solid var(--color-primary-bg);
}

.page-header h1 {
  font-size: 28px;
  color: var(--color-primary);
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
  font-weight: bold;
  transition: all 0.3s;
}

.back-btn:hover {
  background-color: var(--color-primary-bg);
}

/* 搜索区域 */
.search-section {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.search-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.search-row:last-child {
  margin-bottom: 0;
}

.search-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.2);
}

.sort-select {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  min-width: 150px;
  outline: none;
  cursor: pointer;
}

.sort-select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.2);
}

/* 多选下拉框 */
.multi-select-wrapper {
  flex: 1;
  position: relative;
}

.multi-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  background-color: var(--color-surface);
  transition: border-color 0.2s;
  min-height: 20px;
}

.multi-select-trigger:hover {
  border-color: var(--color-primary);
}

.placeholder-text {
  color: var(--text-hint);
}

.selected-count {
  color: var(--color-primary);
  font-weight: 600;
}

.dropdown-arrow {
  font-size: 10px;
  color: var(--text-hint);
  margin-left: 8px;
}

.multi-select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 300px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  margin-top: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dropdown-search {
  padding: 8px 12px;
  border: none;
  border-bottom: 1px solid #eee;
  font-size: 14px;
  outline: none;
}

.dropdown-search:focus {
  border-bottom-color: var(--color-primary);
}

.dropdown-list {
  overflow-y: auto;
  max-height: 240px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  gap: 8px;
}

.dropdown-item:hover {
  background-color: var(--bg-page);
}

.dropdown-item.selected {
  background-color: var(--color-primary-bg);
}

.checkbox-icon {
  font-size: 14px;
  color: var(--text-hint);
  width: 18px;
  flex-shrink: 0;
}

.dropdown-item.selected .checkbox-icon {
  color: var(--color-primary);
}

.item-text {
  font-size: 14px;
  color: var(--text-main);
  flex: 1;
  min-width: 0;
}

.item-category {
  flex: 0 0 auto;
  min-width: 56px;
  max-width: 120px;
  padding: 3px 10px;
  background-color: var(--color-success-bg-light);
  color: #166534;
  border: 1px solid var(--color-success-border);
  border-radius: 14px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-rating {
  flex: 0 0 auto;
  min-width: 50px;
  max-width: 100px;
  padding: 3px 10px;
  background-color: var(--color-warning-bg-light);
  color: var(--color-warning-strong);
  border: 1px solid #fed7aa;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 统计信息 */
.stats-info {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 15px;
  padding: 10px 15px;
  background-color: var(--color-primary-bg);
  border-radius: 6px;
}

/* 方案容器 */
.builds-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 方案卡片 */
.build-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
}

.build-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.build-card.expanded {
  border-color: var(--color-primary);
}

/* 卡片头部 */
.build-header {
  padding: 15px 20px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--bg-secondary);
  transition: background-color 0.2s;
}

.build-header:hover {
  background-color: var(--bg-page);
}

.build-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-icon {
  font-size: 12px;
  color: var(--color-primary);
  width: 16px;
}

.build-name {
  font-weight: bold;
  font-size: 16px;
  color: var(--text-main);
}

.build-meta {
  display: flex;
  gap: 15px;
}

.meta-item {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 删除按钮 */
.delete-btn {
  padding: 4px 8px;
  border: 1px solid var(--color-danger);
  background-color: var(--color-surface);
  color: var(--color-danger);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  margin-left: 8px;
}

.delete-btn:hover {
  background-color: var(--color-danger);
  color: white;
}

/* 审核按钮 */
.approve-btn {
  padding: 4px 8px;
  border: 1px solid var(--color-success-strong);
  background-color: var(--color-surface);
  color: var(--color-success-strong);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  margin-left: 8px;
}

.approve-btn:hover {
  background-color: var(--color-success-strong);
  color: white;
}

/* 编辑按钮 */
.edit-btn {
  padding: 4px 8px;
  border: 1px solid var(--color-primary);
  background-color: var(--color-surface);
  color: var(--color-primary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  margin-left: 8px;
}

.edit-btn:hover {
  background-color: var(--color-primary);
  color: white;
}

/* 点赞/图片按钮 */
.like-btn {
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  color: var(--text-hint);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  margin-left: 8px;
}

.like-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.like-btn.liked {
  border-color: var(--color-danger);
  color: var(--color-danger);
  background-color: #fce4ec;
}

.img-btn {
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  margin-left: 8px;
}

.img-btn:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-bg);
}

/* 一键应用到计算器 */
.apply-btn {
  padding: 4px 8px;
  border: 1px solid var(--color-success-strong);
  background-color: var(--color-surface);
  color: var(--color-success-strong);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  margin-left: 8px;
}

.apply-btn:hover {
  background-color: var(--color-success-strong);
  color: white;
}

/* 驳回状态标签（红色系，区别于待审核） */
.pending-tag.rejected {
  background-color: #fce4ec;
  color: var(--color-danger-strong);
  cursor: help;
}

/* 驳回原因提示条 */
.reject-reason {
  margin-bottom: 12px;
  padding: 10px 14px;
  background-color: #fce4ec;
  border-left: 4px solid var(--color-danger);
  border-radius: 4px;
  color: var(--color-danger-strong);
  font-size: 13px;
}

/* 分页加载更多 */
.load-more-wrap {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.load-more-builds-btn {
  padding: 10px 32px;
  border: 2px solid var(--color-primary);
  background-color: var(--color-surface);
  color: var(--color-primary);
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s;
}

.load-more-builds-btn:hover:not(:disabled) {
  background-color: var(--color-primary);
  color: white;
}

.load-more-builds-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 待审核标签 */
.pending-tag {
  background-color: var(--color-warning-bg);
  color: var(--color-warning);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

/* 详情区域 */
.build-details {
  padding: 16px 20px;
  border-top: 1px solid var(--bg-secondary);
  background-color: var(--color-surface);
}

/* 装备搭配行 */
.equipment-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.equip-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  font-size: 14px;
  max-width: 100%;
}

.equip-chip-label {
  color: var(--color-primary);
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  flex-shrink: 0;
}

.equip-chip-value {
  color: var(--text-main);
  font-weight: 500;
  white-space: nowrap;
  font-size: 14px;
}

.equip-chip-sub {
  color: #888;
  font-size: 13px;
  white-space: nowrap;
}

/* 装备分析行 */
.analysis-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  align-items: center;
  padding: 12px 16px;
  background-color: #fafbfc;
  border: 1px solid var(--bg-secondary);
  border-radius: 6px;
  margin-bottom: 14px;
}

.analysis-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  white-space: nowrap;
}

.analysis-stat:first-child {
  padding-left: 0;
}

.analysis-divider {
  width: 1px;
  height: 20px;
  background-color: var(--color-divider);
  margin: 0 4px;
  flex-shrink: 0;
}

.stat-label {
  font-size: 14px;
  color: #888;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
}

.stat-tension {
  color: var(--color-primary);
}

.stat-price {
  color: var(--color-warning);
}

.analysis-total {
  margin-left: auto;
  padding-left: 16px;
  border-left: 1px solid var(--color-divider);
}

.stat-total {
  font-size: 14px;
}

/* 鱼种地图行 */
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.meta-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-label {
  font-size: 14px;
  color: #888;
  font-weight: 500;
  white-space: nowrap;
}

.meta-desc {
  flex: 1;
}

.meta-desc-text {
  font-size: 14px;
  color: #555;
  line-height: 1.5;
}

/* 标签样式 */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.tag-fish {
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
}

.tag-map {
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-hint);
}

.empty-state p {
  font-size: 16px;
  margin-bottom: 20px;
}

/* 创建方案按钮（常驻） */
.create-section {
  display: flex;
  justify-content: center;
  padding: 30px 20px;
}

.create-btn {
  padding: 14px 32px;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 24px;
  cursor: pointer;
  font-size: 15px;
  font-weight: bold;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.3);
}

.create-btn:hover {
  background-color: #0d47a1;
  box-shadow: 0 4px 12px rgba(21, 101, 192, 0.4);
  transform: translateY(-1px);
}

/* 响应式 */
@media (max-width: 768px) {
  .search-row {
    flex-direction: column;
  }

  .build-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .build-meta {
    flex-wrap: wrap;
  }

  .analysis-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .analysis-stat {
    padding: 0;
  }

  .analysis-divider {
    display: none;
  }

  .analysis-total {
    margin-left: 0;
    padding-left: 0;
    border-left: none;
    padding-top: 8px;
    border-top: 1px solid var(--color-divider);
    width: 100%;
  }

  .meta-row {
    flex-direction: column;
    gap: 10px;
  }
}

/* 骨架屏 */
.skeleton-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-card {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.skeleton-header {
  margin-bottom: 16px;
}

.skeleton-body {
  display: flex;
  gap: 12px;
}

.skeleton-line {
  height: 16px;
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--color-divider) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-title {
  width: 40%;
  height: 20px;
  margin-bottom: 12px;
}

.skeleton-meta {
  width: 60%;
  height: 14px;
}

.skeleton-chip {
  width: 120px;
  height: 32px;
  border-radius: 16px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 编辑弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.edit-modal {
  background: var(--color-surface);
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-main);
}

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-hint);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background-color: var(--bg-page);
  color: var(--text-main);
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #555;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.2);
}

.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.2);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.btn-cancel {
  padding: 8px 20px;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background-color: var(--bg-page);
  border-color: var(--color-border-light);
}

.btn-save {
  padding: 8px 20px;
  border: none;
  background-color: var(--color-primary);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-save:hover:not(:disabled) {
  background-color: #0d47a1;
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 编辑弹窗鱼种地图左右布局 */
.form-row {
  display: flex;
  gap: 16px;
}

.form-col {
  flex: 1;
  min-width: 0;
}

/* 已选标签 */
.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.selected-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.tag-remove {
  cursor: pointer;
  font-size: 11px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.tag-remove:hover {
  opacity: 1;
}

/* 多选列表 */
.multi-select-container {
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background-color: #fafbfc;
}

.multi-select-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.15s;
  border-bottom: 1px solid var(--bg-secondary);
}

.multi-select-item:last-child {
  border-bottom: none;
}

.multi-select-item:hover {
  background-color: #f0f4f8;
}

.multi-select-item.selected {
  background-color: var(--color-primary-bg);
}

.checkbox-icon {
  font-size: 14px;
  color: var(--color-primary);
  flex-shrink: 0;
}

.item-text {
  font-size: 14px;
  color: var(--text-main);
  flex: 1;
}

.select-hint {
  display: block;
  font-size: 12px;
  color: var(--text-hint);
  margin-top: 4px;
}

/* 移动端响应式 */
@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  .edit-modal {
    max-width: 95%;
  }
}
</style>
