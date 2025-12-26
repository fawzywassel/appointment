# Docker Setup Guide

This guide explains how to run the VP Scheduling Application using Docker Compose.

## Prerequisites

- Docker Desktop installed and running
- At least 4GB of RAM allocated to Docker
- Ports 3000, 3001, 5432, and 6379 available on your machine

## Architecture

The application consists of 4 services:
- **PostgreSQL** (port 5432) - Database
- **Redis** (port 6379) - Caching layer
- **Backend** (port 3001) - NestJS API
- **Frontend** (port 3000) - Next.js UI

All services are connected via a Docker bridge network and can communicate with each other.

## Quick Start (Production Mode)

### 1. Build and Start All Services
```bash
docker-compose up -d
```

This will:
- Pull PostgreSQL and Redis images
- Build backend and frontend Docker images
- Start all services in detached mode
- Run database migrations automatically
- Expose services to your local machine

### 2. Check Service Status
```bash
docker-compose ps
```

### 3. View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 5. Stop Services
```bash
docker-compose down
```

### 6. Stop and Remove Volumes (Delete Data)
```bash
docker-compose down -v
```

## Development Mode (With Hot Reload)

For development with hot reload and volume mounting:

### 1. Start Development Environment
```bash
docker-compose -f docker-compose.dev.yml up -d
```

This will:
- Mount source code as volumes
- Enable hot reload for both frontend and backend
- Use development dependencies
- Run in watch mode

### 2. View Development Logs
```bash
docker-compose -f docker-compose.dev.yml logs -f
```

### 3. Stop Development Environment
```bash
docker-compose -f docker-compose.dev.yml down
```

## Useful Commands

### Rebuild Services (After Code Changes)
```bash
# Rebuild and restart all services
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build backend
```

### Execute Commands Inside Containers

#### Backend Container
```bash
# Access shell
docker-compose exec backend sh

# Run Prisma commands
docker-compose exec backend npx prisma migrate dev
docker-compose exec backend npx prisma studio

# Run tests
docker-compose exec backend npm test
```

#### Frontend Container
```bash
# Access shell
docker-compose exec frontend sh

# Run lint
docker-compose exec frontend npm run lint
```

#### Database Container
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d vp_scheduling_db

# Create database backup
docker-compose exec postgres pg_dump -U postgres vp_scheduling_db > backup.sql
```

### View Container Resources
```bash
docker-compose stats
```

### Restart Specific Service
```bash
docker-compose restart backend
docker-compose restart frontend
```

## Port Mapping

All services are exposed to your local machine:

| Service    | Container Port | Host Port | Access URL                |
|------------|---------------|-----------|---------------------------|
| Frontend   | 3000          | 3000      | http://localhost:3000     |
| Backend    | 3001          | 3001      | http://localhost:3001     |
| PostgreSQL | 5432          | 5432      | localhost:5432            |
| Redis      | 6379          | 6379      | localhost:6379            |

## Environment Variables

Environment variables are set in `docker-compose.yml`. To customize:

### Backend Variables
```yaml
environment:
  - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/vp_scheduling_db
  - REDIS_HOST=redis
  - JWT_SECRET=your-secret-here
  - FRONTEND_URL=http://localhost:3000
```

### Frontend Variables
```yaml
environment:
  - NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Database Management

### Run Migrations
```bash
docker-compose exec backend npx prisma migrate dev
```

### Access Prisma Studio
```bash
docker-compose exec backend npx prisma studio
```
Then open http://localhost:5555

### Reset Database
```bash
docker-compose exec backend npx prisma migrate reset
```

### Backup Database
```bash
docker-compose exec postgres pg_dump -U postgres vp_scheduling_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database
```bash
cat backup.sql | docker-compose exec -T postgres psql -U postgres -d vp_scheduling_db
```

## Troubleshooting

### Services Won't Start
1. Check if ports are already in use:
   ```bash
   lsof -i :3000
   lsof -i :3001
   lsof -i :5432
   lsof -i :6379
   ```

2. Check Docker logs:
   ```bash
   docker-compose logs
   ```

### Database Connection Issues
```bash
# Check if PostgreSQL is healthy
docker-compose exec postgres pg_isready -U postgres

# View PostgreSQL logs
docker-compose logs postgres
```

### Backend Won't Start
```bash
# View backend logs
docker-compose logs backend

# Rebuild backend
docker-compose up -d --build backend
```

### Frontend Build Errors
```bash
# View frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up -d --build frontend
```

### Clean Everything and Start Fresh
```bash
# Stop and remove everything
docker-compose down -v

# Remove all images
docker-compose down --rmi all -v

# Rebuild from scratch
docker-compose up -d --build
```

## Network Configuration

All services are on the `app-network` bridge network:
- Services can communicate using service names (e.g., `postgres`, `redis`, `backend`)
- The network is isolated from other Docker networks
- Port forwarding exposes services to your local machine

### Test Network Connectivity
```bash
# From backend to postgres
docker-compose exec backend ping postgres

# From backend to redis
docker-compose exec backend ping redis
```

## Performance Tips

1. **Allocate enough memory to Docker** (at least 4GB)
2. **Use development mode** for faster rebuilds during development
3. **Use volume caching** (already configured in dev mode)
4. **Prune unused images** regularly:
   ```bash
   docker system prune -a
   ```

## Security Notes

- Change default PostgreSQL password in production
- Update JWT_SECRET before deploying
- Don't commit sensitive environment variables
- Use Docker secrets for production deployments

## CI/CD Integration

The Dockerfiles are optimized for CI/CD:
- Multi-stage builds reduce image size
- Production images only include necessary dependencies
- Health checks enable automatic restart on failure

Example GitHub Actions:
```yaml
- name: Build Docker images
  run: docker-compose build

- name: Run tests
  run: docker-compose up -d && docker-compose exec backend npm test
```

## Next Steps

1. Start the services: `docker-compose up -d`
2. Check logs: `docker-compose logs -f`
3. Access frontend: http://localhost:3000
4. Access backend: http://localhost:3001
5. Test authentication endpoints
6. Explore the database with Prisma Studio

For local development without Docker, see `QUICK_START.md`.
