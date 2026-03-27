<template>
  <!-- AvatarPanel.vue - SDK 功能测试面板 -->
  <div class="avatar-panel" :class="{ sleeping: isSleeping, 'hidden-state': !isVisible }">
    <!-- 左侧：虚拟人视频区域 -->
    <div class="avatar-section">
      <div ref="containerRef" class="avatar-container">
        <div v-if="!ready" class="loading">
          <span class="loading-text">虚拟人加载中...</span>
          <span class="loading-hint">请确保使用 Chrome 94+ 浏览器</span>
        </div>
        <div v-if="isSleeping && isVisible" class="sleep-indicator">
          <span class="sleep-icon">💤</span>
          <span class="sleep-text">沉睡中</span>
        </div>
      </div>
      <!-- 状态指示器 -->
      <div class="avatar-status-bar">
        <span class="status-dot" :class="ready ? 'online' : 'offline'"></span>
        <span class="status-text">{{ ready ? '已连接' : '连接中...' }}</span>
        <span class="state-divider">|</span>
        <span class="avatar-state" :class="avatarState">
          <span class="state-icon">{{ stateDisplay.icon }}</span>
          <span class="state-label">{{ stateDisplay.label }}</span>
        </span>
      </div>
    </div>

    <!-- 右侧：功能面板区域 -->
    <div class="function-section">
      <!-- Tab 切换 -->
      <div class="tab-bar">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'chat' }"
          @click="activeTab = 'chat'"
        >
          💬 对话
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'voice' }"
          @click="activeTab = 'voice'"
        >
          🎤 语音
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'broadcast' }"
          @click="activeTab = 'broadcast'"
        >
          📢 播报
          <span v-if="broadcastState.queuedCount" class="tab-badge">{{ broadcastState.queuedCount }}</span>
        </button>
      </div>

      <!-- Tab 内容区 -->
      <div class="tab-content">
        <!-- 对话面板 -->
        <div v-show="activeTab === 'chat'" class="panel chat-panel">
          <div class="message-list" ref="messageListRef">
            <div v-if="!messages.length" class="empty-hint">
              发送消息开始对话...
            </div>
            <div
              v-for="(msg, i) in messages"
              :key="i"
              class="message"
              :class="msg.role"
            >
              {{ msg.text }}
            </div>
            <div v-if="asrTempText && isStreaming" class="message user asr-temp">
              {{ asrTempText }}
              <span class="asr-badge">识别中</span>
            </div>
            <div v-if="replyText || loading" class="message assistant">
              {{ loading && !replyText ? '思考中...' : replyText }}
            </div>
          </div>
          <div class="input-area">
            <input
              v-model="inputText"
              type="text"
              class="text-input"
              :placeholder="isSleeping ? '虚拟人正在休息，说唤醒词唤醒...' : (voiceResponseMode === 'asr_only' ? 'asr_only 模式下文本对话已禁用' : '输入消息...')"
              @keydown.enter="send"
              :disabled="loading || !isVisible || voiceResponseMode === 'asr_only'"
            />
            <button 
              class="send-btn" 
              :disabled="loading || !inputText.trim() || !isVisible || voiceResponseMode === 'asr_only'" 
              @click="send"
            >
              发送
            </button>
          </div>
        </div>

        <!-- 语音面板 -->
        <div v-show="activeTab === 'voice'" class="panel voice-panel">
          <div class="voice-status">
            <div class="voice-icon" :class="{ active: isStreaming }">
              {{ isStreaming ? '🎙️' : '🎤' }}
            </div>
            <p class="voice-hint">
              {{ isStreaming ? '正在录音，请说话...' : '点击下方按钮开始实时语音对话' }}
            </p>
            <p v-if="streamStatus" class="voice-detail">{{ streamStatus }}</p>
          </div>
          <div class="voice-mode-card">
            <p class="voice-mode-title">回复模式</p>
            <label class="voice-mode-option">
              <input v-model="voiceResponseMode" type="radio" value="auto_reply" :disabled="isStreaming" />
              <span>自动回复</span>
            </label>
            <label class="voice-mode-option">
              <input v-model="voiceResponseMode" type="radio" value="asr_only" :disabled="isStreaming" />
              <span>仅返回 ASR 文本</span>
            </label>
          </div>
          <div class="voice-actions">
            <button
              v-if="!isStreaming"
              class="voice-btn start"
              :disabled="!ready || !isVisible"
              @click="startStream"
            >
              开始对话
            </button>
            <button
              v-else
              class="voice-btn stop"
              @click="stopStream"
            >
              结束对话
            </button>
          </div>
          <div class="voice-note">
            <p v-if="voiceResponseMode === 'auto_reply'">💡 语音对话时，ASR 最终文本会自动触发虚拟人回复</p>
            <p v-else>💡 当前模式只返回 ASR 文本，不触发 LLM、TTS 和虚拟人播报</p>
          </div>
        </div>

        <!-- 播报面板 -->
        <div v-show="activeTab === 'broadcast'" class="panel broadcast-panel">
          <div class="broadcast-status-bar">
            <span class="broadcast-context" :class="broadcastState.currentContext">
              {{ broadcastState.currentContext === 'broadcast' ? '🔊 播报中' : '⏸️ 空闲' }}
            </span>
            <span v-if="broadcastState.activeBroadcast" class="broadcast-current">
              正在播放: {{ broadcastState.activeBroadcast.text?.slice(0, 20) }}...
            </span>
          </div>

          <div class="broadcast-form">
            <textarea
              v-model="broadcastText"
              class="broadcast-textarea"
              placeholder="输入要播报的内容..."
              :disabled="!ready || !isVisible"
            ></textarea>

            <div class="broadcast-options">
              <label class="option-item">
                <span>优先级</span>
                <input v-model.number="broadcastPriority" type="number" min="1" max="100" class="priority-input" />
              </label>
              <label class="option-item checkbox">
                <input v-model="broadcastInterrupt" type="checkbox" />
                <span>可抢占</span>
              </label>
              <label class="option-item checkbox">
                <input v-model="broadcastEnqueue" type="checkbox" />
                <span>允许入队</span>
              </label>
            </div>

            <div class="broadcast-buttons">
              <button
                class="bc-btn primary"
                :disabled="!ready || !isVisible || !broadcastText.trim()"
                @click="sendBroadcast()"
              >
                发送播报
              </button>
              <button
                class="bc-btn danger"
                :disabled="!broadcastState.activeBroadcast"
                @click="cancelActiveBroadcast"
              >
                取消当前
              </button>
              <button
                class="bc-btn warning"
                :disabled="!broadcastState.queuedCount"
                @click="clearQueuedBroadcasts"
              >
                清空队列
              </button>
            </div>
          </div>

          <div class="broadcast-log">
            <div class="log-title">事件日志</div>
            <div class="log-content">{{ lastBroadcastEvent }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { VideoAvatar } from '@wanlingsdk/avatar-sdk'

const props = defineProps({
  apiBaseUrl: { type: String, default: '/' },
  pageData: { type: Object, default: () => ({}) },
  roleId: { type: String, default: 'xiao_ye' },
  ttsSpeed: { type: Number, default: 0 }  // TTS 语速（-500 到 500）
})

const emit = defineEmits(['reply', 'dataOut', 'streamState', 'stateChange'])

// DOM refs
const containerRef = ref(null)
const messageListRef = ref(null)

// 状态变量
const ready = ref(false)
const loading = ref(false)
const inputText = ref('')
const replyText = ref('')
const messages = ref([])
const isSleeping = ref(false)
const isVisible = ref(true)
const isStreaming = ref(false)
const streamStatus = ref('')
const asrTempText = ref('')
const activeTab = ref('chat')
const avatarState = ref('idle')

// 状态显示配置
const STATE_CONFIG = {
  idle: { icon: '⏸️', label: '待机' },
  listen: { icon: '👂', label: '倾听' },
  think: { icon: '💡', label: '思考' },
  speak: { icon: '🗣️', label: '说话' },
  sleep: { icon: '💤', label: '沉睡' },
  wake: { icon: '✨', label: '唤醒' },
  wave: { icon: '👋', label: '打招呼' }
}

const stateDisplay = computed(() => {
  return STATE_CONFIG[avatarState.value] || STATE_CONFIG.idle
})

// 播报相关
const broadcastText = ref('欢迎来到数字人主动播报演示')
const broadcastPriority = ref(50)
const broadcastInterrupt = ref(true)
const broadcastEnqueue = ref(true)
const broadcastState = ref({
  currentContext: 'chat',
  activeBroadcast: null,
  queuedCount: 0,
  queue: []
})
const lastBroadcastEvent = ref('暂无事件')
const voiceResponseMode = ref('auto_reply')

// SDK 实例
let avatar = null
const sessionId = 'demo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9)

function getBaseUrl() {
  const v = String(props.apiBaseUrl || '').trim()
  if (v && v !== '/') return v
  return import.meta.env.VITE_API_BASE_URL || v || ''
}

function normalizeBaseUrl(baseUrl) {
  const v = String(baseUrl || '').trim()
  if (!v || v === '/') return window.location.origin
  if (v.startsWith('/')) return `${window.location.origin}${v}`.replace(/\/$/, '')
  return v.replace(/\/$/, '')
}

async function initAvatar() {
  if (!containerRef.value) return
  try {
    const baseUrl = normalizeBaseUrl(getBaseUrl())
    avatar = new VideoAvatar({
      apiBaseUrl: baseUrl,
      characterId: props.roleId,
      container: containerRef.value,
      useLLMStream: true,
      voiceResponseMode: voiceResponseMode.value,
      debug: false,
    })
    await avatar.init()
    if (props.pageData && Object.keys(props.pageData).length > 0) {
      avatar.setPageData(props.pageData)
    }
    connectSocket()
  } catch (error) {
    console.error('[AvatarPanel] 初始化失败:', error)
    ready.value = false
  }
}

function connectSocket() {
  if (!avatar) return
  const socketUrl = normalizeBaseUrl(getBaseUrl())
  avatar.connectTtsaSocket({
    url: socketUrl,
    room: sessionId,
    ttsSpeed: props.ttsSpeed,  // TTS 语速（-500 到 500）
    onReady: () => {
      ready.value = true
      syncBroadcastState()
    },
    onDataOut: (data) => {
      emit('dataOut', data)
      handleDataOut(data)
    },
    onReplyText: (data) => {
      handleReplyText(data)
    },
    onError: (err) => {
      console.error('[AvatarPanel] 错误:', err)
      handleError(err)
    }
  })
}

function handleDataOut(data) {
  if (!data?.type) return
  switch (data.type) {
    case 'state_change':
      const oldState = data?.payload?.old_state || ''
      const newState = data?.payload?.new_state || ''
      if (newState && STATE_CONFIG[newState]) {
        avatarState.value = newState
        emit('stateChange', { oldState, newState })
      }
      break
    case 'sleep_state_change':
      isSleeping.value = data?.payload?.isSleeping === true
      const sleepMessage = data?.payload?.message || (isSleeping.value ? '虚拟人已沉睡' : '虚拟人已唤醒')
      replyText.value = ''
      // 无论进入沉睡还是唤醒，都显示对应消息并重置 loading
      // 因为沉睡/唤醒使用的是 direct_speech_service，不会发送 reply_text 事件
      loading.value = false
      messages.value.push({ role: 'assistant', text: sleepMessage })
      scrollToBottom()
      break
    case 'asr_status':
      streamStatus.value = data?.payload?.status || ''
      emit('streamState', { streaming: isStreaming.value, status: data?.payload?.status })
      break
    case 'asr_transcription':
      const asrText = data?.payload?.content || ''
      const asrIsFinal = data?.payload?.is_final
      if (asrIsFinal && asrText.trim()) {
        messages.value.push({ role: 'user', text: asrText.trim() })
        asrTempText.value = ''
        scrollToBottom()
      } else if (asrText.trim()) {
        asrTempText.value = asrText
      }
      break
    case 'visibility_change':
      isVisible.value = data?.payload?.visible !== false
      if (!isVisible.value) {
        loading.value = false
        replyText.value = ''
        asrTempText.value = ''
        isStreaming.value = false
        streamStatus.value = ''
      }
      break
    case 'broadcast_start':
      syncBroadcastState()
      lastBroadcastEvent.value = `▶ 开始播报: ${data?.payload?.broadcast?.id || ''}`
      break
    case 'broadcast_end':
      syncBroadcastState()
      lastBroadcastEvent.value = `⏹ 播报结束: ${data?.payload?.reason || 'completed'}`
      break
    case 'broadcast_interrupted':
      syncBroadcastState()
      lastBroadcastEvent.value = `⚠ 播报中断: ${data?.payload?.reason || 'unknown'}`
      break
    case 'broadcast_rejected':
      syncBroadcastState()
      lastBroadcastEvent.value = `❌ 播报拒绝: ${data?.payload?.reason || 'busy'}`
      break
    case 'broadcast_queue_cleared':
      syncBroadcastState()
      lastBroadcastEvent.value = `🗑 队列已清空`
      break
    case 'broadcast_queue_change':
      syncBroadcastState()
      break
    case 'message_ignored':
      // 消息被忽略（如沉睡状态），重置 loading 并显示提示，但保留用户消息
      loading.value = false
      replyText.value = ''
      const ignoredMsg = data?.payload?.message || '消息已被忽略'
      messages.value.push({ role: 'assistant', text: ignoredMsg })
      scrollToBottom()
      break
  }
}

function handleReplyText(data) {
  const text = data?.text ?? ''
  const isFinal = data?.is_final
  const streamSeq = data?.stream_seq ?? 0
  if (isFinal) {
    const finalText = replyText.value || text
    if (finalText) {
      messages.value.push({ role: 'assistant', text: finalText })
      replyText.value = ''
      loading.value = false
      scrollToBottom()
      emit('reply', { success: true, reply_text: finalText })
    }
    return
  }
  if (streamSeq === 0) {
    replyText.value = text
  } else {
    replyText.value += text
  }
}

function handleError(err) {
  const errMsg = err?.msg ? `错误: ${err.msg}` : '服务异常，请稍后重试'
  replyText.value = ''
  loading.value = false
  messages.value.push({ role: 'assistant', text: errMsg })
  scrollToBottom()
}

function send() {
  const text = (inputText.value || '').trim()
  if (voiceResponseMode.value === 'asr_only') return
  // 沉睡状态下也允许发送消息（用于唤醒词唤醒虚拟人）
  if (!text || loading.value || !avatar || !isVisible.value) return
  messages.value.push({ role: 'user', text })
  inputText.value = ''
  // 沉睡状态下不设置 loading，避免显示"思考中..."并禁用输入框
  // 唤醒成功后服务端会正常返回回复，不是唤醒词则返回 message_ignored
  if (!isSleeping.value) {
    loading.value = true
  }
  replyText.value = ''
  avatar.sendTextViaSocket(text)
  scrollToBottom()
}

function syncBroadcastState() {
  if (!avatar || typeof avatar.getBroadcastState !== 'function') return
  broadcastState.value = avatar.getBroadcastState()
}

function sendBroadcast(options = {}) {
  const text = String(options?.text ?? broadcastText.value ?? '').trim()
  if (!text || !avatar || !isVisible.value) return
  if (options?.text) broadcastText.value = text
  const broadcastId = avatar.broadcast({
    text,
    priority: Number.isFinite(Number(options?.priority)) ? Number(options.priority) : broadcastPriority.value,
    interrupt: typeof options?.interrupt === 'boolean' ? options.interrupt : broadcastInterrupt.value,
    enqueue: typeof options?.enqueue === 'boolean' ? options.enqueue : broadcastEnqueue.value,
    source: options?.source || 'frontend-sdk-demo'
  })
  if (broadcastId) {
    lastBroadcastEvent.value = `📤 已发送: ${broadcastId}`
    syncBroadcastState()
  }
}

function cancelActiveBroadcast() {
  if (!avatar || !broadcastState.value.activeBroadcast) return
  avatar.cancelBroadcast(broadcastState.value.activeBroadcast.id)
}

function clearQueuedBroadcasts() {
  if (!avatar) return
  avatar.clearBroadcastQueue()
}

async function startStream() {
  if (!avatar || !isVisible.value) return
  try {
    asrTempText.value = ''
    await avatar.startVoiceStream({
      voiceResponseMode: voiceResponseMode.value
    })
    isStreaming.value = true
    emit('streamState', { streaming: true, status: 'connecting' })
  } catch (error) {
    console.error('[AvatarPanel] 启动实时对话失败:', error)
    streamStatus.value = '启动失败'
  }
}

function stopStream() {
  if (!avatar) return
  avatar.stopVoiceStream()
  isStreaming.value = false
  streamStatus.value = ''
  emit('streamState', { streaming: false, status: 'ended' })
}

async function hideAvatar() {
  if (!avatar || !isVisible.value) return
  loading.value = false
  replyText.value = ''
  asrTempText.value = ''
  isStreaming.value = false
  streamStatus.value = ''
  await avatar.hide()
  isVisible.value = false
  syncBroadcastState()
}

async function showAvatar() {
  if (!avatar || isVisible.value) return
  await avatar.show()
  isVisible.value = true
  syncBroadcastState()
}

async function toggleVisibility() {
  if (isVisible.value) {
    await hideAvatar()
  } else {
    await showAvatar()
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

defineExpose({
  send,
  hideAvatar,
  showAvatar,
  toggleVisibility,
  sendBroadcast,
  cancelActiveBroadcast,
  clearQueuedBroadcasts,
  getBroadcastState: () => broadcastState.value
})

watch(() => props.pageData, (data) => {
  if (avatar && typeof avatar.setPageData === 'function' && data && Object.keys(data).length > 0) {
    avatar.setPageData(data)
  }
}, { deep: true })

watch(voiceResponseMode, (mode) => {
  if (mode === 'asr_only') {
    inputText.value = ''
    loading.value = false
    replyText.value = ''
  }
  if (avatar && typeof avatar.setVoiceResponseMode === 'function') {
    avatar.setVoiceResponseMode(mode)
  }
})

onMounted(() => {
  initAvatar()
})

onUnmounted(() => {
  if (avatar && typeof avatar.stopVoiceStream === 'function') {
    avatar.stopVoiceStream()
  }
  if (avatar && typeof avatar.destroy === 'function') {
    avatar.destroy()
  }
})
</script>

<style scoped>
.avatar-panel {
  display: flex;
  width: 900px;
  max-width: 95vw;
  height: 550px;
  max-height: 85vh;
  background: rgba(15, 25, 40, 0.98);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  border: 1px solid rgba(59, 123, 196, 0.3);
}

/* 左侧虚拟人区域 */
.avatar-section {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(20, 35, 55, 0.9) 0%, rgba(10, 20, 35, 0.95) 100%);
  border-right: 1px solid rgba(59, 123, 196, 0.2);
}

.avatar-container {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.avatar-container :deep(video),
.avatar-container :deep(canvas) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.avatar-status-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.4);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.state-divider {
  margin: 0 4px;
  color: rgba(255, 255, 255, 0.3);
}

.avatar-state {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.avatar-state .state-icon {
  font-size: 12px;
}

.avatar-state .state-label {
  text-transform: capitalize;
}

/* 状态颜色 */
.avatar-state.idle {
  background: rgba(100, 116, 139, 0.4);
  color: rgba(255, 255, 255, 0.8);
}

.avatar-state.listen {
  background: rgba(59, 130, 246, 0.4);
  color: #93c5fd;
  animation: state-pulse 1.5s ease-in-out infinite;
}

.avatar-state.think {
  background: rgba(245, 158, 11, 0.4);
  color: #fcd34d;
  animation: state-pulse 1s ease-in-out infinite;
}

.avatar-state.speak {
  background: rgba(34, 197, 94, 0.4);
  color: #86efac;
  animation: state-pulse 0.8s ease-in-out infinite;
}

.avatar-state.sleep {
  background: rgba(139, 92, 246, 0.4);
  color: #c4b5fd;
}

.avatar-state.wake {
  background: rgba(236, 72, 153, 0.4);
  color: #f9a8d4;
  animation: state-pulse 0.6s ease-in-out infinite;
}

.avatar-state.wave {
  background: rgba(20, 184, 166, 0.4);
  color: #5eead4;
}

@keyframes state-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: #4ade80;
  box-shadow: 0 0 8px #4ade80;
}

.status-dot.offline {
  background: #fbbf24;
}

.loading, .sleep-indicator, .hidden-indicator {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 12px;
  backdrop-filter: blur(4px);
}

.loading-text, .sleep-text, .hidden-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.loading-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.sleep-icon {
  font-size: 28px;
}

/* 右侧功能区域 */
.function-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tab-bar {
  display: flex;
  background: rgba(10, 20, 35, 0.8);
  border-bottom: 1px solid rgba(59, 123, 196, 0.2);
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  padding: 14px 16px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.tab-btn:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(59, 123, 196, 0.1);
}

.tab-btn.active {
  color: #fff;
  background: rgba(59, 123, 196, 0.2);
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #667eea, #764ba2);
}

.tab-badge {
  margin-left: 6px;
  padding: 2px 6px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  border-radius: 10px;
}

.tab-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 对话面板 */
.chat-panel .message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-hint {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  padding: 40px;
}

.message {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.message.user {
  align-self: flex-end;
  background: rgba(102, 126, 234, 0.8);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message.assistant {
  align-self: flex-start;
  background: rgba(40, 60, 90, 0.8);
  color: rgba(255, 255, 255, 0.95);
  border-bottom-left-radius: 4px;
}

.message.asr-temp {
  opacity: 0.7;
  border: 1px dashed rgba(255, 255, 255, 0.3);
}

.asr-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: 11px;
}

.input-area {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid rgba(59, 123, 196, 0.2);
  background: rgba(10, 20, 35, 0.5);
}

.text-input {
  flex: 1;
  height: 40px;
  padding: 0 14px;
  border: 1px solid rgba(59, 123, 196, 0.4);
  border-radius: 8px;
  background: rgba(20, 35, 55, 0.8);
  color: #fff;
  font-size: 14px;
  outline: none;
}

.text-input:focus {
  border-color: rgba(102, 126, 234, 0.8);
}

.send-btn {
  height: 40px;
  padding: 0 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 语音面板 */
.voice-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 24px;
}

.voice-status {
  text-align: center;
}

.voice-icon {
  font-size: 64px;
  margin-bottom: 16px;
  transition: transform 0.3s;
}

.voice-icon.active {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.voice-hint {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.voice-detail {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin: 8px 0 0;
}

.voice-mode-card {
  width: 100%;
  max-width: 320px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(10, 20, 35, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.voice-mode-title {
  margin: 0 0 10px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
}

.voice-mode-option {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.92);
  font-size: 14px;
}

.voice-mode-option + .voice-mode-option {
  margin-top: 10px;
}

.voice-actions {
  display: flex;
  gap: 12px;
}

.voice-btn {
  height: 48px;
  padding: 0 32px;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.voice-btn.start {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #fff;
}

.voice-btn.stop {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
}

.voice-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.voice-note {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

.voice-note p {
  margin: 0;
}

/* 播报面板 */
.broadcast-panel {
  padding: 16px;
  gap: 16px;
}

.broadcast-status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(10, 20, 35, 0.6);
  border-radius: 8px;
}

.broadcast-context {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.broadcast-context.chat {
  background: rgba(100, 116, 139, 0.3);
  color: rgba(255, 255, 255, 0.7);
}

.broadcast-context.broadcast {
  background: rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

.broadcast-current {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.broadcast-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.broadcast-textarea {
  width: 100%;
  height: 80px;
  padding: 12px;
  border: 1px solid rgba(59, 123, 196, 0.4);
  border-radius: 8px;
  background: rgba(20, 35, 55, 0.8);
  color: #fff;
  font-size: 14px;
  resize: none;
  outline: none;
}

.broadcast-textarea:focus {
  border-color: rgba(102, 126, 234, 0.8);
}

.broadcast-options {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.option-item.checkbox {
  cursor: pointer;
}

.priority-input {
  width: 60px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid rgba(59, 123, 196, 0.4);
  border-radius: 4px;
  background: rgba(20, 35, 55, 0.8);
  color: #fff;
  font-size: 13px;
  text-align: center;
}

.broadcast-buttons {
  display: flex;
  gap: 10px;
}

.bc-btn {
  flex: 1;
  height: 38px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.bc-btn.primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}

.bc-btn.danger {
  background: rgba(239, 68, 68, 0.8);
  color: #fff;
}

.bc-btn.warning {
  background: rgba(245, 158, 11, 0.8);
  color: #fff;
}

.bc-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.broadcast-log {
  padding: 10px 14px;
  background: rgba(10, 20, 35, 0.6);
  border-radius: 8px;
}

.log-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
}

.log-content {
  font-size: 13px;
  color: rgba(126, 231, 135, 0.9);
}

/* 沉睡状态 */
.avatar-panel.sleeping .avatar-section {
  opacity: 0.7;
  filter: grayscale(30%);
}

/* 隐藏状态 - 完全不可见 */
.avatar-panel.hidden-state .avatar-section {
  visibility: hidden;
}
</style>
