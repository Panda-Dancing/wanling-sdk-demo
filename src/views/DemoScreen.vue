<template>
  <!-- 
    DemoScreen.vue - SDK 功能测试页面
    简洁布局，专注于 SDK 核心功能测试
  -->
  <div class="demo-screen">
    <!-- 顶部标题栏 -->
    <header class="demo-header">
      <h1 class="demo-title">🎭 XHuman Video Avatar SDK Demo</h1>
      <div class="demo-controls">
        <button
          class="control-btn"
          :class="{ active: avatarVisible }"
          @click="toggleAvatarVisibility"
        >
          {{ avatarVisible ? '🙈 隐藏' : '👁️ 展示' }}
        </button>
        <span class="status-badge" :class="{ hidden: !avatarVisible }">
          {{ avatarVisible ? '展示中' : '已隐藏' }}
        </span>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="demo-main">
      <AvatarPanel
        ref="avatarRef"
        :api-base-url="apiBaseUrl"
        :page-data="pageData"
        @reply="onReply"
        @data-out="onAvatarDataOut"
      />
    </main>

    <!-- 底部提示 -->
    <footer class="demo-footer">
      <span>💡 提示：发送文字消息或点击"实时对话"开启语音交互 | 播报功能可在右侧面板中测试</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AvatarPanel from '@/components/AvatarPanel.vue'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
const avatarRef = ref(null)
const avatarVisible = ref(true)
const pageData = ref({ scene: 'sdk_demo' })

function onAvatarDataOut(data) {
  if (data?.type === 'visibility_change') {
    avatarVisible.value = data?.payload?.visible !== false
  }
}

async function toggleAvatarVisibility() {
  if (!avatarRef.value) return
  if (avatarVisible.value) {
    await avatarRef.value.hideAvatar?.()
    avatarVisible.value = false
  } else {
    await avatarRef.value.showAvatar?.()
    avatarVisible.value = true
  }
}

function onReply() {
  console.log('收到虚拟人回复')
}

onMounted(() => {
  console.log('✅ SDK Demo 页面已加载')
  console.log('📡 API 地址:', apiBaseUrl || '使用代理转发')
})
</script>

<style scoped>
.demo-screen {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0a1628 0%, #1a2a40 100%);
}

/* 顶部标题栏 */
.demo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(10, 22, 40, 0.9);
  border-bottom: 1px solid rgba(59, 123, 196, 0.2);
  flex-shrink: 0;
}

.demo-title {
  font-size: 20px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
}

.demo-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-btn {
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: rgba(59, 123, 196, 0.8);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn:hover {
  background: rgba(79, 143, 216, 1);
}

.control-btn.active {
  background: rgba(255, 193, 7, 0.9);
  color: #17283d;
}

.status-badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(126, 231, 135, 0.2);
  color: rgba(126, 231, 135, 0.95);
}

.status-badge.hidden {
  background: rgba(255, 193, 7, 0.2);
  color: rgba(255, 193, 7, 0.95);
}

/* 主内容区 */
.demo-main {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  min-height: 0;
}

/* 底部提示 */
.demo-footer {
  padding: 12px 24px;
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(10, 22, 40, 0.6);
  border-top: 1px solid rgba(59, 123, 196, 0.15);
  flex-shrink: 0;
}
</style>
