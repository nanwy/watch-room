import { createDeleteEpisodeHandler, createUpdateEpisodeHandler } from "./handler"

export const runtime = "nodejs"

export const DELETE = createDeleteEpisodeHandler()
export const PATCH = createUpdateEpisodeHandler()
