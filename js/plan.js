// 個人化學習計畫：依考試日、程度、每日時間，自動排出今天的任務
// 沒做完的內容會留在待學清單，隔天重新平均分配
import { S, save, day } from './store.js';
import { D } from './data.js';
import { todayKey, addDays, diffDays, clamp, pct } from './util.js';
import { dueKeys, isLearned } from './srs.js';

// 每一項大約花幾分鐘（用來換算每日份量）
export const COST = { review: 0.35, kana: 0.6, vocab: 1.0, kanji: 1.6, grammar: 7, practice: 5, quiz: 3 };

export const EXAM_OPTIONS = [
  { date: '2026-12-06', name: '2026 年 12 月' },
  { date: '2027-07-04', name: '2027 年 7 月' },
  { date: '2027-12-05', name: '2027 年 12 月' },
];

export function remaining() {
  const p = S().profile;
  const kana = p.level === 'zero' ? D.kanaList.filter(k => !isLearned(k.key)).map(k => k.key) : [];
  return {
    kana,
    vocab: D.vocabList.filter(w => !isLearned(w.key)).map(w => w.key),
    kanji: D.kanjiList.filter(k => !isLearned(k.key)).map(k => k.key),
    grammar: D.grammarList.filter(g => !S().grammar[g.id]).map(g => g.id),
  };
}

const hiraganaDone = () => S().profile.level !== 'zero' || D.kanaList.filter(k => k.script === 'h').every(k => isLearned(k.key));

function bufferDays(daysLeft) { return Math.min(14, Math.floor(daysLeft * 0.15)); }

export function todayPlan(force = false) {
  const t = todayKey();
  const d = day(t);
  if (d.plan && !force) return d.plan;
  const p = S().profile;
  const daysLeft = Math.max(0, diffDays(t, p.examDate));
  const studyDays = Math.max(1, daysLeft - bufferDays(daysLeft));
  const rem = remaining();
  const due = dueKeys().length;
  // 每天的複習量最多約占一半時間，多的留到之後（也可以在「複習」頁自己多做）
  const reviewN = Math.min(due, Math.max(20, Math.floor(p.dailyMinutes * 0.5 / COST.review)));
  const q = { kana: 0, vocab: 0, kanji: 0, grammar: 0 };
  const hira = hiraganaDone();

  // 先扣掉複習、練習、小測驗的時間，剩下的時間用來學新內容
  const practice = hira && (D.reading.length || D.listening.length);
  const fixed = reviewN * COST.review + (practice ? COST.practice : 0) + COST.quiz;
  let room = Math.max(p.dailyMinutes * 0.4, p.dailyMinutes - fixed);

  if (rem.kana.length) {
    // 假名：至少要在開始後約 10%（7–21 天）內學完，時間多就學快一點，每天最多 12 個
    const total = Math.max(14, diffDays(p.startDate, p.examDate));
    const kanaEnd = addDays(p.startDate, clamp(Math.round(total * 0.1), 7, 21));
    const even = Math.ceil(rem.kana.length / Math.max(1, diffDays(t, kanaEnd)));
    q.kana = Math.min(rem.kana.length, Math.max(5, even, Math.min(12, Math.floor(room / COST.kana))));
    room -= q.kana * COST.kana;
  }
  if (hira && room > 0) {
    if (rem.grammar.length) {
      const evenGap = Math.max(1, Math.floor(studyDays / rem.grammar.length));
      const budgetGap = room >= 22 ? 1 : room >= 12 ? 2 : 3;
      const dates = Object.values(S().grammar).map(g => g.date).sort();
      const last = dates[dates.length - 1];
      const gap = last ? diffDays(last, t) : 99;
      if (gap >= Math.min(evenGap, budgetGap) && room >= 5) { q.grammar = 1; room -= COST.grammar; }
    }
    room = Math.max(room, 2);
    const vCost = rem.vocab.length * COST.vocab, kCost = rem.kanji.length * COST.kanji;
    const share = vCost + kCost ? vCost / (vCost + kCost) : 0;
    const evenV = Math.ceil(rem.vocab.length / studyDays), evenK = Math.ceil(rem.kanji.length / studyDays);
    q.vocab = Math.min(rem.vocab.length, 20, Math.max(evenV, Math.floor(room * share / COST.vocab)));
    q.kanji = Math.min(rem.kanji.length, 8, Math.max(evenK, Math.floor(room * (1 - share) / COST.kanji)));
    const variable = q.vocab * COST.vocab + q.kanji * COST.kanji;
    if (variable > room) {
      const f = room / variable;
      if (q.vocab) q.vocab = Math.max(1, Math.floor(q.vocab * f));
      if (q.kanji) q.kanji = Math.max(rem.kanji.length ? 1 : 0, Math.floor(q.kanji * f));
    }
  }

  const tasks = [];
  if (reviewN) tasks.push({ id: 'review', n: reviewN, due });
  if (q.kana) tasks.push({ id: 'kana', keys: rem.kana.slice(0, q.kana) });
  if (q.vocab) tasks.push({ id: 'vocab', keys: rem.vocab.slice(0, q.vocab) });
  if (q.kanji) tasks.push({ id: 'kanji', keys: rem.kanji.slice(0, q.kanji) });
  if (q.grammar) tasks.push({ id: 'grammar', ids: rem.grammar.slice(0, q.grammar) });
  if (practice) {
    const n = diffDays(p.startDate, t);
    const order = n % 2 ? ['listening', 'reading'] : ['reading', 'listening'];
    for (const kind of order) {
      const list = D[kind];
      const next = list.find(x => !S().practice[x.id]) || list[n % list.length];
      if (next) { tasks.push({ id: 'practice', kind, ref: next.id }); break; }
    }
  }
  tasks.push({ id: 'quiz' });

  const minutes = Math.round(reviewN * COST.review + q.kana * COST.kana + q.vocab * COST.vocab + q.kanji * COST.kanji + q.grammar * COST.grammar + (practice ? COST.practice : 0) + COST.quiz);
  d.plan = { date: t, tasks, minutes };
  save();
  return d.plan;
}

