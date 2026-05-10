"use client"
import { useEffect, useRef, useState } from "react"

import { calculateEffectivePosition } from "@workspace/shared/playback"

import { mediaUrl } from "@/lib/media-url"
import { useRoomStore } from "@/store/room-store"

const DRIFT_THRESHOLD_SECONDS = 1.5

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
  const suppressEvents = useRef(false)
  const [error, setError] = useState<string | null>(null)

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

    suppressEvents.current = true
    if (Math.abs(video.currentTime - target) > DRIFT_THRESHOLD_SECONDS) {
      video.currentTime = target
    }
    video.playbackRate = playbackState.playbackRate
    if (playbackState.status === "playing" && video.paused) {
      void video.play().catch(() => {})
    } else if (playbackState.status === "paused" && !video.paused) {
      video.pause()
    }
    queueMicrotask(() => { suppressEvents.current = false })
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
      if (Math.abs(video.currentTime - expected) > DRIFT_THRESHOLD_SECONDS) {
        suppressEvents.current = true
        video.currentTime = expected
        queueMicrotask(() => { suppressEvents.current = false })
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
        preload="metadata"
        className="aspect-video w-full bg-black"
        onPlay={() => {
          if (suppressEvents.current) return
          onControl({ type: "play", positionSeconds: ref.current?.currentTime ?? 0 })
        }}
        onPause={() => {
          if (suppressEvents.current) return
          onControl({ type: "pause", positionSeconds: ref.current?.currentTime ?? 0 })
        }}
        onSeeked={() => {
          if (suppressEvents.current) return
          onControl({ type: "seek", positionSeconds: ref.current?.currentTime ?? 0 })
        }}
        onRateChange={() => {
          if (suppressEvents.current || !ref.current) return
          onControl({ type: "setPlaybackRate", positionSeconds: ref.current.currentTime, playbackRate: ref.current.playbackRate })
        }}
        onError={() => setError("无法播放该剧集，文件可能缺失或格式不受支持。")}
      >
        <source src={mediaUrl(episodeId)} type={episodeMimeType ?? undefined} />
      </video>
    </div>
  )
}
