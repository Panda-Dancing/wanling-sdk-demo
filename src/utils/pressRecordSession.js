export function createPressRecordSession({
  start,
  finish,
  cancel,
  onStateChange = () => {},
  onResult = () => {},
  onError = () => {},
}) {
  let currentState = 'idle'
  let generation = 0
  let terminalKind = null
  let terminalMetadata = null
  let startTask = null
  let terminalTask = null
  let errorReported = false

  function setState(nextState) {
    if (currentState === nextState) return
    currentState = nextState
    onStateChange(nextState)
  }

  function fail(error) {
    if (currentState === 'idle' || errorReported) return false

    const failedState = currentState
    errorReported = true
    generation += 1
    terminalKind = 'failed'
    setState('idle')

    try {
      onError(error)
    } catch {
      // 调试 UI 的错误回调不能破坏录音状态复位。
    }

    if (failedState !== 'cancelling') {
      Promise.resolve()
        .then(() => cancel())
        .catch(() => {})
    }
    return true
  }

  async function runTerminal(kind, ownGeneration) {
    if (ownGeneration !== generation) return false

    setState(kind === 'finish' ? 'finishing' : 'cancelling')
    try {
      const result = kind === 'finish'
        ? await finish(terminalMetadata)
        : await cancel(terminalMetadata)
      if (ownGeneration !== generation) return false
      if (kind === 'finish' && typeof result === 'string' && result.trim()) {
        onResult(result)
      }
      setState('idle')
      return true
    } catch (error) {
      if (ownGeneration === generation) fail(error)
      return false
    }
  }

  async function begin() {
    if (currentState !== 'idle') return false

    const ownGeneration = ++generation
    terminalKind = null
    terminalMetadata = null
    terminalTask = null
    errorReported = false
    setState('starting')

    try {
      await start()
    } catch (error) {
      if (ownGeneration === generation) fail(error)
      return false
    }

    if (ownGeneration !== generation) return false
    if (terminalKind) {
      terminalTask = runTerminal(terminalKind, ownGeneration)
      return terminalTask
    }

    setState('recording')
    return true
  }

  function requestTerminal(kind, metadata = {}) {
    if (currentState === 'idle') return Promise.resolve(false)
    if (terminalKind) return terminalTask || startTask || Promise.resolve(false)

    terminalKind = kind
    terminalMetadata = metadata
    if (currentState === 'starting') return startTask

    terminalTask = runTerminal(kind, generation)
    return terminalTask
  }

  return {
    get state() {
      return currentState
    },
    start() {
      if (currentState !== 'idle') return startTask || Promise.resolve(false)
      startTask = begin()
      return startTask
    },
    finish(metadata) {
      return requestTerminal('finish', metadata)
    },
    cancel(metadata) {
      return requestTerminal('cancel', metadata)
    },
    fail,
  }
}
