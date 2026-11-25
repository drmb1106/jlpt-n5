// 日語語音：使用裝置內建的語音合成（不需付費 API）
import { S } from './store.js';

let jaVoices = [];
let ready = false;
const listeners = new Set();

export const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

function refresh() {
  if (!supported()) return;
  jaVoices = speechSynthesis.getVoices().filter(v => /^ja([-_]|$)/i.test(v.lang));
  ready = true;
  listeners.forEach(f => f());
}
export function initTTS() {
  if (!supported()) return;
  refresh();
  speechSynthesis.addEventListener?.('voiceschanged', refresh);
  setTimeout(refresh, 800);
}
export const onVoices = f => { listeners.add(f); return () => listeners.delete(f); };
export const voices = () => jaVoices;
export const hasJa = () => jaVoices.length > 0;
export const voicesReady = () => ready;

function pick(role) {
  const pref = S().settings.voiceURI;
  const main = jaVoices.find(v => v.voiceURI === pref) || jaVoices.find(v => v.localService) || jaVoices[0] || null;
  if (role === 'M' || role === 'F') {
    // 有兩種以上日語聲音時，讓男女角色用不同聲音
    const alt = jaVoices.find(v => v !== main && /otoya|male|hattori|ichiro|keita/i.test(v.name)) || jaVoices.find(v => v !== main);
    if (role === 'M' && alt) return alt;
  }
  return main;
}

export function stop() { if (supported()) speechSynthesis.cancel(); }

// lines: 字串，或 [{s:'M'|'F'|'N', t:'...'}]
export function speak(lines, opts = {}) {
  return new Promise(resolve => {
    if (!supported()) { resolve(false); return; }
    stop();
    const arr = typeof lines === 'string' ? [{ s: 'N', t: lines }] : lines;
    const rate = (opts.rate ?? S().settings.rate ?? 1);
    let left = arr.length;
    if (!left) { resolve(true); return; }
    arr.forEach(l => {
      const u = new SpeechSynthesisUtterance(l.t);
      u.lang = 'ja-JP';
      const v = pick(l.s);
      if (v) u.voice = v;
      u.rate = rate * 0.95;
      const twoVoices = jaVoices.length > 1;
      u.pitch = twoVoices ? 1 : (l.s === 'M' ? 0.75 : l.s === 'F' ? 1.3 : 1);
      const done = () => { if (--left === 0) resolve(true); };
      u.onend = done; u.onerror = done;
      speechSynthesis.speak(u);
    });
  });
}
