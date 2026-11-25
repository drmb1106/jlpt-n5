// 離線快取：App 本體與教材先存起來，沒有網路也能學習
const VERSION = 'n5-v1.0.1';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/main.js', './js/util.js', './js/store.js', './js/srs.js', './js/tts.js', './js/ui.js', './js/data.js', './js/plan.js', './js/quizgen.js',
  './js/views/runners.js', './js/views/home.js', './js/views/session.js', './js/views/learn.js', './js/views/review.js', './js/views/quiz.js', './js/views/me.js', './js/views/onboarding.js',
  './data/n5/kana.json', './data/n5/vocab.json', './data/n5/kanji.json', './data/n5/grammar.json', './data/n5/reading.json', './data/n5/listening.json', './data/n5/questions.json', './data/n5/daily.json',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-32.png',
];
const STROKES = 'n5-strokes';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== STROKES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 漢字筆順（KanjiVG）：看過一次就存起來
  if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/kanjivg')) {
    e.respondWith(caches.open(STROKES).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // 頁面：先試網路，離線時用快取
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // 其他檔案：先用快取，背景更新
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
