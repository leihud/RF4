<template>
  <div id="app">
    <AppHeader />
    <router-view />
    <!-- 版本信息展示 -->
    <div class="version-badge" @click="showVersionDetail = !showVersionDetail">
      <span class="version-label">{{ appVersion }}</span>
    </div>
    <!-- 版本详情弹窗 -->
    <div v-if="showVersionDetail" class="version-overlay" @click.self="showVersionDetail = false">
      <div class="version-popup">
        <h3>📦 版本信息</h3>
        <div class="version-info">
          <div class="info-row">
            <span class="info-label">当前版本：</span>
            <span class="info-value">{{ appVersion }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">发布时间：</span>
            <span class="info-value">{{ buildTime }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">部署状态：</span>
            <span class="info-value status-success">✓ 已发布</span>
          </div>
        </div>
        <!-- 更新日志 -->
        <div class="changelog-section">
          <h4> 更新日志</h4>
          <div class="changelog-list">
            <div v-for="(log, idx) in displayChangelog" :key="idx" class="changelog-item">
              <div class="changelog-version">
                <span class="version-tag">{{ log.version }}</span>
                <span v-if="idx === 0" class="new-badge">NEW</span>
                <span class="version-date">{{ log.date }}</span>
              </div>
              <ul class="changelog-changes">
                <li v-for="(change, i) in log.changes" :key="i">
                  <span :class="getChangeTypeClass(change)">{{ getChangeTypeLabel(change) }}</span>
                  {{ getChangeContent(change) }}
                </li>
              </ul>
            </div>
          </div>
          <!-- 加载更多按钮 -->
          <button v-if="changelog.length > 1 && !showAllChangelog" class="load-more-btn" @click="showAllChangelog = true">
            查看更多版本 ({{ changelog.length - 1 }})
          </button>
        </div>
        <button class="close-btn" @click="showVersionDetail = false">关闭</button>
      </div>
    </div>
    <div v-if="fatalErrorMessage" class="global-error-overlay">
      <div class="global-error-popup">
        <h3>⚠ 页面出现异常</h3>
        <p class="global-error-text">{{ fatalErrorMessage }}</p>
        <div class="global-error-actions">
          <button class="global-error-btn primary" @click="reloadPage">刷新页面</button>
          <button class="global-error-btn" @click="dismissError">忽略继续</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { versionInfo } from './version-info.js'
import AppHeader from './components/common/AppHeader.vue'

export default {
  name: 'App',
  components: {
    AppHeader
  },
  data() {
    return {
      fatalErrorMessage: '',
      appVersion: versionInfo.currentVersion,
      buildTime: versionInfo.buildTime,
      changelog: versionInfo.changelog,
      showVersionDetail: false,
      showAllChangelog: false
    }
  },
  computed: {
    // 显示更新日志（默认只显示最新版本）
    displayChangelog() {
      if (this.showAllChangelog) {
        return this.changelog
      }
      return this.changelog.slice(0, 1)
    }
  },
  created() {
    // 全局 Vue 渲染错误兜底（防止组件内部未捕获异常导致整页白屏）
    if (this.$root && this.$root.appContext && this.$root.appContext.config) {
      const originalHandler = this.$root.appContext.config.errorHandler
      this.$root.appContext.config.errorHandler = (err, instance, info) => {
        console.error('[Vue errorHandler] 捕获全局错误:', err, info)
        this.fatalErrorMessage = `${err && err.message ? err.message : String(err)}（${info || '组件渲染异常'}）`
        if (typeof originalHandler === 'function') {
          try { originalHandler.call(this, err, instance, info) } catch (_) {}
        }
      }
    }
    // 全局 window 级错误兜底（脚本错误/Promise rejection）
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        console.error('[window error] 全局未捕获错误:', event.error || event.message)
        if (!this.fatalErrorMessage) {
          this.fatalErrorMessage = event.message || '脚本执行异常'
        }
      })
      window.addEventListener('unhandledrejection', (event) => {
        console.error('[window unhandledrejection] Promise未处理异常:', event.reason)
        if (!this.fatalErrorMessage) {
          const reason = event.reason
          this.fatalErrorMessage = reason && reason.message ? reason.message : String(reason || '异步请求异常')
        }
      })
    }
  },
  errorCaptured(err, instance, info) {
    console.error('[App errorCaptured] 错误捕获:', err, info)
    this.fatalErrorMessage = `${err && err.message ? err.message : String(err)}（${info || '组件内部错误'}）`
    return false // 继续上抛，保证全局 errorHandler 仍能收到
  },
  methods: {
    reloadPage() {
      window.location.reload()
    },
    dismissError() {
      this.fatalErrorMessage = ''
    },
    // 解析变更类型前缀（新增/优化/修复/删除）
    getChangeTypeClass(change) {
      if (change.startsWith('新增：') || change.startsWith('新增:')) return 'change-type-new'
      if (change.startsWith('优化：') || change.startsWith('优化:')) return 'change-type-optimize'
      if (change.startsWith('修复：') || change.startsWith('修复:')) return 'change-type-fix'
      if (change.startsWith('删除：') || change.startsWith('删除:')) return 'change-type-remove'
      return ''
    },
    getChangeTypeLabel(change) {
      if (change.startsWith('新增：') || change.startsWith('新增:')) return '[新增]'
      if (change.startsWith('优化：') || change.startsWith('优化:')) return '[优化]'
      if (change.startsWith('修复：') || change.startsWith('修复:')) return '[修复]'
      if (change.startsWith('删除：') || change.startsWith('删除:')) return '[删除]'
      return ''
    },
    getChangeContent(change) {
      // 去掉类型前缀，返回纯内容
      return change.replace(/^(新增|优化|修复|删除)[：:]/, '')
    }
  }
}
</script>

