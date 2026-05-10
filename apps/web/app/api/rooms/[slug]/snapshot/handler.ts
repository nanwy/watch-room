import { getPrisma } from "@workspace/db/client"
import { getRoomSnapshot } from "@workspace/db/rooms"

export type RoomSnapshotDeps = {
  getSnapshot: typeof getRoomSnapshot
  getPrismaClient: () => Parameters<typeof getRoomSnapshot>[0]
}

const defaultDeps: RoomSnapshotDeps = {
  getSnapshot: getRoomSnapshot,
  getPrismaClient: getPrisma,
}

export function createRoomSnapshotHandler(deps: RoomSnapshotDeps = defaultDeps) {
  return async function handler(
    _request: Request,
    context: { params: Promise<{ slug: string }> },
  ) {
    const { slug } = await context.params
    const snapshot = await deps.getSnapshot(deps.getPrismaClient(), slug)
    if (!snapshot) {
      return Response.json({ error: "Room not found" }, { status: 404 })
    }
    return Response.json(snapshot)
  }
}
