import { createServer } from "node:http"

import { getPrisma } from "@workspace/db/client"
import { Server } from "socket.io"

import { sendChatMessage } from "./chat.js"
import { env } from "./env.js"
import { applyPlaybackControl } from "./playback.js"
import { broadcastMembersAfterDisconnect, getOnlineMembers, joinRoomSession } from "./sessions.js"

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: env.webOrigin,
  },
})

const prisma = getPrisma()

io.on("connection", (socket) => {
  socket.on("room:join", async (payload, ack) => {
    try {
      const result = await joinRoomSession(prisma, {
        ...payload,
        socketId: socket.id,
      })
      socket.join(result.room.slug)
      socket.emit("room:state", result.room)
      socket.emit("chat:history", result.messages)
      io.to(result.room.slug).emit("room:members", result.members)
      ack?.({ ok: true })
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : "Join failed" })
    }
  })

  socket.on("chat:send", async (payload, ack) => {
    try {
      const message = await sendChatMessage(prisma, payload)
      io.to(payload.roomSlug).emit("chat:message", message)
      ack?.({ ok: true })
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : "Message failed" })
    }
  })

  socket.on("playback:control", async (payload, ack) => {
    try {
      const state = await applyPlaybackControl(prisma, payload)
      io.to(payload.roomSlug).emit("playback:state", state)
      ack?.({ ok: true })
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : "Playback update failed" })
    }
  })

  socket.on("disconnect", async () => {
    await broadcastMembersAfterDisconnect(prisma, socket.id, {
      to: (slug) => io.to(slug),
      getOnlineMembers,
    })
  })
})

httpServer.listen(env.port, () => {
  console.log(`Realtime service listening on :${env.port}`)
})
