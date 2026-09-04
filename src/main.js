import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// 全局 Vue 错误处理统一收敛在 App.vue（created 中注册 handler 以展示错误覆盖层），
// 此处不再重复注册，避免双份日志与职责重复。
app.use(router)
app.mount('#app')