#!/usr/bin/env sh
set -eu

ACTION="${1:-status}"
BACKUP_FILE="${2:-}"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ENV_FILE="$SCRIPT_DIR/.env"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

docker info >/dev/null 2>&1 || { echo "Docker is not running."; exit 1; }
[ -f "$ENV_FILE" ] || { cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"; echo "Edit $ENV_FILE, then run install again."; exit 1; }
if grep -q 'CHANGE_TO' "$ENV_FILE"; then echo "Replace every CHANGE_TO value in $ENV_FILE."; exit 1; fi

compose() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; }

case "$ACTION" in
  install|update) compose up -d --build --wait ;;
  start) compose up -d --wait ;;
  stop) compose stop ;;
  status) compose ps ;;
  backup)
    mkdir -p "$SCRIPT_DIR/backups"
    DB_USER=$(sed -n 's/^DB_USER=//p' "$ENV_FILE")
    DB_NAME=$(sed -n 's/^DB_NAME=//p' "$ENV_FILE")
    TARGET="$SCRIPT_DIR/backups/hospital-queue-$(date +%Y%m%d-%H%M%S).sql"
    compose exec -T database pg_dump -U "$DB_USER" -d "$DB_NAME" > "$TARGET"
    echo "Backup saved to $TARGET"
    ;;
  restore)
    [ -f "$BACKUP_FILE" ] || { echo "Usage: ./clinic.sh restore /path/to/backup.sql"; exit 1; }
    DB_USER=$(sed -n 's/^DB_USER=//p' "$ENV_FILE")
    DB_NAME=$(sed -n 's/^DB_NAME=//p' "$ENV_FILE")
    compose exec -T database psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
    ;;
  *) echo "Use: install, start, stop, status, backup, restore, or update"; exit 1 ;;
esac
