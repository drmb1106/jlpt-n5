// 複習：智慧複習、錯題筆記、收藏
import { S, save } from '../store.js';
import { D, item, TYPE_NAME } from '../data.js';
import { dueKeys, level } from '../srs.js';
import { esc, todayKey, addDays } from '../util.js';
import { QTYPES } from '../quizgen.js';
import { runCards, runQuiz, resultHTML, logQuiz } from './runners.js';
import { sayBtn, favBtn, bindSay, bindFav, toast, confirmBox } from '../ui.js';
import { wordDetail, kanjiDetail } from './learn.js';

export function reviewView(el) {
  const due = dueKeys();
  const by = p => due.filter(k => k.startsWith(p)).length;
  const s = S().srs, t = todayKey();
  const tomorrow = Object.values(s).filter(v => v.due === addDays(t, 1)).length;
  const week = Object.values(s).filter(v => v.due > t && v.due <= addDays(t, 7)).length;
  const lv = [1, 2, 3].map(n => Object.keys(s).filter(k => level(k) === n).length);
  const wrongN = Object.keys(S().wrong).length, favN = Object.keys(S().favorites).length;
  el.innerHTML = `<div class="page-head"><h1>複習</h1></div>
    <section class="card pink">
      <div class="small muted">今天到期</div>
      <div style="font-size:44px;font-weight:800;font-family:var(--font-round);line-height:1.2;color:var(--navy)">${due.length}<span style="font-size:16px"> 張</span></div>
      <div class="due-row">${by('kana') ? `<span class="chip red">假名 ${by('kana')}</span>` : ''}${by('v:') ? `<span class="chip blue">單字 ${by('v:')}</span>` : ''}${by('k:') ? `<span class="chip yellow">漢字 ${by('k:')}</span>` : ''}${by('g:') ? `<span class="chip purple">文法 ${by('g:')}</span>` : ''}</div>
      <button class="btn block" style="margin-top:14px" data-review ${due.length ? '' : 'disabled'}>${due.length ? '開始複習' : '今天沒有到期的內容 🌸'}</button>
      <p class="tiny faint" style="margin-top:8px">明天 ${tomorrow} 張・未來 7 天 ${week} 張</p>
    </section>
    <h2 class="sec">記憶程度</h2>
    <div class="grid3"><div class="stat"><b style="color:var(--primary)">${lv[0]}</b><span>學習中</span></div><div class="stat"><b style="color:#B98714">${lv[1]}</b><span>熟悉</span></div><div class="stat"><b style="color:var(--matcha)">${lv[2]}</b><span>已掌握</span></div></div>
    <p class="tiny faint" style="margin-top:6px">答錯或標「完全不會」的內容會更快再出現；記得越牢，間隔越長。</p>
    <h2 class="sec">筆記</h2>
    <div class="list">
      <a class="li" href="#/review/wrong"><span class="badge ic red">✕</span><span class="main"><div class="t">錯題筆記</div><div class="d">自動收錄答錯的題目</div></span><span class="small faint">${wrongN}</span><span class="arr">›</span></a>
      <a class="li" href="#/review/fav"><span class="badge ic yellow">★</span><span class="main"><div class="t">我的收藏</div><div class="d">單字、漢字、文法</div></span><span class="small faint">${favN}</span><span class="arr">›</span></a>
    </div>`;
  el.onclick = e => {
    if (e.target.closest('[data-review]')) runCards(el, due.slice(0, 150), { title: '智慧複習', onDone: () => { toast('複習完成，已更新下次複習日期'); reviewView(el); }, onExit: () => reviewView(el) });
  };
}

