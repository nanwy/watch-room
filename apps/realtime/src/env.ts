import "dotenv/config"

export const env = {
  port: Number(process.env.PORT ?? 4001),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
}
