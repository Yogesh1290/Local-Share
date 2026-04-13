import { escHtml } from './utils.js';

export function toast(type, msg, ms = 3500) {
  const toastsCt = document.getElementById('toasts');
  const colors = { 
    success: 'border-emerald-800/60 text-emerald-300', 
    error: 'border-red-900/60 text-red-300', 
    info: 'border-zinc-700 text-zinc-200' 
  };
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : '→';
  const el = document.createElement('div');
  el.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border bg-zinc-900 text-sm font-medium shadow-2xl animate-fade-up ${colors[type]}`;
  el.innerHTML = `<span class="shrink-0">${icon}</span><span class="flex-1 min-w-0 truncate">${escHtml(msg)}</span>`;
  toastsCt.appendChild(el);
  setTimeout(() => el.remove(), ms);
}
