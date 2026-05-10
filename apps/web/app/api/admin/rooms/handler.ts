import { getPrisma } from "@workspace/db/client"
import { createRoom } from "@workspace/db/rooms"
import { z } from "zod"

import { isAdminRequest, unauthorizedResponse } from "../../../../lib/admin-auth"

const createRoomSchema = z.object({
  animeId: z.string().min(1),
  episodeId: z.string().min(1),
})

export type CreateRoomDeps = {
  create: typeof createRoom
  getPrismaClient: () => Parameters<typeof createRoom>[0]
}

const defaultDeps: CreateRoomDeps = {
  create: createRoom,
  getPrismaClient: getPrisma,
}

export function createRoomRouteHandler(deps: CreateRoomDeps = defaultDeps) {
  return async function handleCreateRoom(request: Request) {
    if (!isAdminRequest(request)) {
      return unauthorizedResponse()
    }

    const payload = createRoomSchema.safeParse(await request.json().catch(() => null))
    if (!payload.success) {
      return Response.json({ error: "Invalid room payload" }, { status: 400 })
    }

    const room = await deps.create(deps.getPrismaClient(), payload.data)
    return Response.json({
      id: room.id,
      slug: room.slug,
      path: `/room/${room.slug}`,
    }, { status: 201 })
  }
}
