# Self-hosted

## 1. Sync static artifacts

```bash
rsync -a api/ /var/www/wca-api/
```

Or pull the `api` branch in CI and rsync to your host.

## 2. nginx

```nginx
server {
  listen 80;
  server_name wca.example.com;

  location /static/ {
    alias /var/www/wca-api/;
    add_header Cache-Control "public, max-age=300";
    types { application/json json; }
    default_type application/json;
  }

  location /v1/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
  }
}
```

## 3. Router process

```bash
STATIC_ROOT=/var/www/wca-api \
PORT=3000 \
bun packages/router/src/index.ts
```

systemd unit sketch:

```ini
[Service]
WorkingDirectory=/opt/wca-data-router
Environment=STATIC_ROOT=/var/www/wca-api
ExecStart=/usr/bin/bun packages/router/src/index.ts
Restart=always
```

## Docker

```bash
docker run --rm -p 3000:3000 \
  -e STATIC_ROOT=/data \
  -v /var/www/wca-api:/data:ro \
  oven/bun:latest \
  bun packages/router/src/index.ts
```
