#!/bin/bash
# Rollback script for VP Scheduling Application
# This script rolls back to the previous Docker image version

set -e

echo "🔄 Starting rollback process..."

# Get the previous image tags
BACKEND_PREV=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep vp-scheduling-backend | sed -n '2p')
FRONTEND_PREV=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep vp-scheduling-frontend | sed-n '2p')

if [ -z "$BACKEND_PREV" ] || [ -z "$FRONTEND_PREV" ]; then
  echo "❌ Error: Could not find previous images"
  exit 1
fi

echo "📦 Rolling back to:"
echo "  Backend: $BACKEND_PREV"
echo "  Frontend: $FRONTEND_PREV"

# Stop current containers
echo "🛑 Stopping current containers..."
docker-compose -f docker-compose.prod.yml down

# Update docker-compose to use previous tags
export BACKEND_IMAGE=$BACKEND_PREV
export FRONTEND_IMAGE=$FRONTEND_PREV

# Start containers with previous images
echo "🚀 Starting containers with previous images..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for health checks
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check health
if curl --fail http://localhost:3001/health > /dev/null 2>&1; then
  echo "✅ Rollback successful! Application is healthy."
else
  echo "❌ Rollback failed! Application health check failed."
  exit 1
fi

echo "✅ Rollback completed successfully"
