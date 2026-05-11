"use client"
import { useEffect, useRef, useState } from "react"
import type { RefObject } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"

const SPEED_OPTIONS = [0.75, 1, 1.5, 2] as const
const HIDE_DELAY_MS = 2500

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>
  containerRef: RefObject<HTMLDivElement | null>
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

export function PlayerControls({ videoRef, containerRef }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [visible, setVisible] = useState(true)
  const [dragPct, setDragPct] = useState<number | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<number | null>(null)
  const dragVersionRef = useRef(0)

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
    const onDur = () => setDuration(isFinite(video.duration) ? video.duration : 0)
    const onProg = () => {
      const len = video.buffered.length
      if (len > 0) setBuffered(video.buffered.end(len - 1))
    }
    const onVol = () => {
      setVolume(video.volume)
      setMuted(video.muted)
    }
    const onRate = () => setPlaybackRate(video.playbackRate)

    video.addEventListener("play", onPlay)
    video.addEventListener("pause", onPause)
    video.addEventListener("timeupdate", onTime)
    video.addEventListener("loadedmetadata", onDur)
    video.addEventListener("durationchange", onDur)
    video.addEventListener("progress", onProg)
    video.addEventListener("volumechange", onVol)
    video.addEventListener("ratechange", onRate)

    return () => {
      video.removeEventListener("play", onPlay)
      video.removeEventListener("pause", onPause)
      video.removeEventListener("timeupdate", onTime)
      video.removeEventListener("loadedmetadata", onDur)
      video.removeEventListener("durationchange", onDur)
      video.removeEventListener("progress", onProg)
      video.removeEventListener("volumechange", onVol)
      video.removeEventListener("ratechange", onRate)
    }
  }, [videoRef])

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [containerRef])

  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    const ping = () => {
      setVisible(true)
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
      const v = videoRef.current
      if (v && !v.paused) {
        hideTimerRef.current = window.setTimeout(() => setVisible(false), HIDE_DELAY_MS)
      }
    }
    const onLeave = () => {
      const v = videoRef.current
      if (v && !v.paused) setVisible(false)
    }
    c.addEventListener("pointermove", ping)
    c.addEventListener("pointerdown", ping)
    c.addEventListener("pointerleave", onLeave)
    ping()
    return () => {
      c.removeEventListener("pointermove", ping)
      c.removeEventListener("pointerdown", ping)
      c.removeEventListener("pointerleave", onLeave)
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    }
  }, [containerRef, videoRef, isPlaying])

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

  function toggleFullscreen() {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) void el.requestFullscreen?.().catch(() => {})
    else void document.exitFullscreen?.()
  }

  function pctFromPointer(e: React.PointerEvent<HTMLDivElement>) {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect) return null
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  }

  function onProgressDown(e: React.PointerEvent<HTMLDivElement>) {
    const pct = pctFromPointer(e)
    if (pct == null) return
    dragVersionRef.current += 1
    setDragPct(pct)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onProgressMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragPct == null) return
    const pct = pctFromPointer(e)
    if (pct != null) setDragPct(pct)
  }
  function onProgressUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragPct == null) return
    const pct = pctFromPointer(e) ?? dragPct
    const v = videoRef.current
    if (v && duration > 0) v.currentTime = pct * duration
    setDragPct(null)
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
  }

  const progressPct = duration > 0
    ? (dragPct != null ? dragPct : currentTime / duration)
    : 0
  const bufferedPct = duration > 0 ? Math.min(1, buffered / duration) : 0
  const displayTime = duration > 0 && dragPct != null ? dragPct * duration : currentTime
  const speedLabel = playbackRate === 1 ? "倍速" : `${playbackRate}x`

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`pointer-events-auto absolute inset-x-0 bottom-0 z-20 select-none bg-gradient-to-t from-black/85 via-black/55 to-transparent px-3 pt-10 pb-2 text-white transition-opacity duration-200 sm:px-4 sm:pt-12 sm:pb-3 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        ref={progressRef}
        onPointerDown={onProgressDown}
        onPointerMove={onProgressMove}
        onPointerUp={onProgressUp}
        onPointerCancel={onProgressUp}
        className="group relative h-2 cursor-pointer touch-none rounded-full bg-white/20"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/35"
          style={{ width: `${bufferedPct * 100}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--bilibili-pink)]"
          style={{ width: `${progressPct * 100}%` }}
        />
        <div
          className="absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-[var(--bilibili-pink)] shadow-[0_0_8px_oklch(0.71_0.18_358/0.6)] opacity-0 transition-opacity group-hover:opacity-100"
          style={{ left: `calc(${progressPct * 100}% - 7px)`, opacity: dragPct != null ? 1 : undefined }}
        />
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

        <span className="font-mono text-[11px] tabular-nums text-white/80 sm:text-xs">
          {formatTime(displayTime)} / {formatTime(duration)}
        </span>

        <div className="flex-1" />

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={toggleMute}
              aria-label="音量"
              className="rounded p-1 transition-colors hover:text-[var(--bilibili-pink)]"
            >
              {muted || volume === 0 ? <VolumeMuteIcon /> : volume < 0.5 ? <VolumeLowIcon /> : <VolumeHighIcon />}
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="center"
            sideOffset={6}
            className="hidden w-auto rounded-md border-[var(--ink-border)] bg-[oklch(0.11_0.04_340/0.95)] p-3 backdrop-blur-md sm:block"
          >
            <VerticalVolume
              value={muted ? 0 : volume}
              onChange={setVolumeLevel}
            />
          </PopoverContent>
        </Popover>

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
                        active ? "text-[var(--bilibili-pink)]" : "text-[var(--mist-100)]"
                      }`}
                    >
                      <span className="tabular-nums">{r}x</span>
                      {r === 1 ? <span className="text-[10px] text-[var(--mist-500)]">默认</span> : null}
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
  )
}

function VerticalVolume({ value, onChange }: { value: number; onChange: (v: number) => void }) {
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
        try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" />
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
    </svg>
  )
}
function VolumeMuteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4Z" fill="currentColor" stroke="none" />
      <path d="M22 9l-6 6M16 9l6 6" />
    </svg>
  )
}
function VolumeLowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4Z" fill="currentColor" stroke="none" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    </svg>
  )
}
function VolumeHighIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4Z" fill="currentColor" stroke="none" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </svg>
  )
}
function FullscreenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
    </svg>
  )
}
function ExitFullscreenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4v4H5M15 4v4h4M9 20v-4H5M15 20v-4h4" />
    </svg>
  )
}
