# Deployment Guide

This guide covers deploying NestJS Better-Auth to production environments.

## Deployment Options

1. **Docker Compose** - Full stack deployment (recommended)
2. **Single Container** - Deploy API with external services
3. **Manual Deployment** - Custom infrastructure

## Docker Compose Deployment

### Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- Domain name with DNS configured
- SSL certificates (or use Let's Encrypt)

### Production Configuration

Create `docker-compose.prod.yml`:

```yaml
version: "3.8"

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      PORT: 8080
      DATABASE_URL: postgresql://user:password@db:5432/production
      BETTER_AUTH_URL: https://api.example.com
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      COOKIE_SECRET: ${COOKIE_SECRET}
      REDIS_URL: redis://redis:6379
      SMTP_HOST: smtp.example.com
      SMTP_PORT: 587
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: production
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d production"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 128M

volumes:
  pgdata:
  redisdata:
```

### Deploy

```bash
# Build and start
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api

# Check status
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

## Environment Variables for Production

### Required

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/dbname
BETTER_AUTH_URL=https://api.example.com
BETTER_AUTH_SECRET=your-production-secret-at-least-32-characters
COOKIE_SECRET=your-cookie-secret-at-least-32-characters
```

### Generate Secrets

```bash
# Auth secret
openssl rand -base64 32

# Cookie secret
openssl rand -base64 32
```

### Optional

```env
# Disable dev features
FEATURE_SWAGGER=false
FEATURE_EMAIL_PREVIEW=false

# Enable observability
FEATURE_TRACING=true
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://tempo.example.com:4318

# File storage
STORAGE_DRIVER=s3
AWS_REGION=us-east-1
AWS_BUCKET=my-app-uploads
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

## Reverse Proxy (Nginx)

### Configuration

```nginx
upstream api {
    server 127.0.0.1:8080;
    keepalive 64;
}

server {
    listen 80;
    server_name api.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    client_max_body_size 5M;

    location / {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /docs {
        proxy_pass http://api;
        # Consider disabling Swagger in production
    }
}
```

### ACME (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.example.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Database Migrations

### Run Migrations

```bash
# In container
docker compose exec api pnpm db:migrate

# Or via script
docker compose exec api node dist/scripts/migrate.js
```

### Migration Script

Create `scripts/migrate.js`:

```javascript
const { migrate } = require("drizzle-orm/node-postgres/migrator");
const { db } = require("../dist/db/connection");

async function runMigrations() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./dist/drizzle/migrations" });
  console.log("Migrations complete");
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

## Health Checks

### Configure Health Endpoint

The `/health` endpoint checks database connectivity:

```bash
curl https://api.example.com/health
```

### Docker Healthcheck

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## Monitoring

### Prometheus Metrics

Enable and access at `/metrics`:

```env
FEATURE_METRICS=true
```

### Example Prometheus Config

```yaml
scrape_configs:
  - job_name: "nest-better-auth"
    static_configs:
      - targets: ["api.example.com:443"]
    metrics_path: "/metrics"
    scheme: https
```

### Logging

Configure structured JSON logs for production:

```env
NODE_ENV=production
# Pino will output JSON format automatically
```

### OpenTelemetry

```env
FEATURE_TRACING=true
OTEL_ENABLED=true
OTEL_SERVICE_NAME=nest-better-auth
OTEL_EXPORTER_OTLP_ENDPOINT=https://tempo.example.com:4318
```

## Security Checklist

- [ ] `NODE_ENV=production`
- [ ] `BETTER_AUTH_SECRET` set to random 32+ char string
- [ ] `COOKIE_SECRET` set to random 32+ char string
- [ ] `CORS_ORIGINS` set to specific domains (not `*`)
- [ ] `FEATURE_SWAGGER=false` (disable API docs)
- [ ] `FEATURE_EMAIL_PREVIEW=false`
- [ ] Database password changed from default
- [ ] Redis password set
- [ ] TLS configured (HTTPS)
- [ ] Rate limiting enabled
- [ ] Firewall configured (only ports 80, 443)

## Scaling

### Horizontal Scaling

The API is stateless and can be scaled horizontally:

```yaml
# docker-compose.prod.yml
services:
  api:
    deploy:
      replicas: 3
    # Use shared Redis for session cache
    environment:
      REDIS_URL: redis://redis:6379
```

### Database Connection Pool

```env
DB_POOL_MAX=20
```

### Redis for Session Cache

Sessions are cached in Redis by default when `REDIS_URL` is set, enabling:

- Horizontal scaling (multiple API instances)
- Fast session lookups
- Shared session state

## Backup Strategy

### Database Backup

```bash
# PostgreSQL backup
docker compose exec db pg_dump -U user production > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T db psql -U user production < backup_20240115.sql
```

### Automated Backups

```bash
# Cron job for daily backups
0 2 * * * docker compose exec db pg_dump -U user production | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs api

# Check environment
docker compose config
```

### Database Connection Failed

```bash
# Verify database is ready
docker compose exec db pg_isready

# Check connection string
docker compose exec api env | grep DATABASE_URL
```

### High Memory Usage

```bash
# Check container limits
docker stats

# Adjust in compose file
deploy:
  resources:
    limits:
      memory: 512M
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and deploy
        env:
          BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}
          COOKIE_SECRET: ${{ secrets.COOKIE_SECRET }}
        run: |
          echo "${{ secrets.DOCKER_CONFIG }}" | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker compose -f docker-compose.yml -f docker-compose.prod.yml push
          # Trigger your deployment mechanism (SSH, Kubernetes, etc.)
```

## Related Documentation

- [Configuration Guide](CONFIGURATION.md)
- [Architecture Overview](ARCHITECTURE.md)
- [API Reference](API.md)
