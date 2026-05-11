const fs = require("node:fs")
const path = require("node:path")

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) return env

      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed)
      if (!match) return env

      const [, key, rawValue] = match
      const value = rawValue.trim().replace(/^(['"])(.*)\1$/, "$2")
      env[key] = value
      return env
    }, {})
}

const root = __dirname
const fileEnv = {
  ...loadEnvFile(path.join(root, ".env")),
  ...loadEnvFile(path.join(root, ".env.production")),
}

module.exports = {
  apps: [
    {
      name: "watch-room-web",
      cwd: root,
      script: "pnpm",
      args: "--filter web start",
      env: {
        ...fileEnv,
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
    {
      name: "watch-room-realtime",
      cwd: root,
      script: "pnpm",
      args: "--filter realtime start",
      env: {
        ...fileEnv,
        NODE_ENV: "production",
        PORT: "4001",
      },
    },
  ],
}
