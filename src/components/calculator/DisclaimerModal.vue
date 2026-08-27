<template>
  <div class="disclaimer-overlay" @click="$emit('close')">
    <div class="disclaimer-modal" @click.stop>
      <div class="disclaimer-header">
        <h3>免责声明</h3>
        <button class="disclaimer-close" @click="$emit('close')">×</button>
      </div>
      <div class="disclaimer-content">
        <p>本网站提供的装备计算器及参数对比工具仅供个人使用，非商业盈利行为。</p>
        <p>所有装备数据仅供参考，实际数值请以游戏内为准。</p>
        <p>使用本网站即表示您同意上述条款。</p>
      </div>
      <div class="disclaimer-footer">
        <button class="disclaimer-accept" @click="$emit('close')">我知道了</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DisclaimerModal',
  emits: ['close']
}
</script>

<style scoped>
.disclaimer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.disclaimer-modal {
  background-color: var(--color-surface);
  border-radius: 12px;
  width: 100%;
  max-width: 620px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.disclaimer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 28px;
  background-color: var(--color-primary-bg);
  border-bottom: 1px solid #bbdefb;
}

.disclaimer-header h3 {
  margin: 0;
  color: var(--color-primary);
  font-size: 20px;
  letter-spacing: 2px;
}

.disclaimer-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.disclaimer-close:hover {
  color: var(--color-primary);
}

.disclaimer-content {
  padding: 28px 32px;
}

.disclaimer-content p {
  margin: 0 0 18px 0;
  color: var(--text-main);
  font-size: 15px;
  line-height: 1.9;
  text-align: justify;
  text-justify: inter-ideograph;
  text-indent: 2em;
  widows: 3;
  orphans: 3;
}

.disclaimer-content p:last-child {
  margin-bottom: 0;
}

.disclaimer-footer {
  padding: 18px 32px;
  background-color: var(--bg-secondary);
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
}

.disclaimer-accept {
  padding: 12px 40px;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  letter-spacing: 2px;
}

.disclaimer-accept:hover {
  background-color: #0d47a1;
}
</style>
