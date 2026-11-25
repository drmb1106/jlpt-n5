// 我的：學習日曆、成果統計、目標設定、語音設定、資料備份
import { S, save, exportJSON, importJSON, resetAll } from '../store.js';
import { D } from '../data.js';
import { level } from '../srs.js';
import { replan, forecast, streak, EXAM_OPTIONS } from '../plan.js';
import { QTYPES } from '../quizgen.js';
import { voices, hasJa, supported, speak, onVoices, voicesReady } from '../tts.js';
import { esc, todayKey, addDays, keyOf, parseKey, fmtDate, fmtMD, weekday, pct, fmtMin, diffDays } from '../util.js';
import { bar, toast, confirmBox } from '../ui.js';

let calMonth = null;

export function meView(el) {
  const s = S(), p = s.profile, t = todayKey();
  if (!calMonth) calMonth = t.slice(0, 7);
  const days7 = [...Array(7)].map((_, i) => addDays(t, i - 6));
  const mins7 = days7.map(k => Math.round((s.daily[k]?.sec || 0) / 60));
  const max7 = Math.max(10, ...mins7);
  const weekTotal = mins7.reduce((a, b) => a + b, 0);
  const allSec = Object.values(s.daily).reduce((a, d) => a + (d.sec || 0), 0);
  const fc = forecast();
  const mastery = [
    ['假名', D.kanaList], ['單字', D.vocabList], ['漢字', D.kanjiList], ['文法', D.grammarList],
  ].map(([n, list]) => ({ n, tot: list.length, l: list.filter(x => s.srs[x.key]).length, m: list.filter(x => level(x.key) === 3).length }));
  const acc = Object.entries(s.stats).filter(([, v]) => v.right + v.wrong > 0).map(([k, v]) => ({ k, n: v.right + v.wrong, p: pct(v.right, v.right + v.wrong) })).sort((a, b) => a.p - b.p);
  const weakItems = Object.entries(s.srs).filter(([, v]) => v.lapses >= 2).sort((a, b) => b[1].lapses - a[1].lapses).slice(0, 8);

  el.innerHTML = `<div class="page-head"><h1>我的</h1><span class="sub">連續 ${streak()} 天</span></div>

  <h2 class="sec" style="margin-top:6px">學習日曆</h2>
  <div class="card">${calendar(calMonth)}</div>

  <h2 class="sec">學習時間 <small>近 7 天共 ${weekTotal} 分・累計 ${fmtMin(allSec)}</small></h2>
  <div class="card"><div class="chart">${days7.map((k, i) => `<div class="col ${k === t ? 'today' : ''}"><span class="v">${mins7[i] || ''}</span><div class="b" style="height:${mins7[i] / max7 * 100}%"></div><span class="l">${k === t ? '今' : weekday(k)}</span></div>`).join('')}</div>
    <p class="tiny faint" style="margin-top:8px">每日目標 ${p.dailyMinutes} 分鐘。畫面開著並有操作時才計時。</p></div>

  <h2 class="sec">掌握程度</h2>
  <div class="card"><table class="tbl"><tr><th></th><th class="num">已學</th><th class="num">已掌握</th><th style="width:38%"></th></tr>
    ${mastery.map(x => `<tr><td>${x.n}</td><td class="num">${x.l}/${x.tot}</td><td class="num">${x.m}</td><td>${bar(pct(x.l, x.tot), 'thin')}</td></tr>`).join('')}</table>
    <p class="tiny faint" style="margin-top:8px">「已掌握」＝複習間隔達 7 天以上。</p></div>

  <h2 class="sec">答題正確率與弱點</h2>
  <div class="card">${acc.length ? `<table class="tbl">${acc.map(a => `<tr><td>${QTYPES[a.k]?.name || a.k}</td><td class="num faint">${a.n} 題</td><td class="num"><b style="color:${a.p >= 70 ? 'var(--matcha)' : 'var(--red)'}">${a.p}%</b></td></tr>`).join('')}</table>
    ${acc[0].p < 70 ? `<div class="notice red" style="margin-top:10px">最需要加強：<b>${QTYPES[acc[0].k]?.name}</b>（正確率 ${acc[0].p}%）。建議到「測驗」做這類題目，或到「錯題筆記」重練。</div>` : '<div class="notice green" style="margin-top:10px">各題型都在 70% 以上，保持下去！</div>'}`
    : '<p class="small faint">做過測驗之後，這裡會顯示各題型的正確率。</p>'}
    ${weakItems.length ? `<h3 style="font-size:14px;margin-top:14px">常忘記的內容</h3><div class="row wrap" style="margin-top:6px">${weakItems.map(([k, v]) => { const it = D.items.get(k); if (!it) return ''; const label = it.w || it.k || it.t || it.kana; return `<span class="chip red" lang="ja">${esc(label)} ×${v.lapses}</span>`; }).join('')}</div>` : ''}</div>

  <h2 class="sec">學習目標</h2>
  <div class="card">
    <div class="small muted">考試日：<b>${fmtDate(p.examDate)}</b>（剩 ${Math.max(0, diffDays(t, p.examDate))} 天）・每天 <b>${p.dailyMinutes}</b> 分鐘</div>
    <div class="small muted" style="margin-top:2px">${fc.done ? '新內容已全部學完' : `預計 ${fmtDate(fc.finish)} 學完新內容${fc.onTrack ? '，進度來得及 👍' : `，建議每天約 ${fc.needMinutes} 分鐘`}`}</div>
    <label class="field"><span>考試日期</span><select class="input" id="exam">${EXAM_OPTIONS.map(o => `<option value="${o.date}" ${o.date === p.examDate ? 'selected' : ''}>${o.name}（${fmtDate(o.date)}）</option>`).join('')}<option value="custom" ${EXAM_OPTIONS.some(o => o.date === p.examDate) ? '' : 'selected'}>自訂日期</option></select></label>
    <input type="date" class="input" id="examCustom" style="margin-top:8px;${EXAM_OPTIONS.some(o => o.date === p.examDate) ? 'display:none' : ''}" value="${p.examDate}" min="${addDays(t, 7)}">
    <label class="field"><span>每天學習時間</span><select class="input" id="mins">${[10, 15, 30, 45, 60, 90].map(m => `<option value="${m}" ${m === p.dailyMinutes ? 'selected' : ''}>${m} 分鐘</option>`).join('')}${[10, 15, 30, 45, 60, 90].includes(p.dailyMinutes) ? '' : `<option value="${p.dailyMinutes}" selected>${p.dailyMinutes} 分鐘（自訂）</option>`}</select></label>
    <label class="field"><span>目前程度</span><select class="input" id="lvl"><option value="zero" ${p.level === 'zero' ? 'selected' : ''}>完全零基礎（從五十音開始）</option><option value="kana" ${p.level === 'kana' ? 'selected' : ''}>學過五十音</option><option value="some" ${p.level === 'some' ? 'selected' : ''}>有一點基礎</option></select></label>
    <button class="btn block" style="margin-top:14px" data-savegoal>儲存並重新安排計畫</button>
    <p class="tiny faint" style="margin-top:8px">考試日期請以 JLPT 台灣主辦單位（LTTC 語言訓練測驗中心）公告為準。</p>
  </div>

  <h2 class="sec">語音設定</h2>
  <div class="card" id="voicecard"></div>

  <h2 class="sec">資料備份</h2>
  <div class="card">
    <p class="small muted">學習紀錄只存在這台裝置上。換手機、清除 Safari 資料前，請先匯出備份。</p>
    <div class="grid2" style="margin-top:12px"><button class="btn soft" data-export>匯出備份</button><label class="btn soft" style="cursor:pointer">匯入備份<input type="file" accept="application/json,.json" id="importFile" hidden></label></div>
    <button class="btn ghost block" style="margin-top:10px;color:var(--red)" data-reset>重設所有學習紀錄</button>
    ${s.lastBackup ? `<p class="tiny faint" style="margin-top:8px">上次匯出：${s.lastBackup}</p>` : ''}
  </div>

  <h2 class="sec">安裝到 iPhone 主畫面</h2>
  <div class="card prose small">
    <p>1. 用 <b>Safari</b> 開啟本網站。</p><p>2. 點下方的「分享」按鈕（方框加向上箭頭）。</p><p>3. 選「加入主畫面」，再按「新增」。</p><p>之後從主畫面開啟，就會像一般 App 一樣全螢幕使用，已下載的教材也能離線學習。</p>
  </div>

  <h2 class="sec">關於</h2>
  <div class="card prose small">
    <p>本 App 的測驗與模擬考題目均為<b>自編練習題</b>，依照 JLPT N5 題型設計，並非官方考古題。官方說明與範例題請見 <a href="https://www.jlpt.jp/tw/" target="_blank" rel="noopener">JLPT 官方網站</a>。</p>
    <p>漢字筆順資料：KanjiVG（Ulrich Apel，CC BY-SA 3.0）。</p>
    <p>教材：${D.kanaList.length} 個假名、${D.vocabList.length} 個單字、${D.kanjiList.length} 個漢字、${D.grammarList.length} 課文法、${D.reading.length} 篇閱讀、${D.listening.length} 段聽力。</p>
  </div>`;

  renderVoice(el.querySelector('#voicecard'));
  const off = onVoices(() => { const c = document.getElementById('voicecard'); if (c) renderVoice(c); else off(); });

  el.querySelector('#exam').onchange = e => { el.querySelector('#examCustom').style.display = e.target.value === 'custom' ? '' : 'none'; };
  el.querySelector('#importFile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    if (!await confirmBox('匯入備份？', '匯入後會<b>取代</b>這台裝置上目前的學習紀錄。', '匯入')) { e.target.value = ''; return; }
    try { importJSON(await f.text()); toast('匯入完成'); meView(el); } catch (er) { toast('匯入失敗：' + er.message, 3500); }
  };
  el.onclick = async e => {
    const nav = e.target.closest('[data-cal]');
    if (nav) { const d = parseKey(calMonth + '-01'); d.setMonth(d.getMonth() + (+nav.dataset.cal)); calMonth = keyOf(d).slice(0, 7); meView(el); return; }
    if (e.target.closest('[data-savegoal]')) {
      let exam = el.querySelector('#exam').value;
      if (exam === 'custom') exam = el.querySelector('#examCustom').value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(exam) || diffDays(t, exam) < 7) { toast('考試日期至少要在 7 天之後'); return; }
      p.examDate = exam; p.dailyMinutes = +el.querySelector('#mins').value; p.level = el.querySelector('#lvl').value;
      save(); replan(); toast('已重新安排學習計畫'); meView(el); return;
    }
    if (e.target.closest('[data-export]')) { doExport(); return; }
    if (e.target.closest('[data-reset]')) {
      if (!await confirmBox('重設所有紀錄？', '所有學習進度、錯題、收藏都會<b>永久刪除</b>，而且無法復原。建議先匯出備份。', '繼續', true)) return;
      if (!await confirmBox('再確認一次', '真的要刪除全部學習紀錄嗎？', '永久刪除', true)) return;
      resetAll(); location.hash = '#/onboarding'; location.reload();
    }
  };
}

