// 進入點：載入資料、路由、底部導覽、學習時間、離線快取
import { load, S, save, day } from './store.js';
import { loadData } from './data.js';
import { initTTS } from './tts.js';
import { ICON, toast } from './ui.js';
import { todayKey } from './util.js';
import { home } from './views/home.js';
import { session } from './views/session.js';
import { learnHub, kanaView, vocabCats, vocabList, kanjiView, grammarList, grammarLesson, readingList, readingView, listeningList, listeningView } from './views/learn.js';
import { reviewView, wrongView, favView } from './views/review.js';
import { quizView } from './views/quiz.js';
import { meView } from './views/me.js';
import { onboarding } from './views/onboarding.js';

const view = document.getElementById('view');
const TABS = [
  { id: 'home', name: '首頁', icon: ICON.home },
  { id: 'learn', name: '學習', icon: ICON.learn },
  { id: 'review', name: '複習', icon: ICON.review },
  { id: 'quiz', name: '測驗', icon: ICON.quiz },
  { id: 'me', name: '我的', icon: ICON.me },
];

const ROUTES = [
  [/^home$/, home],
  [/^today$/, session],
  [/^learn$/, learnHub],
  [/^learn\/kana$/, kanaView],
  [/^learn\/vocab$/, vocabCats],
  [/^learn\/vocab\/([\w-]+)$/, vocabList],
  [/^learn\/kanji$/, kanjiView],
  [/^learn\/grammar$/, grammarList],
  [/^learn\/grammar\/([\w-]+)$/, grammarLesson],
  [/^learn\/reading$/, readingList],
  [/^learn\/reading\/([\w-]+)$/, readingView],
  [/^learn\/listening$/, listeningList],
  [/^learn\/listening\/([\w-]+)$/, listeningView],
  [/^review$/, reviewView],
  [/^review\/wrong$/, wrongView],
  [/^review\/fav$/, favView],
  [/^quiz$/, quizView],
  [/^me$/, meView],
  [/^onboarding$/, onboarding],
];

function renderTabbar(active) {
  const nav = document.getElementById('tabbar');
  if (!nav.firstChild) nav.innerHTML = `<div class="inner">${TABS.map(t => `<a href="#/${t.id}" data-tab="${t.id}">${t.icon}<span>${t.name}</span></a>`).join('')}</div>`;
  nav.querySelectorAll('a').forEach(a => { const on = a.dataset.tab === active; a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
}

function route() {
  let path = location.hash.replace(/^#\/?/, '') || 'home';
  if (!S().profile?.onboarded && path !== 'onboarding') { location.replace('#/onboarding'); return; }
  let handler = null, params = [];
  for (const [re, fn] of ROUTES) { const m = path.match(re); if (m) { handler = fn; params = m.slice(1); break; } }
  if (!handler) { location.replace('#/home'); return; }
  const tab = path.split('/')[0];
  const hideBar = path === 'onboarding' || path === 'today';
  document.body.classList.toggle('no-tabbar', hideBar);
  renderTabbar(TABS.some(t => t.id === tab) ? tab : '');
  view.onclick = null;
  window.scrollTo(0, 0);
  try { handler(view, ...params); }
  catch (e) { console.error(e); view.innerHTML = `<div class="card" style="margin-top:30px">畫面發生錯誤：${e.message}<br><a href="#/home">回到首頁</a></div>`; }
}

// 學習時間：畫面開著且 90 秒內有操作才計時
let lastAct = Date.now();
['click', 'touchstart', 'keydown', 'scroll'].forEach(ev => addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
setInterval(() => {
  if (document.visibilityState !== 'visible' || Date.now() - lastAct > 90e3 || !S().profile?.onboarded) return;
  day(todayKey()).sec += 10;
  save();
}, 10e3);

// 換日時重新整理首頁
let currentDay = todayKey();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && todayKey() !== currentDay) { currentDay = todayKey(); if (/^#\/(home)?$/.test(location.hash || '#/')) route(); }
});

function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  // 本機開發時預設不啟用快取（網址加 ?sw=1 可測試離線）
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/[?&]sw=1/.test(location.search)) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          const t = document.createElement('button');
          t.className = 'toast'; t.textContent = '有新版本，點這裡更新';
          t.onclick = () => { nw.postMessage('skipWaiting'); };
          document.getElementById('toast-root').appendChild(t);
        }
      });
    });
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
}

async function boot() {
  load();
  initTTS();
  try { await loadData('n5'); }
  catch (e) {
    view.innerHTML = `<div class="card" style="margin-top:40px"><h3>教材載入失敗</h3><p class="small muted" style="margin-top:6px">${e.message}。請確認網路連線後重新整理；安裝後第一次開啟需要連網下載教材。</p></div>`;
    return;
  }
  addEventListener('hashchange', route);
  route();
  registerSW();
  if (!navigator.onLine) toast('目前離線，使用已下載的教材');
}
boot();
