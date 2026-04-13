import './style.css';
import {
  createIcons, Zap, Monitor, Smartphone, Tablet, Upload, Copy, QrCode,
  FolderOpen, Clock, Users, ChevronRight, X, Send, Check, WifiOff,
  Trash2, Download, Server, RefreshCw
} from 'lucide';
import { uid, escHtml, fmtSize, timeAgo, fileEmoji, getPlatform, getDeviceName } from './utils.js';
import { toast } from './ui.js';

// Store icons for re-initialization
const myIcons = { Zap, Monitor, Smartphone, Tablet, Upload, Copy, QrCode, FolderOpen, Clock, Users, ChevronRight, X, Send, Check, WifiOff, Trash2, Download, Server, RefreshCw };
const pIconClass = { Windows: 'monitor', macOS: 'monitor', Linux: 'monitor', Android: 'smartphone', iPhone: 'smartphone', iPad: 'tablet', Browser: 'monitor' };

// ─── State ──────────────────────────────────────────────────────────────────
let ws, myPeerId, selectedPeerId;
const peers = new Map();
let selectedFiles = [];
let transferHistory = (() => { try { return JSON.parse(localStorage.getItem('ls_history') || '[]'); } catch { return []; } })();
let networkUrl = '';

// ─── DOM refs ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const dom = {
  statusBadge: $('statusBadge'), statusDot: $('statusDot'), statusText: $('statusText'),
  desktopDevList: $('desktopDeviceList'), mobileDevChips: $('mobileDeviceChips'), peerCount: $('peerCount'),
  qrBox: $('qrBox'), qrModalBox: $('qrModalBox'),
  urlText: $('urlText'), mobileUrlText: $('mobileUrlText'), qrModalUrl: $('qrModalUrl'),
  dropZone: $('dropZone'), fileInput: $('fileInput'), fileChips: $('fileChips'),
  sendBtn: $('sendBtn'), sendBtnText: $('sendBtnText'), targetHint: $('targetHint'), targetHintText: $('targetHintText'),
  historyList: $('historyList'), historyEmpty: $('historyEmpty'), clearBtn: $('clearBtn'), qrModal: $('qrModal'),
  serverFilesDiv: $('serverFilesSection'), serverList: $('serverFilesList'),
  modalCloseBtn: $('modalCloseBtn'), desktopCopyBtn: $('desktopCopyBtn'), mobileCopyBtn: $('mobileCopyBtn'), 
  modalCopyBtn: $('modalCopyBtn'), mobileQrBtn: $('mobileQrBtn'), refreshServerFilesBtn: $('refreshServerFilesBtn')
};

function refreshIcons() { createIcons({ icons: myIcons }); }

// ─── Setup Events ─────────────────────────────────────────────────────────────
dom.desktopCopyBtn.onclick = copyUrl;
dom.mobileCopyBtn.onclick = copyUrl;
dom.modalCopyBtn.onclick = () => { copyUrl(); closeQrModal(); };
dom.mobileQrBtn.onclick = openQrModal;
dom.modalCloseBtn.onclick = closeQrModal;
dom.clearBtn.onclick = clearHistory;
dom.refreshServerFilesBtn.onclick = loadServerFiles;
dom.qrModal.onclick = (e) => { if (e.target === dom.qrModal) closeQrModal(); };

dom.sendBtn.onclick = async () => {
  if (!selectedPeerId || !selectedFiles.length) return;
  const toSend = [...selectedFiles];
  selectedFiles = []; renderChips(); 
  dom.sendBtn.disabled = true; dom.sendBtnText.textContent = 'Sending…';
  for (const f of toSend) await uploadFile(f, selectedPeerId);
  refreshSendBtn();
};

dom.dropZone.onclick     = () => dom.fileInput.click();
dom.fileInput.onchange   = (e) => { addFiles(Array.from(e.target.files)); dom.fileInput.value = ''; };
dom.dropZone.ondragover  = (e) => { e.preventDefault(); dom.dropZone.classList.add('drag-over'); };
dom.dropZone.ondragleave = ()  => dom.dropZone.classList.remove('drag-over');
dom.dropZone.ondrop      = (e) => { e.preventDefault(); dom.dropZone.classList.remove('drag-over'); addFiles(Array.from(e.dataTransfer.files)); };

// ─── WebSocket ───────────────────────────────────────────────────────────────
function connect() {
  ws = new WebSocket(`ws://${location.host}`);
  ws.onopen = () => {
    setStatus('connected');
    ws.send(JSON.stringify({ type: 'register', metadata: { name: getDeviceName(), platform: getPlatform() } }));
  };
  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.type === 'connected')  myPeerId = d.peerId;
    if (d.type === 'peers')      renderDevices(d.peers.filter(p => p.id !== myPeerId));
    if (d.type === 'file-ready') receiveFile(d);
  };
  ws.onerror = () => setStatus('disconnected');
  ws.onclose = () => { setStatus('disconnected'); setTimeout(connect, 3000); };
}

