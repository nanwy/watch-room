"use client"
import { useEffect, useRef, useState } from "react"

import { calculateEffectivePosition } from "@workspace/shared/playback"

import { TvMascot } from "./tv-mascot"
import { mediaUrl } from "@/lib/media-url"
import { useRoomStore } from "@/store/room-store"

const DRIFT_THRESHOLD_SECONDS = 1.5
const LOCAL_CONTROL_CONFIRM_MS = 3500
const SEEK_SUPPRESS_MS = 800
const PROGRAMMATIC_SEEK_TARGET_EPSILON = 0.5

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
  const isSwitching = useRoomStore((s) => s.isSwitching)
  const localControlUntilRef = useRef(0)
  const seekSuppressUntilRef = useRef(0)
  const programmaticSeekTargetRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  function isSeekInProgress() {
    return Date.now() < seekSuppressUntilRef.current
  }

  function markSeekActivity() {
    seekSuppressUntilRef.current = Date.now() + SEEK_SUPPRESS_MS
  }

  function setVideoTimeProgrammatically(video: HTMLVideoElement, target: number) {
    programmaticSeekTargetRef.current = target
    video.currentTime = target
  }

  function isProgrammaticSeekEcho(video: HTMLVideoElement) {
    const target = programmaticSeekTargetRef.current
    if (target === null) return false
    return Math.abs(video.currentTime - target) < PROGRAMMATIC_SEEK_TARGET_EPSILON
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

    if (Math.abs(video.currentTime - target) > DRIFT_THRESHOLD_SECONDS) {
      setVideoTimeProgrammatically(video, target)
    }
    if (Math.abs(video.playbackRate - playbackState.playbackRate) > 0.001) {
      video.playbackRate = playbackState.playbackRate
    }
    if (playbackState.status === "playing" && video.paused) {
      void video.play().catch(() => {})
    } else if (playbackState.status === "paused" && !video.paused) {
      video.pause()
    }
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
        setVideoTimeProgrammatically(video, expected)
      }
    }, 2000)
    return () => window.clearInterval(id)
  }, [])

  const banner = playbackSupportStatus === "maybeUnsupported" ? (
    <div className="rounded-md border border-[var(--danwei-yellow)]/40 bg-[oklch(0.30_0.06_90)] px-3 py-2 text-xs text-[var(--danwei-yellow)]">
      ⚠️ 该格式可能在你的浏览器里跑不动，推荐 MP4 或 WebM。
    </div>
  ) : null

  return (
    <div className="flex flex-col gap-2 lg:h-full lg:min-h-0">
      {error ? (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--ink-border)] bg-[var(--ink-surface)] px-3 py-2 text-xs text-[var(--mist-300)]">
          <TvMascot size={32} bob />
          <span>{error}（鸽了，下次一定）</span>
        </div>
      ) : null}
      {banner}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black lg:aspect-auto lg:h-full lg:min-h-0 lg:flex-1">
        <video
          ref={ref}
          controls
          playsInline
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nofullscreen noremoteplayback"
          preload="metadata"
          className="h-full w-full object-contain"
        onPlay={() => {
          if (isSeekInProgress()) return
          const state = useRoomStore.getState().playbackState
          if (state?.status === "playing") return
          markLocalControlPending()
          onControl({ type: "play", positionSeconds: ref.current?.currentTime ?? 0 })
        }}
        onPause={() => {
          if (!ref.current) return
          if (ref.current.seeking || isSeekInProgress()) return
          if (ref.current.ended) return
          const state = useRoomStore.getState().playbackState
          if (state?.status === "paused") return
          markLocalControlPending()
          onControl({ type: "pause", positionSeconds: ref.current.currentTime })
        }}
        onSeeking={() => {
          markSeekActivity()
        }}
        onSeeked={() => {
          if (!ref.current) return
          if (isProgrammaticSeekEcho(ref.current)) {
            programmaticSeekTargetRef.current = null
            return
          }
          markSeekActivity()
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
          if (!ref.current) return
          const state = useRoomStore.getState().playbackState
          if (state && Math.abs(state.playbackRate - ref.current.playbackRate) < 0.001) return
          markLocalControlPending()
          onControl({ type: "setPlaybackRate", positionSeconds: ref.current.currentTime, playbackRate: ref.current.playbackRate })
        }}
        onError={() => setError("视频出错了，可能文件缺失或格式不支持")}
      >
        <source src={mediaUrl(episodeId)} type={episodeMimeType ?? undefined} />
      </video>
      {isSwitching ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[oklch(0.10_0.04_340/0.7)] backdrop-blur-sm">
          <TvMascot size={56} bob />
          <p className="text-sm font-medium text-[var(--mist-100)]">正在切换…前方高能</p>
        </div>
      ) : null}
      </div>
    </div>
  )
}
