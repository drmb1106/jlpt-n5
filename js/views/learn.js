// 學習：五十音、單字、漢字、文法、閱讀、聽力
import { S, save } from '../store.js';
import { D, KANA_GROUPS } from '../data.js';
import { level, isLearned, grade, GRADES } from '../srs.js';
import { speak } from '../tts.js';
import { esc, pct, todayKey } from '../util.js';
import { bar, sayBtn, favBtn, bindSay, bindFav, modal, toast, petals } from '../ui.js';
import { makeQuestions, grammarQs, readingQs, listeningQs } from '../quizgen.js';
import { runCards, runQuiz, resultHTML, logQuiz } from './runners.js';

const back = (href, label = '返回') => `<a class="back-btn" href="${href}">${label}</a>`;
const learnedPct = list => pct(list.filter(x => isLearned(x.key)).length, list.length);
const restore = fn => () => fn();

export function learnHub(el) {
  const g = D.grammarList, gDone = g.filter(x => S().grammar[x.id]).length;
  const rDone = D.reading.filter(r => S().practice[r.id]).length, lDone = D.listening.filter(r => S().practice[r.id]).length;
  const cards = [
    ['kana', 'あア', '五十音', '平假名・片假名・濁音・拗音', learnedPct(D.kanaList), 'var(--red)'],
    ['vocab', '語', '單字', `${D.vocabList.length} 個 N5 單字`, learnedPct(D.vocabList), 'var(--fuji)'],
    ['kanji', '漢', '漢字', `${D.kanjiList.length} 個 N5 漢字`, learnedPct(D.kanjiList), '#B98714'],
    ['grammar', '文', '文法', `${g.length} 課・繁中解說`, pct(gDone, g.length), 'var(--lavender)'],
    ['reading', '読', '閱讀', `${D.reading.length} 篇短文`, pct(rDone, D.reading.length), 'var(--matcha)'],
    ['listening', '聴', '聽力', `${D.listening.length} 段對話`, pct(lDone, D.listening.length), 'var(--primary)'],
  ];
  el.innerHTML = `<div class="page-head"><h1>學習</h1></div>
    <div class="hub">${cards.map(([id, big, nm, ds, p, c]) => `<a href="#/learn/${id}"><div class="big" lang="ja" style="color:${c}">${big}</div><div class="nm">${nm}</div><div class="ds">${ds}</div>${bar(p, 'thin')}<div class="tiny faint" style="margin-top:4px">已學 ${p}%</div></a>`).join('')}</div>
    <p class="small faint" style="margin-top:16px">每天的進度會自動排在首頁的「今日任務」。這裡可以自由瀏覽、預習或加強。</p>`;
}

