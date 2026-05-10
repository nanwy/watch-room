export type PlaybackStatus = "playing" | "paused"

export type PlaybackState = {
  roomId: string
  animeId: string
  episodeId: string
  status: PlaybackStatus
  positionSeconds: number
  playbackRate: number
  updatedAt: Date
  updatedByClientId: string | null
}

export function calculateEffectivePosition(input: {
  status: PlaybackStatus
  positionSeconds: number
  playbackRate: number
  updatedAtMs: number
  nowMs: number
}) {
  if (input.status === "paused") return input.positionSeconds
  const elapsedSeconds = Math.max(0, input.nowMs - input.updatedAtMs) / 1000
  return input.positionSeconds + elapsedSeconds * input.playbackRate
}

export function shouldCorrectDrift(input: {
  localPositionSeconds: number
  authoritativePositionSeconds: number
  thresholdSeconds?: number
}) {
  const threshold = input.thresholdSeconds ?? 1.5
  return Math.abs(input.localPositionSeconds - input.authoritativePositionSeconds) > threshold
}
