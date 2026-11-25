// 記憶卡與答題的共用流程
import { D, item, TYPE_NAME } from '../data.js';
import { S, save, day } from '../store.js';
import { grade, previewInterval, lapse, isLearned, GRADES } from '../srs.js';
import { speak, stop } from '../tts.js';
import { esc, todayKey, pct } from '../util.js';
import { bar, sayBtn, favBtn, bindSay, bindFav, ICON, confirmBox, petals } from '../ui.js';
import { QTYPES } from '../quizgen.js';

const sizeCls = s => s.length <= 2 ? '' : s.length <= 4 ? 'md' : 'sm';
const sayText = it => it.type === 'kana' ? it.kana : it.type === 'vocab' ? it.r : it.type === 'kanji' ? (it.words?.[0]?.r || '') : (it.ex?.[0]?.j || '');

export function faces(it) {
  if (it.type === 'kana') return {
    front: `<div class="huge" lang="ja">${esc(it.kana)}</div>`,
    back: `<div class="huge" lang="ja">${esc(it.kana)}</div><div class="mn">${esc(it.ro)}</div><div class="pos"><span class="chip">${it.script === 'h' ? '平假名' : '片假名'}</span></div>`,
  };
  if (it.type === 'vocab') return {
    front: `<div class="huge ${sizeCls(it.w)}" lang="ja">${esc(it.w)}</div>${it.note ? '<div class="pos"><span class="chip red">同形異義</span></div>' : ''}`,
    back: `<div class="huge sm" lang="ja">${esc(it.w)}</div>${it.w !== it.r ? `<div class="rd" lang="ja">${esc(it.r)}</div>` : ''}
      <div class="mn">${esc(it.m)}</div><div class="pos"><span class="chip">${esc(it.pos)}</span></div>
      ${it.note ? `<div class="warn">⚠ ${esc(it.note)}</div>` : ''}
      ${it.ex ? `<div class="ex"><div class="row"><div class="grow"><div class="j" lang="ja">${esc(it.ex)}</div><div class="z">${esc(it.exm)}</div></div>${sayBtn(it.ex)}</div></div>` : ''}`,
  };
  if (it.type === 'kanji') return {
    front: `<div class="huge" lang="ja">${esc(it.k)}</div>`,
    back: `<div class="huge sm" lang="ja">${esc(it.k)}</div><div class="mn">${esc(it.m)}</div>
      <dl class="kv"><dt>音讀</dt><dd>${esc(it.on.join('・') || '—')}</dd><dt>訓讀</dt><dd>${esc(it.kun.join('・') || '—')}</dd></dl>
      <div class="ex">${it.words.slice(0, 3).map(w => `<div class="row" style="padding:3px 0"><span lang="ja" style="font-size:16px">${esc(w.w)}</span><span class="faint small" lang="ja">${esc(w.r)}</span><span class="small muted grow" style="text-align:right">${esc(w.m)}</span></div>`).join('')}</div>`,
  };
  return {
    front: `<div class="huge sm" lang="ja">${esc(it.t)}</div><div class="pos"><span class="chip purple">文法</span></div>`,
    back: `<div class="huge sm" lang="ja" style="font-size:26px">${esc(it.t)}</div><div class="mn">${esc(it.mean)}</div>
      ${it.ex.slice(0, 2).map(e => `<div class="ex"><div class="row"><div class="grow"><div class="j" lang="ja">${esc(e.j)}</div><div class="z">${esc(e.z)}</div></div>${sayBtn(e.j)}</div></div>`).join('')}`,
  };
}

const ivl = n => n === 0 ? '今天' : n === 1 ? '1 天' : n < 30 ? `${n} 天` : `${Math.round(n / 30)} 個月`;