function calendar(ym) {
  const s = S(), t = todayKey();
  const first = parseKey(ym + '-01');
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const offset = first.getDay();
  let cells = '日一二三四五六'.split('').map(d => `<div class="wd">${d}</div>`).join('');
  for (let i = 0; i < offset; i++) cells += '<div></div>';
  for (let d = 1; d <= daysIn; d++) {
    const k = `${ym}-${String(d).padStart(2, '0')}`;
    const m = (s.daily[k]?.sec || 0) / 60;
    const lv = m >= s.profile.dailyMinutes ? 3 : m >= 10 ? 2 : m >= 1 || Object.keys(s.daily[k]?.done || {}).length ? 1 : 0;
    const cls = k === s.profile.examDate ? 'exam' : `l${lv}`;
    cells += `<div class="d ${cls} ${k === t ? 'today' : ''}" title="${k} ${Math.round(m)} 分">${k === s.profile.examDate ? '試' : d}</div>`;
  }
  return `<div class="row" style="justify-content:space-between;margin-bottom:10px"><button class="icon-btn" data-cal="-1" aria-label="上個月">‹</button><b>${first.getFullYear()} 年 ${first.getMonth() + 1} 月</b><button class="icon-btn" data-cal="1" aria-label="下個月">›</button></div>
    <div class="cal">${cells}</div>
    <div class="row tiny faint" style="margin-top:10px;gap:12px"><span><span class="dot" style="display:inline-block;background:#FCE1EA"></span> 有學習</span><span><span class="dot" style="display:inline-block;background:#F8BCD0"></span> 10 分以上</span><span><span class="dot" style="display:inline-block;background:var(--primary)"></span> 達成目標</span></div>`;
}

