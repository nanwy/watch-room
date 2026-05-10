import { expect, test } from "@playwright/test"

test("two browsers join, chat, and sync playback", async ({ browser, request }) => {
  const scan = await request.post("/api/admin/import/scan")
  expect(scan.ok(), await scan.text()).toBeTruthy()

  const library = await request.get("/api/library").then((r) => r.json()) as Array<{
    id: string; episodes: { id: string }[]
  }>
  const animeWithEpisode = library.find((a) => a.episodes.length > 0)
  test.skip(!animeWithEpisode, "no media in library; place an mp4 in MEDIA_IMPORT_DIR before running")

  const create = await request.post("/api/admin/rooms", {
    data: { animeId: animeWithEpisode!.id, episodeId: animeWithEpisode!.episodes[0]!.id },
  })
  expect(create.ok(), await create.text()).toBeTruthy()
  const room = (await create.json()) as { slug: string }

  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const a = await ctxA.newPage()
  const b = await ctxB.newPage()

  await a.goto(`/room/${room.slug}`)
  await a.getByPlaceholder("你的昵称").fill("Alice")
  await a.getByRole("button", { name: "加入" }).click()

  await b.goto(`/room/${room.slug}`)
  await b.getByPlaceholder("你的昵称").fill("Bob")
  await b.getByRole("button", { name: "加入" }).click()

  await expect(a.getByText("Alice")).toBeVisible()
  await expect(a.getByText("Bob")).toBeVisible()

  await a.locator("input[placeholder='说点什么']").fill("hello from alice")
  await a.getByRole("button", { name: "发送" }).click()
  await expect(b.getByText("hello from alice")).toBeVisible()

  await b.evaluate(() => {
    const v = document.querySelector("video") as HTMLVideoElement | null
    v?.play()
  })
  await a.waitForFunction(() => {
    const v = document.querySelector("video") as HTMLVideoElement | null
    return v ? !v.paused : false
  }, undefined, { timeout: 5000 })
})
