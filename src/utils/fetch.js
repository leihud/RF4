/**
 * 带超时的 fetch 封装。
 *
 * 背景：页面所有数据请求均未设置超时，当网络异常或 CF 边缘无响应时，
 * 浏览器默认 fetch 可悬挂数十秒甚至数分钟（尤其无任何缓存的首访），
 * 造成页面长时间停留在加载态。统一收敛到这里，默认 15 秒超时。
 *
 * 实现：AbortController + setTimeout，超时即 abort 触发 DOMException('AbortError')，
 * 由调用方既有 catch/错误兜底逻辑统一处理；兼容外部传入 signal（透传 abort）。
 *
 * @param {string|URL} url
 * @param {RequestInit} [options]
 * @param {number} [timeoutMs=15000]
 * @returns {Promise<Response>}
 */
export function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const { signal: externalSignal, ...restOptions } = options
  const controller = new AbortController()
  const onExternalAbort = () => controller.abort()

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort()
    } else {
      externalSignal.addEventListener('abort', onExternalAbort)
    }
  }

  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const cleanup = () => {
    clearTimeout(timer)
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort)
    }
  }

  const request = fetch(url, { ...restOptions, signal: controller.signal })
  // 请求完成（成功或失败）后清理定时器与监听；不清空 signal 避免未决请求悬挂
  request.then(cleanup, cleanup)
  return request
}