function setStatus(s) {
  const ok = s === 'connected';
  dom.statusDot.className = `w-1.5 h-1.5 rounded-full shrink-0 transition-all ${ok ? 'bg-emerald-400 animate-pulse-dot' : 'bg-zinc-600'}`;
  dom.statusText.textContent = ok ? 'Connected' : 'Reconnecting…';
  dom.statusBadge.className = `flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-300 ${ok ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`;
}

// ─── Devices ─────────────────────────────────────────────────────────────────
function renderDevices(list) {
  peers.clear();
  list.forEach(p => peers.set(p.id, p));
  dom.peerCount.textContent = `${list.length} online`;

  if (list.length === 0) {
    dom.desktopDevList.innerHTML = `<div class="py-6 text-center text-zinc-700 text-xs"><p>No devices found</p><p class="mt-1 text-zinc-800">Open on another device on the same WiFi</p></div>`;
    dom.mobileDevChips.innerHTML = `<div class="text-xs text-zinc-700 py-2 shrink-0">Open this URL on another device <br/>to see it here</div>`;
    return;
  }

  dom.desktopDevList.innerHTML = list.map(peer => {
    const sel = selectedPeerId === peer.id;
    const PIconId = pIconClass[peer.platform] || 'monitor';
    const initials = (peer.name || 'D').slice(0, 2).toUpperCase();
    return `<button onclick="selectPeer('${peer.id}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group ${sel ? 'bg-white text-zinc-950' : 'hover:bg-zinc-900 text-zinc-300 hover:text-white'}">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${sel ? 'bg-zinc-950/10' : 'bg-zinc-800 group-hover:bg-zinc-700'}">${initials}</div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">${escHtml(peer.name || 'Unknown')}</p>
          <p class="text-xs ${sel ? 'text-zinc-500' : 'text-zinc-600'} truncate">${escHtml(peer.platform || 'Device')}</p>
        </div>
        <i data-lucide="${PIconId}" class="w-3.5 h-3.5 shrink-0 ${sel ? 'text-zinc-500' : 'text-zinc-700 group-hover:text-zinc-600'}"></i>
      </button>`;
  }).join('');

  dom.mobileDevChips.innerHTML = list.map(peer => {
    const sel = selectedPeerId === peer.id;
    const initials = (peer.name || 'D').slice(0, 2).toUpperCase();
    return `<button onclick="selectPeer('${peer.id}')" class="flex items-center gap-2 shrink-0 px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-150 active:scale-95 ${sel ? 'bg-white text-zinc-950 border-white' : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600'}">
        <span class="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${sel ? 'bg-zinc-950/10' : 'bg-zinc-800'}">${initials}</span>${escHtml(peer.name || 'Unknown')}
      </button>`;
  }).join('');

  refreshIcons();
}

window.selectPeer = (id) => {
  selectedPeerId = id;
  const peer = peers.get(id);
  dom.targetHintText.textContent = `Sending to ${peer?.name || 'device'}`;
  dom.targetHint.className = 'flex items-center gap-1.5 mb-3 text-xs md:text-sm text-zinc-300';
  renderDevices(Array.from(peers.values()));
  refreshSendBtn();
};

// ─── File selection ──────────────────────────────────────────────────────────
function addFiles(newFiles) {
  newFiles.forEach(f => { if (!selectedFiles.find(x => x.name === f.name && x.size === f.size)) selectedFiles.push(f); });
  renderChips(); refreshSendBtn();
}

window.removeFile = (i) => { selectedFiles.splice(i, 1); renderChips(); refreshSendBtn(); };

function renderChips() {
  if (!selectedFiles.length) { dom.fileChips.classList.add('hidden'); dom.fileChips.innerHTML = ''; return; }
  dom.fileChips.classList.remove('hidden');
  dom.fileChips.innerHTML = selectedFiles.map((f, i) => `
    <div class="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg pl-2.5 pr-1.5 py-1.5 animate-slide-in">
      <span class="text-sm leading-none">${fileEmoji(f.name)}</span>
      <span class="text-xs text-zinc-300 max-w-[100px] md:max-w-[140px] truncate">${escHtml(f.name)}</span>
      <span class="text-xs text-zinc-600">${fmtSize(f.size)}</span>
      <button onclick="removeFile(${i})" class="text-zinc-700 hover:text-zinc-400 p-0.5 ml-0.5"><i data-lucide="x" class="w-3 h-3"></i></button>
    </div>`).join('');
  refreshIcons();
}

