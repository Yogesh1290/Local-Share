#!/usr/bin/env node
'use strict';

const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const http = require('http');

// ─── Config ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// ─── Ensure uploads folder exists ──────────────────────────────────────────
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── Express app ───────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Serve the Vite-built frontend (npm run build → client/dist → server/public)
const PUBLIC_DIR = path.join(__dirname, 'public');
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
} else {
  // Dev fallback: tell user to run the Vite dev server
  app.get('/', (req, res) => res.send(`
    <html><body style="font-family:sans-serif;padding:40px;background:#0a0a0f;color:#fff">
      <h2>⚡ LocalShare — Dev Mode</h2>
      <p>Open <a href="http://localhost:5173" style="color:#a78bfa">http://localhost:5173</a> for the Vite dev server.</p>
      <p style="color:#666">Or run <code>npm run build</code> first for the production UI.</p>
    </body></html>
  `));
}

// ─── File storage ──────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._\-]/g, '_');
    cb(null, Date.now() + '-' + safe);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: Infinity } // no limit
});

// ─── In-memory file store ──────────────────────────────────────────────────
const fileStore = new Map();
const peers = new Map();

// ─── Info endpoint (used by client to get the real network URL) ────────────
app.get('/api/info', (req, res) => {
  const ip = getLocalIP();
  res.json({
    networkUrl: `http://${ip}:${PORT}`,
    ip,
    port: PORT
  });
});

// ─── QR Code endpoint ──────────────────────────────────────────────────────
app.get('/qr', async (req, res) => {
  try {
    const QRCode = require('qrcode');
    const ip = getLocalIP();
    const url = `http://${ip}:${PORT}`;
    const svg = await QRCode.toString(url, { type: 'svg', width: 300, margin: 2 });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (e) {
    res.status(500).send('QR not available');
  }
});

// ─── Upload endpoint ───────────────────────────────────────────────────────
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const fileId = generateId();
  const targetPeer = req.body.targetPeer;

  fileStore.set(fileId, {
    filename: req.file.originalname,
    path: req.file.path,
    size: req.file.size,
    targetPeer,
    createdAt: Date.now()
  });

  // Notify target peer via WebSocket
  const peer = peers.get(targetPeer);
  if (peer && peer.ws.readyState === WebSocket.OPEN) {
    peer.ws.send(JSON.stringify({
      type: 'file-ready',
      fileId,
      filename: req.file.originalname,
      size: req.file.size
    }));
  }

  res.json({ success: true, fileId });
});

// ─── Download endpoint ─────────────────────────────────────────────────────
app.get('/download/:fileId', (req, res) => {
  const file = fileStore.get(req.params.fileId);
  if (!file) return res.status(404).send('File not found or already downloaded');

  res.download(file.path, file.filename, (err) => {
    if (!err) {
      try { fs.unlinkSync(file.path); } catch (_) {}
      fileStore.delete(req.params.fileId);
    }
  });
});

// ─── Server Files endpoints ────────────────────────────────────────────────
app.get('/api/files', (req, res) => {
  const files = [];
  const trackedPaths = new Set();

  for (const [id, file] of fileStore.entries()) {
    files.push({ id, filename: file.filename, size: file.size, targetPeer: file.targetPeer, ts: file.createdAt });
    trackedPaths.add(file.path);
  }

  // Read physical directory to recover orphaned files
  try {
    const items = fs.readdirSync(UPLOADS_DIR);
    for (const item of items) {
      if (item === '.gitkeep') continue;
      const fullPath = path.join(UPLOADS_DIR, item);
      if (trackedPaths.has(fullPath)) continue;

      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;

      let ts = stat.mtimeMs;
      let origName = item;
      const match = item.match(/^(\d+)-(.*)$/);
      if (match) {
        ts = parseInt(match[1]);
        origName = match[2];
      }

      const orphanedId = generateId();
      fileStore.set(orphanedId, {
        filename: origName,
        path: fullPath,
        size: stat.size,
        targetPeer: '',
        createdAt: ts
      });

      files.push({ id: orphanedId, filename: origName, size: stat.size, targetPeer: '', ts: ts });
      trackedPaths.add(fullPath);
    }
  } catch (e) {
    console.error('Error reading uploads dir', e);
  }

  files.sort((a, b) => b.ts - a.ts);
  res.json(files);
});

app.delete('/api/files/:fileId', (req, res) => {
  const file = fileStore.get(req.params.fileId);
  if (!file) return res.status(404).json({ error: 'File not found' });
  try { fs.unlinkSync(file.path); } catch (_) {}
  fileStore.delete(req.params.fileId);
  res.json({ success: true });
});

// ─── Cleanup old unclaimed files every 30 min ──────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [id, file] of fileStore.entries()) {
    if (now - file.createdAt > 30 * 60 * 1000) {
      try { fs.unlinkSync(file.path); } catch (_) {}
      fileStore.delete(id);
    }
  }
}, 10 * 60 * 1000);

