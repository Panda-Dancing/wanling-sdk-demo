function safeString(value) {
  return typeof value === 'string' ? value : ''
}

function safeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function safeBoolean(value) {
  return typeof value === 'boolean' ? value : null
}

export function summarizeAsrDiagnostics(envelope) {
  if (
    !envelope
    || envelope.type !== 'asr_diagnostics'
    || envelope.version !== 1
    || !safeString(envelope.trace_id)
    || !envelope.payload
  ) {
    return null
  }

  const payload = envelope.payload
  const pcm = payload.pcm || {}
  const timings = payload.timings_ms || {}
  const track = payload.audio?.track || {}
  const audioContext = payload.audio?.audio_context || {}
  const local = envelope.local || {}
  const localCallbacks = local.audio_callbacks || {}
  const inputAudio = local.input_audio || {}
  const trackEvents = local.track_events || {}
  const localTimings = local.timings_ms || {}

  return {
    traceId: safeString(envelope.trace_id),
    sdkVersion: safeString(payload.sdk_version),
    termination: safeString(payload.termination),
    pcm: {
      frames: safeNumber(pcm.frames),
      bytes: safeNumber(pcm.bytes),
      rms: safeNumber(pcm.rms),
      peak: safeNumber(pcm.peak),
    },
    timingsMs: {
      wsOpen: safeNumber(timings.ws_open),
      micReady: safeNumber(timings.mic_ready),
      firstPcm: safeNumber(timings.first_pcm),
      ended: safeNumber(timings.ended),
    },
    track: {
      sampleRate: safeNumber(track.sample_rate),
      channelCount: safeNumber(track.channel_count),
      sampleSize: safeNumber(track.sample_size),
      echoCancellation: safeBoolean(track.echo_cancellation),
      noiseSuppression: safeBoolean(track.noise_suppression),
      autoGainControl: safeBoolean(track.auto_gain_control),
    },
    audioContext: {
      sampleRate: safeNumber(audioContext.sample_rate),
      state: safeString(audioContext.state),
    },
    local: {
      captureEngine: safeString(local.capture_engine),
      capturePolicy: safeString(local.capture_policy),
      captureFallbackError: safeString(local.capture_fallback_error),
      terminationSource: safeString(local.termination_source),
      audioCallbacks: {
        count: safeNumber(localCallbacks.count),
        averageIntervalMs: safeNumber(localCallbacks.average_interval_ms),
        maxIntervalMs: safeNumber(localCallbacks.max_interval_ms),
      },
      inputAudio: {
        callbacks: safeNumber(inputAudio.callbacks),
        samples: safeNumber(inputAudio.samples),
        rms: safeNumber(inputAudio.rms),
        peak: safeNumber(inputAudio.peak),
        zeroCallbacks: safeNumber(inputAudio.zero_callbacks),
        longestZeroCallbacks: safeNumber(inputAudio.longest_zero_callbacks),
      },
      trackEvents: {
        muteCount: safeNumber(trackEvents.mute_count),
        unmuteCount: safeNumber(trackEvents.unmute_count),
      },
      timingsMs: {
        firstInterim: safeNumber(localTimings.first_interim),
        micReleased: safeNumber(localTimings.mic_released),
      },
    },
  }
}
