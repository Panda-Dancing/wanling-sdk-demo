export function canStartVoiceStream({
  hasAvatar,
  isVisible,
  isPressRecording,
  isPressFinalizing,
  isStreaming,
}) {
  return Boolean(
    hasAvatar
    && isVisible
    && !isPressRecording
    && !isPressFinalizing
    && !isStreaming
  )
}
