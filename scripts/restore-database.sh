#!/bin/bash

# Database restore script for VP Scheduling Application
# Usage: ./restore-database.sh <backup-file>

set -e

# Check if backup file provided
if [ -z "$1" ]; then
    echo "❌ Error: Backup file not specified"
    echo "Usage: ./restore-database.sh <backup-file>"
    echo "Example: ./restore-database.sh ../backups/vp-scheduling-backup-production-20231225_120000.sql.gz"
    exit 1
fi

BACKUP_FILE=$1

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Load environment variables
if [ -f "../backend/.env" ]; then
    export $(cat ../backend/.env | grep -v '^#' | xargs)
fi

echo "⚠️  WARNING: This will replace the current database!"
echo "Backup file: $BACKUP_FILE"
echo "---"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

echo "🔄 Starting database restore..."

# Extract database connection details
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*@.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
    echo "📦 Decompressing backup file..."
    DECOMPRESSED_FILE="${BACKUP_FILE%.gz}"
    gunzip -c "$BACKUP_FILE" > "$DECOMPRESSED_FILE"
    RESTORE_FILE="$DECOMPRESSED_FILE"
    CLEANUP_DECOMPRESSED=true
else
    RESTORE_FILE="$BACKUP_FILE"
    CLEANUP_DECOMPRESSED=false
fi

# Drop existing connections
echo "🔌 Terminating existing connections..."
PGPASSWORD=$DB_PASS psql \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
    > /dev/null 2>&1 || true

# Drop and recreate database
echo "🗑️  Dropping existing database..."
PGPASSWORD=$DB_PASS dropdb \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    --if-exists \
    $DB_NAME

echo "🆕 Creating new database..."
PGPASSWORD=$DB_PASS createdb \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    $DB_NAME

# Restore backup
echo "📥 Restoring backup..."
PGPASSWORD=$DB_PASS psql \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    -f "$RESTORE_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
    
    # Run Prisma migrations to ensure schema is up to date
    echo "🔧 Running Prisma migrations..."
    cd ../backend
    npx prisma migrate deploy
    
    echo "✅ Migrations applied!"
else
    echo "❌ Restore failed!"
    exit 1
fi

# Cleanup decompressed file if needed
if [ "$CLEANUP_DECOMPRESSED" = true ]; then
    rm "$DECOMPRESSED_FILE"
    echo "🧹 Cleaned up temporary files"
fi

echo "---"
echo "✅ Restore process completed!"
echo "⚠️  Remember to restart your application"
