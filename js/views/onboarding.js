// 首次使用：程度 → 考試日期 → 每日時間 → 程度評估（可略過）→ 建立計畫
import { S, save } from '../store.js';
import { D } from '../data.js';
import { EXAM_OPTIONS, replan, forecast, todayPlan } from '../plan.js';
import { makeQuestions } from '../quizgen.js';
import { runQuiz } from './runners.js';
import { todayKey, diffDays, fmtDate, addDays, esc } from '../util.js';
import { toast, petals } from '../ui.js';

export function onboarding(el) {
  const t = todayKey();
  const a = { level: null, examDate: null, dailyMinutes: 30, step: 0, suggested: null };
  const firstOk = EXAM_OPTIONS.find(o => diffDays(t, o.date) >= 30);
  a.examDate = firstOk?.date || addDays(t, 180);
  const STEPS = 5;

  const steps = n => `<div class="steps">${[...Array(STEPS)].map((_, i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;

  function render() {
    const s = a.step;
    if (s === 0) {
      el.innerHTML = `<div class="ob center"><img class="hero-icon" src="icons/icon-512.png" alt="N5 日語學習圖示">
        <h1 lang="ja">ようこそ！</h1><p class="lead">一起用最適合你的節奏，<br>準備 JLPT N5 日本語能力試驗。</p>
        <div class="card pink" style="text-align:left;margin-top:22px"><p class="small" style="line-height:1.9">✓ 自動安排每天要學的內容<br>✓ 依記憶程度安排複習<br>✓ 錯題筆記、模擬考、弱點分析<br>✓ 紀錄只存在這台裝置，不需註冊</p></div>
        <div class="foot"><button class="btn block" data-next>開始設定</button><label class="btn ghost block" style="cursor:pointer">從備份檔還原<input type="file" accept=".json,application/json" id="restore" hidden></label></div></div>`;
      el.querySelector('#restore').onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        try { const { importJSON } = await import('../store.js'); importJSON(await f.text()); if (!S().profile?.onboarded) throw new Error('備份裡沒有學習設定'); toast('已還原學習紀錄'); location.hash = '#/home'; }
        catch (er) { toast('還原失敗：' + er.message, 3500); }
      };
      return;
    }
    if (s === 1) {
      const opts = [['zero', 'あ', '完全零基礎', '從平假名、片假名開始'], ['kana', 'ア', '學過五十音', '認得假名，但單字、文法還不熟'], ['some', '語', '有一點基礎', '會一些單字和簡單句子']];
      el.innerHTML = `<div class="ob">${steps(0)}<h1>你目前的日語程度？</h1><p class="lead">之後可以在「我的」修改。</p>
        <div class="choices">${opts.map(([v, em, tt, d]) => `<button class="choice ${a.level === v ? 'on' : ''}" data-v="${v}"><span class="em">${em}</span><span><div class="t">${tt}</div><div class="d">${d}</div></span></button>`).join('')}</div>
        <div class="foot"><button class="btn block" data-next ${a.level ? '' : 'disabled'}>下一步</button><button class="btn ghost block" data-prev>上一步</button></div></div>`;
      return;
    }
    if (s === 2) {
      const isCustom = !EXAM_OPTIONS.some(o => o.date === a.examDate);
      el.innerHTML = `<div class="ob">${steps(1)}<h1>想參加哪一次考試？</h1><p class="lead">JLPT 每年 7 月和 12 月的第一個星期日舉行。正式日期請以台灣主辦單位（LTTC）公告為準。</p>
        <div class="choices">${EXAM_OPTIONS.map(o => { const left = diffDays(t, o.date); const ok = left >= 14; return `<button class="choice ${a.examDate === o.date ? 'on' : ''}" data-d="${o.date}" ${ok ? '' : 'disabled style="opacity:.45"'}><span class="em" lang="ja">試</span><span><div class="t">${o.name}</div><div class="d">${fmtDate(o.date)}・${ok ? `還有 ${left} 天` : '時間太近'}</div></span></button>`; }).join('')}
          <button class="choice ${isCustom ? 'on' : ''}" data-d="custom"><span class="em">📅</span><span class="grow"><div class="t">自訂目標日期</div><div class="d">沒有要報名考試，也可以設一個目標日</div>${isCustom ? `<input type="date" class="input" id="cd" style="margin-top:8px" value="${a.examDate}" min="${addDays(t, 14)}">` : ''}</span></button></div>
        <div class="foot"><button class="btn block" data-next>下一步</button><button class="btn ghost block" data-prev>上一步</button></div></div>`;
      el.querySelector('#cd')?.addEventListener('change', e => { a.examDate = e.target.value; });
      return;
    }
    if (s === 3) {
      const preset = [10, 15, 30, 45, 60];
      el.innerHTML = `<div class="ob">${steps(2)}<h1>每天可以學多久？</h1><p class="lead">App 會依時間調整每天的份量，不會要求固定的進度。</p>
        <div class="min-grid">${preset.map(m => `<button class="choice ${a.dailyMinutes === m ? 'on' : ''}" data-m="${m}"><b>${m}</b><span class="small faint">分鐘</span></button>`).join('')}
          <button class="choice ${preset.includes(a.dailyMinutes) ? '' : 'on'}" data-m="custom"><b>✎</b><span class="small faint">自訂</span></button></div>
        ${preset.includes(a.dailyMinutes) ? '' : `<label class="field"><span>自訂分鐘數（5–180）</span><input type="number" class="input" id="cm" min="5" max="180" value="${a.dailyMinutes}" inputmode="numeric"></label>`}
        <div class="notice blue" style="margin-top:16px">${hint()}</div>
        <div class="foot"><button class="btn block" data-next>下一步</button><button class="btn ghost block" data-prev>上一步</button></div></div>`;
      el.querySelector('#cm')?.addEventListener('input', e => { const v = Math.round(+e.target.value); if (v >= 5 && v <= 180) { a.dailyMinutes = v; el.querySelector('.notice').innerHTML = hint(); } });
      return;
    }
    if (s === 4) {
      el.innerHTML = `<div class="ob">${steps(3)}<h1>做個小小的程度評估？</h1><p class="lead">8 題，大約 2 分鐘。可以幫你確認起點，也可以直接略過。</p>
        ${a.suggested ? `<div class="card pink" style="margin-top:20px"><b>評估結果：${{ zero: '建議從五十音開始', kana: '假名沒問題，從單字和文法開始', some: '已有基礎，可以加快進度' }[a.suggested]}</b>
          <p class="small muted" style="margin-top:4px">已幫你把程度設為「${{ zero: '完全零基礎', kana: '學過五十音', some: '有一點基礎' }[a.suggested]}」。</p></div>` : ''}
        <div class="foot"><button class="btn block" data-test>${a.suggested ? '再測一次' : '開始評估'}</button><button class="btn ${a.suggested ? '' : 'ghost'} block" data-next>${a.suggested ? '下一步' : '略過'}</button><button class="btn ghost block" data-prev>上一步</button></div></div>`;
      return;
    }
    if (s === 5) {
      S().profile = { level: a.level, examDate: a.examDate, dailyMinutes: a.dailyMinutes, startDate: t, onboarded: false };
      const fc = forecast();
      const plan = todayPlan(true);
      el.innerHTML = `<div class="ob">${steps(4)}<h1>你的學習計畫完成了！</h1>
        <div class="card" style="margin-top:18px"><table class="tbl">
          <tr><td class="faint">考試日</td><td class="num"><b>${fmtDate(a.examDate)}</b>（${diffDays(t, a.examDate)} 天後）</td></tr>
          <tr><td class="faint">每天</td><td class="num"><b>${a.dailyMinutes}</b> 分鐘</td></tr>
          <tr><td class="faint">起點</td><td class="num">${{ zero: '五十音', kana: '單字・文法', some: '單字・文法（加快）' }[a.level]}</td></tr>
          <tr><td class="faint">預計學完新內容</td><td class="num"><b>${fmtDate(fc.finish)}</b></td></tr></table>
          ${fc.onTrack ? '<div class="notice green" style="margin-top:12px">時間足夠，還能留下考前衝刺複習的時間。</div>' : `<div class="notice" style="margin-top:12px">以目前的時間會比較趕，建議每天約 ${fc.needMinutes} 分鐘。也可以先開始，之後再調整。</div>`}</div>
        <h2 class="sec">今天的任務</h2><div class="card small">${plan.tasks.map(x => `・${esc({ review: '複習', kana: `五十音 ${x.keys?.length} 個`, vocab: `單字 ${x.keys?.length} 個`, kanji: `漢字 ${x.keys?.length} 個`, grammar: '文法 1 課', practice: x.kind === 'listening' ? '聽力練習' : '閱讀練習', quiz: '小測驗' }[x.id])}`).join('<br>')}</div>
        <div class="foot"><button class="btn block" data-finish>開始學習</button><button class="btn ghost block" data-prev>上一步</button></div></div>`;
    }
  }

  function hint() {
    const days = Math.max(1, diffDays(t, a.examDate));
    const total = (a.level === 'zero' ? D.kanaList.length * 0.6 : 0) + D.vocabList.length + D.kanjiList.length * 1.6 + D.grammarList.length * 7;
    const need = Math.ceil((total / Math.max(1, days - Math.min(14, Math.floor(days * .15))) + 3) / 0.6);
    return a.dailyMinutes >= need ? `距離目標還有 ${days} 天，每天 ${a.dailyMinutes} 分鐘應該來得及。` : `距離目標還有 ${days} 天，若要讀完全部內容，建議每天約 <b>${need}</b> 分鐘。`;
  }

  function placement() {
    const qs = [...makeQuestions('kana', 4, { keys: D.kanaList.filter(k => k.script === 'h' && k.group === 'seion').map(k => k.key) }), ...makeQuestions('meaning', 4, { keys: D.vocabList.slice(0, 80).map(w => w.key) })];
    runQuiz(el, [{ name: '程度評估', qs }], {
      onDone: ({ results }) => {
        const kana = results.slice(0, 4).filter(r => r.ok).length, voc = results.slice(4).filter(r => r.ok).length;
        a.suggested = kana >= 3 && voc >= 3 ? 'some' : kana >= 3 ? 'kana' : 'zero';
        a.level = a.suggested;
        // 評估題不列入錯題與統計
        Object.keys(S().wrong).forEach(k => { if (qs.some(q => q.id === k)) delete S().wrong[k]; });
        S().stats = {}; save();
        render();
      },
      onExit: render,
    });
  }

  el.onclick = e => {
    if (e.target.closest('[data-next]')) { a.step++; render(); window.scrollTo(0, 0); return; }
    if (e.target.closest('[data-prev]')) { a.step--; render(); return; }
    const v = e.target.closest('[data-v]'); if (v) { a.level = v.dataset.v; render(); return; }
    const d = e.target.closest('[data-d]'); if (d && !e.target.closest('input')) { a.examDate = d.dataset.d === 'custom' ? (EXAM_OPTIONS.some(o => o.date === a.examDate) ? addDays(t, 180) : a.examDate) : d.dataset.d; render(); return; }
    const m = e.target.closest('[data-m]'); if (m) { a.dailyMinutes = m.dataset.m === 'custom' ? (a.dailyMinutes === 30 ? 20 : a.dailyMinutes) : +m.dataset.m; if (m.dataset.m === 'custom' && [10, 15, 30, 45, 60].includes(a.dailyMinutes)) a.dailyMinutes = 20; render(); return; }
    if (e.target.closest('[data-test]')) { placement(); return; }
    if (e.target.closest('[data-finish]')) {
      S().profile.onboarded = true;
      save(); replan(); petals(30);
      location.hash = '#/home';
    }
  };
  render();
}