export function forecast() {
  const p = S().profile, t = todayKey(), rem = remaining();
  const newCost = rem.kana.length * COST.kana + rem.vocab.length * COST.vocab + rem.kanji.length * COST.kanji + rem.grammar.length * COST.grammar;
  // 約四成時間會花在複習、練習與測驗上
  const perDay = Math.max(3, p.dailyMinutes * 0.6 - 3);
  const days = Math.ceil(newCost / perDay);
  const daysLeft = Math.max(0, diffDays(t, p.examDate));
  const target = addDays(p.examDate, -bufferDays(daysLeft));
  const studyDays = Math.max(1, daysLeft - bufferDays(daysLeft));
  const needMinutes = Math.ceil((newCost / studyDays + 3) / 0.6);
  const finish = addDays(t, days);
  return { finish, target, onTrack: finish <= target, needMinutes, daysLeft, done: newCost === 0 };
}

export function progress() {
  const p = S().profile;
  const parts = [
    ...(p.level === 'zero' ? D.kanaList.map(k => [k.key, COST.kana]) : []),
    ...D.vocabList.map(w => [w.key, COST.vocab]),
    ...D.kanjiList.map(k => [k.key, COST.kanji]),
  ];
  let tot = 0, got = 0;
  for (const [k, c] of parts) { tot += c; if (isLearned(k)) got += c; }
  for (const g of D.grammarList) { tot += COST.grammar; if (S().grammar[g.id]) got += COST.grammar; }
  return pct(got, tot);
}

export function markTask(id) {
  const d = day();
  d.done[id] = true;
  save();
}

export function streak() {
  const t = todayKey();
  const active = k => { const d = S().daily[k]; return d && (d.sec >= 60 || Object.keys(d.done || {}).length > 0 || d.learned > 0); };
  let n = 0, k = active(t) ? t : addDays(t, -1);
  while (active(k)) { n++; k = addDays(k, -1); }
  return n;
}

// 新的一天或設定改變時重新排計畫
export function replan() { const d = day(); delete d.plan; save(); return todayPlan(true); }
