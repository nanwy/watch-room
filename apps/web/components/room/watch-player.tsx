"use client"
import { useEffect, useRef, useState } from "react"

import { calculateEffectivePosition } from "@workspace/shared/playback"

import { mediaUrl } from "@/lib/media-url"
import { useRoomStore } from "@/store/room-store"

const DRIFT_THRESHOLD_SECONDS = 1.5
const PROGRAMMATIC_WINDOW_MS = 600
const LOCAL_CONTROL_CONFIRM_MS = 3500

type Props = {
  episodeId: string
  episodeMimeType?: string
  playbackSupportStatus: "supported" | "maybeUnsupported"
  onControl: (event:
    | { type: "play"; positionSeconds: number }
    | { type: "pause"; positionSeconds: number }
    | { type: "seek"; positionSeconds: number }
    | { type: "setPlaybackRate"; positionSeconds: number; playbackRate: number }
  ) => void
}

export function WatchPlayer({ episodeId, episodeMimeType, playbackSupportStatus, onControl }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const playbackState = useRoomStore((s) => s.playbackState)
  const programmaticUntilRef = useRef(0)
  const localControlUntilRef = useRef(0)
  const [error, setError] = useState<string | null>(null)

  function isProgrammatic() {
    return Date.now() < programmaticUntilRef.current
  }

  function withProgrammatic(fn: () => void) {
    programmaticUntilRef.current = Date.now() + PROGRAMMATIC_WINDOW_MS
    fn()
  }

  function markLocalControlPending() {
    localControlUntilRef.current = Date.now() + LOCAL_CONTROL_CONFIRM_MS
  }

  function shouldDeferRemoteCorrection(video: HTMLVideoElement, target: number) {
    if (Date.now() >= localControlUntilRef.current) return false
    if (Math.abs(video.currentTime - target) <= DRIFT_THRESHOLD_SECONDS) {
      localControlUntilRef.current = 0
      return false
    }
    return true
  }

  useEffect(() => {
    if (!ref.current || !playbackState) return
    const video = ref.current

    const target = calculateEffectivePosition({
      status: playbackState.status,
      positionSeconds: playbackState.positionSeconds,
      playbackRate: playbackState.playbackRate,
      updatedAtMs: new Date(playbackState.updatedAt).getTime(),
      nowMs: Date.now(),
    })

    if (shouldDeferRemoteCorrection(video, target)) return

    withProgrammatic(() => {
      if (Math.abs(video.currentTime - target) > DRIFT_THRESHOLD_SECONDS) {
        video.currentTime = target
      }
      if (Math.abs(video.playbackRate - playbackState.playbackRate) > 0.001) {
        video.playbackRate = playbackState.playbackRate
      }
      if (playbackState.status === "playing" && video.paused) {
        void video.play().catch(() => {})
      } else if (playbackState.status === "paused" && !video.paused) {
        video.pause()
      }
    })
  }, [playbackState])

  useEffect(() => {
    const id = window.setInterval(() => {
      const video = ref.current
      const state = useRoomStore.getState().playbackState
      if (!video || !state) return
      const expected = calculateEffectivePosition({
        status: state.status,
        positionSeconds: state.positionSeconds,
        playbackRate: state.playbackRate,
        updatedAtMs: new Date(state.updatedAt).getTime(),
        nowMs: Date.now(),
      })
      if (shouldDeferRemoteCorrection(video, expected)) return
      if (Math.abs(video.currentTime - expected) > DRIFT_THRESHOLD_SECONDS) {
        withProgrammatic(() => {
          video.currentTime = expected
        })
      }
    }, 2000)
    return () => window.clearInterval(id)
  }, [])

  const banner = playbackSupportStatus === "maybeUnsupported" ? (
    <div className="rounded-md border bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
      该格式可能在你的浏览器中无法播放，建议使用 MP4 或 WebM。
    </div>
  ) : null

  return (
    <div className="space-y-2">
      {error ? (
        <div className="rounded-md border bg-red-50 px-3 py-2 text-xs text-red-900">{error}</div>
      ) : null}
      {banner}
      <video
        ref={ref}
        controls
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        controlsList="nofullscreen noremoteplayback"
        preload="metadata"
        className="aspect-video w-full bg-black"
        onPlay={() => {
          if (isProgrammatic()) return
          const state = useRoomStore.getState().playbackState
          if (state?.status === "playing") return
          markLocalControlPending()
          onControl({ type: "play", positionSeconds: ref.current?.currentTime ?? 0 })
        }}
        onPause={() => {
          if (isProgrammatic()) return
          const state = useRoomStore.getState().playbackState
          if (state?.status === "paused") return
          markLocalControlPending()
          onControl({ type: "pause", positionSeconds: ref.current?.currentTime ?? 0 })
        }}
        onSeeked={() => {
          if (isProgrammatic() || !ref.current) return
          const state = useRoomStore.getState().playbackState
          if (!state) return
          const expected = calculateEffectivePosition({
            status: state.status,
            positionSeconds: state.positionSeconds,
            playbackRate: state.playbackRate,
            updatedAtMs: new Date(state.updatedAt).getTime(),
            nowMs: Date.now(),
          })
          if (Math.abs(ref.current.currentTime - expected) <= DRIFT_THRESHOLD_SECONDS) return
          markLocalControlPending()
          onControl({ type: "seek", positionSeconds: ref.current.currentTime })
        }}
        onRateChange={() => {
          if (isProgrammatic() || !ref.current) return
          const state = useRoomStore.getState().playbackState
          if (state && Math.abs(state.playbackRate - ref.current.playbackRate) < 0.001) return
          markLocalControlPending()
          onControl({ type: "setPlaybackRate", positionSeconds: ref.current.currentTime, playbackRate: ref.current.playbackRate })
        }}
        onError={() => setError("无法播放该剧集，文件可能缺失或格式不受支持。")}
      >
        <source src={mediaUrl(episodeId)} type={episodeMimeType ?? undefined} />
      </video>
    </div>
  )
}
