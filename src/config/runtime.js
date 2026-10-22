const DEFAULT_API_BASE_URL = '/api'

function getConfigValue(runtimeConfig, viteEnv, key, fallback = '') {
  const runtimeValue = runtimeConfig?.[key]
  if (typeof runtimeValue === 'string' && runtimeValue.length > 0) {
    return runtimeValue
  }

  const viteValue = viteEnv?.[key]
  if (typeof viteValue === 'string' && viteValue.length > 0) {
    return viteValue
  }

  return fallback
}

export function resolveRuntimeConfig(runtimeConfig = {}, viteEnv = {}) {
  return {
    apiBaseUrl: getConfigValue(runtimeConfig, viteEnv, 'VITE_API_BASE_URL', DEFAULT_API_BASE_URL),
  }
}

const browserRuntimeConfig = typeof window === 'undefined'
  ? {}
  : window.__APP_CONFIG__ || {}

export const runtimeEnv = resolveRuntimeConfig(
  browserRuntimeConfig,
  import.meta.env || {},
)
