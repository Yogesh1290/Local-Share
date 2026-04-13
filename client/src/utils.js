export const uid = () => Math.random().toString(36).slice(2, 9);

export const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const fmtSize = (b) => {
  if (!b) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(1)} GB`;
};

export const timeAgo = (ts) => {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
};

export const fileEmoji = (name) => {
  const e = name.split('.').pop().toLowerCase();
  const map = {
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️', heic: '🖼️',
    mp4: '🎬', mov: '🎬', mkv: '🎬', avi: '🎬',
    mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵',
    pdf: '📄', doc: '📝', docx: '📝', txt: '📝',
    zip: '🗜️', rar: '🗜️', gz: '🗜️', apk: '📱', exe: '⚙️'
  };
  return map[e] || '📎';
};

export const getPlatform = () => {
  const u = navigator.userAgent;
  if (/android/i.test(u)) return 'Android';
  if (/iPad/.test(u)) return 'iPad';
  if (/iPhone|iPod/.test(u)) return 'iPhone';
  if (/Win/.test(u)) return 'Windows';
  if (/Mac/.test(u)) return 'macOS';
  if (/Linux/.test(u)) return 'Linux';
  return 'Browser';
};

export const getDeviceName = () => {
  let n = localStorage.getItem('ls_name');
  if (!n) {
    n = `${getPlatform()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    localStorage.setItem('ls_name', n);
  }
  return n;
};
