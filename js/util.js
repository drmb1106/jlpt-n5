// 共用小工具
export const $ = (s, r = document) => r.querySelector(s);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 測試用：網址加上 ?date=2027-02-15 可模擬日期
let override = null;
try {
  const p = new URLSearchParams(location.search).get('date');
  if (p && /^\d{4}-\d{2}-\d{2}$/.test(p)) override = p;
} catch (e) { /* ignore */ }

export const keyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayKey = () => override || keyOf(new Date());
export const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
export const diffDays = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5); // b − a
export const fmtDate = k => { const d = parseKey(k); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };
export const fmtMD = k => { const d = parseKey(k); return `${d.getMonth() + 1}/${d.getDate()}`; };
export const weekday = k => '日一二三四五六'[parseKey(k).getDay()];
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const sample = (arr, n) => shuffle(arr).slice(0, n);
export const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
export const fmtMin = sec => { const m = Math.round(sec / 60); return m < 60 ? `${m} 分` : `${Math.floor(m / 60)} 小時 ${m % 60} 分`; };
export const uniq = arr => [...new Set(arr)];
