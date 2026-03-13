import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

/**
 * Vite 配置文件
 * 
 * 主要配置：
 * - 使用 @vitejs/plugin-vue 支持 Vue 3 单文件组件
 * - 配置路径别名 @ 指向 src 目录，方便导入组件
 * - 配置代理，将 /api 请求转发到后端服务
 * - 支持本地 SDK 调试模式（npm run local）
 */
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL
  const useLocalSdk = env.VITE_USE_LOCAL_SDK === 'true'

  // 构建 alias 配置
  const alias = {
    // 路径别名：@ 指向项目 src 目录
    '@': resolve(__dirname, 'src')
  }

  // 本地 SDK 调试模式：将 npm 包指向本地源码
  if (useLocalSdk) {
    alias['@wanlingsdk/avatar-sdk'] = resolve(__dirname, '../SDK-video/src/index.js')
    console.log('\n\x1b[36mℹ 使用本地 SDK 源码: ../SDK-video/src\x1b[0m\n')
  }

  return {
    plugins: [vue()],
    resolve: { alias },
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        // 代理配置：将 /api 开头的请求转发到后端服务
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api')
        },
        // WebSocket 代理配置
        '/socket.io': {
          target: apiBaseUrl,
          changeOrigin: true,
          ws: true
        }
      }
    }
  }
})
