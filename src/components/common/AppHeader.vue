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
        <router-link :to="routes.IMPORT" class="nav-link" active-class="active">数据导入</router-link>
        <a class="nav-link external" href="https://cn.rf4-stat.ru/" target="_blank" rel="noopener noreferrer">RF4 数据站 ↗</a>
      </nav>
    </div>
  </header>
</template>

<script>
import { ROUTES } from '../../constants/routes.js'

/**
 * 全局顶部导航栏：所有页面共享，router-link 自动高亮当前路由。
 * 移动端通过 flex-wrap 自动换行，无需汉堡菜单。
 */
export default {
  name: 'AppHeader',
  data() {
    return { routes: ROUTES }
  }
}
</script>

<style scoped>
.app-header {
  background: white;
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

/* 移动端：导航换行，间距收紧 */
@media (max-width: 600px) {
  .app-header-inner {
    padding: 8px 12px;
    justify-content: center;
  }
  .nav-link {
    padding: 5px 10px;
    font-size: 13px;
  }
}
</style>