// ─── HTTP + WebSocket server ───────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  const peerId = generateId();
  peers.set(peerId, { ws, metadata: { name: '', platform: '' } });

  ws.send(JSON.stringify({ type: 'connected', peerId }));
  broadcastPeerList();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(peerId, data);
    } catch (_) {}
  });

  ws.on('close', () => {
    peers.delete(peerId);
    broadcastPeerList();
  });

  ws.on('error', () => {
    peers.delete(peerId);
  });
});

function handleMessage(fromPeer, data) {
  switch (data.type) {
    case 'register':
      if (peers.has(fromPeer)) {
        peers.get(fromPeer).metadata = data.metadata || {};
        broadcastPeerList();
      }
      break;
    case 'signal': {
      const target = peers.get(data.to);
      if (target && target.ws.readyState === WebSocket.OPEN) {
        target.ws.send(JSON.stringify({ type: 'signal', from: fromPeer, signal: data.signal }));
      }
      break;
    }
  }
}

function broadcastPeerList() {
  const peerList = Array.from(peers.entries()).map(([id, peer]) => ({
    id,
    ...peer.metadata
  }));
  peers.forEach(peer => {
    if (peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(JSON.stringify({ type: 'peers', peers: peerList }));
    }
  });
}

function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();

  // Adapter name fragments to SKIP entirely (clearly virtual)
  const SKIP_NAMES = [
    'vmware', 'virtualbox', 'vbox', 'hyper-v',
    'docker', 'tailscale', 'hamachi', 'nordvpn', 'expressvpn',
    'tun', 'tap', 'teredo', 'isatap', 'pseudo', 'loopback',
    'bluetooth', '6to4'
  ];

  // Adapter name fragments to strongly PREFER (real physical WiFi)
  const PREFER_NAMES = [
    'wi-fi', 'wifi', 'wlan', 'wireless',
    'en0', 'en1', 'wlp', 'wlo'
  ];

  // Adapter name fragments that are OK but less preferred than WiFi
  const OK_NAMES = [
    'ethernet', 'local area connection', 'eth0', 'eth1', 'eno', 'enp'
  ];

  // Known virtual/reserved subnets — penalise even if adapter name looks OK
  const VIRTUAL_SUBNETS = [
    /^192\.168\.(56|14|77|99|150|254)\./,  // VirtualBox/VMware host-only common ranges
    /^169\.254\./,                           // APIPA / link-local (no real DHCP)
    /^172\.(1[6-9]|2\d|3[01])\./,           // Docker default bridge range
  ];

  const candidates = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    const nameLow = name.toLowerCase();

    // Hard skip known virtual adapter names
    if (SKIP_NAMES.some(k => nameLow.includes(k))) continue;

    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue;

      let score = 0;

      // Name scoring: WiFi is best
      if (PREFER_NAMES.some(k => nameLow.includes(k))) score += 4;
      else if (OK_NAMES.some(k => nameLow.includes(k)))  score += 2;

      // IP subnet bonuses for common real networks
      if (/^192\.168\./.test(addr.address)) score += 1;
      if (/^10\./.test(addr.address))       score += 1;

      // Heavily penalise known virtual subnets
      if (VIRTUAL_SUBNETS.some(re => re.test(addr.address))) score -= 10;

      candidates.push({ ip: addr.address, name, score });
    }
  }

  if (candidates.length === 0) return 'localhost';

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].ip;
}

// ─── Start ─────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', async () => {
  const localIP = getLocalIP();
  const localUrl = `http://localhost:${PORT}`;
  const networkUrl = `http://${localIP}:${PORT}`;

  console.log('\n');
  console.log('  ██╗      ██████╗  ██████╗ █████╗ ██╗     ███████╗██╗  ██╗ █████╗ ██████╗ ███████╗');
  console.log('  ██║     ██╔═══██╗██╔════╝██╔══██╗██║     ██╔════╝██║  ██║██╔══██╗██╔══██╗██╔════╝');
  console.log('  ██║     ██║   ██║██║     ███████║██║     ███████╗███████║███████║██████╔╝█████╗  ');
  console.log('  ██║     ██║   ██║██║     ██╔══██║██║     ╚════██║██╔══██║██╔══██║██╔══██╗██╔══╝  ');
  console.log('  ███████╗╚██████╔╝╚██████╗██║  ██║███████╗███████║██║  ██║██║  ██║██║  ██║███████╗');
  console.log('  ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝');
  console.log('');
  console.log('  ⚡ Ultra-fast WiFi file sharing — no apps, no cloud, no accounts\n');
  console.log('  ┌─────────────────────────────────────────────┐');
  console.log(`  │  🖥️  This device:    ${localUrl.padEnd(23)}│`);
  console.log(`  │  📱 Other devices:  ${networkUrl.padEnd(23)}│`);
  console.log('  └─────────────────────────────────────────────┘\n');
  console.log('  💡 Share the network URL with devices on the same WiFi');
  console.log('  📷 Scan QR code in the app to connect your phone instantly');
  console.log('  🛑 Press Ctrl+C to stop the server\n');

  // Auto-open browser
  try {
    const open = require('open');
    await open(localUrl);
    console.log('  ✅ Browser opened automatically!\n');
  } catch (_) {
    console.log(`  👉 Open your browser and go to: ${localUrl}\n`);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n  👋 LocalShare stopped. Goodbye!\n');
  process.exit(0);
});