function refreshSendBtn() {
  const ready = selectedPeerId && selectedFiles.length > 0;
  dom.sendBtn.disabled = !ready;
  if (!selectedPeerId) {
    dom.sendBtnText.textContent = 'Select a device first';
    dom.sendBtn.className = 'mt-3 md:mt-4 w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold bg-zinc-800 text-zinc-500 cursor-not-allowed transition-all duration-150';
  } else if (!selectedFiles.length) {
    dom.sendBtnText.textContent = 'Drop or choose files above';
    dom.sendBtn.className = 'mt-3 md:mt-4 w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold bg-zinc-800 text-zinc-500 cursor-not-allowed transition-all duration-150';
  } else {
    const peer = peers.get(selectedPeerId);
    dom.sendBtnText.textContent = `Send ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} to ${peer?.name || 'device'}`;
    dom.sendBtn.className = 'mt-3 md:mt-4 w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold bg-white text-zinc-950 hover:bg-zinc-100 cursor-pointer transition-all active:scale-[0.99]';
  }
}

// ─── Network Transfers ───────────────────────────────────────────────────────
async function uploadFile(file, targetPeer) {
  const tid = uid();
  const peer = peers.get(targetPeer);
  addHistory({ id: tid, name: file.name, size: file.size, dir: 'out', peer: peer?.name || 'device', status: 'sending', progress: 0, ts: Date.now() });
  
  const fd = new FormData();
  fd.append('file', file); 
  fd.append('targetPeer', targetPeer);
  
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) updateProgress(tid, (e.loaded / e.total) * 100); };
    xhr.onload = () => {
      finishHistory(tid, xhr.status === 200 ? 'done' : 'error');
      if (xhr.status === 200) toast('success', `Sent ${file.name}`);
      else toast('error', `Failed: ${file.name}`);
      resolve();
    };
    xhr.onerror = () => { finishHistory(tid, 'error'); toast('error', 'Connection error'); resolve(); };
    xhr.open('POST', '/upload'); 
    xhr.send(fd);
  });
}

function receiveFile(data) {
  const tid = uid();
  addHistory({ id: tid, name: data.filename, size: data.size, dir: 'in', peer: 'device', status: 'receiving', progress: 100, ts: Date.now() });
  window.location.assign(`/download/${data.fileId}`);
  setTimeout(() => finishHistory(tid, 'done'), 800);
  toast('info', `Receiving ${data.filename}`);
}

// ─── History ─────────────────────────────────────────────────────────────────
function addHistory(item) {
  transferHistory.unshift(item);
  if (transferHistory.length > 60) transferHistory.pop();
  try { localStorage.setItem('ls_history', JSON.stringify(transferHistory)); } catch (_) {}
  renderHistory();
}

function updateProgress(id, pct) {
  const b = $(`bar-${id}`);
  if (b) b.style.width = `${pct}%`;
}

function finishHistory(id, status) {
  const item = transferHistory.find(h => h.id === id);
  if (item) { item.status = status; item.progress = 100; }
  try { localStorage.setItem('ls_history', JSON.stringify(transferHistory)); } catch (_) {}
  
  const el = $(`hist-${id}`);
  if (!el) return;
  const st = el.querySelector('.hst');
  if (st) st.innerHTML = status === 'done' ? `<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i>` : `<i data-lucide="x" class="w-3.5 h-3.5 text-red-400"></i>`;
  const bar = $(`bar-${id}`);
  if (bar) { bar.style.width = '100%'; bar.className = `h-0.5 rounded-full transition-all duration-500 ${status === 'done' ? 'bg-emerald-500' : 'bg-red-500'}`; }
  refreshIcons();
}

function renderHistory() {
  if (!transferHistory.length) { dom.historyEmpty.classList.remove('hidden'); dom.historyList.innerHTML = ''; dom.clearBtn.classList.add('hidden'); return; }
  dom.historyEmpty.classList.add('hidden'); dom.clearBtn.classList.remove('hidden');
  dom.historyList.innerHTML = transferHistory.map(h => {
    const isOut = h.dir === 'out';
    const isDone = h.status === 'done';
    const isErr = h.status === 'error';
    const isLive = h.status === 'sending' || h.status === 'receiving';
    const statusIcon = isDone ? `<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i>` : isErr ? `<i data-lucide="x" class="w-3.5 h-3.5 text-red-400"></i>` : `<svg class="w-3.5 h-3.5 text-zinc-600 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="20"/></svg>`;
    const arrowIcon = isOut ? `<svg class="w-3.5 h-3.5 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>` : `<svg class="w-3.5 h-3.5 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`;
    return `<div id="hist-${h.id}" class="flex items-center gap-3 px-3.5 md:px-4 py-3 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/50 rounded-xl transition-colors duration-100 animate-slide-in">
        <div class="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">${arrowIcon}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2 mb-0.5">
            <p class="text-sm font-medium text-zinc-200 truncate">${fileEmoji(h.name)} ${escHtml(h.name)}</p>
            <span class="hst shrink-0">${statusIcon}</span>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs text-zinc-600">${fmtSize(h.size)}</span>
            <span class="text-xs text-zinc-700">${isOut ? `→ ${escHtml(h.peer||'')}` : `← ${escHtml(h.peer||'')}`}</span>
            <span class="text-xs text-zinc-800 ml-auto">${timeAgo(h.ts)}</span>
          </div>
          ${isLive ? `<div class="mt-1.5 h-0.5 bg-zinc-800 rounded-full overflow-hidden"><div id="bar-${h.id}" class="h-0.5 bg-zinc-400 rounded-full transition-all duration-300" style="width:${h.progress||0}%"></div></div>` : ''}
        </div>
      </div>`;
  }).join('');
  refreshIcons();
}

