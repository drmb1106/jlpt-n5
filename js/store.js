// 學習紀錄：全部存在這台裝置（localStorage），可匯出／匯入備份
import { todayKey } from './util.js';

const KEY = 'jlpt-app.v1';
export const SCHEMA = 1;

const fresh = () => ({
  schema: SCHEMA,
  app: 'jlpt-study',
  level: 'N5',
  profile: null,          // {level, examDate, dailyMinutes, startDate, onboarded}
  srs: {},                // key -> {due, interval, ease, reps, lapses, last, g, first}
  grammar: {},            // id -> {mastery 0-3, date}
  stats: {},              // 題型 -> {right, wrong}
  wrong: {},              // 題目id -> 題目快照 + {count, added}
  favorites: {},          // key -> 收藏日期
  daily: {},              // YYYY-MM-DD -> {sec, done:{}, plan, learned, reviewed, answered, correct}
  quizLog: [],            // 測驗紀錄
  practice: {},           // 閱讀／聽力題組 id -> 完成日期
  settings: { rate: 1, voiceURI: '', autoplay: true },
});

let state = fresh();
export const S = () => state;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = migrate(JSON.parse(raw));
  } catch (e) { console.warn('讀取紀錄失敗', e); state = fresh(); }
  try { navigator.storage?.persist?.(); } catch (e) { /* ignore */ }
  return state;
}

function migrate(obj) {
  const base = fresh();
  const s = Object.assign(base, obj);
  s.settings = Object.assign(fresh().settings, obj.settings || {});
  s.schema = SCHEMA;
  return s;
}

let warned = false;
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch (e) {
    if (!warned) { warned = true; alert('儲存失敗：裝置空間不足或瀏覽器禁止儲存。建議先到「我的 › 資料備份」匯出紀錄。'); }
    return false;
  }
}

export function day(k = todayKey()) {
  const d = state.daily[k] || (state.daily[k] = { sec: 0, done: {}, learned: 0, reviewed: 0, answered: 0, correct: 0 });
  d.done = d.done || {};
  return d;
}

export function exportJSON() {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 1);
}

export function importJSON(text) {
  const obj = JSON.parse(text);
  if (!obj || obj.app !== 'jlpt-study' || typeof obj.srs !== 'object') throw new Error('這不是本 App 的備份檔');
  state = migrate(obj);
  save();
}

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  state = fresh();
}
