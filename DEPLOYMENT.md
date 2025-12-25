# VP Scheduling Application - Deployment Guide

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment)
- [Database Management](#database-management)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **PostgreSQL**: v15 or higher
- **Redis**: v7 or higher (optional, for caching)
- **Docker**: v24 or higher (for containerized deployment)
- **Docker Compose**: v2.20 or higher

### Required Accounts
- **SSO Provider** (Azure AD/Okta/etc.)
- **Microsoft Azure** (for Outlook calendar integration)
- **Google Cloud Platform** (for Google Calendar integration)
- **SendGrid** (for email notifications)
- **Twilio** (for SMS notifications)

---

## Environment Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd vp-scheduling-app
```

### 2. Configure Environment Variables

#### Backend (.env)
Create `backend/.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/vpscheduling?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV="production"
FRONTEND_URL="https://your-domain.com"

# SSO Authentication
SSO_CLIENT_ID="your-sso-client-id"
SSO_CLIENT_SECRET="your-sso-client-secret"
SSO_REDIRECT_URI="https://api.your-domain.com/api/auth/callback"

# Microsoft Graph (Outlook)
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
MICROSOFT_REDIRECT_URI="https://api.your-domain.com/api/calendar/callback/microsoft"

# Google Calendar
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="https://api.your-domain.com/api/calendar/callback/google"

# Redis (optional)
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD="your-redis-password"

# SendGrid
SENDGRID_API_KEY="your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@your-domain.com"

# Twilio
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"
```

#### Frontend (.env.local)
Create `frontend/.env.local` file:

```env
NEXT_PUBLIC_API_URL="https://api.your-domain.com/api"
NEXT_PUBLIC_SSO_CLIENT_ID="your-sso-client-id"
```

---

## Production Deployment

### Method 1: Manual Deployment

#### Backend
```bash
cd backend

# Install dependencies
npm ci --only=production

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build application
npm run build

# Start production server
NODE_ENV=production node dist/main.js
```

#### Frontend
```bash
cd frontend

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Start production server
npm start
```

---

### Method 2: PM2 Process Manager

#### Install PM2
```bash
npm install -g pm2
```

#### Backend
```bash
cd backend
pm2 start dist/main.js --name "vp-scheduling-api" \
  --node-args="--max-old-space-size=2048" \
  --env production
```

#### Frontend
```bash
cd frontend
pm2 start npm --name "vp-scheduling-frontend" -- start
```

#### PM2 Management
```bash
# View logs
pm2 logs vp-scheduling-api
pm2 logs vp-scheduling-frontend

# Restart
pm2 restart vp-scheduling-api
pm2 restart vp-scheduling-frontend

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

---

## Docker Deployment

### Build and Run with Docker Compose

#### 1. Create Production Environment File
Create `.env` in project root:

```env
# PostgreSQL
POSTGRES_DB=vpscheduling
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-postgres-password
POSTGRES_PORT=5432

# Redis
REDIS_PASSWORD=your-secure-redis-password
REDIS_PORT=6379

# Application
BACKEND_PORT=3001
FRONTEND_PORT=3000
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# URLs
FRONTEND_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api

# SSO, Microsoft, Google, SendGrid, Twilio (same as above)
# ... add all other env vars
```

#### 2. Build Images
```bash
docker-compose -f docker-compose.prod.yml build
```

#### 3. Start Services
```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### 4. View Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

#### 5. Stop Services
```bash
docker-compose -f docker-compose.prod.yml down
```

---

## Database Management

### Run Migrations
```bash
cd backend
npx prisma migrate deploy
```

### Create Migration
```bash
npx prisma migrate dev --name <migration-name>
```

### Reset Database (⚠️ Dangerous)
```bash
npx prisma migrate reset
```

### Backup Database
```bash
cd scripts
chmod +x backup-database.sh
./backup-database.sh production
```

Backups are saved to `backups/` directory with format:
```
vp-scheduling-backup-production-YYYYMMDD_HHMMSS.sql.gz
```

### Restore Database
```bash
cd scripts
chmod +x restore-database.sh
./restore-database.sh ../backups/vp-scheduling-backup-production-20231225_120000.sql.gz
```

### Automated Backups (Cron)
Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/scripts/backup-database.sh production >> /var/log/vp-scheduling-backup.log 2>&1
```

---

## Monitoring & Health Checks

### Health Check Endpoints

#### Backend Health
```bash
# Main health check (includes database)
curl http://localhost:3001/api/health

# Liveness check (is app running)
curl http://localhost:3001/api/health/live

# Readiness check (is app ready to serve)
curl http://localhost:3001/api/health/ready
```

#### API Documentation
Access Swagger docs at:
```
http://localhost:3001/api-docs
```

### Docker Health Checks
Health checks are built into Docker containers:
```bash
docker inspect vp-scheduling-backend-prod | grep -A 10 Health
```

---

## Security Considerations

### 1. Environment Variables
- ❌ NEVER commit `.env` files to version control
- ✅ Use secrets management (AWS Secrets Manager, Azure Key Vault, etc.)
- ✅ Rotate secrets regularly

### 2. Database Security
- ✅ Use strong passwords (minimum 32 characters)
- ✅ Enable SSL/TLS connections
- ✅ Restrict database access to application IP only
- ✅ Regular backups with encryption

### 3. API Security
- ✅ Rate limiting enabled
- ✅ JWT tokens with expiration
- ✅ CORS properly configured
- ✅ Input validation on all endpoints
- ✅ SQL injection protection (Prisma ORM)

### 4. HTTPS/SSL
- ✅ Use SSL certificates (Let's Encrypt recommended)
- ✅ Force HTTPS redirect
- ✅ HSTS headers enabled
- ✅ Secure cookie flags

### 5. Docker Security
- ✅ Non-root user in containers
- ✅ Multi-stage builds to reduce image size
- ✅ Scan images for vulnerabilities
- ✅ Use specific version tags (not `latest`)

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Error
**Problem**: `Can't reach database server`

**Solution**:
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs vp-scheduling-postgres-prod

# Verify connection string
echo $DATABASE_URL
```

#### 2. Migration Errors
**Problem**: `Migration failed`

**Solution**:
```bash
# Reset migrations (⚠️ development only)
npx prisma migrate reset

# Or force deploy
npx prisma migrate deploy --force
```

#### 3. Port Already in Use
**Problem**: `Port 3001 already in use`

**Solution**:
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

#### 4. Out of Memory
**Problem**: Container crashes with OOM

**Solution**:
```yaml
# In docker-compose.prod.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
```

#### 5. Slow Performance
**Problem**: Application is slow

**Solutions**:
- Enable Redis caching
- Optimize database queries (add indexes)
- Enable connection pooling
- Use CDN for frontend assets
- Enable gzip compression

---

## Production Checklist

Before going live:

- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Backup system tested
- [ ] Health checks verified
- [ ] Monitoring/logging setup
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Documentation updated
- [ ] Disaster recovery plan ready
- [ ] Support team trained

---

## Support & Maintenance

### Regular Maintenance Tasks

**Daily**:
- Monitor application logs
- Check error rates
- Verify backup completion

**Weekly**:
- Review performance metrics
- Check disk space
- Update dependencies (security patches)

**Monthly**:
- Full backup test (restore)
- Security audit
- Performance optimization review

---

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Last Updated**: December 25, 2025  
**Version**: 1.0.0