function clearHistory() { transferHistory = []; try { localStorage.removeItem('ls_history'); } catch (_) {} renderHistory(); }

// ─── Server Files ──────────────────────────────────────────────────────────────
async function loadServerFiles() {
  try {
    const files = await fetch('/api/files').then(r => r.json());
    if (files.length > 0) {
      dom.serverFilesDiv.classList.remove('hidden');
      dom.serverList.innerHTML = files.map(f => `
        <div class="flex items-center justify-between px-3 py-2 bg-zinc-900/50 border border-zinc-800/80 rounded-lg group">
          <div class="min-w-0 pr-3">
            <p class="text-sm text-zinc-300 truncate font-medium">${fileEmoji(f.filename)} ${escHtml(f.filename)}</p>
            <p class="text-xs text-zinc-600 mt-0.5">${fmtSize(f.size)} · ${timeAgo(f.ts)}</p>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <a href="/download/${f.id}" download="${escHtml(f.filename)}" class="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors" title="Download">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
            </a>
            <button onclick="deleteServerFile('${f.id}')" class="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors" title="Delete from server">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `).join('');
    } else {
      dom.serverFilesDiv.classList.add('hidden');
    }
    refreshIcons();
  } catch (e) { console.error('Failed to load server files', e); }
}

window.deleteServerFile = async (id) => {
  if (!confirm('Delete this file from the server?')) return;
  try {
    const r = await fetch(`/api/files/${id}`, { method: 'DELETE' });
    if (r.ok) { toast('success', 'File deleted'); loadServerFiles(); }
    else toast('error', 'Failed to delete');
  } catch { toast('error', 'Network error'); }
};

// ─── QR + URL ────────────────────────────────────────────────────────────────
let qrModalLoaded = false;
function openQrModal() {
  dom.qrModal.classList.remove('hidden'); dom.qrModal.classList.add('flex');
  if (!qrModalLoaded) {
    fetch('/qr').then(r => r.text()).then(svg => {
      dom.qrModalBox.innerHTML = svg;
      const el = dom.qrModalBox.querySelector('svg');
      if (el) { el.removeAttribute('width'); el.removeAttribute('height'); el.style.cssText = 'width:100%;height:100%'; }
      qrModalLoaded = true;
    }).catch(() => { dom.qrModalBox.innerHTML = '<p class="text-xs text-zinc-500">QR unavailable</p>'; });
  }
}
function closeQrModal() { dom.qrModal.classList.add('hidden'); dom.qrModal.classList.remove('flex'); }

async function copyUrl() {
  const text = networkUrl || dom.urlText?.textContent;
  if (!text) return;
  try { await navigator.clipboard.writeText(text); toast('success', 'URL copied!'); }
  catch { prompt('Copy this URL:', text); }
}

async function loadNetworkUrl() {
  try {
    const info = await fetch('/api/info').then(r => r.json());
    networkUrl = info.networkUrl;
    [dom.urlText, dom.mobileUrlText, dom.qrModalUrl].forEach(el => { if (el) el.textContent = networkUrl; });
    
    // Load QR in main box
    const svg = await fetch('/qr').then(r => r.text());
    dom.qrBox.innerHTML = svg;
    const el = dom.qrBox.querySelector('svg');
    if (el) { el.removeAttribute('width'); el.removeAttribute('height'); el.style.cssText = 'width:100%;height:100%'; }
  } catch {
    networkUrl = `${location.protocol}//${location.hostname}:${location.port || 8080}`;
    [dom.urlText, dom.mobileUrlText, dom.qrModalUrl].forEach(el => { if (el) el.textContent = networkUrl; });
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
renderHistory();
loadNetworkUrl();
loadServerFiles();
connect();
refreshIcons();
