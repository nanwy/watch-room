"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import type { RefObject } from "react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"

import {
  getFullscreenAction,
  shouldCaptureTouchTap,
} from "./player-controls-behavior"

const SPEED_OPTIONS = [0.75, 1, 1.5, 2] as const
const HIDE_DELAY_MS = 2500

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>
  containerRef: RefObject<HTMLDivElement | null>
  /**
   * Whether the room's authoritative state says we should be playing.
   * When this is true but the local video is paused (autoplay block, buffer error, etc.),
   * the center overlay shows a "同步" hint so the user knows clicking play will catch up.
   */
  expectedPlaying?: boolean
}

type WebKitFullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void
}

function formatTime(t: number) {
  if (!isFinite(t) || t < 0) return "00:00"
  const total = Math.floor(t)
  const s = total % 60
  const m = Math.floor(total / 60) % 60
  const h = Math.floor(total / 3600)
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function PlayerControls({
  videoRef,
  containerRef,
  expectedPlaying = false,
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [visible, setVisible] = useState(true)
  const [volumeHover, setVolumeHover] = useState(false)
  const [dragPct, setDragPct] = useState<number | null>(null)
  const [hoverPct, setHoverPct] = useState<number | null>(null)
  const [isBuffering, setIsBuffering] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<number | null>(null)
  const isPressedRef = useRef(false)
  const dragCleanupRef = useRef<(() => void) | null>(null)
  const volumeHideTimerRef = useRef<number | null>(null)

  function showVolumeSlider() {
    if (volumeHideTimerRef.current) {
      window.clearTimeout(volumeHideTimerRef.current)
      volumeHideTimerRef.current = null
    }
    setVolumeHover(true)
  }
  function scheduleHideVolumeSlider() {
    if (volumeHideTimerRef.current)
      window.clearTimeout(volumeHideTimerRef.current)
    volumeHideTimerRef.current = window.setTimeout(
      () => setVolumeHover(false),
      200
    )
  }

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const showControls = useCallback(() => {
    clearHideTimer()
    setVisible(true)
  }, [clearHideTimer])

  const scheduleHideControls = useCallback(() => {
    clearHideTimer()
    const v = videoRef.current
    if (v && !v.paused) {
      hideTimerRef.current = window.setTimeout(
        () => setVisible(false),
        HIDE_DELAY_MS
      )
    }
  }, [clearHideTimer, videoRef])

  useEffect(
    () => () => {
      dragCleanupRef.current?.()
    },
    []
  )

  useEffect(() => {
    const coarsePointer = window.matchMedia("(pointer: coarse)")
    const updateTouchDevice = () => {
      setIsTouchDevice(coarsePointer.matches || navigator.maxTouchPoints > 0)
    }
    updateTouchDevice()
    coarsePointer.addEventListener("change", updateTouchDevice)
    return () => coarsePointer.removeEventListener("change", updateTouchDevice)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const sync = () => {
      setIsPlaying(!video.paused)
      setCurrentTime(video.currentTime)
      setDuration(isFinite(video.duration) ? video.duration : 0)
      setVolume(video.volume)
      setMuted(video.muted)
      setPlaybackRate(video.playbackRate)
    }
    sync()

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onTime = () => setCurrentTime(video.currentTime)
    const onDur = () =>
      setDuration(isFinite(video.duration) ? video.duration : 0)
    const onProg = () => {
      const len = video.buffered.length
      if (len > 0) setBuffered(video.buffered.end(len - 1))
    }
    const onVol = () => {
      setVolume(video.volume)
      setMuted(video.muted)
    }
    const onRate = () => setPlaybackRate(video.playbackRate)
    const onWaiting = () => setIsBuffering(true)
    const onCanPlay = () => setIsBuffering(false)
    const onPlaying = () => setIsBuffering(false)
    const onSeekingEv = () => setIsBuffering(true)
    const onSeekedEv = () => {
      if (video.readyState >= 3) setIsBuffering(false)
    }

    video.addEventListener("play", onPlay)
    video.addEventListener("pause", onPause)
    video.addEventListener("timeupdate", onTime)
    video.addEventListener("loadedmetadata", onDur)
    video.addEventListener("durationchange", onDur)
    video.addEventListener("progress", onProg)
    video.addEventListener("volumechange", onVol)
    video.addEventListener("ratechange", onRate)
    video.addEventListener("waiting", onWaiting)
    video.addEventListener("canplay", onCanPlay)
    video.addEventListener("playing", onPlaying)
    video.addEventListener("seeking", onSeekingEv)
    video.addEventListener("seeked", onSeekedEv)

    return () => {
      video.removeEventListener("play", onPlay)
      video.removeEventListener("pause", onPause)
      video.removeEventListener("timeupdate", onTime)
      video.removeEventListener("loadedmetadata", onDur)
      video.removeEventListener("durationchange", onDur)
      video.removeEventListener("progress", onProg)
      video.removeEventListener("volumechange", onVol)
      video.removeEventListener("ratechange", onRate)
      video.removeEventListener("waiting", onWaiting)
      video.removeEventListener("canplay", onCanPlay)
      video.removeEventListener("playing", onPlaying)
      video.removeEventListener("seeking", onSeekingEv)
      video.removeEventListener("seeked", onSeekedEv)
    }
  }, [videoRef])

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    const video = videoRef.current as WebKitFullscreenVideo | null
    const action = getFullscreenAction({
      isDocumentFullscreen: Boolean(document.fullscreenElement),
      canRequestContainerFullscreen: Boolean(el?.requestFullscreen),
      canEnterWebKitVideoFullscreen: Boolean(video?.webkitEnterFullscreen),
    })

    switch (action) {
      case "exitDocumentFullscreen":
        void document.exitFullscreen?.()
        break
      case "requestContainerFullscreen":
        void el?.requestFullscreen?.().catch(() => {
          video?.webkitEnterFullscreen?.()
        })
        break
      case "enterWebKitVideoFullscreen":
        video?.webkitEnterFullscreen?.()
        break
      case "none":
        break
    }
  }, [containerRef, videoRef])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = document.activeElement as HTMLElement | null
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return
      const v = videoRef.current
      if (!v) return
      switch (e.key) {
        case " ":
          e.preventDefault()
          if (v.paused) void v.play().catch(() => {})
          else v.pause()
          break
        case "ArrowLeft":
          e.preventDefault()
          v.currentTime = Math.max(0, v.currentTime - 5)
          break
        case "ArrowRight":
          e.preventDefault()
          v.currentTime = Math.min(
            isFinite(v.duration) ? v.duration : Infinity,
            v.currentTime + 5
          )
          break
        case "ArrowUp":
          e.preventDefault()
          v.volume = Math.min(1, v.volume + 0.05)
          if (v.muted) v.muted = false
          break
        case "ArrowDown":
          e.preventDefault()
          v.volume = Math.max(0, v.volume - 0.05)
          break
        case "f":
        case "F": {
          toggleFullscreen()
          break
        }
        case "m":
        case "M":
          v.muted = !v.muted
          break
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [videoRef, toggleFullscreen])

  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    const onWebKitBeginFullscreen = () => setIsFullscreen(true)
    const onWebKitEndFullscreen = () => setIsFullscreen(false)
    const video = videoRef.current
    document.addEventListener("fullscreenchange", onChange)
    video?.addEventListener("webkitbeginfullscreen", onWebKitBeginFullscreen)
    video?.addEventListener("webkitendfullscreen", onWebKitEndFullscreen)
    return () => {
      document.removeEventListener("fullscreenchange", onChange)
      video?.removeEventListener("webkitbeginfullscreen", onWebKitBeginFullscreen)
      video?.removeEventListener("webkitendfullscreen", onWebKitEndFullscreen)
    }
  }, [containerRef, videoRef])

  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    const ping = () => {
      showControls()
      scheduleHideControls()
    }
    const onLeave = () => {
      const v = videoRef.current
      if (v && !v.paused) {
        if (isTouchDevice) scheduleHideControls()
        else setVisible(false)
      }
    }
    c.addEventListener("pointermove", ping)
    c.addEventListener("pointerdown", ping)
    c.addEventListener("pointerleave", onLeave)
    ping()
    return () => {
      c.removeEventListener("pointermove", ping)
      c.removeEventListener("pointerdown", ping)
      c.removeEventListener("pointerleave", onLeave)
      clearHideTimer()
    }
  }, [
    containerRef,
    videoRef,
    isPlaying,
    isTouchDevice,
    clearHideTimer,
    scheduleHideControls,
    showControls,
  ])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play().catch(() => {})
    else v.pause()
  }

  function toggleMute() {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    if (!v.muted && v.volume === 0) v.volume = 0.5
  }

  function setVolumeLevel(lv: number) {
    const v = videoRef.current
    if (!v) return
    v.volume = Math.max(0, Math.min(1, lv))
    if (v.volume > 0 && v.muted) v.muted = false
  }

  function setRate(r: number) {
    const v = videoRef.current
    if (!v) return
    v.playbackRate = r
  }

  function pctFromClientX(clientX: number) {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return null
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }

  function onProgressDown(e: React.PointerEvent<HTMLDivElement>) {
    const pct = pctFromClientX(e.clientX)
    if (pct == null) return
    dragCleanupRef.current?.()
    isPressedRef.current = true
    setDragPct(pct)

    const onMove = (ev: PointerEvent) => {
      const p = pctFromClientX(ev.clientX)
      if (p != null) setDragPct(p)
    }
    const finish = (commitClientX: number | null) => {
      isPressedRef.current = false
      const p = commitClientX != null ? pctFromClientX(commitClientX) : null
      const v = videoRef.current
      const dur = v?.duration
      if (v && dur != null && isFinite(dur) && dur > 0 && p != null) {
        const newTime = p * dur
        v.currentTime = newTime
        setCurrentTime(newTime)
      }
      setDragPct(null)
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerup", onUp)
      document.removeEventListener("pointercancel", onCancel)
      dragCleanupRef.current = null
    }
    const onUp = (ev: PointerEvent) => finish(ev.clientX)
    const onCancel = () => finish(null)
    dragCleanupRef.current = () => finish(null)
    document.addEventListener("pointermove", onMove)
    document.addEventListener("pointerup", onUp)
    document.addEventListener("pointercancel", onCancel)
  }

  const progressPct =
    duration > 0 ? (dragPct != null ? dragPct : currentTime / duration) : 0
  const bufferedPct = duration > 0 ? Math.min(1, buffered / duration) : 0
  const displayTime =
    duration > 0 && dragPct != null ? dragPct * duration : currentTime
  const previewPct = dragPct != null ? dragPct : hoverPct
  const speedLabel = playbackRate === 1 ? "倍速" : `${playbackRate}x`

  return (
    <>
      <div
        aria-hidden="true"
        onPointerDown={showControls}
        onClick={(e) => {
          e.stopPropagation()
          if (!visible) showControls()
        }}
        className={`absolute inset-0 z-10 bg-transparent ${
          shouldCaptureTouchTap(isTouchDevice, visible)
            ? "pointer-events-auto"
            : "pointer-events-none"
        }`}
      />
      {isBuffering ? (
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-2 rounded-md bg-black/65 px-3 py-2 text-sm text-white backdrop-blur-sm">
            <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-[var(--bilibili-pink)]" />
            <span>缓冲中…</span>
          </div>
        </div>
      ) : null}
      {!isPlaying && !isBuffering ? (
        <div className="absolute top-1/2 left-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={expectedPlaying ? "同步至房间进度并播放" : "播放"}
            className="transition-transform duration-200 hover:scale-110 active:scale-95"
          >
            <img
              src="https://s1.hdslb.com/bfs/static/player/img/play.svg"
              alt=""
              className="size-16 drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:size-20"
            />
          </button>
          {expectedPlaying ? (
            <p className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              同步
            </p>
          ) : null}
        </div>
      ) : null}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`pointer-events-auto absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-3 pt-10 pb-2 text-white transition-opacity duration-200 select-none sm:px-4 sm:pt-12 sm:pb-3 ${
          visible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          ref={progressRef}
          onPointerDown={onProgressDown}
          onPointerMove={(e) => {
            if (isPressedRef.current) return
            const p = pctFromClientX(e.clientX)
            if (p != null) setHoverPct(p)
          }}
          onPointerLeave={() => setHoverPct(null)}
          className="group relative -my-2 flex h-6 cursor-pointer touch-none items-center"
        >
          <div className="relative h-1.5 w-full rounded-full bg-white/20 transition-[height] duration-150 group-hover:h-2.5">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/35"
              style={{ width: `${bufferedPct * 100}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--bilibili-pink)]"
              style={{ width: `${progressPct * 100}%` }}
            />
            <div
              className="absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-[var(--bilibili-pink)] opacity-0 shadow-[0_0_8px_oklch(0.71_0.18_358/0.6)] transition-opacity group-hover:opacity-100"
              style={{
                left: `calc(${progressPct * 100}% - 7px)`,
                opacity: dragPct != null ? 1 : undefined,
              }}
            />
          </div>
          {previewPct != null && duration > 0 ? (
            <div
              className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded bg-black/85 px-2 py-1 font-mono text-[11px] whitespace-nowrap text-white"
              style={{ left: `${previewPct * 100}%` }}
            >
              {formatTime(previewPct * duration)}
            </div>
          ) : null}
        </div>

        <div className="mt-2 flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "暂停" : "播放"}
            className="rounded p-1 transition-colors hover:text-[var(--bilibili-pink)]"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <span className="font-mono text-[11px] text-white/80 tabular-nums sm:text-xs">
            {formatTime(displayTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          <div
            className="relative flex items-center"
            onPointerEnter={showVolumeSlider}
            onPointerLeave={scheduleHideVolumeSlider}
          >
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "取消静音" : "静音"}
              className="rounded p-1 transition-colors hover:text-[var(--bilibili-pink)]"
            >
              {muted || volume === 0 ? (
                <VolumeMuteIcon />
              ) : volume < 0.5 ? (
                <VolumeLowIcon />
              ) : (
                <VolumeHighIcon />
              )}
            </button>
            {volumeHover ? (
              <div
                onPointerEnter={showVolumeSlider}
                onPointerLeave={scheduleHideVolumeSlider}
                className="absolute bottom-full left-1/2 hidden -translate-x-1/2 pb-2 sm:block"
              >
                <div className="rounded-md border border-[var(--ink-border)] bg-[oklch(0.11_0.04_340/0.95)] p-3 backdrop-blur-md">
                  <VerticalVolume
                    value={muted ? 0 : volume}
                    onChange={setVolumeLevel}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="播放倍速"
                className="rounded px-2 py-1 text-xs font-medium tabular-nums transition-colors hover:text-[var(--bilibili-pink)]"
              >
                {speedLabel}
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              sideOffset={6}
              className="w-24 overflow-hidden rounded-md border-[var(--ink-border)] bg-[oklch(0.11_0.04_340/0.95)] p-1 backdrop-blur-md"
            >
              <ul className="flex flex-col">
                {SPEED_OPTIONS.map((r) => {
                  const active = Math.abs(playbackRate - r) < 0.001
                  return (
                    <li key={r}>
                      <button
                        type="button"
                        onClick={() => setRate(r)}
                        className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs transition-colors hover:bg-[var(--ink-surface-hover)] ${
                          active
                            ? "text-[var(--bilibili-pink)]"
                            : "text-[var(--mist-100)]"
                        }`}
                      >
                        <span className="tabular-nums">{r}x</span>
                        {r === 1 ? (
                          <span className="text-[10px] text-[var(--mist-500)]">
                            默认
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </PopoverContent>
          </Popover>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "退出全屏" : "全屏"}
            className="rounded p-1 transition-colors hover:text-[var(--bilibili-pink)]"
          >
            {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </button>
        </div>
      </div>
    </>
  )
}

function VerticalVolume({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const railRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  function pctFrom(e: React.PointerEvent<HTMLDivElement>) {
    const rect = railRef.current?.getBoundingClientRect()
    if (!rect) return null
    return Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height))
  }

  return (
    <div
      ref={railRef}
      onPointerDown={(e) => {
        const pct = pctFrom(e)
        if (pct != null) {
          onChange(pct)
          setDragging(true)
          e.currentTarget.setPointerCapture(e.pointerId)
        }
      }}
      onPointerMove={(e) => {
        if (!dragging) return
        const pct = pctFrom(e)
        if (pct != null) onChange(pct)
      }}
      onPointerUp={(e) => {
        setDragging(false)
        try {
          e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {}
      }}
      className="relative h-24 w-1.5 cursor-pointer rounded-full bg-white/20"
    >
      <div
        className="absolute right-0 bottom-0 left-0 rounded-full bg-[var(--bilibili-pink)]"
        style={{ height: `${value * 100}%` }}
      />
      <div
        className="absolute left-1/2 size-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-[var(--bilibili-pink)]"
        style={{ bottom: `${value * 100}%` }}
      />
    </div>
  )
}

function PlayIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" />
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
    </svg>
  )
}
function VolumeMuteIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4Z" fill="currentColor" stroke="none" />
      <path d="M22 9l-6 6M16 9l6 6" />
    </svg>
  )
}
function VolumeLowIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4Z" fill="currentColor" stroke="none" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    </svg>
  )
}
function VolumeHighIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4Z" fill="currentColor" stroke="none" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </svg>
  )
}
function FullscreenIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
    </svg>
  )
}
function ExitFullscreenIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 4v4H5M15 4v4h4M9 20v-4H5M15 20v-4h4" />
    </svg>
  )
}
