import { z } from "zod"
import {
  clientIdSchema,
  messageBodySchema,
  nicknameSchema,
  playbackRateSchema,
  positionSecondsSchema,
  roomSlugSchema,
} from "./validation.js"

export const joinRoomSchema = z.object({
  roomSlug: roomSlugSchema,
  clientId: clientIdSchema,
  nickname: nicknameSchema,
})

export const chatMessageSchema = z.object({
  roomSlug: roomSlugSchema,
  clientId: clientIdSchema,
  nickname: nicknameSchema,
  body: messageBodySchema,
})

export const playbackControlSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("play"),
    roomSlug: roomSlugSchema,
    clientId: clientIdSchema,
    positionSeconds: positionSecondsSchema,
  }),
  z.object({
    type: z.literal("pause"),
    roomSlug: roomSlugSchema,
    clientId: clientIdSchema,
    positionSeconds: positionSecondsSchema,
  }),
  z.object({
    type: z.literal("seek"),
    roomSlug: roomSlugSchema,
    clientId: clientIdSchema,
    positionSeconds: positionSecondsSchema,
  }),
  z.object({
    type: z.literal("setPlaybackRate"),
    roomSlug: roomSlugSchema,
    clientId: clientIdSchema,
    positionSeconds: positionSecondsSchema,
    playbackRate: playbackRateSchema,
  }),
  z.object({
    type: z.literal("switchEpisode"),
    roomSlug: roomSlugSchema,
    clientId: clientIdSchema,
    animeId: z.string().min(1),
    episodeId: z.string().min(1),
  }),
  z.object({
    type: z.literal("switchAnime"),
    roomSlug: roomSlugSchema,
    clientId: clientIdSchema,
    animeId: z.string().min(1),
    episodeId: z.string().min(1),
  }),
])

export type JoinRoomInput = z.infer<typeof joinRoomSchema>
export type ChatMessageInput = z.infer<typeof chatMessageSchema>
export type PlaybackControlInput = z.infer<typeof playbackControlSchema>
