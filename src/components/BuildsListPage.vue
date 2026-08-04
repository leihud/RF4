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
          </div>
        </div>

        <div v-if="expandedIndex === index" class="build-details">
          <!-- 鱼竿信息 -->
          <div v-if="build.rod_model" class="detail-group">
            <h4>🎯 鱼竿</h4>
            <p>{{ build.rod_name || build.rod_model }} ({{ build.rod_category || '未知分类' }})</p>
          </div>

          <!-- 渔轮信息 -->
          <div v-if="build.reel_model" class="detail-group">
            <h4>🔄 渔轮</h4>
            <p>{{ build.reel_name || build.reel_model }} ({{ build.reel_category || '未知分类' }})</p>
          </div>

          <!-- 主线信息 -->
          <div v-if="build.main_line_tension > 0" class="detail-group">
            <h4>🧵 主线</h4>
            <p>{{ build.main_line_material ? build.main_line_material + '线 ' : '' }}{{ build.main_line_tension }}kN (磨损: {{ build.main_line_wear }}%)</p>
          </div>

          <!-- 引线信息 -->
          <div v-if="build.leader_line_tension > 0" class="detail-group">
            <h4>🧶 引线</h4>
            <p>{{ build.leader_line_material ? build.leader_line_material + '线 ' : '' }}{{ build.leader_line_tension }}kN (磨损: {{ build.leader_line_wear }}%)</p>
          </div>

          <!-- 鱼钩信息 -->
          <div v-if="build.hook_name" class="detail-group">
            <h4>🪝 鱼钩</h4>
            <p>{{ build.hook_name }}</p>
          </div>

          <!-- 适用鱼种 -->
          <div v-if="build.suitable_fish" class="detail-group">
            <h4>🐟 适用鱼种</h4>
            <div class="tags">
              <span v-for="(fish, i) in build.suitable_fish.split(',')" :key="i" class="tag">
                {{ fish.trim() }}
              </span>
            </div>
          </div>

          <!-- 适用地图 -->
          <div v-if="build.suitable_map" class="detail-group">
            <h4> 适用地图</h4>
            <div class="tags">
              <span v-for="(map, i) in build.suitable_map.split(',')" :key="i" class="tag">
                {{ map.trim() }}
              </span>
            </div>
          </div>

          <!-- 说明 -->
          <div v-if="build.description" class="detail-group">
            <h4>📝 说明</h4>
            <p>{{ build.description }}</p>
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
      expandedIndex: null
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
    }
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

/* 详情区域 */
.build-details {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  background-color: white;
}

.detail-group {
  margin-bottom: 15px;
}

.detail-group:last-child {
  margin-bottom: 0;
}

.detail-group h4 {
  font-size: 14px;
  color: #1565c0;
  margin: 0 0 8px 0;
  font-weight: bold;
}

.detail-group p {
  font-size: 14px;
  color: #333;
  margin: 0;
  line-height: 1.6;
}

/* 标签样式 */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  display: inline-block;
  padding: 4px 10px;
  background-color: #e3f2fd;
  color: #1565c0;
  border-radius: 4px;
  font-size: 13px;
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
}
</style>
