"use client"
import { useEffect, useRef, useState } from "react"

import { calculateEffectivePosition } from "@workspace/shared/playback"

import { PlayerControls } from "./player-controls"
import { TvMascot } from "./tv-mascot"
import { mediaUrl } from "@/lib/media-url"
import { useRoomStore } from "@/store/room-store"

const DRIFT_THRESHOLD_SECONDS = 1.5
// State that this client itself last set carries the server's recording lag
// (Prisma write delay + RTT), which manifests as a persistent ~lag*rate offset
// between video.currentTime and the state's effective position. Tolerate up to
// SELF_DRIFT_TOLERANCE_SECONDS for self-state so the 2s interval doesn't keep
// snapping us back to a stale position. 6s covers up to 3s lag at 2x rate.
const SELF_DRIFT_TOLERANCE_SECONDS = 6
const LOCAL_CONTROL_CONFIRM_MS = 3500
const PROGRAMMATIC_SEEK_TARGET_EPSILON = 0.5

type Props = {
  episodeId: string
  playbackSupportStatus: "supported" | "maybeUnsupported"
  clientId: string
  endNotice?: string | null
  onEnded?: () => void
  onControl: (event:
    | { type: "play"; positionSeconds: number }
    | { type: "pause"; positionSeconds: number }
    | { type: "seek"; positionSeconds: number }
    | { type: "setPlaybackRate"; positionSeconds: number; playbackRate: number }
  ) => void
}

export function WatchPlayer({ episodeId, playbackSupportStatus, clientId, endNotice, onEnded, onControl }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const playbackState = useRoomStore((s) => s.playbackState)
  const isSwitching = useRoomStore((s) => s.isSwitching)
  const localControlUntilRef = useRef(0)
  const programmaticSeekTargetRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    // Drift small enough that we don't need to apply a correction anyway — but DON'T
    // clear the local-control window here. The 2s drift interval calls this too, and
    // its `target` comes from possibly-stale store state (our own echo hasn't landed
    // yet). Clearing the window here would let a later interval tick snap us back to
    // that stale position.
    if (Math.abs(video.currentTime - target) <= DRIFT_THRESHOLD_SECONDS) return false
    return true
  }

  useEffect(() => {
    // Reset per-episode transient state so prior session leftovers don't leak into the
    // newly loaded source.
    setError(null)
    programmaticSeekTargetRef.current = null
    localControlUntilRef.current = 0
  }, [episodeId])

  useEffect(() => {
    // Updating a nested <source> changes the DOM, but browsers do not have to reload
    // an existing HTMLMediaElement. Force the element to pick up the new episode URL.
    ref.current?.load()
  }, [episodeId])

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

    const isSelfState = playbackState.updatedByClientId === clientId
    const driftThreshold = isSelfState ? SELF_DRIFT_TOLERANCE_SECONDS : DRIFT_THRESHOLD_SECONDS
    if (Math.abs(video.currentTime - target) > driftThreshold) {
      setVideoTimeProgrammatically(video, target)
    }
    if (Math.abs(video.playbackRate - playbackState.playbackRate) > 0.001) {
      video.playbackRate = playbackState.playbackRate
    }
    if (playbackState.status === "playing" && video.paused) {
      video.play().catch((err) => {
        // Most common cause: browser autoplay policy. The UI shows a "同步" prompt on
        // the center play button overlay so the user can manually start.
        console.warn("[watch-player] v.play() rejected, waiting for user gesture", err)
      })
    } else if (playbackState.status === "paused" && !video.paused) {
      video.pause()
    }
  }, [playbackState, clientId])

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
      const threshold = state.updatedByClientId === clientId
        ? SELF_DRIFT_TOLERANCE_SECONDS
        : DRIFT_THRESHOLD_SECONDS
      if (Math.abs(video.currentTime - expected) > threshold) {
        setVideoTimeProgrammatically(video, expected)
      }
    }, 2000)
    return () => window.clearInterval(id)
  }, [clientId])

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
      <div
        ref={containerRef}
        className="group/player relative aspect-video w-full overflow-hidden rounded-lg bg-black lg:aspect-auto lg:h-full lg:min-h-0 lg:flex-1"
      >
        <video
          ref={ref}
          playsInline
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nofullscreen noremoteplayback nodownload"
          preload="metadata"
          onClick={() => {
            const v = ref.current
            if (!v) return
            if (v.paused) void v.play().catch(() => {})
            else v.pause()
          }}
          className="h-full w-full cursor-pointer object-contain"
          onPlay={() => {
            const state = useRoomStore.getState().playbackState
            if (state?.status === "playing") return
            markLocalControlPending()
            onControl({ type: "play", positionSeconds: ref.current?.currentTime ?? 0 })
          }}
          onPause={() => {
            if (!ref.current) return
            if (ref.current.seeking) return
            if (ref.current.ended) return
            const state = useRoomStore.getState().playbackState
            if (state?.status === "paused") return
            markLocalControlPending()
            onControl({ type: "pause", positionSeconds: ref.current.currentTime })
          }}
          onSeeking={() => {
            // User-initiated seek (not a programmatic remote correction): open the local-control
            // window now so the 2s drift interval / playbackState useEffect can't clobber the
            // user's target before `seeked` fires.
            if (ref.current && !isProgrammaticSeekEcho(ref.current)) {
              markLocalControlPending()
            }
          }}
          onSeeked={() => {
            if (!ref.current) return
            if (isProgrammaticSeekEcho(ref.current)) {
              programmaticSeekTargetRef.current = null
              return
            }
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
          onEnded={onEnded}
          onError={() => setError("视频出错了，可能文件缺失或格式不支持")}
        >
          <source src={mediaUrl(episodeId)} />
        </video>
      <PlayerControls
        videoRef={ref}
        containerRef={containerRef}
        expectedPlaying={playbackState?.status === "playing"}
      />
      {isSwitching ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[oklch(0.10_0.04_340/0.7)] backdrop-blur-sm">
          <TvMascot size={56} bob />
          <p className="text-sm font-medium text-[var(--mist-100)]">正在切换…前方高能</p>
        </div>
      ) : null}
      {endNotice ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-20 z-30 rounded-lg border border-[var(--ink-border)] bg-black/75 px-4 py-3 text-sm font-medium text-[var(--mist-100)] backdrop-blur-sm">
          {endNotice}
        </div>
      ) : null}
      </div>
    </div>
  )
}