// ===== 五十音 =====
export function kanaView(el, script = 'h') {
  let sc = sessionStorageGet('kana-script') || 'h';
  const render = () => {
    const list = D.kanaList.filter(k => k.script === sc);
    const name = sc === 'h' ? 'hiragana' : 'katakana';
    el.innerHTML = `${back('#/learn', '學習')}<div class="page-head"><h1>五十音</h1><span class="sub">已學 ${list.filter(k => isLearned(k.key)).length}/${list.length}</span></div>
      <div class="seg"><button data-sc="h" class="${sc === 'h' ? 'on' : ''}">平假名</button><button data-sc="k" class="${sc === 'k' ? 'on' : ''}">片假名</button></div>
      <div class="row" style="margin-top:12px"><button class="btn soft sm grow" data-learn>學新的假名</button><button class="btn soft sm grow" data-quiz="see">看字選讀音</button><button class="btn soft sm grow" data-quiz="hear">聽音選字</button></div>
      ${KANA_GROUPS.map(g => `<h2 class="sec">${g.name}</h2>
        <div class="kana-grid ${g.id === 'yoon' ? 'c3' : ''}">${D.kana[name][g.id].flatMap(row => row.map(c => c
          ? `<button class="kcell ${g.id === 'yoon' ? 'c3' : ''}" data-k="${esc(c[0])}"><span class="dot s${level(`kana:${sc}:${c[0]}`)}"></span><span class="k" lang="ja">${esc(c[0])}</span><span class="ro">${c[1]}</span></button>`
          : '<div class="kcell empty"></div>')).join('')}</div>`).join('')}
      <p class="small faint" style="margin-top:14px">點假名可以聽發音。右上角的點：粉＝學習中、黃＝熟悉、綠＝已掌握。<br>「ぢ・づ」與「じ・ず」發音相同，現代日語多用「じ・ず」。</p>`;
  };
  el.onclick = e => {
    const s = e.target.closest('[data-sc]'); if (s) { sc = s.dataset.sc; sessionStorageSet('kana-script', sc); render(); return; }
    const k = e.target.closest('[data-k]'); if (k) { speak(k.dataset.k); return; }
    if (e.target.closest('[data-learn]')) {
      const keys = D.kanaList.filter(k => k.script === sc && !isLearned(k.key)).slice(0, 10).map(k => k.key);
      if (!keys.length) { toast('這一組都學過了，可以用測驗加強'); return; }
      runCards(el, keys, { title: '五十音', onDone: () => { toast('已儲存學習進度'); kanaView(el); }, onExit: () => kanaView(el) });
      return;
    }
    const q = e.target.closest('[data-quiz]');
    if (q) {
      const pool = D.kanaList.filter(k => k.script === sc);
      let qs = makeQuestions('kana', 10, { keys: pool.map(k => k.key) });
      if (q.dataset.quiz === 'hear') qs = qs.map(x => toListenKana(x, pool));
      runQuiz(el, [{ name: '五十音', qs }], { onDone: r => { logQuiz('kana', r); showResult(el, r, () => kanaView(el)); }, onExit: () => kanaView(el) });
    }
  };
  render();
}
function toListenKana(q, pool) {
  const it = D.items.get(q.ref);
  const others = pool.filter(k => k.kana !== it.kana && k.ro !== it.ro).sort(() => Math.random() - .5).slice(0, 3).map(k => k.kana);
  const opts = [it.kana, ...others].sort(() => Math.random() - .5);
  return { ...q, id: `kh:${it.key}`, stem: '<div class="center small muted">按播放鍵，選出聽到的假名</div>', audio: [{ s: 'N', t: it.kana }], say: null, opts, a: opts.indexOf(it.kana), exp: `聽到的是「${esc(it.kana)}」（${esc(it.ro)}）。` };
}
function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }

export function showResult(el, r, onBack) {
  el.innerHTML = `${resultHTML(r)}<button class="btn block" style="margin-top:18px" data-back>完成</button>`;
  el.onclick = e => { if (e.target.closest('[data-back]')) onBack(); };
  window.scrollTo(0, 0);
  if (r.results.length && r.results.every(x => x.ok)) petals(20);
}

// ===== 單字 =====
export function vocabCats(el) {
  el.innerHTML = `${back('#/learn', '學習')}<div class="page-head"><h1>單字</h1><span class="sub">已學 ${D.vocabList.filter(w => isLearned(w.key)).length}/${D.vocabList.length}</span></div>
    <div class="list">${D.vocab.categories.map(c => {
      const ws = D.vocabList.filter(w => w.c === c.id);
      return `<a class="li" href="#/learn/vocab/${c.id}"><span class="main"><div class="t">${esc(c.name)}</div><div class="d">${ws.slice(0, 6).map(w => esc(w.w)).join('・')}</div>${bar(learnedPct(ws), 'thin')}</span><span class="small faint">${ws.length}</span><span class="arr">›</span></a>`;
    }).join('')}</div>`;
}

