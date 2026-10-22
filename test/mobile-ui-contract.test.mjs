import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const avatarPanel = await readFile(
  new URL('../src/components/AvatarPanel.vue', import.meta.url),
  'utf8',
)
const demoScreen = await readFile(
  new URL('../src/views/DemoScreen.vue', import.meta.url),
  'utf8',
)
const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('移动端使用独立按住录音按钮且桌面输入仍保留 400ms 长按', () => {
  assert.match(avatarPanel, /class="mobile-record-btn"/)
  assert.match(avatarPanel, /@pointerdown="onMobileRecordPointerDown"/)
  assert.match(avatarPanel, /@pointerup="onMobileRecordPointerUp"/)
  assert.match(avatarPanel, /@pointercancel="onMobileRecordPointerCancel"/)
  assert.doesNotMatch(avatarPanel, /@lostpointercapture=/)
  assert.match(avatarPanel, /@contextmenu\.prevent/)
  assert.match(avatarPanel, /const LONG_PRESS_MS = 400/)
  assert.match(avatarPanel, /if \(isMobileLayout\.value\) return/)
  assert.match(avatarPanel, /finishPressRecord\(\{ terminationSource: source \}\)/)
})

test('移动端不自动预热或跨会话占用麦克风', () => {
  assert.doesNotMatch(avatarPanel, /warmupMobileMicrophone/)
  assert.doesNotMatch(avatarPanel, /avatar\.prepareMicrophone\(/)
})

test('正常松手立即退出录音视觉，收尾阶段单独显示识别中', () => {
  assert.match(avatarPanel, /const isPressFinalizing = ref\(false\)/)
  assert.match(avatarPanel, /isPressRecording\.value = state === 'starting' \|\| state === 'recording'/)
  assert.match(avatarPanel, /isPressFinalizing\.value = state === 'finishing'/)
  assert.match(avatarPanel, /isPressFinalizing \? '识别中…'/)
})

test('零 PCM 和预连接缓存溢出显示真实错误，不再误报权限或网络', () => {
  assert.match(avatarPanel, /error\?\.code === 'MIC_NOT_READY'/)
  assert.match(avatarPanel, /error\?\.code === 'MIC_BUFFER_OVERFLOW'/)
  assert.match(avatarPanel, /未采集到音频，请重新按住录音/)
  assert.match(avatarPanel, /网络连接过慢，录音缓存已满，请重试/)
})

test('诊断卡片位于语音 Tab 内并支持复制 trace', () => {
  const voiceStart = avatarPanel.indexOf('class="panel voice-panel"')
  const diagnostics = avatarPanel.indexOf('class="asr-diagnostics-card"')
  const broadcastStart = avatarPanel.indexOf('class="panel broadcast-panel"')
  assert.ok(voiceStart >= 0 && diagnostics > voiceStart && diagnostics < broadcastStart)
  assert.match(avatarPanel, /copyDiagnosticsTrace/)
  assert.match(avatarPanel, /最近一次 ASR 诊断/)
  assert.match(avatarPanel, /采集策略/)
  assert.match(avatarPanel, /输入全零回调/)
  assert.match(avatarPanel, /最长连续全零/)
  assert.match(avatarPanel, /Track mute/)
  assert.match(avatarPanel, /Track unmute/)
})

test('按住录音错误在聊天 Tab 可见，实时语音入口受录音状态互斥', () => {
  const chatStart = avatarPanel.indexOf('class="panel chat-panel"')
  const errorAlert = avatarPanel.indexOf('class="press-record-error"')
  const voiceStart = avatarPanel.indexOf('class="panel voice-panel"')
  assert.ok(chatStart >= 0 && errorAlert > chatStart && errorAlert < voiceStart)
  assert.match(avatarPanel, /role="alert"/)
  assert.match(avatarPanel, /class="voice-btn start"[\s\S]*?:disabled="[^"]*isPressRecording[^"]*"/)
})

test('移动端媒体规则覆盖常规竖屏与 844×390 横屏', () => {
  const query = /@media \(max-width: 768px\), \(max-width: 900px\) and \(max-height: 500px\)/
  assert.match(avatarPanel, query)
  assert.match(demoScreen, query)
  assert.match(avatarPanel, /touch-action:\s*none/)
  assert.match(avatarPanel, /user-select:\s*none/)
  assert.match(avatarPanel, /-webkit-touch-callout:\s*none/)
})

test('矮横屏输入区保持单行，避免底部录音按钮被裁切', () => {
  assert.match(
    avatarPanel,
    /@media \(max-width: 900px\) and \(max-height: 500px\)[\s\S]*?\.input-area\s*\{[^}]*flex-wrap:\s*nowrap/s,
  )
  assert.match(
    avatarPanel,
    /@media \(max-width: 900px\) and \(max-height: 500px\)[\s\S]*?\.mobile-record-btn\s*\{[^}]*flex:\s*0 0 132px/s,
  )
})

test('外层页面使用动态视口、安全区且移动端隐藏 footer', () => {
  assert.match(indexHtml, /viewport-fit=cover/)
  assert.match(demoScreen, /100dvh/)
  assert.match(demoScreen, /env\(safe-area-inset-top\)/)
  assert.match(demoScreen, /\.demo-footer\s*\{[^}]*display:\s*none/s)
})
