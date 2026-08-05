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
          v-model="searchQuery.name"
          type="text"
          class="search-input"
          placeholder="搜索方案名称..."
        />
        <input
          v-model="searchQuery.rod"
          type="text"
          class="search-input"
          placeholder="搜索鱼竿..."
        />
        <input
          v-model="searchQuery.reel"
          type="text"
          class="search-input"
          placeholder="搜索渔轮..."
        />
      </div>
      <div class="search-row">
        <input
          v-model="searchQuery.fish"
          type="text"
          class="search-input"
          placeholder="搜索适用鱼种..."
        />
        <input
          v-model="searchQuery.map"
          type="text"
          class="search-input"
          placeholder="搜索适用地图..."
        />
        <select v-model="sortBy" class="sort-select">
          <option value="newest">最新优先</option>
          <option value="oldest">最早优先</option>
          <option value="name">按名称排序</option>
        </select>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-info">
      共找到 {{ filteredBuilds.length }} 个方案
    </div>

    <!-- 方案列表 -->
    <div class="builds-container">
      <div 
        v-for="(build, index) in filteredBuilds" 
        :key="index"
        class="build-card"
        :class="{ expanded: expandedIndex === index }"
      >
        <div class="build-header" @click="toggleExpand(index)">
          <div class="build-title">
            <span class="expand-icon">{{ expandedIndex === index ? '▼' : '▶' }}</span>
            <span class="build-name">{{ build.name || '未命名方案' }}</span>
          </div>
          <div class="build-meta">
            <span class="meta-item">🎣 {{ getFishCount(build.suitable_fish) }} 种鱼</span>
            <span class="meta-item">️ {{ getMapCount(build.suitable_map) }} 张地图</span>
            <span class="meta-item">📅 {{ formatDate(build.created_at) }}</span>
            <button v-if="showDeleteBtn" class="delete-btn" @click.stop="deleteBuild(build, index)" title="删除方案">️</button>
          </div>
        </div>

        <div v-if="expandedIndex === index" class="build-details">
          <!-- 装备搭配 -->
          <div class="equipment-row">
            <div v-if="build.rod_model" class="equip-chip">
              <span class="equip-chip-label">鱼竿</span>
              <span class="equip-chip-value">{{ build.rod_name || build.rod_model }}</span>
              <span class="equip-chip-sub">{{ build.rod_category || '' }}</span>
            </div>
            <div v-if="build.reel_model" class="equip-chip">
              <span class="equip-chip-label">渔轮</span>
              <span class="equip-chip-value">{{ build.reel_name || build.reel_model }}</span>
              <span class="equip-chip-sub">{{ build.reel_category || '' }}</span>
            </div>
            <div v-if="build.main_line_tension > 0" class="equip-chip">
              <span class="equip-chip-label">主线</span>
              <span class="equip-chip-value">
                {{ build.main_line_material ? build.main_line_material : '' }}{{ build.main_line_tension }}kN
                <span class="equip-chip-sub" v-if="build.main_line_wear > 0">磨损{{ build.main_line_wear }}%</span>
                <span class="equip-chip-sub" v-if="build.main_line_diameter > 0">{{ build.main_line_diameter }}mm</span>
                <span class="equip-chip-sub" v-if="build.main_line_length > 0">{{ build.main_line_length }}cm</span>
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
            <div class="analysis-stat">
              <span class="stat-label">鱼竿</span>
              <span class="stat-value stat-price">{{ formatPrice(build.rod_price) }}</span>
            </div>
            <div class="analysis-stat">
              <span class="stat-label">渔轮</span>
              <span class="stat-value stat-price">{{ formatPrice(build.reel_price) }}</span>
            </div>
            <div class="analysis-stat analysis-total">
              <span class="stat-label">总计</span>
              <span class="stat-value stat-price stat-total">{{ formatPrice((build.rod_price || 0) + (build.reel_price || 0)) }}</span>
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

    <!-- 空状态 -->
    <div v-if="filteredBuilds.length === 0" class="empty-state">
      <p>暂无装备方案</p>
      <button class="create-btn" @click="$router.push('/')">去创建一个方案</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BuildsListPage',
  data() {
    return {
      builds: [],
      searchQuery: {
        name: '',
        rod: '',
        reel: '',
        fish: '',
        map: ''
      },
      sortBy: 'newest',
      expandedIndex: null,
      showDeleteBtn: false,
      hKeyTimer: null
    }
  },
  computed: {
    filteredBuilds() {
      let result = this.builds.filter(build => {
        const q = this.searchQuery
        const matchName = !q.name || (build.name && build.name.toLowerCase().includes(q.name.toLowerCase()))
        const matchRod = !q.rod || (build.rod_name && build.rod_name.toLowerCase().includes(q.rod.toLowerCase())) || 
                        (build.rod_model && build.rod_model.toLowerCase().includes(q.rod.toLowerCase()))
        const matchReel = !q.reel || (build.reel_name && build.reel_name.toLowerCase().includes(q.reel.toLowerCase())) || 
                         (build.reel_model && build.reel_model.toLowerCase().includes(q.reel.toLowerCase()))
        const matchFish = !q.fish || (build.suitable_fish && build.suitable_fish.toLowerCase().includes(q.fish.toLowerCase()))
        const matchMap = !q.map || (build.suitable_map && build.suitable_map.toLowerCase().includes(q.map.toLowerCase()))
        
        return matchName && matchRod && matchReel && matchFish && matchMap
      })

      // 排序
      if (this.sortBy === 'newest') {
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      } else if (this.sortBy === 'oldest') {
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      } else if (this.sortBy === 'name') {
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      }

      return result
    }
  },
  async mounted() {
    await this.loadBuilds()
    document.addEventListener('keydown', this.handleKeyDown)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown)
  },
  methods: {
    async loadBuilds() {
      try {
        const response = await fetch('/api/recommended_builds')
        const result = await response.json()
        if (result.success && result.data) {
          this.builds = result.data
        }
      } catch (error) {
        console.error('加载装备方案失败:', error)
        alert('加载失败：' + error.message)
      }
    },
    toggleExpand(index) {
      this.expandedIndex = this.expandedIndex === index ? null : index
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
    formatPrice(price) {
      if (!price || price === 0) return '-'
      return price.toLocaleString('zh-CN')
    },
    handleKeyDown(e) {
      if (e.key === 'h' || e.key === 'H') {
        if (this.hKeyTimer) {
          // 第二次按下，切换删除按钮
          this.showDeleteBtn = !this.showDeleteBtn
          clearTimeout(this.hKeyTimer)
          this.hKeyTimer = null
        } else {
          // 第一次按下，设置计时器
          this.hKeyTimer = setTimeout(() => {
            this.hKeyTimer = null
          }, 500)
        }
      }
    },
    async deleteBuild(build, index) {
      if (!confirm(`确定要删除方案 "${build.name || '未命名'}" 吗？`)) return
      try {
        const response = await fetch('/api/recommended_builds', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: build.id })
        })
        const result = await response.json()
        if (result.success) {
          this.builds.splice(this.builds.indexOf(build), 1)
          if (this.expandedIndex === index) {
            this.expandedIndex = null
          }
        } else {
          alert('删除失败：' + (result.error || result.message || '未知错误'))
        }
      } catch (error) {
        alert('删除失败：' + error.message)
      }
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
  border-bottom: 2px solid #e3f2fd;
}

