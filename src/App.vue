<template>
  <div id="app">
    <router-view />
    <!-- 版本信息展示 -->
    <div class="version-badge" @click="showVersionDetail = !showVersionDetail">
      <span class="version-label">v{{ appVersion }}</span>
    </div>
    <!-- 版本详情弹窗 -->
    <div v-if="showVersionDetail" class="version-overlay" @click.self="showVersionDetail = false">
      <div class="version-popup">
        <h3>📦 版本信息</h3>
        <div class="version-info">
          <div class="info-row">
            <span class="info-label">当前版本：</span>
            <span class="info-value">v{{ appVersion }}</span>
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
import pkg from '../package.json'

export default {
  name: 'App',
  data() {
    return {
      fatalErrorMessage: '',
      appVersion: pkg.version,
      buildTime: new Date().toLocaleString('zh-CN'),
      showVersionDetail: false
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
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  background-color: #f5f5f5;
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
  background: #1565c0;
  border-color: #1565c0;
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
  color: #333;
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
  border-bottom: 1px solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  color: #666;
}

.info-value {
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.status-success {
  color: #43a047;
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
</style>