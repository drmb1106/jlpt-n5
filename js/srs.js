// 間隔重複（簡化版 SM-2）：依記憶程度安排下次複習
import { S, save, day } from './store.js';
import { todayKey, addDays } from './util.js';

export const GRADES = [
  { v: 0, label: '完全不會', next: '今天再看' },
  { v: 1, label: '有點印象', next: '明天' },
  { v: 2, label: '大致熟悉', next: '幾天後' },
  { v: 3, label: '已經掌握', next: '更久之後' },
];

// 熟悉度：0 未學、1 學習中、2 熟悉、3 已掌握
export function level(key) {
  const it = S().srs[key];
  if (!it) return 0;
  if (it.interval >= 7) return 3;
  if (it.interval >= 2) return 2;
  return 1;
}
export const isLearned = key => !!S().srs[key];

export function previewInterval(key, g) {
  const it = S().srs[key] || { reps: 0, interval: 0, ease: 2.5 };
  return calc({ ...it }, g).interval;
}

function calc(it, g) {
  if (g === 0) { it.interval = 0; it.ease = Math.max(1.3, it.ease - 0.2); it.lapses = (it.lapses || 0) + 1; it.reps = 0; }
  else if (g === 1) { it.interval = 1; it.ease = Math.max(1.3, it.ease - 0.15); it.reps++; }
  else if (g === 2) { it.interval = it.reps < 1 ? 2 : Math.max(it.interval + 1, Math.round(it.interval * it.ease)); it.reps++; }
  else { it.interval = it.reps < 1 ? 4 : Math.max(it.interval + 2, Math.round(it.interval * it.ease * 1.3)); it.ease = Math.min(3.2, it.ease + 0.1); it.reps++; }
  it.interval = Math.min(it.interval, 180);
  return it;
}

export function grade(key, g) {
  const s = S().srs;
  const isNew = !s[key];
  const it = calc(s[key] ? { ...s[key] } : { reps: 0, interval: 0, ease: 2.5, lapses: 0, first: todayKey() }, g);
  it.due = addDays(todayKey(), it.interval);
  it.last = todayKey();
  it.g = g;
  s[key] = it;
  const d = day();
  if (isNew) d.learned++; else d.reviewed++;
  save();
  return it;
}

// 測驗答錯：拉回今天複習
export function lapse(key) {
  const it = S().srs[key];
  if (!it) return;
  it.due = todayKey();
  it.interval = Math.min(it.interval, 1);
  it.lapses = (it.lapses || 0) + 1;
  it.ease = Math.max(1.3, it.ease - 0.15);
  save();
}

export function dueKeys(prefix = '') {
  const t = todayKey();
  return Object.entries(S().srs)
    .filter(([k, v]) => v.due <= t && k.startsWith(prefix))
    .sort((a, b) => a[1].due.localeCompare(b[1].due) || b[1].lapses - a[1].lapses)
    .map(([k]) => k);
}