.page-header h1 {
  font-size: 28px;
  color: #1565c0;
  margin: 0;
}

.back-btn {
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

.back-btn:hover {
  background-color: #e3f2fd;
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
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #1565c0;
  box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.2);
}

.sort-select {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  min-width: 150px;
  outline: none;
  cursor: pointer;
}

.sort-select:focus {
  border-color: #1565c0;
  box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.2);
}

/* 统计信息 */
.stats-info {
  font-size: 14px;
  color: #666;
  margin-bottom: 15px;
  padding: 10px 15px;
  background-color: #e3f2fd;
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
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
}

.build-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.build-card.expanded {
  border-color: #1565c0;
}

/* 卡片头部 */
.build-header {
  padding: 15px 20px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fafafa;
  transition: background-color 0.2s;
}

.build-header:hover {
  background-color: #f5f5f5;
}

.build-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-icon {
  font-size: 12px;
  color: #1565c0;
  width: 16px;
}

.build-name {
  font-weight: bold;
  font-size: 16px;
  color: #333;
}

.build-meta {
  display: flex;
  gap: 15px;
}

.meta-item {
  font-size: 13px;
  color: #666;
}

/* 删除按钮 */
.delete-btn {
  padding: 4px 8px;
  border: 1px solid #e53935;
  background-color: white;
  color: #e53935;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  margin-left: 8px;
}

.delete-btn:hover {
  background-color: #e53935;
  color: white;
}

/* 详情区域 */
.build-details {
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
  background-color: white;
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
  font-size: 13px;
  max-width: 100%;
}

.equip-chip-label {
  color: #1565c0;
  font-weight: 600;
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.equip-chip-value {
  color: #333;
  font-weight: 500;
  white-space: nowrap;
}

.equip-chip-sub {
  color: #888;
  font-size: 12px;
  white-space: nowrap;
}

/* 装备分析行 */
.analysis-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  padding: 12px 16px;
  background-color: #fafbfc;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  margin-bottom: 14px;
}

.analysis-stat {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-label {
  font-size: 13px;
  color: #888;
}

.stat-value {
  font-size: 15px;
  font-weight: 600;
}

.stat-tension {
  color: #1565c0;
}

.stat-price {
  color: #e65100;
}

.analysis-total {
  margin-left: auto;
  padding-left: 16px;
  border-left: 1px solid #e0e0e0;
}

.stat-total {
  font-size: 17px;
}

/* 鱼种地图行 */
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
}

.meta-group {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.meta-label {
  font-size: 13px;
  color: #888;
  font-weight: 500;
  padding-top: 4px;
  white-space: nowrap;
}

.meta-desc {
  flex: 1;
}

.meta-desc-text {
  font-size: 13px;
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
  background-color: #e3f2fd;
  color: #1565c0;
}

.tag-map {
  background-color: #e8f5e9;
  color: #2e7d32;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-state p {
  font-size: 16px;
  margin-bottom: 20px;
}

.create-btn {
  padding: 12px 24px;
  background-color: #1565c0;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.3s;
}

.create-btn:hover {
  background-color: #0d47a1;
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
    gap: 10px;
  }

  .analysis-total {
    margin-left: 0;
    padding-left: 0;
    border-left: none;
    padding-top: 8px;
    border-top: 1px solid #e0e0e0;
    width: 100%;
  }

  .meta-row {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