export function wordDetail(w) {
  modal(`<div class="row" style="justify-content:space-between"><span class="chip">${esc(w.pos)}</span><span class="row">${sayBtn(w.r)}${favBtn(w.key)}</span></div>
    <div class="center" style="margin:10px 0 4px"><div style="font-size:42px;font-weight:600" lang="ja">${esc(w.w)}</div>${w.w !== w.r ? `<div style="color:var(--primary);font-size:18px" lang="ja">${esc(w.r)}</div>` : ''}<div style="font-size:19px;font-weight:700;margin-top:4px">${esc(w.m)}</div></div>
    ${w.note ? `<div class="notice red" style="margin-top:10px">⚠ ${esc(w.note)}</div>` : ''}
    ${w.ex ? `<div class="card flat" style="margin-top:12px"><div class="row"><div class="grow"><div lang="ja" style="font-size:16px">${esc(w.ex)}</div><div class="small faint">${esc(w.exm)}</div></div>${sayBtn(w.ex)}</div></div>` : ''}
    <div class="small faint" style="margin-top:12px">熟悉度：${['尚未學習', '學習中', '熟悉', '已掌握'][level(w.key)]}${S().srs[w.key] ? `・下次複習 ${S().srs[w.key].due}` : ''}</div>
    <button class="btn ghost block" style="margin-top:14px" data-close>關閉</button>`, { onOpen: m => { bindSay(m); bindFav(m); } });
}

export function vocabList(el, cat) {
  const c = D.vocab.categories.find(x => x.id === cat);
  if (!c) { location.hash = '#/learn/vocab'; return; }
  const ws = D.vocabList.filter(w => w.c === cat);
  const render = () => {
    el.innerHTML = `${back('#/learn/vocab', '單字')}<div class="page-head"><h1>${esc(c.name)}</h1><span class="sub">${ws.filter(w => isLearned(w.key)).length}/${ws.length}</span></div>
      <div class="row"><button class="btn sm grow" data-learn>學這一組（未學的）</button><button class="btn soft sm grow" data-test>這一組小測驗</button></div>
      <div class="list" style="margin-top:12px">${ws.map(w => `<button class="li" data-w="${w.id}"><span class="dot s${level(w.key)}"></span><span class="main"><div class="t" lang="ja">${esc(w.w)} ${w.w !== w.r ? `<span class="small faint">${esc(w.r)}</span>` : ''}</div><div class="d">${esc(w.m)}</div></span>${S().favorites[w.key] ? '<span class="chip yellow">★</span>' : ''}</button>`).join('')}</div>`;
  };
  el.onclick = e => {
    const b = e.target.closest('[data-w]'); if (b) { wordDetail(D.vocabList.find(w => w.id === b.dataset.w)); return; }
    if (e.target.closest('[data-learn]')) {
      const keys = ws.filter(w => !isLearned(w.key)).slice(0, 15).map(w => w.key);
      if (!keys.length) { toast('這一組都學過了！'); return; }
      runCards(el, keys, { title: c.name, onDone: () => { toast('已儲存學習進度'); vocabList(el, cat); }, onExit: () => vocabList(el, cat) });
    }
    if (e.target.closest('[data-test]')) {
      const qs = makeQuestions('meaning', Math.min(10, ws.length), { keys: ws.map(w => w.key) });
      runQuiz(el, [{ name: c.name, qs }], { onDone: r => { logQuiz('vocab', r); showResult(el, r, () => vocabList(el, cat)); }, onExit: () => vocabList(el, cat) });
    }
  };
  render();
}

