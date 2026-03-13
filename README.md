# XHuman Video Avatar SDK - 前端接入示例

这是一个简化版的 SDK 接入示例项目，基于 Vue 3 + Vite 构建，演示了如何将 XHuman Video Avatar SDK 集成到您的 Web 应用中。

## 项目结构

```
frontend-demo/
├── .env.development          # 开发环境配置
├── .env.production           # 生产环境配置
├── .env.example              # 环境变量示例
├── index.html                # 入口 HTML
├── package.json              # 项目依赖
├── vite.config.js            # Vite 配置
├── README.md                 # 本文档
└── src/
    ├── main.js               # 应用入口
    ├── App.vue               # 根组件
    ├── views/
    │   └── DemoScreen.vue    # 主页面（SDK 接入演示）
    └── components/
        ├── AvatarPanel.vue   # 虚拟人对话面板（核心 SDK 接入组件）
        └── MapPanel.vue      # 地图/数据展示面板（业务组件示例）
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173 查看效果。

### 3. 使用本地 SDK 源码联调

如果要直接验证仓库内 `SDK-video/` 的最新改动，建议使用本地 SDK 源码模式启动：

```bash
VITE_USE_LOCAL_SDK=true npm run dev
```

开启后，`frontend-sdk-demo` 会把 `@wanlingsdk/avatar-sdk` 映射到 `../SDK-video/src/index.js`。

## SDK 接入要点

### 核心接入流程

本 Demo 演示了 SDK 的标准接入流程：

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   DemoScreen    │────▶│   AvatarPanel    │────▶│  VideoAvatar    │
│   (页面组件)     │     │  (SDK 封装组件)   │     │   (SDK 核心)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                        │
        │  1. 传入 apiBaseUrl    │  2. 创建实例            │
        │  2. 监听 select-city   │  3. 调用 init()         │  4. 连接 WebSocket
        │  3. 调用 askCity()     │  4. 连接 WebSocket      │  5. 发送/接收消息
        ▼                        ▼                        ▼
```

### 关键代码说明

#### 1. 引入 SDK

在 `AvatarPanel.vue` 中导入 SDK：

```javascript
import { VideoAvatar } from '@wanlingsdk/avatar-sdk'
```

#### 2. 创建实例

```javascript
avatar = new VideoAvatar({
  apiBaseUrl: getBaseUrl(),    // 后端服务地址
  characterId: 'xiao_ma',      // 角色 ID， 目前支持xiao_ma, xiao_ye（交投项目avatar， 新模型和视频素材完善中，测试可先使用）
  container: containerRef.value, // 视频容器 DOM
  useLLMStream: true           // 启用流式输出
})
```

#### 3. 初始化并连接 WebSocket

```javascript
// 初始化
await avatar.init()

// 连接 WebSocket
avatar.connectTtsaSocket({
  url: getBaseUrl(),
  room: sessionId,             // 会话 ID
  onReady: () => { /* 连接成功 */ },
  onReplyText: (data) => { /* 收到文本回复 */ },
  onDataOut: (data) => { /* 收到其他数据（状态、ASR等） */ }
})
```

#### 4. 监听状态变更和其他事件

通过 `onDataOut` 回调接收数字人状态变更、ASR 识别文本等事件：

```javascript
avatar.connectTtsaSocket({
  // ...其他配置
  onDataOut: (data) => {
    switch (data.type) {
      case 'state_change':
        // 数字人状态变更
        // payload: { old_state: 'idle', new_state: 'think' }
        console.log('状态变更:', data.payload.old_state, '→', data.payload.new_state)
        break
        
      case 'sleep_state_change':
        // 沉睡状态变更
        // payload: { isSleeping: true/false, message: '虚拟人已沉睡' }
        console.log('沉睡状态:', data.payload.isSleeping)
        break
        
      case 'asr_transcription':
        // ASR 语音识别文本
        // payload: { content: '识别的文本', is_final: true/false }
        console.log('ASR 识别:', data.payload.content, data.payload.is_final ? '(最终)' : '(中间)')
        break
        
      case 'asr_status':
        // ASR 连接状态
        // payload: { status: 'connecting'|'connected'|'listening'|'stopped'|'error' }
        console.log('ASR 状态:', data.payload.status)
        break
        
      case 'error':
        // 错误信息
        console.error('错误:', data.payload)
        break
    }
  }
})
```

**数字人状态值说明：**

| 状态 | 说明 |
|------|------|
| `idle` | 待机（无用户交互） |
| `listen` | 听（用户正在说话） |
| `think` | 思考（处理用户输入） |
| `speak` | 说话（TTS 播放中） |
| `sleep` | 沉睡 |
| `wake` | 唤醒中 |

**典型状态流转：**
- 文本对话：`idle → think → speak → idle`
- 语音对话：`idle → listen → think → speak → idle`

#### 5. 发送消息

