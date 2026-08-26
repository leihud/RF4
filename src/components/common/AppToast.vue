<template>
  <transition name="toast">
    <div v-if="visible" class="toast" :class="'toast-' + type">
      {{ message }}
    </div>
  </transition>
</template>

<script>
/**
 * 全局共享 Toast 提示组件。
 * 用法：<AppToast ref="toast" /> + this.$refs.toast.show('消息', 'success')
 * 内部自管 3 秒自动隐藏定时器，页面卸载时自动清理，父组件无需维护状态。
 */
export default {
  name: 'AppToast',
  data() {
    return {
      visible: false,
      message: '',
      type: 'info',
      timer: null
    }
  },
  methods: {
    show(message, type = 'info') {
      this.message = message
      this.type = type
      this.visible = true
      if (this.timer) clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        this.visible = false
      }, 3000)
    }
  },
  beforeUnmount() {
    if (this.timer) clearTimeout(this.timer)
  }
}
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 90%;
  word-break: break-word;
}

.toast-info {
  background-color: var(--color-primary);
  color: white;
}

.toast-error {
  background-color: var(--color-danger-strong);
  color: white;
}

.toast-success {
  background-color: var(--color-success);
  color: white;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
