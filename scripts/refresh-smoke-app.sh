#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SMOKE_APP_DIR="$REPO_ROOT/examples/smoke-app"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but not found in PATH." >&2
  exit 1
fi

echo "[1/4] Building package at repo root..."
cd "$REPO_ROOT"
npm run build

echo "[2/4] Uninstalling env-safe-check from smoke app..."
cd "$SMOKE_APP_DIR"
npm uninstall env-safe-check

echo "[3/4] Installing local package into smoke app..."
npm install ../../ --no-package-lock

echo "[4/4] Running smoke app validation..."
npm run validate