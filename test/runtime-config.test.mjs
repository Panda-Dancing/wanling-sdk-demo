import assert from 'node:assert/strict'

import { resolveRuntimeConfig } from '../src/config/runtime.js'

assert.equal(
  resolveRuntimeConfig(
    { VITE_API_BASE_URL: '/runtime-api' },
    { VITE_API_BASE_URL: '/build-api' },
  ).apiBaseUrl,
  '/runtime-api',
)

assert.equal(
  resolveRuntimeConfig(
    {},
    { VITE_API_BASE_URL: '/build-api' },
  ).apiBaseUrl,
  '/build-api',
)

assert.equal(resolveRuntimeConfig({}, {}).apiBaseUrl, '/api')
