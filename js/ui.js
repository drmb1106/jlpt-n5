// 介面共用元件：彈出視窗、提示、櫻花慶祝、圖示
import { esc } from './util.js';
import { speak, supported, hasJa, voicesReady } from './tts.js';
import { S, save } from './store.js';

export const ICON = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  learn: '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 12h5"/></svg>',
  review: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>',
  quiz: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 12 2.5 2.5L16 9"/></svg>',
  me: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',
  speaker: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5l-5.5 2.9 1-6.3L3 9.7l6.2-.9z"/></svg>',
};

export function toast(msg, ms = 2200) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.getElementById('toast-root').appendChild(el);
  setTimeout(() => el.remove(), ms);
}

export function modal(html, { onOpen, onClose } = {}) {
  const root = document.getElementById('modal-root');
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  let closed = false;
  const close = () => { if (closed) return; closed = true; back.remove(); document.removeEventListener('keydown', onKey); onClose?.(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  root.appendChild(back);
  onOpen?.(back.querySelector('.modal'), close);
  return close;
}

export function confirmBox(title, body, okLabel = '確定', danger = false) {
  return new Promise(res => {
    let result = false;
    modal(`<h3 style="font-size:18px;margin-bottom:8px">${esc(title)}</h3><p class="muted small" style="line-height:1.7">${body}</p>
      <div class="row" style="margin-top:18px"><button class="btn ghost grow" data-no>取消</button><button class="btn grow ${danger ? 'danger' : ''}" data-ok>${esc(okLabel)}</button></div>`,
      { onOpen: (m, c) => {
        m.querySelector('[data-ok]').onclick = () => { result = true; c(); };
        m.querySelector('[data-no]').onclick = () => c();
      }, onClose: () => res(result) });
  });
}

export function petals(n = 26) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.getElementById('petals');
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = 'petal';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
    p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    p.style.animationDuration = (2.4 + Math.random() * 2.2) + 's';
    p.style.animationDelay = (Math.random() * .8) + 's';
    p.style.transform = `scale(${.6 + Math.random() * .7})`;
    root.appendChild(p);
    setTimeout(() => p.remove(), 6000);
  }
}

// 發音按鈕：data-say="日本語"
export const sayBtn = (text, label = '播放發音') => `<button class="icon-btn" data-say="${esc(text)}" aria-label="${label}">${ICON.speaker}</button>`;
const bound = new WeakMap();
const once = (root, name) => { const set = bound.get(root) || new Set(); if (set.has(name)) return false; set.add(name); bound.set(root, set); return true; };
export function bindSay(root) {
  if (!once(root, 'say')) return;
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-say]');
    if (!b) return;
    e.stopPropagation();
    if (!supported()) { toast('這個瀏覽器不支援語音播放'); return; }
    if (voicesReady() && !hasJa()) toast('裝置沒有日語語音，請看「我的 › 語音設定」');
    speak(b.dataset.say);
  });
}

// 收藏
export function isFav(key) { return !!S().favorites[key]; }
export function favBtn(key) {
  return `<button class="icon-btn ${isFav(key) ? 'on' : ''}" data-fav="${esc(key)}" aria-label="收藏" aria-pressed="${isFav(key)}">${ICON.star}</button>`;
}
export function bindFav(root) {
  if (!once(root, 'fav')) return;
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-fav]');
    if (!b) return;
    e.stopPropagation();
    const k = b.dataset.fav, f = S().favorites;
    if (f[k]) delete f[k]; else f[k] = new Date().toISOString().slice(0, 10);
    save();
    document.querySelectorAll(`[data-fav="${CSS.escape(k)}"]`).forEach(x => { x.classList.toggle('on', !!f[k]); x.setAttribute('aria-pressed', !!f[k]); });
    toast(f[k] ? '已加入收藏' : '已取消收藏', 1200);
  });
}

export const bar = (p, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></div>`;

export const FUJI_SVG = `<svg class="fuji" viewBox="0 0 160 90" aria-hidden="true">
  <circle cx="120" cy="26" r="14" fill="#F7A6C0" opacity=".55"/>
  <path d="M10 90 62 30q8-8 16 0l52 60z" fill="#4A86C8" opacity=".85"/>
  <path d="M55 38 62 30q8-8 16 0l7 8-8 6-7-5-8 6-7-5z" fill="#fff"/>
  <g fill="#F7A6C0"><circle cx="138" cy="60" r="4"/><circle cx="146" cy="52" r="3"/><circle cx="20" cy="70" r="3"/></g></svg>`;
