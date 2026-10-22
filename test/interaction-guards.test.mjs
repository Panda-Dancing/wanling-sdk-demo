import assert from 'node:assert/strict'
import test from 'node:test'

import { canStartVoiceStream } from '../src/utils/interactionGuards.js'

test('按住录音或实时语音已启动时禁止再启动实时语音', () => {
  const ready = { hasAvatar: true, isVisible: true, isPressRecording: false, isPressFinalizing: false, isStreaming: false }
  assert.equal(canStartVoiceStream(ready), true)
  assert.equal(canStartVoiceStream({ ...ready, isPressRecording: true }), false)
  assert.equal(canStartVoiceStream({ ...ready, isPressFinalizing: true }), false)
  assert.equal(canStartVoiceStream({ ...ready, isStreaming: true }), false)
  assert.equal(canStartVoiceStream({ ...ready, isVisible: false }), false)
  assert.equal(canStartVoiceStream({ ...ready, hasAvatar: false }), false)
})
