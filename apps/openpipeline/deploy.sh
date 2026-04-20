#!/bin/bash
# Deploy OpenPipeline to Hetzner server
# Usage: ./deploy.sh

set -e

SERVER="root@116.203.36.5"
REMOTE_DIR="/opt/openpipeline"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "=== Building and deploying OpenPipeline ==="
echo "Server: $SERVER"
echo "Repo root: $REPO_ROOT"

# 1. Build Docker image locally
echo ""
echo "[1/4] Building Docker image..."
cd "$REPO_ROOT"
docker build -f apps/openpipeline/Dockerfile -t openpipeline:latest .

# 2. Save and transfer image
echo ""
echo "[2/4] Transferring image to server..."
docker save openpipeline:latest | gzip | ssh "$SERVER" "docker load"

# 3. Transfer docker-compose.yml
echo ""
echo "[3/4] Transferring config..."
ssh "$SERVER" "mkdir -p $REMOTE_DIR/data/uploads"
scp "$REPO_ROOT/apps/openpipeline/docker-compose.yml" "$SERVER:$REMOTE_DIR/docker-compose.yml"

# 4. Start container
echo ""
echo "[4/4] Starting container..."
ssh "$SERVER" "cd $REMOTE_DIR && docker compose up -d"

echo ""
echo "=== Deploy complete ==="
echo "App running at http://116.203.36.5:4177"
