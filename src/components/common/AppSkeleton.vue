<template>
  <div class="app-skeleton" aria-hidden="true">
    <div v-for="i in rows" :key="i" class="skeleton-row" :style="{ width: rowWidth(i) }"></div>
  </div>
</template>

<script>
/**
 * 通用骨架屏：数据加载中的占位动画。
 * 用法：<AppSkeleton :rows="5" />，各行宽度递减模拟真实内容层次。
 */
export default {
  name: 'AppSkeleton',
  props: {
    rows: { type: Number, default: 4 }
  },
  methods: {
    rowWidth(i) {
      // 首行最宽，逐行递减，最低 50%，模拟自然排版
      return Math.max(50, 100 - (i - 1) * 12) + '%'
    }
  }
}
</script>

<style scoped>
.app-skeleton {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.skeleton-row {
  height: 18px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-page) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: skeleton-wave 1.4s ease-in-out infinite;
}

@keyframes skeleton-wave {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
