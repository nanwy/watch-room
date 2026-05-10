import { z } from "zod"

export const clientIdSchema = z.string().min(8).max(128)
export const nicknameSchema = z.string().trim().min(1).max(32)
export const roomSlugSchema = z.string().min(6).max(64)
export const messageBodySchema = z.string().trim().min(1).max(1000)

export const playbackRateSchema = z.number().min(0.25).max(3)
export const positionSecondsSchema = z.number().finite().min(0)