<style>
/* ── 全局设计令牌：颜色统一由这里定义，组件内一律引用变量，禁止再写硬编码色值 ── */
:root {
  /* 品牌主色（蓝色阶梯） */
  --color-primary: #1565c0;
  --color-primary-hover: #1e88e5;
  --color-primary-light: #90caf9;
  --color-primary-bg: #e3f2fd;
  /* 成功（绿色阶梯） */
  --color-success: #2e7d32;
  --color-success-strong: #43a047;
  --color-success-accent: #42b983;
  --color-success-bg: #e8f5e9;
  --color-success-bg-light: #f0fdf4;
  --color-success-border: #bbf7d0;
  /* 警告（橙色阶梯） */
  --color-warning: #e65100;
  --color-warning-strong: #c2410c;
  --color-warning-accent: #ff9800;
  --color-warning-bg: #fff3e0;
  --color-warning-bg-light: #fff7ed;
  /* 危险（红色） */
  --color-danger: #e53935;
  --color-danger-strong: #c62828;
  /* 文本 */
  --text-heading: #2c3e50;
  --text-main: #333;
  --text-secondary: #666;
  --text-hint: #999;
  /* 边框与背景 */
  --color-border: #ddd;
  --color-border-light: #ccc;
  --color-divider: #e0e0e0;
  --bg-page: #f5f5f5;
  --bg-secondary: #f0f0f0;
  /* 品牌渐变（版本徽章等） */
  --gradient-brand: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  background-color: var(--bg-page);
  min-height: 100vh;
}

#app {
  width: 100%;
}

.global-error-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.global-error-popup {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  max-width: 480px;
  width: 100%;
  padding: 28px 32px;
}

.global-error-popup h3 {
  font-size: 18px;
  color: #d32f2f;
  margin-bottom: 16px;
  font-weight: 600;
}

.global-error-text {
  font-size: 14px;
  line-height: 1.7;
  color: #37474f;
  background: #fff8e1;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 24px;
  word-break: break-word;
}

.global-error-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.global-error-btn {
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid #cfd8dc;
  background: white;
  color: #455a64;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.global-error-btn:hover {
  background: #eceff1;
}

.global-error-btn.primary {
  background: #1976d2;
  border-color: #1976d2;
  color: white;
}

.global-error-btn.primary:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

/* 版本徽章 */
.version-badge {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  z-index: 9998;
}

.version-badge:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
}

.version-label {
  white-space: nowrap;
}

/* 版本详情弹窗 */
.version-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 16px;
}

.version-popup {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 100%;
  padding: 28px 32px;
}

.version-popup h3 {
  font-size: 18px;
  color: var(--text-main);
  margin-bottom: 20px;
  font-weight: 600;
  text-align: center;
}

.version-info {
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--bg-secondary);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.info-value {
  font-size: 14px;
  color: var(--text-main);
  font-weight: 600;
}

.status-success {
  color: var(--color-success-strong);
}

.close-btn {
  width: 100%;
  padding: 10px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* 更新日志 */
.changelog-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 2px solid var(--bg-secondary);
}

.changelog-section h4 {
  font-size: 16px;
  color: var(--text-main);
  margin-bottom: 16px;
  font-weight: 600;
}

.changelog-list {
  max-height: 300px;
  overflow-y: auto;
}

.changelog-item {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--bg-page);
}

.changelog-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.changelog-version {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.version-tag {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.version-date {
  font-size: 12px;
  color: var(--text-hint);
}

.changelog-changes {
  margin: 0;
  padding-left: 20px;
  list-style-type: disc;
}

.changelog-changes li {
  font-size: 13px;
  color: #555;
  line-height: 1.6;
  margin-bottom: 4px;
}

.changelog-changes li::marker {
  color: #667eea;
}

/* 新版本标识 */
.new-badge {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* 变更类型标签 */
.change-type-new,
.change-type-optimize,
.change-type-fix,
.change-type-remove {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-right: 6px;
}

.change-type-new {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.change-type-optimize {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.change-type-fix {
  background: var(--color-warning-bg);
  color: #ef6c00;
}

.change-type-remove {
  background: #fce4ec;
  color: var(--color-danger-strong);
}
</style>