```javascript
// 发送文本消息
avatar.sendTextViaSocket('你好')

// 启动实时语音对话
await avatar.startVoiceStream()

// 停止实时语音对话
avatar.stopVoiceStream()
```

#### 6. 隐藏 / 展示数字人

SDK 现在提供会话级的展示开关。隐藏后：

- 不再接收 ASR 输入
- 忽略新的文本/语音请求
- 当前正在进行的回答会被中断

```javascript
// 隐藏数字人
await avatar.hide()

// 展示数字人
await avatar.show()

// 等价写法
await avatar.setVisible(false)
await avatar.setVisible(true)

// 查询当前可见状态
const visible = avatar.isVisible()
```

也可以通过 `onDataOut` 监听后端同步回来的 `visibility_change`：

```javascript
onDataOut: (data) => {
  if (data.type === 'visibility_change') {
    console.log('展示状态:', data.payload.visible)
  }
}
```

#### 7. 页面数据交互

```javascript
// 设置页面上下文数据（会随消息发送到后端）
avatar.setPageData({ selectedCity: '北京' })

// 获取页面数据
const data = avatar.getPageData()
```

#### 8. 主动播报

主动播报功能允许前端主动触发数字人播放指定文本，无需等待用户输入。后端支持播报队列、优先级抢占和中断处理。

**Socket.IO 事件：**

- 请求事件：`broadcast_text`、`cancel_broadcast`、`clear_broadcast_queue`
- 回调事件：`broadcast_start`、`broadcast_end`、`broadcast_interrupted`、`broadcast_rejected`
- 队列事件：`broadcast_queue_change`、`broadcast_queue_cleared`

**SDK API：**

```javascript
// 发起播报
const broadcastId = avatar.broadcast({
  text: '欢迎来到数字人主动播报演示',
  priority: 50,          // 优先级 1-100，高优先级可抢占低优先级
  interrupt: true,       // 是否允许打断当前交互
  enqueue: true,         // 是否允许入队等待
  source: 'frontend-sdk-demo',  // 播报来源标识
  metadata: { scene: 'demo_panel' }  // 自定义元数据
})

// 取消播报
avatar.cancelBroadcast(broadcastId)  // 取消指定播报
avatar.cancelBroadcast()             // 取消当前活跃播报

// 清空等待队列
avatar.clearBroadcastQueue()

// 获取播报状态
const state = avatar.getBroadcastState()
console.log(state.currentContext)    // 'chat' | 'broadcast'
console.log(state.activeBroadcast)   // 当前活跃的播报任务
console.log(state.queuedCount)       // 等待队列中的任务数
console.log(state.queue)             // 等待队列列表
```

**Demo 集成UI：**

Demo 中提供了完整的播报控制面板，位于 `AvatarPanel` 组件底部：

| 控件 | 说明 |
|------|------|
| **播报输入框** | 输入要播报的文本内容，按回车或点击“发送播报”触发 |
| **优先级** | 设置播报优先级 (1-100)，高优先级可抢占低优先级 |
| **可抢占** | 开启后，当前播报可被更高优先级的播报中断 |
| **允许入队** | 关闭后，如果当前正在播报则直接拒绝新请求 |
| **发送播报** | 触发播报请求 |
| **取消当前** | 中断当前正在播放的播报 |
| **清空队列** | 清空所有等待中的播报任务 |
| **状态显示** | 实时显示当前播报状态、队列数、最近事件 |

**父组件外部触发：**

Demo 中 `DemoScreen` 顶部提供了“播报当前城市”按钮，演示父组件通过 `ref` 外部触发播报：

```javascript
// 父组件中通过 ref 调用
avatarRef.value?.sendBroadcast?.({
  text: '主动播报：当前地图重点城市是北京，请关注它的业务表现。',
  priority: 60  // 可选，覆盖默认优先级
})
```

**监听播报事件：**

```javascript
onDataOut: (data) => {
  switch (data.type) {
    case 'broadcast_start':
      console.log('播报开始', data.payload.broadcast)
      break
    case 'broadcast_end':
      console.log('播报结束', data.payload.reason)  // 'completed' | 'error'
      break
    case 'broadcast_interrupted':
      console.log('播报被中断', data.payload.reason)
      break
    case 'broadcast_rejected':
      console.log('播报被拒绝', data.payload.reason)
      break
    case 'broadcast_queue_change':
      console.log('队列变化', data.payload.queued_count)
      break
    case 'broadcast_queue_cleared':
      console.log('队列已清空', data.payload.cleared)
      break
  }
}
```

### ASR 语音识别文本显示实现

本 Demo 演示了如何将 ASR 识别的文本显示在聊天面板中：

#### 数据流向

```
用户语音 → 后端(ASR识别) → SDK(onDataOut回调) → 前端(显示在消息列表)
```

#### 实现代码