// ===== 記憶卡 =====
export function runCards(el, keys, { title = '記憶卡', onDone, onExit } = {}) {
  const queue = [...keys];
  const total = keys.length;
  const seen = new Set();
  const again = {};
  const counts = [0, 0, 0, 0];
  let flipped = false;

  function render() {
    if (!queue.length) return finish();
    const key = queue[0], it = item(key);
    if (!it) { queue.shift(); return render(); }
    const f = faces(it);
    flipped = false;
    el.innerHTML = `
      <div class="runner-head"><button class="close-btn" data-exit aria-label="離開">×</button>${bar(pct(seen.size, total))}<span class="cnt">${seen.size}/${total}</span></div>
      <div class="small faint">${esc(title)}${isLearned(key) ? '' : '・<span style="color:var(--primary)">新內容</span>'}</div>
      <div class="fc" data-flip>
        <div class="fc-in">
          <div class="fc-face"><span class="type chip">${TYPE_NAME[it.type]}</span>${f.front}<div class="hint">點一下翻面</div></div>
          <div class="fc-face fc-back"><div class="row" style="width:100%;justify-content:space-between;margin-bottom:6px"><span class="chip">${TYPE_NAME[it.type]}</span><span class="row">${it.type !== 'grammar' ? sayBtn(sayText(it)) : ''}${favBtn(key)}</span></div>${f.back}</div>
        </div>
      </div>
      <div id="act">
        <button class="btn block" data-flipbtn>看答案</button>
      </div>`;
  }
  function showGrades() {
    const key = queue[0];
    el.querySelector('#act').innerHTML = `<p class="small faint center" style="margin-bottom:8px">你記得多少？</p>
      <div class="grades">${GRADES.map(g => `<button class="g${g.v}" data-g="${g.v}">${g.label}<small>${ivl(previewInterval(key, g.v))}</small></button>`).join('')}</div>`;
  }
  function flip() {
    const fc = el.querySelector('.fc');
    if (!fc) return;
    fc.classList.toggle('flipped');
    if (!flipped) {
      flipped = true;
      showGrades();
      const it = item(queue[0]);
      if (S().settings.autoplay && it.type !== 'grammar') speak(sayText(it));
    }
  }
  function finish() {
    stop();
    el.onclick = null;
    onDone?.({ total, counts });
  }

  el.onclick = async e => {
    if (e.target.closest('[data-say],[data-fav]')) return;
    if (e.target.closest('[data-exit]')) {
      if (seen.size === 0 || await confirmBox('先離開？', '已經評分的卡片都會保存，剩下的之後可以繼續。', '離開')) { stop(); el.onclick = null; onExit?.(); }
      return;
    }
    if (e.target.closest('[data-flip],[data-flipbtn]')) { flip(); return; }
    const g = e.target.closest('[data-g]');
    if (g) {
      const v = +g.dataset.g, key = queue.shift();
      grade(key, v);
      counts[v]++;
      seen.add(key);
      if (v === 0 && (again[key] = (again[key] || 0) + 1) <= 2) queue.splice(Math.min(queue.length, 3), 0, key);
      render();
    }
  };
  bindSay(el); bindFav(el);
  render();
}

// ===== 答題紀錄 =====
export function record(q, picked, { fromWrong = false } = {}) {
  const s = S(), ok = picked === q.a;
  const st = s.stats[q.type] || (s.stats[q.type] = { right: 0, wrong: 0 });
  ok ? st.right++ : st.wrong++;
  const d = day(); d.answered++; if (ok) d.correct++;
  if (!ok) {
    const prev = s.wrong[q.id];
    s.wrong[q.id] = { id: q.id, type: q.type, stem: q.stem, opts: q.opts, a: q.a, exp: q.exp, passage: q.passage, title: q.title, audio: q.audio, ref: q.ref, inst: q.inst,
      count: (prev?.count || 0) + 1, added: prev?.added || todayKey(), last: todayKey() };
    if (q.ref && isLearned(q.ref)) lapse(q.ref);
  } else if (fromWrong && s.wrong[q.id]) {
    delete s.wrong[q.id];
  }
  save();
  return ok;
}

