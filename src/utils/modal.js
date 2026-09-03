/**
 * 弹窗通用辅助：body 滚动锁定 + Esc 关闭。
 * 采用引用计数，支持多个弹窗同时打开；页面卸载时务必调用 cleanupModalLock。
 */

let lockCount = 0

/** 打开弹窗时锁定 body 滚动，全部关闭后自动解锁（引用计数） */
export function lockScroll(open) {
  lockCount = Math.max(0, lockCount + (open ? 1 : -1))
  document.body.style.overflow = lockCount > 0 ? 'hidden' : ''
}

/** 强制解除所有滚动锁定（用于页面卸载兜底，避免回到列表页后 body 仍被锁住） */
export function unlockAllScroll() {
  lockCount = 0
  document.body.style.overflow = ''
}

/** 注册 Esc 关闭回调，返回取消监听函数 */
export function bindEscape(onClose) {
  const handler = (e) => {
    if (e && e.key === 'Escape') onClose()
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}
