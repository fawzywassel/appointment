#!/bin/bash

echo "🚀 Starting VP Scheduling Application with Docker..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop first."
  exit 1
fi

echo "✓ Docker is running"
echo ""

# Check for existing local PostgreSQL on port 5432
if lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  echo "⚠️  Warning: Port 5432 is already in use (likely local PostgreSQL)"
  echo "   You can either:"
  echo "   1. Stop local PostgreSQL: brew services stop postgresql@16"
  echo "   2. Continue (containers will use different ports)"
  read -p "   Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Prompt for mode
echo "Select mode:"
echo "1) Production (optimized builds)"
echo "2) Development (with hot reload)"
read -p "Enter choice [1 or 2]: " mode

echo ""
echo "🔨 Building and starting services..."
echo ""

if [ "$mode" = "2" ]; then
  echo "Starting in DEVELOPMENT mode..."
  docker-compose -f docker-compose.dev.yml up -d --build
else
  echo "Starting in PRODUCTION mode..."
  docker-compose up -d --build
fi

# Wait a moment for services to start
echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Check status
echo ""
echo "📊 Service Status:"
if [ "$mode" = "2" ]; then
  docker-compose -f docker-compose.dev.yml ps
else
  docker-compose ps
fi

echo ""
echo "✅ Application started successfully!"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3001"
echo "   Prisma Studio: docker-compose exec backend npx prisma studio"
echo ""
echo "📝 Useful commands:"
if [ "$mode" = "2" ]; then
  echo "   View logs:     docker-compose -f docker-compose.dev.yml logs -f"
  echo "   Stop services: docker-compose -f docker-compose.dev.yml down"
else
  echo "   View logs:     docker-compose logs -f"
  echo "   Stop services: docker-compose down"
fi
echo ""
echo "📖 For more commands, see DOCKER_GUIDE.md"
echo ""
