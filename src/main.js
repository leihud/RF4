import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// 全局 Vue 错误处理器：捕获组件渲染/生命周期异常（防止整页白屏，日志落控制台便于排查）
app.config.errorHandler = (err, instance, info) => {
  console.error('[全局Vue错误]', {
    message: err && err.message ? err.message : String(err),
    stack: err && err.stack ? err.stack : undefined,
    info,
    instance: instance && instance.$options ? instance.$options.name : undefined
  })
  // 继续上抛，便于 App.vue 中 errorCaptured/errorHandler 再次处理 UI 提示
}

app.use(router)
app.mount('#app')