// ===== 漢字 =====
export function kanjiView(el) {
  el.innerHTML = `${back('#/learn', '學習')}<div class="page-head"><h1>漢字</h1><span class="sub">已學 ${D.kanjiList.filter(k => isLearned(k.key)).length}/${D.kanjiList.length}</span></div>
    <div class="row"><button class="btn sm grow" data-learn>學新的漢字</button><button class="btn soft sm grow" data-test>漢字讀法測驗</button></div>
    <div class="kanji-grid" style="margin-top:14px">${D.kanjiList.map(k => `<button data-k="${esc(k.k)}" lang="ja"><span class="dot s${level(k.key)}"></span>${esc(k.k)}</button>`).join('')}</div>
    <p class="tiny faint" style="margin-top:14px">筆順資料來自 KanjiVG（CC BY-SA 3.0），第一次查看需要連網。</p>`;
  el.onclick = e => {
    const b = e.target.closest('[data-k]'); if (b) { kanjiDetail(D.kanjiList.find(k => k.k === b.dataset.k)); return; }
    if (e.target.closest('[data-learn]')) {
      const keys = D.kanjiList.filter(k => !isLearned(k.key)).slice(0, 8).map(k => k.key);
      if (!keys.length) { toast('全部漢字都學過了！'); return; }
      runCards(el, keys, { title: '漢字', onDone: () => kanjiView(el), onExit: () => kanjiView(el) });
    }
    if (e.target.closest('[data-test]')) runQuiz(el, [{ name: '漢字讀法', qs: makeQuestions('kanji-read', 10, { onlyLearned: true }) }], { onDone: r => { logQuiz('kanji', r); showResult(el, r, () => kanjiView(el)); }, onExit: () => kanjiView(el) });
  };
}

export function kanjiDetail(k) {
  const related = D.vocabList.filter(w => w.w.includes(k.k)).slice(0, 6);
  modal(`<div class="row" style="justify-content:space-between"><span class="chip yellow">N5 漢字</span>${favBtn(k.key)}</div>
    <div class="row" style="margin-top:8px;align-items:stretch">
      <div class="stroke-box grow" id="stroke"><span class="small faint">筆順載入中…</span></div>
      <div style="flex:1"><div style="font-size:20px;font-weight:700">${esc(k.m)}</div>
        <dl class="small" style="margin-top:8px;line-height:1.9"><dt class="faint">音讀</dt><dd lang="ja">${esc(k.on.join('・') || '—')}</dd><dt class="faint">訓讀</dt><dd lang="ja">${esc(k.kun.join('・') || '—')}</dd></dl></div></div>
    <button class="btn soft sm" style="margin-top:8px" data-replay>重播筆順</button>
    <h3 style="margin-top:16px;font-size:15px">常見詞彙</h3>
    <div class="list" style="margin-top:8px;box-shadow:none;border:1px solid var(--line)">${(k.words || []).map(w => `<div class="li"><span class="main"><div class="t" lang="ja">${esc(w.w)} <span class="small faint">${esc(w.r)}</span></div><div class="d">${esc(w.m)}</div></span>${sayBtn(w.r)}</div>`).join('')}
    ${related.filter(r => !(k.words || []).some(w => w.w === r.w)).map(w => `<div class="li"><span class="main"><div class="t" lang="ja">${esc(w.w)} <span class="small faint">${esc(w.r)}</span></div><div class="d">${esc(w.m)}</div></span>${sayBtn(w.r)}</div>`).join('')}</div>
    <button class="btn ghost block" style="margin-top:14px" data-close>關閉</button>`, {
    onOpen: m => { bindSay(m); bindFav(m); loadStroke(m.querySelector('#stroke'), k.k); m.querySelector('[data-replay]').onclick = () => loadStroke(m.querySelector('#stroke'), k.k); },
  });
}

async function loadStroke(box, ch) {
  const code = ch.codePointAt(0).toString(16).padStart(5, '0');
  try {
    const res = await fetch(`https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${code}.svg`);
    if (!res.ok) throw new Error();
    const txt = await res.text();
    const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
    const paths = [...doc.querySelectorAll('path')].map(p => p.getAttribute('d')).filter(Boolean);
    const nums = [...doc.querySelectorAll('text')].map(t => ({ x: t.getAttribute('transform'), n: t.textContent }));
    if (!paths.length) throw new Error();
    box.innerHTML = `<svg viewBox="0 0 109 109">${paths.map(d => `<path d="${d}"/>`).join('')}${nums.map(t => `<text transform="${esc(t.x)}">${esc(t.n)}</text>`).join('')}</svg>`;
    box.querySelectorAll('path').forEach((p, i) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 550, delay: i * 600, fill: 'forwards', easing: 'ease-in-out' });
    });
  } catch (e) {
    box.innerHTML = `<div class="center"><div style="font-size:90px;line-height:1" lang="ja">${esc(ch)}</div><div class="tiny faint">離線中，暫時無法顯示筆順</div></div>`;
  }
}