function renderVoice(box) {
  const s = S().settings;
  if (!supported()) { box.innerHTML = '<div class="notice red">這個瀏覽器不支援語音播放。請改用 iPhone 的 Safari 或電腦版 Chrome／Safari。</div>'; return; }
  const vs = voices();
  box.innerHTML = `${voicesReady() && !hasJa() ? `<div class="notice" style="margin-bottom:12px">這台裝置沒有日語語音。<br>iPhone／iPad：設定 › 輔助使用 › 朗讀內容 › 聲音 › 日文，下載任一日文聲音後重新開啟 App。<br>Mac：系統設定 › 輔助使用 › 朗讀內容 › 系統聲音 › 管理聲音，加入日文聲音。</div>` : ''}
    ${vs.length > 1 ? `<label class="field" style="margin-top:0"><span>聲音</span><select class="input" id="voiceSel">${vs.map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === s.voiceURI ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>` : vs.length ? `<p class="small muted">目前聲音：${esc(vs[0].name)}</p>` : ''}
    <label class="field"><span>語速：<b id="rateV">${s.rate.toFixed(1)}×</b></span><input type="range" min="0.6" max="1.2" step="0.1" value="${s.rate}" id="rate"></label>
    <label class="row small" style="margin-top:12px"><input type="checkbox" id="auto" ${s.autoplay ? 'checked' : ''}> 記憶卡翻面時自動播放發音</label>
    <button class="btn soft block" style="margin-top:12px" id="testVoice">試聽：はじめまして。どうぞ よろしく おねがいします。</button>`;
  box.querySelector('#voiceSel')?.addEventListener('change', e => { s.voiceURI = e.target.value; save(); });
  box.querySelector('#rate').oninput = e => { s.rate = +e.target.value; box.querySelector('#rateV').textContent = s.rate.toFixed(1) + '×'; save(); };
  box.querySelector('#auto').onchange = e => { s.autoplay = e.target.checked; save(); };
  box.querySelector('#testVoice').onclick = () => speak('はじめまして。どうぞ よろしく おねがいします。');
}

async function doExport() {
  const json = exportJSON();
  const name = `n5-backup-${todayKey()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  S().lastBackup = todayKey(); save();
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'N5 學習紀錄備份' }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('已匯出備份檔');
}
void fmtMD;
