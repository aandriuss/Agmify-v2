#!/bin/bash

BACKUP_DIR="$HOME/speckle-backups"
# Keep backups for 30 days by default
DEFAULT_BACKUP_DAYS=30
# Keep at least this many backups, even if they're older
MIN_BACKUPS=5

function cleanup_old_backups() {
    local days_to_keep=${1:-$DEFAULT_BACKUP_DAYS}
    local backup_count=$(ls -1 "$BACKUP_DIR" | wc -l)
    
    echo "🧹 Cleaning up backups older than $days_to_keep days..."
    
    # First, remove old backups but keep at least MIN_BACKUPS
    if [ $backup_count -gt $MIN_BACKUPS ]; then
        find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +$days_to_keep -print0 | \
        while IFS= read -r -d '' dir; do
            # Check if we still have more than MIN_BACKUPS before deleting
            current_count=$(ls -1 "$BACKUP_DIR" | wc -l)
            if [ $current_count -gt $MIN_BACKUPS ]; then
                echo "🗑️  Removing old backup: $(basename "$dir")"
                rm -rf "$dir"
            fi
        done
    fi
    
    # Show backup storage stats
    echo "📊 Backup storage status:"
    du -sh "$BACKUP_DIR"
    echo "📦 Total backups: $(ls -1 "$BACKUP_DIR" | wc -l)"
}

function list_backups() {
    echo "📋 Available backups:"
    echo "----------------------------------------"
    echo "Date Created | Size | Path"
    echo "----------------------------------------"
    
    for backup in "$BACKUP_DIR"/*/; do
        if [ -d "$backup" ]; then
            created=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$backup")
            size=$(du -sh "$backup" | cut -f1)
            echo "$created | $size | $(basename "$backup")"
        fi
    done
}

function backup_speckle_data() {
    local backup_name="speckle_$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    # Create backup directory
    echo "📦 Creating backup directory: $backup_path"
    mkdir -p "$backup_path"
    
    # Backup Speckle volumes
    echo "💾 Backing up Postgres data..."
    docker run --rm -v speckle-server-postgres-data:/source -v "$backup_path":/backup \
        alpine tar czf /backup/postgres_data.tar.gz -C /source . || echo "⚠️  Postgres backup failed"
    
    echo "💾 Backing up Redis data..."
    docker run --rm -v speckle-server-redis-data:/source -v "$backup_path":/backup \
        alpine tar czf /backup/redis_data.tar.gz -C /source . || echo "⚠️  Redis backup failed"
    
    echo "💾 Backing up Minio data..."
    docker run --rm -v speckle-server-minio-data:/source -v "$backup_path":/backup \
        alpine tar czf /backup/minio_data.tar.gz -C /source . || echo "⚠️  Minio backup failed"
    
    echo "✅ Backup completed in: $backup_path"
    
    # Automatic cleanup of old backups
    cleanup_old_backups
}

function stop_speckle() {
    echo "🛑 Stopping all Speckle services..."
    
    # First backup the data
    backup_speckle_data
    
    # Stop all containers using docker compose
    echo "🛑 Stopping Docker Compose services..."
    docker compose down
    
    # Double-check for any remaining containers
    local remaining=$(docker ps -q --filter name="speckle|redis|minio|postgres|keycloak")
    if [ ! -z "$remaining" ]; then
        echo "🧹 Stopping remaining containers..."
        docker stop $remaining
    fi
    
    echo "✨ Speckle environment stopped successfully"
}

function start_speckle() {
    echo "🚀 Starting Speckle environment..."
    
    # Start all services using docker compose
    docker compose up -d
    
    # Wait for services to initialize
    echo "⏳ Waiting for services to start..."
    sleep 10
    
    # Check service status
    echo "📊 Current service status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E 'speckle|redis|minio|postgres|keycloak'
}

# Main script with command handling
case "$1" in
    "stop")
        stop_speckle
        ;;
    "start")
        start_speckle
        ;;
    "backup")
        backup_speckle_data
        ;;
    "list-backups")
        list_backups
        ;;
    "cleanup")
        if [ ! -z "$2" ]; then
            cleanup_old_backups "$2"
        else
            cleanup_old_backups
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|backup|list-backups|cleanup [days]}"
        echo "  start        - Start the Speckle environment"
        echo "  stop         - Safely stop the environment and backup data"
        echo "  backup       - Create a backup without stopping services"
        echo "  list-backups - Show all available backups"
        echo "  cleanup [days] - Remove backups older than [days] (default: $DEFAULT_BACKUP_DAYS)"
        echo ""
        echo "Examples:"
        echo "  $0 cleanup 7     # Remove backups older than 7 days"
        echo "  $0 list-backups  # Show all backups"
        ;;
esac