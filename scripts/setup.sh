#!/bin/bash
set -e
echo "Setting up opensoftware-starter..."
cp .env.example .env.local 2>/dev/null || true
pnpm install
echo "Setup complete! Run: pnpm dev"
