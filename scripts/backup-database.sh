#!/bin/bash

# Database backup script for VP Scheduling Application
# Usage: ./backup-database.sh [environment]

set -e

# Configuration
ENVIRONMENT=${1:-development}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="../backups"
BACKUP_FILE="vp-scheduling-backup-${ENVIRONMENT}-${TIMESTAMP}.sql"

# Load environment variables
if [ -f "../backend/.env" ]; then
    export $(cat ../backend/.env | grep -v '^#' | xargs)
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting database backup..."
echo "Environment: $ENVIRONMENT"
echo "Timestamp: $TIMESTAMP"
echo "---"

# Extract database connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*@.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Perform backup
PGPASSWORD=$DB_PASS pg_dump \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    -F p \
    --no-owner \
    --no-acl \
    -f "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup completed successfully!"
    echo "📁 Backup file: $BACKUP_DIR/$BACKUP_FILE"
    
    # Compress backup
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    echo "🗜️  Backup compressed: ${BACKUP_FILE}.gz"
    
    # Get file size
    FILESIZE=$(du -h "$BACKUP_DIR/${BACKUP_FILE}.gz" | cut -f1)
    echo "📊 Backup size: $FILESIZE"
    
    # Clean up old backups (keep last 7 days)
    echo "🧹 Cleaning up old backups..."
    find "$BACKUP_DIR" -name "vp-scheduling-backup-${ENVIRONMENT}-*.sql.gz" -type f -mtime +7 -delete
    echo "✅ Old backups removed (keeping last 7 days)"
    
else
    echo "❌ Backup failed!"
    exit 1
fi

echo "---"
echo "✅ Backup process completed!"
