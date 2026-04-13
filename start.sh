#!/bin/bash
set -e

echo ""
echo "  ============================================"
echo "   LocalShare | Fast WiFi File Sharing"
echo "  ============================================"
echo ""

# ── Step 1: Check Node.js ──────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "  [!] Node.js not found. Trying to install..."
  if command -v brew &>/dev/null; then
    brew install node
  elif command -v apt-get &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif command -v dnf &>/dev/null; then
    sudo dnf install -y nodejs npm
  else
    echo ""
    echo "  [ERROR] Cannot auto-install Node.js on this system."
    echo "  Please install it from https://nodejs.org (LTS version)"
    echo "  then run this script again."
    exit 1
  fi
fi

echo "  [OK] Node.js $(node -v) found."
echo ""

# ── Step 2: Install server dependencies ───────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo "  [*] Installing server dependencies - first time only..."
  npm install
  echo "  [OK] Done."
  echo ""
fi

# ── Step 3: Install client dependencies ───────────────────────────────────
if [ ! -d "client/node_modules" ]; then
  echo "  [*] Installing client dependencies - first time only..."
  cd client && npm install && cd ..
  echo "  [OK] Done."
  echo ""
fi

# ── Step 4: Build the UI ──────────────────────────────────────────────────
if [ ! -f "server/public/index.html" ]; then
  echo "  [*] Building UI - first time only, takes ~10 seconds..."
  cd client && npx vite build && cd ..
  echo "  [OK] UI built!"
  echo ""
fi

# ── Step 5: Start ─────────────────────────────────────────────────────────
echo "  ============================================"
echo "   Starting LocalShare... Press Ctrl+C to stop"
echo "  ============================================"
echo ""

if ! node server/index.js; then
  echo ""
  echo "  [ERROR] LocalShare crashed or port 8080 is already in use natively."
  exit 1
fi