在 `AvatarPanel.vue` 中，通过 `onDataOut` 回调接收 `asr_transcription` 事件：

```javascript
// 1. 定义响应式变量
const asrTempText = ref('')  // ASR 中间识别文本（实时显示）
const messages = ref([])      // 历史消息列表

// 2. 在 onDataOut 回调中处理
case 'asr_transcription':
  const asrText = data?.payload?.content || ''
  const isFinal = data?.payload?.is_final
  
  if (isFinal && asrText.trim()) {
    // 最终结果：添加到历史消息列表
    messages.value.push({ role: 'user', text: asrText.trim() })
    asrTempText.value = ''
  } else if (asrText.trim()) {
    // 中间结果：显示临时文本
    asrTempText.value = asrText
  }
  break
```

```vue
<!-- 3. 在模板中显示 ASR 中间文本 -->
<div v-if="asrTempText && isStreaming" class="message user asr-temp">
  <span class="message-text">{{ asrTempText }}</span>
  <span class="asr-indicator">正在识别...</span>
</div>
```

#### 显示效果

1. 用户点击「实时对话」开始语音对话
2. 用户说话时，聊天面板**实时显示**识别中的文本（带“正在识别...”提示）
3. 识别完成后，最终文本固定显示在消息列表中
4. SDK 自动将最终结果发送给虚拟人回复

### 组件间通信

本 Demo 演示了父组件（DemoScreen）与子组件（AvatarPanel）之间的通信：

```vue
<!-- DemoScreen.vue -->
<template>
  <AvatarPanel
    ref="avatarRef"
    :api-base-url="apiBaseUrl"
    :page-data="{ selectedCity }"
    @reply="onReply"
  />
</template>

<script setup>
const avatarRef = ref(null)

// 调用 AvatarPanel 的方法
function onSelectCity(cityName) {
  avatarRef.value?.askCity?.(cityName)
}
</script>
```

父组件也可以通过 `ref` 直接控制隐藏 / 展示：

```javascript
await avatarRef.value?.hideAvatar?.()
await avatarRef.value?.showAvatar?.()
await avatarRef.value?.toggleVisibility?.()
```

父组件也可以通过 `ref` 主动触发播报：

```javascript
avatarRef.value?.sendBroadcast?.({
  text: '主动播报：当前地图重点城市是北京，请关注它的业务表现。'
})
```

Demo 中提供了两种入口：

- `AvatarPanel` 内部按钮：便于直接验证 SDK 行为
- `DemoScreen` 顶部按钮：演示父组件通过 `ref` 远程控制

## 文件说明

### AvatarPanel.vue

这是 SDK 接入的核心组件，包含：

- **SDK 初始化**：创建 VideoAvatar 实例、连接 WebSocket
- **文本对话**：发送消息、接收流式回复
- **实时语音**：启动/停止 ASR 语音识别
- **展示控制**：隐藏/展示数字人并同步后端交互开关
- **主动播报**：发起播报、取消当前播报、清空等待队列、展示播报队列状态
- **状态管理**：处理沉睡状态、ASR 状态等
- **页面数据**：setPageData/getPageData 的使用

### MapPanel.vue

这是业务组件示例，演示了：

- 业务数据展示
- 用户交互处理
- 与 AvatarPanel 的联动

### DemoScreen.vue

这是主页面组件，演示了：

- 如何引入和配置 AvatarPanel
- 如何通过 ref 调用子组件方法
- 如何在父组件中外部控制数字人的隐藏/展示
- 如何在父组件中外部触发主动播报
- 页面数据如何传递给 SDK


## 常见问题

### 1. 虚拟人无法加载

- 检查后端服务是否已启动
- 检查浏览器控制台是否有错误信息

### 2. WebSocket 连接失败

- 检查 `.env.development` 中的 `VITE_API_BASE_URL` 配置
- 检查后端服务是否正常运行
- 检查网络连接是否正常

### 3. 实时语音无法使用

- 确保页面通过 HTTPS 或 localhost 访问（麦克风权限要求）
- 检查浏览器是否授予了麦克风权限

## 扩展开发

### 添加新的动作触发

在 `AvatarPanel.vue` 中添加新的方法：

```javascript
// 暴露方法给父组件调用
defineExpose({ askCity, send, yourNewMethod })

// 实现新方法
function yourNewMethod(data) {
  // 处理数据
  avatar.sendTextViaSocket(`处理: ${data}`)
}
```

### 自定义页面数据

修改 `DemoScreen.vue` 中的 `pageData`：

```javascript
avatar.setPageData({
  selectedCity: cityName,
  userId: 'user_123',
  scene: 'bigscreen'
})
```

后端可以通过 `page_data` 字段接收到这些数据。

## 参考文档

- [SDK 技术接入文档](../SDK-video/技术接入文档.md)
- [SDK README](../SDK-video/README.md)
