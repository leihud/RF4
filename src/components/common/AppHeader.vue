<template>
  <header class="app-header">
    <div class="app-header-inner">
      <router-link :to="routes.CALCULATOR" class="brand">
        🎣 RF4 装备计算器
      </router-link>
      <nav class="nav-links">
        <router-link :to="routes.CALCULATOR" class="nav-link" exact-active-class="active">装备计算</router-link>
        <router-link to="/builds" class="nav-link" active-class="active">方案汇总</router-link>
        <router-link :to="routes.COMPARE" class="nav-link" active-class="active">参数对比</router-link>
        <router-link :to="routes.VALUE" class="nav-link" active-class="active">价值统计</router-link>
        <router-link :to="routes.IMPORT" class="nav-link desktop-only" active-class="active">数据导入</router-link>
        <a class="nav-link external desktop-only" href="https://cn.rf4-stat.ru/" target="_blank" rel="noopener noreferrer">RF4 数据站 ↗</a>
        <button
          class="theme-toggle-btn"
          :title="isDarkTheme ? '切换到亮色模式' : '切换到暗色模式'"
          :aria-label="isDarkTheme ? '切换到亮色模式' : '切换到暗色模式'"
          @click="toggleTheme"
        >{{ isDarkTheme ? '☀️' : '🌙' }}</button>
      </nav>
    </div>
  </header>
</template>

<script>
import { ROUTES } from '../../constants/routes.js'

/**
 * 全局顶部导航栏：所有页面共享，router-link 自动高亮当前路由。
 * 移动端（≤600px）自动切换为底部固定 Tab 栏，无需汉堡菜单。
 * 内置暗色/亮色主题切换（令牌覆盖式，选择持久化到 localStorage）。
 */
export default {
  name: 'AppHeader',
  data() {
    return { routes: ROUTES, isDarkTheme: false }
  },
  created() {
    try {
      this.isDarkTheme = localStorage.getItem('rf4_theme') === 'dark'
    } catch (e) { /* 存储不可用时默认亮色 */ }
    this.applyTheme()
  },
  methods: {
    toggleTheme() {
      this.isDarkTheme = !this.isDarkTheme
      try { localStorage.setItem('rf4_theme', this.isDarkTheme ? 'dark' : 'light') } catch (e) { /* 忽略 */ }
      this.applyTheme()
    },
    applyTheme() {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light')
      }
    }
  }
}
</script>

<style scoped>
.app-header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-divider);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 100;
}

.app-header-inner {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  min-height: 56px;
}

.brand {
  font-size: 18px;
  font-weight: bold;
  color: var(--color-primary);
  text-decoration: none;
  white-space: nowrap;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.nav-link {
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s;
  white-space: nowrap;
}

.nav-link:hover {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.nav-link.active {
  color: white;
  background: var(--color-primary);
}

.nav-link.external {
  color: var(--color-success);
}

.nav-link.external:hover {
  color: var(--color-success);
  background: var(--color-success-bg);
}

.theme-toggle-btn {
  border: none;
  background: transparent;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 12px;
  transition: background 0.2s;
}

.theme-toggle-btn:hover {
  background: var(--bg-secondary);
}

/* 移动端：切换为底部固定 Tab 栏 */
@media (max-width: 600px) {
  .app-header {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
    z-index: 200;
  }

  .app-header-inner {
    padding: 6px 8px;
    justify-content: center;
    min-height: 0;
  }

  .brand {
    display: none;
  }

  .nav-links {
    justify-content: center;
    width: 100%;
  }

  .nav-link {
    padding: 5px 8px;
    font-size: 12px;
  }

  /* 数据导入/外部数据站属桌面管理功能，移动端收起避免底部 Tab 拥挤 */
  .desktop-only {
    display: none;
  }
}
</style>
