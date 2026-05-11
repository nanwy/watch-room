import { getPrisma } from "@workspace/db/client"

import { isAdminRequest, unauthorizedResponse } from "../../../../../lib/admin-auth"

type PrismaClient = ReturnType<typeof getPrisma>

export type DeleteRoomDeps = {
  getPrismaClient: () => PrismaClient
}

const defaultDeps: DeleteRoomDeps = {
  getPrismaClient: getPrisma,
}

export function createDeleteRoomHandler(deps: DeleteRoomDeps = defaultDeps) {
  return async function handleDeleteRoom(
    request: Request,
    context: { params: Promise<{ roomId: string }> },
  ) {
    if (!isAdminRequest(request)) {
      return unauthorizedResponse()
    }

    const { roomId } = await context.params
    const prisma = deps.getPrismaClient()
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true },
    })

    if (!room) {
      return Response.json({ error: "Room not found" }, { status: 404 })
    }

    await prisma.room.delete({ where: { id: room.id } })
    return Response.json({ deleted: true })
  }
}
