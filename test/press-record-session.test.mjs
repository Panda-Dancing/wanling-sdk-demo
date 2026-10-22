import assert from 'node:assert/strict'
import test from 'node:test'

import { createPressRecordSession } from '../src/utils/pressRecordSession.js'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

test('正常 start → finish 只追加一次结果', async () => {
  const results = []
  const states = []
  const session = createPressRecordSession({
    start: async () => {},
    finish: async () => '最终文本',
    cancel: async () => {},
    onResult: (text) => results.push(text),
    onStateChange: (state) => states.push(state),
  })

  await session.start()
  await Promise.all([session.finish(), session.finish()])

  assert.deepEqual(results, ['最终文本'])
  assert.deepEqual(states, ['starting', 'recording', 'finishing', 'idle'])
})

test('start 未完成时首个 finish 请求获胜', async () => {
  const gate = deferred()
  const finishCalls = []
  let cancelCalls = 0
  const session = createPressRecordSession({
    start: () => gate.promise,
    finish: async (metadata) => { finishCalls.push(metadata); return '保留' },
    cancel: async () => { cancelCalls += 1 },
  })

  const starting = session.start()
  const finishing = session.finish({ source: 'pointerup' })
  const lateCancel = session.cancel({ source: 'lostpointercapture' })
  gate.resolve()
  await Promise.all([starting, finishing, lateCancel])

  assert.deepEqual(finishCalls, [{ source: 'pointerup' }])
  assert.equal(cancelCalls, 0)
  assert.equal(session.state, 'idle')
})

test('start 未完成时首个 cancel 请求获胜且不追加结果', async () => {
  const gate = deferred()
  const results = []
  let finishCalls = 0
  let cancelCalls = 0
  const session = createPressRecordSession({
    start: () => gate.promise,
    finish: async () => { finishCalls += 1; return '不应出现' },
    cancel: async () => { cancelCalls += 1 },
    onResult: (text) => results.push(text),
  })

  const starting = session.start()
  const cancelling = session.cancel()
  const lateFinish = session.finish()
  gate.resolve()
  await Promise.all([starting, cancelling, lateFinish])

  assert.equal(finishCalls, 0)
  assert.equal(cancelCalls, 1)
  assert.deepEqual(results, [])
})

test('finish 已开始后忽略 lostpointercapture 对应的 cancel', async () => {
  const finishGate = deferred()
  const results = []
  let cancelCalls = 0
  const session = createPressRecordSession({
    start: async () => {},
    finish: () => finishGate.promise,
    cancel: async () => { cancelCalls += 1 },
    onResult: (text) => results.push(text),
  })

  await session.start()
  const finishing = session.finish({ source: 'pointerup' })
  const lateCancel = session.cancel({ source: 'lostpointercapture' })
  finishGate.resolve('正常松手文本')
  await Promise.all([finishing, lateCancel])

  assert.equal(cancelCalls, 0)
  assert.deepEqual(results, ['正常松手文本'])
})

test('首个终止来源会传到底层，后到来源不能覆盖', async () => {
  const finishSources = []
  const session = createPressRecordSession({
    start: async () => {},
    finish: async (metadata) => { finishSources.push(metadata); return '' },
    cancel: async () => {},
  })

  await session.start()
  await Promise.all([
    session.finish({ source: 'window-pointerup' }),
    session.finish({ source: 'button-pointerup' }),
  ])

  assert.deepEqual(finishSources, [{ source: 'window-pointerup' }])
})

test('Promise reject 会恢复 idle 且只报告一次', async () => {
  const error = new Error('启动失败')
  const errors = []
  const session = createPressRecordSession({
    start: async () => { throw error },
    finish: async () => '',
    cancel: async () => {},
    onError: (value) => errors.push(value),
  })

  await session.start()

  assert.equal(session.state, 'idle')
  assert.deepEqual(errors, [error])
})

test('start 内 onError 回调后即使 Promise resolve 也不进入 recording', async () => {
  const error = new Error('SDK 内部启动失败')
  const errors = []
  let session
  session = createPressRecordSession({
    start: async () => { session.fail(error) },
    finish: async () => '不应出现',
    cancel: async () => {},
    onError: (value) => errors.push(value),
  })

  await session.start()

  assert.equal(session.state, 'idle')
  assert.deepEqual(errors, [error])
})

test('finish 内 onError 回调后即使 Promise resolve 也不追加文本', async () => {
  const error = new Error('SDK 内部收尾失败')
  const errors = []
  const results = []
  let session
  session = createPressRecordSession({
    start: async () => {},
    finish: async () => { session.fail(error); return '残缺文本' },
    cancel: async () => {},
    onResult: (text) => results.push(text),
    onError: (value) => errors.push(value),
  })

  await session.start()
  await session.finish()

  assert.equal(session.state, 'idle')
  assert.deepEqual(results, [])
  assert.deepEqual(errors, [error])
})