// ===== 文法 =====
export function grammarList(el) {
  el.innerHTML = `${back('#/learn', '學習')}<div class="page-head"><h1>文法</h1><span class="sub">完成 ${D.grammarList.filter(g => S().grammar[g.id]).length}/${D.grammarList.length}</span></div>
    <div class="list">${D.grammarList.map((g, i) => { const st = S().grammar[g.id]; return `<a class="li" href="#/learn/grammar/${g.id}"><span class="small faint" style="width:22px">${i + 1}</span><span class="main"><div class="t" lang="ja">${esc(g.t)}</div><div class="d">${esc(g.mean)}</div></span>${st ? `<span class="chip ${['red', 'yellow', 'blue', 'green'][st.mastery]}">${GRADES[st.mastery].label}</span>` : ''}<span class="arr">›</span></a>`; }).join('')}</div>`;
}

export function grammarLesson(el, id) {
  const g = D.grammarList.find(x => x.id === id);
  if (!g) { location.hash = '#/learn/grammar'; return; }
  grammarFlow(el, g, { onDone: () => { location.hash = '#/learn/grammar'; }, onExit: () => { location.hash = '#/learn/grammar'; }, standalone: true });
}

export function grammarFlow(el, g, { onDone, onExit, standalone = false }) {
  const st = S().grammar[g.id];
  el.innerHTML = `${standalone ? back('#/learn/grammar', '文法') : `<div class="runner-head"><button class="close-btn" data-exit aria-label="離開">×</button><span class="small faint grow">今日文法</span></div>`}
    <div class="row" style="justify-content:space-between;margin:8px 0"><span class="chip purple">文法 ${D.grammarList.indexOf(g) + 1}</span>${favBtn(g.key)}</div>
    <div class="pattern" lang="ja">${esc(g.pattern)}</div>
    <div class="pattern-mean">${esc(g.mean)}</div>
    <h2 class="sec">說明</h2><div class="card prose">${g.explain.map(p => `<p>${esc(p)}</p>`).join('')}</div>
    <h2 class="sec">使用情境</h2><div class="card prose"><p>${esc(g.usage)}</p></div>
    <h2 class="sec">例句</h2><div class="card">${g.ex.map(e => `<div class="ex-line"><div class="grow"><div class="j" lang="ja">${esc(e.j)}</div><div class="z">${esc(e.z)}</div></div>${sayBtn(e.j)}</div>`).join('')}</div>
    <h2 class="sec">常見錯誤</h2><div class="card">${g.mistakes.map(m => `<div class="mistake">${esc(m)}</div>`).join('')}</div>
    <button class="btn block" style="margin-top:20px" data-practice>做練習題（${g.quiz.length} 題）</button>
    ${st ? `<p class="small faint center" style="margin-top:8px">上次評估：${GRADES[st.mastery].label}（${st.date}）</p>` : ''}`;
  window.scrollTo(0, 0);
  el.onclick = e => {
    if (e.target.closest('[data-exit]')) { onExit?.(); return; }
    if (e.target.closest('[data-practice]')) {
      runQuiz(el, [{ name: g.t, qs: grammarQs(g.id) }], {
        onDone: r => {
          logQuiz('grammar', r);
          const c = r.results.filter(x => x.ok).length;
          el.innerHTML = `${resultHTML(r)}<h2 class="sec">你覺得自己掌握得如何？</h2>
            <div class="grades">${GRADES.map(x => `<button class="g${x.v}" data-m="${x.v}">${x.label}</button>`).join('')}</div>
            <p class="small faint" style="margin-top:8px">這會決定這個文法下次出現在複習的時間。</p>`;
          window.scrollTo(0, 0);
          el.onclick = ev => {
            const b = ev.target.closest('[data-m]');
            if (!b) return;
            const m = Math.min(+b.dataset.m, c === r.results.length ? 3 : 2);
            S().grammar[g.id] = { mastery: m, date: todayKey() };
            grade(g.key, m);
            save();
            toast('已記錄文法掌握程度');
            onDone?.();
          };
        },
        onExit: () => grammarFlow(el, g, { onDone, onExit, standalone }),
      });
    }
  };
  bindSay(el); bindFav(el);
}