// ===== 答題 =====
// sections: [{name, minutes?, qs}]；mode: practice（每題回饋）或 exam（交卷後批改）
export function runQuiz(el, sections, { mode = 'practice', title = '測驗', fromWrong = false, onDone, onExit } = {}) {
  const flat = sections.flatMap((s, si) => s.qs.map(q => ({ ...q, si })));
  if (!flat.length) { el.innerHTML = `<div class="card center" style="margin-top:30px">目前沒有可以出的題目。</div><button class="btn block" style="margin-top:14px" data-exit>返回</button>`; el.onclick = e => { if (e.target.closest('[data-exit]')) onExit?.(); }; return; }
  const answers = new Array(flat.length).fill(undefined);
  let i = 0, revealed = false, showScript = false, timer = null, secEnd = null, curSec = -1, plays = 0;

  function startSection(si) {
    curSec = si;
    clearInterval(timer);
    const m = sections[si].minutes;
    if (mode === 'exam' && m) {
      secEnd = Date.now() + m * 60e3;
      timer = setInterval(tick, 1000);
    }
  }
  function tick() {
    const t = el.querySelector('#timer');
    const r = secEnd - Date.now();
    if (t) t.textContent = fmt(r);
    if (r <= 0) {
      clearInterval(timer);
      // 時間到：跳到下一節
      const nextIdx = flat.findIndex(q => q.si > curSec);
      if (nextIdx === -1) submit(); else { i = nextIdx; startSection(flat[i].si); render(); }
    }
  }
  const fmt = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

  function render() {
    const q = flat[i];
    if (q.si !== curSec) startSection(q.si);
    const meta = QTYPES[q.type];
    const picked = answers[i];
    const show = mode === 'practice' && revealed;
    const cls = k => show ? (k === q.a ? 'ok' : k === picked ? 'ng' : '') : (k === picked ? 'sel' : '');
    const secName = sections.length > 1 ? sections[q.si].name : (meta?.sec || '');
    el.innerHTML = `
      <div class="runner-head"><button class="close-btn" data-exit aria-label="離開">×</button>${bar(pct(i, flat.length))}
        ${mode === 'exam' && sections[q.si].minutes ? `<span class="timer" id="timer">${fmt(secEnd - Date.now())}</span>` : ''}<span class="cnt">${i + 1}/${flat.length}</span></div>
      <div class="q-sec" lang="ja">${esc(secName)}${meta ? `・${meta.name}` : ''}</div>
      <p class="q-inst" lang="ja">${esc(q.inst || meta?.inst || '')}</p>
      ${q.passage ? `${q.title ? `<div class="small faint" style="margin-bottom:4px">${esc(q.title)}</div>` : ''}<div class="q-passage" lang="ja">${esc(q.passage)}</div>` : ''}
      ${q.audio ? `<div class="player"><button class="play-btn" data-play aria-label="播放">${ICON.play}</button>
          <div class="grow"><div style="font-weight:700">播放音檔</div><div class="small faint">${q.situation ? esc(q.situation) : '可以重複播放'}</div></div>
          <button class="btn ghost sm" data-rate>${S().settings.rate < 1 ? '0.8×' : '1.0×'}</button></div>
        ${(show || fromWrong) ? `<button class="btn soft sm" data-script style="margin-bottom:10px">${showScript ? '隱藏逐字稿' : '看逐字稿'}</button>${showScript ? `<div class="script">${q.audio.filter(l => l.s !== 'N').map(l => `${l.s === 'M' ? '男' : '女'}：${esc(l.t)}`).join('<br>')}</div>` : ''}` : ''}` : ''}
      ${q.say && !q.audio ? `<div class="center" style="margin-bottom:-6px">${sayBtn(q.say)}</div>` : ''}
      <div class="q-stem" lang="ja">${q.stem}</div>
      <div class="opts">${q.opts.map((o, k) => `<button class="opt ${cls(k)}" data-pick="${k}" lang="ja"><span class="n">${k + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>
      ${show ? `<div class="feedback ${picked === q.a ? 'ok' : 'ng'}"><b>${picked === q.a ? '答對了！' : `正確答案是 ${q.a + 1}`}</b>${q.exp}</div>` : ''}
      <div style="margin-top:16px" class="stack">
        ${(show || mode === 'exam') ? `<button class="btn block ${mode === 'exam' && picked === undefined ? 'ghost' : ''}" data-next>${i < flat.length - 1 ? '下一題' : (mode === 'exam' ? '交卷' : '看結果')}</button>` : ''}
        ${mode === 'exam' ? `<div class="row">${i > 0 && flat[i - 1].si === q.si ? '<button class="btn ghost sm grow" data-prev>上一題</button>' : ''}<button class="btn ghost sm grow" data-submit>提前交卷</button></div>` : ''}
      </div>`;
    el.scrollTop = 0; window.scrollTo(0, 0);
  }

  function submit() {
    clearInterval(timer); stop();
    const results = flat.map((q, k) => ({ q, picked: answers[k], ok: answers[k] === q.a }));
    if (mode === 'exam') results.forEach(r => record(r.q, r.picked ?? -1));
    el.onclick = null;
    onDone?.({ results, sections });
  }

  el.onclick = async e => {
    if (e.target.closest('[data-say]')) return;
    if (e.target.closest('[data-exit]')) {
      if (await confirmBox('離開測驗？', mode === 'exam' ? '模擬考還沒交卷，離開後這次作答不會計分。' : '已作答的題目都已記錄。', '離開')) { clearInterval(timer); stop(); el.onclick = null; onExit?.(); }
      return;
    }
    const q = flat[i];
    const p = e.target.closest('[data-pick]');
    if (p) {
      if (mode === 'practice' && revealed) return;
      answers[i] = +p.dataset.pick;
      if (mode === 'practice') { revealed = true; record(q, answers[i], { fromWrong }); if (answers[i] === q.a && navigator.vibrate) navigator.vibrate(15); }
      render(); return;
    }
    if (e.target.closest('[data-next]')) {
      if (i < flat.length - 1) { i++; revealed = false; showScript = false; plays = 0; stop(); render(); }
      else submit();
      return;
    }
    if (e.target.closest('[data-prev]')) { i--; render(); return; }
    if (e.target.closest('[data-submit]')) {
      const left = answers.filter(a => a === undefined).length;
      if (await confirmBox('確定交卷？', left ? `還有 ${left} 題沒作答，未作答的題目以答錯計算。` : '交卷後會自動批改。', '交卷')) submit();
      return;
    }
    if (e.target.closest('[data-play]')) { plays++; speak(q.audio); return; }
    if (e.target.closest('[data-rate]')) { S().settings.rate = S().settings.rate < 1 ? 1 : 0.8; save(); render(); return; }
    if (e.target.closest('[data-script]')) { showScript = !showScript; render(); }
  };
  bindSay(el);
  render();
}

// ===== 結果頁 =====
export function resultHTML({ results, sections }, { mock = false } = {}) {
  const c = results.filter(r => r.ok).length, n = results.length;
  const byType = {};
  results.forEach(r => { const t = r.q.type; byType[t] = byType[t] || { c: 0, n: 0 }; byType[t].n++; if (r.ok) byType[t].c++; });
  let head;
  if (mock) {
    const lr = results.filter(r => r.q.si < 2), li = results.filter(r => r.q.si === 2);
    const lrS = lr.length ? Math.round(lr.filter(r => r.ok).length / lr.length * 120) : 0;
    const liS = li.length ? Math.round(li.filter(r => r.ok).length / li.length * 60) : 0;
    const tot = lrS + liS, pass = tot >= 80 && lrS >= 38 && liS >= 19;
    head = `<div class="result-hero"><div class="small faint">換算分數（僅供參考）</div><div class="score">${tot}<small> / 180</small></div>
      <div class="stamp ${pass ? '' : 'ng'}" lang="ja">${pass ? '合格ライン' : 'もう少し'}</div></div>
      <table class="tbl" style="margin-top:12px"><tr><th>科目</th><th class="num">得分</th><th class="num">基準分</th></tr>
      <tr><td>言語知識（文字・語彙・文法）・讀解</td><td class="num">${lrS} / 120</td><td class="num">38</td></tr>
      <tr><td>聽解</td><td class="num">${liS} / 60</td><td class="num">19</td></tr>
      <tr><td><b>總分</b></td><td class="num"><b>${tot}</b> / 180</td><td class="num">80</td></tr></table>
      <p class="tiny faint" style="margin-top:8px">及格條件：總分 80 分以上，且兩個科目都達基準分。官方採等化計分，這裡用答對比例換算，只能當作參考。</p>`;
  } else {
    head = `<div class="result-hero"><div class="score">${c}<small> / ${n}</small></div><div class="stamp ${c / n >= .8 ? '' : 'ng'}" lang="ja">${c === n ? '満点！' : c / n >= .8 ? 'よくできました' : 'がんばろう'}</div></div>`;
  }
  const weak = Object.entries(byType).sort((a, b) => a[1].c / a[1].n - b[1].c / b[1].n);
  return `${head}
    <h2 class="sec">各題型表現</h2>
    <div class="card"><table class="tbl">${weak.map(([t, v]) => `<tr><td>${QTYPES[t]?.name || t}</td><td class="num">${v.c}/${v.n}</td><td class="num" style="width:40%">${bar(pct(v.c, v.n), pct(v.c, v.n) >= 70 ? 'green' : '')}</td></tr>`).join('')}</table>
    ${weak.length && weak[0][1].c / weak[0][1].n < .7 ? `<p class="small" style="margin-top:10px">需要加強：<b>${QTYPES[weak[0][0]]?.name}</b>。答錯的題目已收進錯題筆記。</p>` : ''}</div>
    ${results.some(r => !r.ok) ? `<h2 class="sec">答錯的題目</h2><div class="stack">${results.filter(r => !r.ok).map(r => `
      <details class="card flat"><summary class="small" style="cursor:pointer"><span lang="ja">${r.q.stem.replace(/<[^>]+>/g, '')}</span></summary>
        <div style="margin-top:8px" class="small">你的答案：${r.picked === undefined || r.picked < 0 ? '未作答' : esc(r.q.opts[r.picked])}<br>正確答案：<b>${esc(r.q.opts[r.q.a])}</b></div>
        <div class="feedback ng small">${r.q.exp}</div></details>`).join('')}</div>` : ''}`;
}

export function logQuiz(kind, { results }) {
  const s = S();
  s.quizLog.push({ date: todayKey(), kind, n: results.length, c: results.filter(r => r.ok).length });
  if (s.quizLog.length > 300) s.quizLog.splice(0, s.quizLog.length - 300);
  save();
}
export { petals };
export const _D = D;
