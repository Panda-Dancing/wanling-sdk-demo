import assert from 'node:assert/strict'
import test from 'node:test'

import { summarizeAsrDiagnostics } from '../src/utils/asrDiagnostics.js'

test('只保留页面需要的 ASR v1 诊断字段', () => {
  const summary = summarizeAsrDiagnostics({
    type: 'asr_diagnostics',
    version: 1,
    trace_id: 'trace_mobile_001',
    payload: {
      sdk_version: '0.1.33',
      termination: 'finished',
      pcm: { frames: 12, bytes: 3840, samples: 1920, rms: 0.1234, peak: 0.8, raw: 'drop' },
      timings_ms: { ws_open: 31, mic_ready: 82, first_pcm: 91, ended: 1380, secret: 9 },
      audio: {
        track: {
          sample_rate: 48000,
          channel_count: 1,
          sample_size: 16,
          echo_cancellation: true,
          noise_suppression: false,
          auto_gain_control: true,
          device_id: 'drop-me',
        },
        audio_context: { sample_rate: 48000, state: 'running', sink_id: 'drop-me' },
      },
      client: { user_agent: '不在页面摘要中', platform: '不在页面摘要中' },
      transcript: '绝不能保留识别全文',
    },
    local: {
      capture_engine: 'script_processor',
      capture_policy: 'android_chrome_114_raw',
      capture_fallback_error: '',
      termination_source: 'pointerup',
      audio_callbacks: { count: 18, average_interval_ms: 85, max_interval_ms: 114 },
      input_audio: {
        callbacks: 18,
        samples: 73728,
        rms: 0.123,
        peak: 0.8,
        zero_callbacks: 4,
        longest_zero_callbacks: 3,
      },
      track_events: { mute_count: 1, unmute_count: 2 },
      timings_ms: { first_interim: 438, mic_released: 1670 },
      private: 'drop-me',
    },
    unknown: 'drop-me',
  })

  assert.deepEqual(summary, {
    traceId: 'trace_mobile_001',
    sdkVersion: '0.1.33',
    termination: 'finished',
    pcm: { frames: 12, bytes: 3840, rms: 0.1234, peak: 0.8 },
    timingsMs: { wsOpen: 31, micReady: 82, firstPcm: 91, ended: 1380 },
    track: {
      sampleRate: 48000,
      channelCount: 1,
      sampleSize: 16,
      echoCancellation: true,
      noiseSuppression: false,
      autoGainControl: true,
    },
    audioContext: { sampleRate: 48000, state: 'running' },
    local: {
      captureEngine: 'script_processor',
      capturePolicy: 'android_chrome_114_raw',
      captureFallbackError: '',
      terminationSource: 'pointerup',
      audioCallbacks: { count: 18, averageIntervalMs: 85, maxIntervalMs: 114 },
      inputAudio: {
        callbacks: 18,
        samples: 73728,
        rms: 0.123,
        peak: 0.8,
        zeroCallbacks: 4,
        longestZeroCallbacks: 3,
      },
      trackEvents: { muteCount: 1, unmuteCount: 2 },
      timingsMs: { firstInterim: 438, micReleased: 1670 },
    },
  })
  assert.equal(JSON.stringify(summary).includes('识别全文'), false)
  assert.equal(JSON.stringify(summary).includes('drop-me'), false)
})

test('非法或非 v1 诊断信封返回 null', () => {
  assert.equal(summarizeAsrDiagnostics(null), null)
  assert.equal(summarizeAsrDiagnostics({ type: 'other', version: 1 }), null)
  assert.equal(summarizeAsrDiagnostics({ type: 'asr_diagnostics', version: 2 }), null)
  assert.equal(summarizeAsrDiagnostics({ type: 'asr_diagnostics', version: 1, trace_id: '' }), null)
})

test('浏览器未提供的数值保持 null，不伪造成 0', () => {
  const summary = summarizeAsrDiagnostics({
    type: 'asr_diagnostics',
    version: 1,
    trace_id: 'trace_nullable',
    payload: {
      sdk_version: '0.1.33',
      termination: 'error',
      pcm: { frames: 0, bytes: 0, rms: 0, peak: 0 },
      timings_ms: { ws_open: null, mic_ready: undefined, first_pcm: '', ended: false },
      audio: {
        track: { sample_rate: null, channel_count: '', sample_size: false },
        audio_context: { sample_rate: null, state: '' },
      },
    },
  })

  assert.deepEqual(summary.timingsMs, {
    wsOpen: null,
    micReady: null,
    firstPcm: null,
    ended: null,
  })
  assert.equal(summary.track.sampleRate, null)
  assert.equal(summary.track.channelCount, null)
  assert.equal(summary.track.sampleSize, null)
  assert.equal(summary.audioContext.sampleRate, null)
})
