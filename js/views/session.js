// 今日學習：依計畫逐項進行，每完成一項自動打勾並儲存
import { S, save, day } from '../store.js';
import { D } from '../data.js';
import { todayPlan, markTask } from '../plan.js';
import { dueKeys, isLearned } from '../srs.js';
import { quizForKeys, readingQs, listeningQs, makeQuestions } from '../quizgen.js';
import { runCards, runQuiz, resultHTML, logQuiz } from './runners.js';
import { grammarFlow } from './learn.js';
import { TASK_META, taskName } from './home.js';
import { petals } from '../ui.js';
import { esc, todayKey } from '../util.js';

export function session(el) {
  const plan = todayPlan();
  let start = null;
  try { start = sessionStorage.getItem('n5-start'); sessionStorage.removeItem('n5-start'); } catch (e) { /* ignore */ }
  const d = day();
  const tasks = plan.tasks;
  let idx = start ? tasks.findIndex(t => t.id === start) : tasks.findIndex(t => !d.done[t.id]);
  const goHome = () => { location.hash = '#/home'; };

  if (idx === -1) return summary();
  run(idx);

  function run(i) {
    const t = tasks[i];
    const done = () => { markTask(t.id); between(i); };
    if (t.id === 'review') {
      const keys = dueKeys().slice(0, t.n || 150);
      if (!keys.length) return done();
      return runCards(el, keys, { title: '智慧複習', onDone: done, onExit: goHome });
    }
    if (t.id === 'kana' || t.id === 'vocab' || t.id === 'kanji') {
      return runCards(el, t.keys, { title: taskName(t), onDone: done, onExit: goHome });
    }
    if (t.id === 'grammar') {
      const ids = [...t.ids];
      const next = () => { const id = ids.shift(); if (!id) return done(); grammarFlow(el, D.grammarList.find(g => g.id === id), { onDone: next, onExit: goHome }); };
      return next();
    }
    if (t.id === 'practice') {
      const qs = t.kind === 'listening' ? listeningQs(t.ref) : readingQs(t.ref);
      return runQuiz(el, [{ name: t.kind === 'listening' ? '聽解' : '讀解', qs }], {
        title: taskName(t),
        onDone: r => { S().practice[t.ref] = todayKey(); save(); logQuiz(t.kind, r); done(); },
        onExit: goHome,
      });
    }
    if (t.id === 'quiz') {
      const keys = tasks.flatMap(x => x.keys || (x.ids || []).map(id => `g:${id}`)).filter(isLearned);
      let qs = quizForKeys(keys, 5);
      if (qs.length < 5) {
        const fill = S().profile.level === 'zero' && !D.kanaList.every(k => isLearned(k.key)) ? makeQuestions('kana', 5 - qs.length, { onlyLearned: true }) : makeQuestions('meaning', 5 - qs.length, { onlyLearned: true });
        qs = qs.concat(fill);
      }
      return runQuiz(el, [{ name: '小測驗', qs }], {
        title: '小測驗',
        onDone: r => { logQuiz('daily', r); markTask('quiz'); el.innerHTML = `${resultHTML(r)}<button class="btn block" style="margin-top:18px" data-cont>繼續</button>`; el.onclick = e => { if (e.target.closest('[data-cont]')) between(i, true); }; window.scrollTo(0, 0); },
        onExit: goHome,
      });
    }
    done();
  }

  function between(i, skipMark) {
    void skipMark;
    const next = tasks.findIndex((t, k) => k > i && !day().done[t.id]);
    const firstUndone = next === -1 ? tasks.findIndex(t => !day().done[t.id]) : next;
    if (firstUndone === -1) return summary();
    const t = tasks[firstUndone], m = TASK_META[t.id];
    el.innerHTML = `<div style="padding-top:60px" class="center pop">
      <div style="font-size:54px">🌸</div>
      <h2 style="font-size:22px;margin-top:8px">「${taskName(tasks[i])}」完成！</h2>
      <p class="muted" style="margin-top:6px">進度已自動儲存。</p>
      <div class="card" style="margin-top:26px;text-align:left"><div class="row"><span class="badge ic ${m.color}" lang="ja">${m.ic}</span>
        <div class="grow"><div class="small faint">下一項</div><div style="font-weight:700">${taskName(t)}</div><div class="small faint">${esc(m.desc(t))}</div></div></div></div>
      <button class="btn block" style="margin-top:18px" data-go="${firstUndone}">繼續</button>
      <a class="btn ghost block" style="margin-top:10px" href="#/home">先休息，回首頁</a></div>`;
    el.onclick = e => { const b = e.target.closest('[data-go]'); if (b) run(+b.dataset.go); };
    window.scrollTo(0, 0);
  }

  function summary() {
    const dd = day();
    petals(36);
    el.innerHTML = `<div style="padding-top:50px" class="center pop">
      <img src="icons/icon-192.png" alt="" width="96" height="96" style="border-radius:24px;box-shadow:var(--shadow)">
      <h1 style="font-size:26px;margin-top:16px;font-family:var(--font-round)" lang="ja">おつかれさまでした！</h1>
      <p class="muted" style="margin-top:4px">今天的任務全部完成了。</p>
      <div class="grid3" style="margin-top:24px">
        <div class="stat"><b>${dd.learned}</b><span>新學內容</span></div>
        <div class="stat"><b>${dd.reviewed}</b><span>複習次數</span></div>
        <div class="stat"><b>${dd.answered ? Math.round(dd.correct / dd.answered * 100) : 0}%</b><span>答題正確率</span></div>
      </div>
      <p class="small faint" style="margin-top:16px">還有時間的話，可以到「測驗」做分類練習，或到「學習」多看幾課。</p>
      <a class="btn block" style="margin-top:20px" href="#/home">回首頁</a></div>`;
    el.onclick = null;
  }
}
