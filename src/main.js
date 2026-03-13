/**
 * 应用主入口文件
 * 
 * 功能说明：
 * - 创建 Vue 3 应用实例
 * - 挂载应用到 DOM
 * 
 * 接入 SDK 前的准备工作：
 * 1. 确保后端服务已启动（默认 http://localhost:8000）
 * 2. 确保浏览器支持 WebCodecs API（Chrome 94+ / Edge 94+）
 */
import { createApp } from 'vue'
import App from './App.vue'

// 创建 Vue 应用实例
const app = createApp(App)

// 挂载到 #app 元素
app.mount('#app')
