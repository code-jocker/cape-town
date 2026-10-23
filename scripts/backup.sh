#!/usr/bin/env bash
# Nightly MongoDB backup for Elite Paradize.
#
# Dumps the app database to a timestamped, gzip-compressed archive under
# BACKUP_DIR and prunes backups older than RETENTION_DAYS. Add to cron, e.g.:
#   0 3 * * *  /opt/paradize/scripts/backup.sh >> /var/log/paradize-backup.log 2>&1
#
# Configure via environment (or edit the defaults below):
#   MONGODB_URI   full connection string (may include auth)
#   BACKUP_DIR    destination directory (default /var/backups/paradize)
#   RETENTION_DAYS  how many days of backups to keep (default 14)
set -euo pipefail

MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/elite-paradize}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/paradize}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# Derive the db name from the URI path (strip query string).
DB_NAME="$(printf '%s' "$MONGODB_URI" | sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/${DB_NAME}-${STAMP}.archive.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Is)] backing up ${DB_NAME} -> ${OUT}"
mongodump --uri="$MONGODB_URI" --gzip --archive="$OUT"

echo "[$(date -Is)] pruning backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -name "${DB_NAME}-*.archive.gz" -type f -mtime "+${RETENTION_DAYS}" -print -delete

echo "[$(date -Is)] done ($(du -h "$OUT" | cut -f1))"
