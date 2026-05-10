# Deployment

This stack runs as four containers (web, realtime, postgres, proxy) plus two host-mounted directories for media.

## Required env vars

Create a `.env` file next to `docker-compose.yml`:

```
ADMIN_PASSCODE=change-me
PUBLIC_REALTIME_URL=http://your.domain
PUBLIC_WEB_ORIGIN=http://your.domain
```

## First run

```
mkdir -p data/imports data/media
docker compose build
docker compose up -d
docker compose exec web pnpm --filter @workspace/db prisma migrate deploy
```

## Importing media

Place media under `./data/imports/<动漫名>/<剧集>.mp4` on the host, then visit `/admin/library` and click **扫描导入** with the configured `ADMIN_PASSCODE`.
