// 測驗：分類測驗、綜合測驗、模擬考試
import { S, save } from '../store.js';
import { QTYPES, makeQuestions, buildMock } from '../quizgen.js';
import { runQuiz, resultHTML, logQuiz } from './runners.js';
import { petals, confirmBox } from '../ui.js';
import { sample, pct, shuffle } from '../util.js';

const CATS = ['kana', 'meaning', 'kanji-read', 'orthography', 'context', 'paraphrase', 'grammar', 'reading', 'listening'];

export function quizView(el) {
  let n = 10, onlyLearned = true;
  try { n = +(sessionStorage.getItem('quiz-n') || 10); } catch (e) { /* ignore */ }
  const render = () => {
    const st = S().stats;
    const log = S().quizLog.filter(x => x.kind === 'mock').slice(-3).reverse();
    el.innerHTML = `<div class="page-head"><h1>測驗</h1></div>
      <section class="card" style="background:linear-gradient(135deg,#263255,#3B4C7E);color:#fff">
        <div class="row" style="justify-content:space-between"><b style="font-size:19px" lang="ja">N5 模擬試験</b><span class="chip" style="background:rgba(255,255,255,.15);color:#fff">約 90 分</span></div>
        <p class="small" style="opacity:.8;margin:6px 0 12px;line-height:1.7">三個科目分別計時：文字・語彙 20 分、文法・讀解 40 分、聽解 30 分。題型與時間參考 JLPT 官方說明，題目為本 App 自編。</p>
        <button class="btn block" style="background:#fff;color:var(--navy)" data-mock>開始模擬考</button>
        ${log.length ? `<p class="tiny" style="opacity:.7;margin-top:8px">最近：${log.map(x => `${x.date} ${x.score ?? '-'} 分`).join('・')}</p>` : ''}
      </section>
      <h2 class="sec">綜合測驗</h2>
      <div class="card"><div class="row"><div class="grow"><b>混合各題型</b><div class="small faint">從各題型隨機出題</div></div><button class="btn sm" data-mix>開始</button></div></div>
      <h2 class="sec">分類測驗 <small>題數</small></h2>
      <div class="seg">${[5, 10, 20].map(x => `<button data-n="${x}" class="${n === x ? 'on' : ''}">${x} 題</button>`).join('')}</div>
      <label class="row small muted" style="margin-top:10px"><input type="checkbox" data-only ${onlyLearned ? 'checked' : ''}> 優先出已學過的內容</label>
      <div class="list" style="margin-top:10px">${CATS.map(t => {
        const s = st[t], tot = s ? s.right + s.wrong : 0;
        return `<button class="li" data-cat="${t}"><span class="main"><div class="t">${QTYPES[t].name}</div><div class="d" lang="ja">${QTYPES[t].sec}</div></span>${tot ? `<span class="chip ${pct(s.right, tot) >= 70 ? 'green' : 'red'}">正確率 ${pct(s.right, tot)}%</span>` : ''}<span class="arr">›</span></button>`;
      }).join('')}</div>
      <p class="tiny faint" style="margin-top:12px">本 App 所有題目皆為自編練習題，並非 JLPT 官方考古題。官方範例題請見 jlpt.jp。</p>`;
  };
  const back = () => quizView(el);
  const done = (kind, r) => {
    logQuiz(kind, r);
    el.innerHTML = `${resultHTML(r)}<button class="btn block" style="margin-top:18px" data-back>回到測驗</button>`;
    el.onclick = e => { if (e.target.closest('[data-back]')) back(); };
    window.scrollTo(0, 0);
    if (r.results.every(x => x.ok)) petals(24);
  };
  el.onclick = async e => {
    const nb = e.target.closest('[data-n]'); if (nb) { n = +nb.dataset.n; try { sessionStorage.setItem('quiz-n', n); } catch (er) { /* ignore */ } render(); return; }
    const ob = e.target.closest('[data-only]'); if (ob) { onlyLearned = ob.checked; return; }
    const c = e.target.closest('[data-cat]');
    if (c) { const t = c.dataset.cat; runQuiz(el, [{ name: QTYPES[t].name, qs: makeQuestions(t, n, { onlyLearned }) }], { onDone: r => done(t, r), onExit: back }); return; }
    if (e.target.closest('[data-mix]')) {
      const per = Math.max(1, Math.round(n / 6));
      const qs = shuffle(['meaning', 'kanji-read', 'orthography', 'context', 'grammar', 'paraphrase'].flatMap(t => makeQuestions(t, per, { onlyLearned }))).slice(0, n);
      runQuiz(el, [{ name: '綜合測驗', qs }], { onDone: r => done('mix', r), onExit: back });
      return;
    }
    if (e.target.closest('[data-mock]')) {
      if (!await confirmBox('開始模擬考？', '共三個科目，每科有時間限制，時間到會自動進入下一科。作答中不會顯示答案，交卷後一起批改。聽解需要開啟聲音。', '開始')) return;
      const secs = buildMock();
      runQuiz(el, secs, {
        mode: 'exam',
        onDone: r => {
          const lr = r.results.filter(x => x.q.si < 2), li = r.results.filter(x => x.q.si === 2);
          const score = Math.round((lr.length ? lr.filter(x => x.ok).length / lr.length * 120 : 0) + (li.length ? li.filter(x => x.ok).length / li.length * 60 : 0));
          logQuiz('mock', r);
          const lg = S().quizLog[S().quizLog.length - 1]; lg.score = score; save();
          el.innerHTML = `${resultHTML(r, { mock: true })}<button class="btn block" style="margin-top:18px" data-back>回到測驗</button>`;
          el.onclick = ev => { if (ev.target.closest('[data-back]')) back(); };
          window.scrollTo(0, 0);
        },
        onExit: back,
      });
    }
  };
  render();
}
void sample;