// ===== 閱讀、聽力 =====
export function readingList(el) {
  el.innerHTML = `${back('#/learn', '學習')}<div class="page-head"><h1>閱讀理解</h1></div>
    <div class="list">${D.reading.map(r => `<a class="li" href="#/learn/reading/${r.id}"><span class="main"><div class="t" lang="ja">${esc(r.title)}</div><div class="d">${esc(r.type)}・${r.qs.length} 題</div></span>${S().practice[r.id] ? '<span class="chip green">已完成</span>' : ''}<span class="arr">›</span></a>`).join('')}</div>`;
}
export function readingView(el, id) {
  const r = D.reading.find(x => x.id === id);
  if (!r) { location.hash = '#/learn/reading'; return; }
  runQuiz(el, [{ name: '讀解', qs: readingQs(id) }], {
    onDone: res => {
      S().practice[id] = todayKey(); save(); logQuiz('reading', res);
      el.innerHTML = `${resultHTML(res)}<h2 class="sec">文章翻譯</h2><div class="card prose"><p lang="ja" style="white-space:pre-wrap">${esc(r.text)}</p><div class="hr"></div><p style="white-space:pre-wrap">${esc(r.zh)}</p></div>
        <a class="btn block" style="margin-top:18px" href="#/learn/reading">完成</a>`;
      window.scrollTo(0, 0);
    },
    onExit: () => { location.hash = '#/learn/reading'; },
  });
}
export function listeningList(el) {
  el.innerHTML = `${back('#/learn', '學習')}<div class="page-head"><h1>聽力訓練</h1></div>
    <div class="notice blue">音檔使用裝置內建的日語語音合成。可以重播、調整速度，答題後可看逐字稿。</div>
    <div class="list" style="margin-top:12px">${D.listening.map(l => `<a class="li" href="#/learn/listening/${l.id}"><span class="main"><div class="t">${esc(l.title)}</div><div class="d" lang="ja">${esc(l.type)}</div></span>${S().practice[l.id] ? '<span class="chip green">已完成</span>' : ''}<span class="arr">›</span></a>`).join('')}</div>`;
}
export function listeningView(el, id) {
  const l = D.listening.find(x => x.id === id);
  if (!l) { location.hash = '#/learn/listening'; return; }
  runQuiz(el, [{ name: '聽解', qs: listeningQs(id) }], {
    onDone: res => {
      S().practice[id] = todayKey(); save(); logQuiz('listening', res);
      el.innerHTML = `${resultHTML(res)}<h2 class="sec">逐字稿</h2><div class="card"><div class="script" style="margin:0">${l.lines.map(x => `${x.s === 'N' ? '' : x.s === 'M' ? '男：' : '女：'}${esc(x.t)}`).join('<br>')}</div><p class="small muted" style="margin-top:10px">${esc(l.zh)}</p></div>
        <a class="btn block" style="margin-top:18px" href="#/learn/listening">完成</a>`;
      window.scrollTo(0, 0);
    },
    onExit: () => { location.hash = '#/learn/listening'; },
  });
}
void restore; void sessionStorageGet;