export function wrongView(el) {
  let filter = 'all';
  const render = () => {
    const all = Object.values(S().wrong).sort((a, b) => b.last.localeCompare(a.last) || b.count - a.count);
    const types = [...new Set(all.map(w => w.type))];
    const list = filter === 'all' ? all : all.filter(w => w.type === filter);
    el.innerHTML = `<a class="back-btn" href="#/review">複習</a><div class="page-head"><h1>錯題筆記</h1><span class="sub">${all.length} 題</span></div>
      ${all.length ? `<div class="row wrap"><button class="chip ${filter === 'all' ? 'pink' : ''}" data-f="all">全部</button>${types.map(t => `<button class="chip ${filter === t ? 'pink' : ''}" data-f="${t}">${QTYPES[t]?.name || t}</button>`).join('')}</div>
      <button class="btn block" style="margin-top:12px" data-redo>再練習${filter === 'all' ? '全部' : '這類'}錯題（${list.length}）</button>
      <p class="tiny faint" style="margin-top:6px">在這裡答對的題目會從錯題筆記移除。</p>
      <div class="stack" style="margin-top:12px">${list.map(w => `<details class="card flat"><summary style="cursor:pointer;list-style:none"><div class="row"><span class="chip">${QTYPES[w.type]?.name || w.type}</span><span class="tiny faint grow">錯 ${w.count} 次・${w.last}</span></div>
        <div lang="ja" style="margin-top:6px">${w.passage ? '<span class="faint small">（閱讀）</span>' : ''}${w.audio ? '<span class="faint small">（聽力）</span>' : ''}${w.stem}</div></summary>
        ${w.passage ? `<div class="q-passage small" style="margin-top:8px" lang="ja">${esc(w.passage)}</div>` : ''}
        ${w.audio ? `<div class="script small" style="margin-top:8px">${w.audio.filter(l => l.s !== 'N').map(l => `${l.s === 'M' ? '男' : '女'}：${esc(l.t)}`).join('<br>')}</div>` : ''}
        <div class="small" style="margin-top:8px">正確答案：<b lang="ja">${esc(w.opts[w.a])}</b></div><div class="feedback ok small">${w.exp}</div>
        <button class="btn ghost sm" style="margin-top:8px" data-del="${esc(w.id)}">移除</button></details>`).join('')}</div>`
      : '<div class="card center" style="margin-top:20px"><div style="font-size:40px">🌸</div><p class="muted">目前沒有錯題。測驗中答錯的題目會自動收進這裡。</p></div>'}`;
  };
  el.onclick = async e => {
    const f = e.target.closest('[data-f]'); if (f) { filter = f.dataset.f; render(); return; }
    const d = e.target.closest('[data-del]');
    if (d) { e.preventDefault(); if (await confirmBox('移除這題？', '移除後不會再出現在錯題筆記。', '移除')) { delete S().wrong[d.dataset.del]; save(); render(); } return; }
    if (e.target.closest('[data-redo]')) {
      const all = Object.values(S().wrong);
      const qs = (filter === 'all' ? all : all.filter(w => w.type === filter)).slice(0, 30);
      runQuiz(el, [{ name: '錯題練習', qs }], { fromWrong: true, onDone: r => { logQuiz('wrong', r); el.innerHTML = `${resultHTML(r)}<button class="btn block" style="margin-top:18px" data-back>完成</button>`; el.onclick = ev => { if (ev.target.closest('[data-back]')) wrongView(el); }; window.scrollTo(0, 0); }, onExit: () => wrongView(el) });
    }
  };
  render();
}

export function favView(el) {
  const render = () => {
    const keys = Object.keys(S().favorites).filter(k => item(k));
    const groups = ['vocab', 'kanji', 'grammar', 'kana'].map(t => [t, keys.filter(k => item(k).type === t)]).filter(([, k]) => k.length);
    el.innerHTML = `<a class="back-btn" href="#/review">複習</a><div class="page-head"><h1>我的收藏</h1><span class="sub">${keys.length}</span></div>
      ${keys.length ? `<button class="btn block" data-cards>用記憶卡複習收藏</button>${groups.map(([t, ks]) => `<h2 class="sec">${TYPE_NAME[t]}</h2><div class="list">${ks.map(k => {
        const it = item(k);
        const title = it.type === 'vocab' ? `${it.w} <span class="small faint">${it.w !== it.r ? esc(it.r) : ''}</span>` : it.type === 'kanji' ? it.k : it.type === 'grammar' ? it.t : it.kana;
        const sub = it.type === 'vocab' ? it.m : it.type === 'kanji' ? it.m : it.type === 'grammar' ? it.mean : it.ro;
        return `<div class="li" data-open="${esc(k)}" style="cursor:pointer"><span class="main"><div class="t" lang="ja">${title}</div><div class="d">${esc(sub)}</div></span>${it.type === 'vocab' ? sayBtn(it.r) : ''}${favBtn(k)}</div>`;
      }).join('')}</div>`).join('')}`
      : '<div class="card center" style="margin-top:20px"><div style="font-size:40px">☆</div><p class="muted">還沒有收藏。在單字、漢字、文法頁面點星星就能收藏。</p></div>'}`;
  };
  el.onclick = e => {
    if (e.target.closest('[data-say],[data-fav]')) return;
    if (e.target.closest('[data-cards]')) { runCards(el, Object.keys(S().favorites).filter(k => item(k)), { title: '收藏複習', onDone: () => favView(el), onExit: () => favView(el) }); return; }
    const o = e.target.closest('[data-open]');
    if (o) { const it = item(o.dataset.open); if (it.type === 'vocab') wordDetail(it); else if (it.type === 'kanji') kanjiDetail(it); else if (it.type === 'grammar') location.hash = `#/learn/grammar/${it.id}`; }
  };
  bindSay(el); bindFav(el);
  render();
}
void D;
