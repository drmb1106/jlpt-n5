// 首頁：今天要學什麼
import { S, day } from '../store.js';
import { D } from '../data.js';
import { todayPlan, forecast, progress, streak } from '../plan.js';
import { dueKeys, level } from '../srs.js';
import { esc, todayKey, diffDays, fmtDate, parseKey } from '../util.js';
import { bar, sayBtn, bindSay, FUJI_SVG } from '../ui.js';

const CHEER = ['今天也一起前進一小步吧！', '每天一點點，累積起來就很可觀。', '先從複習開始，記憶會更牢固。', '慢慢來也沒關係，重要的是不中斷。', '考試那天的你，會感謝今天的自己。', '學過的東西，複習一次就更熟一些。'];

export const TASK_META = {
  review:   { name: '智慧複習', ic: '復', color: 'pink', desc: p => p.due > p.n ? `今天複習 ${p.n} 張（共 ${p.due} 張到期）` : `${p.n} 張到期的記憶卡` },
  kana:     { name: '五十音', ic: 'あ', color: 'red', desc: p => `${p.keys.length} 個新假名` },
  vocab:    { name: '新單字', ic: '語', color: 'blue', desc: p => `${p.keys.length} 個單字` },
  kanji:    { name: '漢字', ic: '字', color: 'yellow', desc: p => `${p.keys.length} 個漢字` },
  grammar:  { name: '文法', ic: '文', color: 'purple', desc: p => p.ids.map(id => D.grammarList.find(g => g.id === id)?.t).join('、') },
  practice: { name: '練習', ic: '聴', color: 'green', desc: p => { const x = D[p.kind].find(r => r.id === p.ref); return `${p.kind === 'listening' ? '聽力' : '閱讀'}・${x?.title || ''}`; } },
  quiz:     { name: '小測驗', ic: '試', color: 'pink', desc: () => '5 題，確認今天學會了沒' },
};
export const taskName = t => t.id === 'practice' ? (t.kind === 'listening' ? '聽力練習' : '閱讀練習') : TASK_META[t.id].name;

export function home(el) {
  const p = S().profile, t = todayKey();
  const plan = todayPlan();
  const d = day(t);
  const fc = forecast();
  const prog = progress();
  const daysLeft = Math.max(0, diffDays(t, p.examDate));
  const h = new Date().getHours();
  const greet = h < 5 ? 'こんばんは' : h < 11 ? 'おはようございます' : h < 18 ? 'こんにちは' : 'こんばんは';
  const dn = diffDays(p.startDate, t);
  const cheer = CHEER[((dn % CHEER.length) + CHEER.length) % CHEER.length];
  const phrase = D.daily[((dn % D.daily.length) + D.daily.length) % D.daily.length];
  const due = dueKeys();
  const dueBy = { kana: 0, v: 0, k: 0, g: 0 };
  due.forEach(k => { const pre = k.split(':')[0]; dueBy[pre] = (dueBy[pre] || 0) + 1; });
  const vocabM = D.vocabList.filter(w => level(w.key) === 3).length;
  const kanjiM = D.kanjiList.filter(k => level(k.key) === 3).length;
  const vocabL = D.vocabList.filter(w => S().srs[w.key]).length;
  const kanjiL = D.kanjiList.filter(k => S().srs[k.key]).length;
  const doneN = plan.tasks.filter(x => d.done[x.id]).length;
  const allDone = doneN === plan.tasks.length;

  el.innerHTML = `
  <div class="hello"><div class="jp" lang="ja">${greet}</div><div class="zh">${cheer}</div></div>

  <section class="count-card" style="margin-top:8px">
    ${FUJI_SVG}
    <div class="lbl">距離 JLPT N5 考試</div>
    <div class="days">${daysLeft}<small>天</small></div>
    <div class="exam">${fmtDate(p.examDate)}（${'日一二三四五六'[parseKey(p.examDate).getDay()]}）</div>
    ${bar(prog)}
    <div class="pct">整體進度 ${prog}%・${fc.done ? '新內容已全部學完，專心複習！' : `預計 ${fmtDate(fc.finish)} 學完`}</div>
  </section>
  ${!fc.done && !fc.onTrack ? `<div class="notice" style="margin-top:10px">以每天 ${p.dailyMinutes} 分鐘的速度，會在考前衝刺期之後才學完。建議調整到每天約 <b>${fc.needMinutes}</b> 分鐘，<a href="#/me">到「我的」修改</a>。</div>` : ''}

  <div class="stats4">
    <div class="stat"><b>${streak()}</b><span>連續天數</span></div>
    <div class="stat"><b>${Math.round(d.sec / 60)}</b><span>今日分鐘</span></div>
    <div class="stat"><b>${vocabL}</b><span>單字・掌握 ${vocabM}</span></div>
    <div class="stat"><b>${kanjiL}</b><span>漢字・掌握 ${kanjiM}</span></div>
  </div>

  <h2 class="sec">今日任務 <small>約 ${plan.minutes} 分鐘・完成 ${doneN}/${plan.tasks.length}</small></h2>
  <ul class="tasks">
    ${plan.tasks.map(x => {
      const m = TASK_META[x.id];
      return `<li><a class="task ${d.done[x.id] ? 'done' : ''}" href="#/today" data-start="${x.id}" style="text-decoration:none;color:inherit">
        <span class="ic ${m.color}" lang="ja">${m.ic}</span>
        <span class="grow"><div class="tt">${taskName(x)}</div><div class="td">${esc(m.desc(x))}</div></span>
        <span class="ck">${d.done[x.id] ? '✓' : ''}</span></a></li>`;
    }).join('')}
  </ul>
  ${allDone ? `<a class="btn soft block" href="${due.length ? '#/review' : '#/learn'}" style="margin-top:14px">今天的任務完成了 🌸 ${due.length ? `還有 ${due.length} 張可以複習` : '想多學一點？'}</a>`
    : `<a class="btn block" href="#/today" style="margin-top:14px">${doneN ? '繼續今日學習' : '開始今日學習'}</a>`}

  <h2 class="sec">待複習 <small><a href="#/review">全部 ›</a></small></h2>
  <div class="card"><div class="row" style="justify-content:space-between">
    <div><b style="font-size:22px">${due.length}</b> <span class="small muted">張到期</span></div>
    <div class="due-row">
      ${dueBy.kana ? `<span class="chip red">假名 ${dueBy.kana}</span>` : ''}${dueBy.v ? `<span class="chip blue">單字 ${dueBy.v}</span>` : ''}
      ${dueBy.k ? `<span class="chip yellow">漢字 ${dueBy.k}</span>` : ''}${dueBy.g ? `<span class="chip purple">文法 ${dueBy.g}</span>` : ''}
      ${!due.length ? '<span class="chip green">目前沒有到期的內容</span>' : ''}
    </div></div></div>

  <h2 class="sec">每日一句</h2>
  <div class="phrase"><div class="grow"><div class="j" lang="ja">${esc(phrase.j)}</div><div class="r" lang="ja">${esc(phrase.r)}</div><div class="z">${esc(phrase.z)}</div></div>${sayBtn(phrase.j)}</div>
  `;
  el.onclick = e => {
    const a = e.target.closest('[data-start]');
    if (a) sessionStorage.setItem('n5-start', a.dataset.start);
  };
  bindSay(el);
}
