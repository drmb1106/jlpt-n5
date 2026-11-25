// 題目產生：所有題目皆為本 App 自編，依 N5 題型設計，非 JLPT 官方試題
import { D } from './data.js';
import { esc, shuffle, sample, uniq } from './util.js';
import { isLearned } from './srs.js';

export const QTYPES = {
  kana:        { name: '假名辨識', sec: '基礎練習', inst: '這個假名怎麼唸？' },
  meaning:     { name: '單字意思', sec: '基礎練習', inst: '選出正確的中文意思。' },
  'kanji-read':{ name: '漢字讀法', sec: '文字・語彙', inst: '＿＿＿の ことばは ひらがなで どう かきますか。' },
  orthography: { name: '表記', sec: '文字・語彙', inst: '＿＿＿の ことばは どう かきますか。' },
  context:     { name: '文脈規定', sec: '文字・語彙', inst: '（　）に なにを いれますか。' },
  paraphrase:  { name: '言い換え類義', sec: '文字・語彙', inst: '＿＿＿の ぶんと だいたい おなじ いみの ぶんが あります。' },
  grammar:     { name: '文法', sec: '文法', inst: '（　）に 何を 入れますか。' },
  reading:     { name: '讀解', sec: '讀解', inst: 'つぎの ぶんを よんで、しつもんに こたえて ください。' },
  listening:   { name: '聽解', sec: '聽解', inst: 'おんせいを きいて、ただしい こたえを えらんで ください。' },
};

const HAS_KANJI = /[一-鿿々]/;
const finish = (q, correct, distract) => {
  const opts = shuffle([correct, ...distract.slice(0, 3)]);
  return { ...q, opts, a: opts.indexOf(correct) };
};

// ---------- 假名 ----------
function genKana(it) {
  const others = uniq(D.kanaList.filter(k => k.script === it.script && k.ro !== it.ro).map(k => k.ro));
  const similarLen = others.filter(r => Math.abs(r.length - it.ro.length) <= 1);
  return finish({
    id: `kn:${it.key}`, type: 'kana', ref: it.key, say: it.kana,
    stem: `<div class="center" style="font-size:64px;line-height:1.3" lang="ja">${esc(it.kana)}</div>`,
    exp: `「${esc(it.kana)}」讀作 <b>${esc(it.ro)}</b>。`,
  }, it.ro, sample(similarLen.length >= 3 ? similarLen : others, 3));
}

// ---------- 單字意思 ----------
function genMeaning(w) {
  const pool = uniq(D.vocabList.filter(x => x.m !== w.m && x.w !== w.w && x.pos === w.pos).map(x => x.m));
  const pool2 = pool.length >= 3 ? pool : uniq(D.vocabList.filter(x => x.m !== w.m).map(x => x.m));
  return finish({
    id: `mn:${w.id}`, type: 'meaning', ref: w.key, say: w.r,
    stem: `<div class="center"><div style="font-size:40px" lang="ja">${esc(w.w)}</div>${w.w !== w.r ? `<div class="faint" lang="ja">${esc(w.r)}</div>` : ''}</div>`,
    exp: `「${esc(w.w)}」（${esc(w.r)}）的意思是「${esc(w.m)}」。`,
  }, w.m, sample(pool2, 3));
}

// ---------- 漢字讀法 ----------
const DAKU = { か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ', た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど', は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ' };
const UNDAKU = Object.fromEntries(Object.entries(DAKU).map(([a, b]) => [b, a]));
const O_ROW = 'おこごそぞとどのほぼぽもよろょ';
function variants(r) {
  const out = new Set();
  [...r].forEach((ch, i) => {
    if (DAKU[ch] && ch !== 'ち' && ch !== 'つ') out.add(r.slice(0, i) + DAKU[ch] + r.slice(i + 1));
    if (UNDAKU[ch] && ch !== 'ぢ' && ch !== 'づ') out.add(r.slice(0, i) + UNDAKU[ch] + r.slice(i + 1));
  });
  if (r.includes('っ')) out.add(r.replace('っ', ''));
  const tsuAt = [...r].findIndex((ch, i) => i > 0 && i < r.length - 1 && 'かきくけこさしすせそたちつてとぱぴぷぺぽ'.includes(r[i + 1]) && !'っんー'.includes(ch));
  if (tsuAt > -1 && !r.includes('っ')) out.add(r.slice(0, tsuAt + 1) + 'っ' + r.slice(tsuAt + 1));
  const longU = [...r].findIndex((ch, i) => ch === 'う' && i > 0 && O_ROW.includes(r[i - 1]));
  if (longU > -1) out.add(r.slice(0, longU) + r.slice(longU + 1));
  else { const oi = [...r].findIndex(ch => O_ROW.includes(ch)); if (oi > -1 && oi < r.length - 1) out.add(r.slice(0, oi + 1) + 'う' + r.slice(oi + 1)); }
  out.delete(r);
  return [...out].filter(x => x.length > 0);
}
const readingsOf = w => new Set(D.vocabList.filter(x => x.w === w).map(x => x.r));

function underlineIn(ex, word, shown) {
  if (ex && ex.includes(word)) return esc(ex).replace(esc(word), `<u>${esc(shown)}</u>`);
  return `<u>${esc(shown)}</u>`;
}

function genKanjiRead(w) {
  const bad = readingsOf(w.w);
  const vs = variants(w.r).filter(x => !bad.has(x));
  const others = shuffle(D.vocabList.filter(x => !bad.has(x.r) && Math.abs(x.r.length - w.r.length) <= 1 && x.r !== w.r)).map(x => x.r);
  const dis = uniq([...sample(vs, 2), ...others]).filter(x => !bad.has(x)).slice(0, 3);
  const real = dis.map(r => D.vocabList.find(x => x.r === r && x.w !== w.w)).filter(Boolean);
  return finish({
    id: `kr:${w.id}`, type: 'kanji-read', ref: w.key, say: w.r,
    stem: underlineIn(w.ex, w.w, w.w),
    exp: `「${esc(w.w)}」讀作「${esc(w.r)}」，意思是「${esc(w.m)}」。` + (real.length ? `<br>其他選項：${real.map(x => `${esc(x.r)}＝${esc(x.w)}（${esc(x.m)}）`).join('、')}。` : ''),
  }, w.r, dis);
}

// ---------- 表記 ----------
const SIMILAR = [['目', '見', '貝', '自', '月', '日', '白'], ['休', '体', '木', '本'], ['右', '石', '左'], ['人', '入', '八'], ['土', '士', '上', '工'], ['天', '夫', '大', '犬', '太'],
  ['千', '干', '十'], ['午', '牛', '年'], ['王', '玉', '主'], ['気', '汽', '元'], ['買', '売', '貝'], ['読', '話', '語', '説'], ['聞', '間', '開', '門', '閉'], ['書', '昼', '晝', '画'],
  ['行', '待', '往'], ['来', '米', '未', '末'], ['田', '由', '甲', '申', '電'], ['川', '州', '三'], ['長', '帳', '張'], ['先', '洗', '生'], ['校', '交', '学'], ['会', '今', '合'],
  ['食', '飲', '館'], ['北', '比', '化'], ['東', '車', '束'], ['西', '四', '酉'], ['南', '同', '内'], ['出', '山', '凸'], ['男', '田', '町'], ['女', '安', '好'], ['雨', '電', '雪'],
  ['新', '親', '近'], ['古', '右', '吉'], ['高', '京', '亭'], ['小', '少', '水'], ['中', '申', '虫'], ['外', '夕', '名'], ['前', '首', '道'], ['後', '役', '復'], ['毎', '海', '母'], ['週', '道', '過'],
  ['駅', '馬', '験'], ['国', '困', '固'], ['円', '内', '丹'], ['分', '今', '父'], ['半', '平', '羊'], ['何', '可', '荷'], ['時', '持', '特'], ['友', '反', '左'], ['手', '毛', '牛'], ['足', '走', '定']];
const simMap = new Map();
SIMILAR.forEach(g => g.forEach(c => simMap.set(c, (simMap.get(c) || []).concat(g.filter(x => x !== c)))));

function genOrtho(w) {
  const fakes = new Set();
  [...w.w].forEach((ch, i) => (simMap.get(ch) || []).forEach(s => fakes.add(w.w.slice(0, i) + s + w.w.slice(i + 1))));
  const realW = new Set(D.vocabList.filter(x => x.r === w.r).map(x => x.w));
  const fake = [...fakes].filter(x => !realW.has(x));
  const sameLen = shuffle(D.vocabList.filter(x => HAS_KANJI.test(x.w) && x.r !== w.r && x.w.length === w.w.length && !realW.has(x.w))).map(x => x.w);
  const dis = uniq([...sample(fake, 3), ...sameLen]).slice(0, 3);
  return finish({
    id: `or:${w.id}`, type: 'orthography', ref: w.key, say: w.r,
    stem: underlineIn(w.ex, w.w, w.r).replace(esc(w.w), esc(w.r)),
    exp: `「${esc(w.r)}」寫作「${esc(w.w)}」，意思是「${esc(w.m)}」。注意字形相近的漢字。`,
  }, w.w, dis);
}

// ---------- 手寫題（文脈規定、言い換え、文法、讀解、聽解） ----------
const fromFixed = (q, type) => finish({ id: q.id, type, stem: esc(q.q).replace(/＿(.+?)＿/g, '<u>$1</u>'), exp: q.exp }, q.opts[q.a], q.opts.filter((_, i) => i !== q.a));

export function grammarQs(gid) {
  const gs = gid ? D.grammarList.filter(g => g.id === gid) : D.grammarList;
  return gs.flatMap(g => g.quiz.map((q, i) => finish({ id: `gq:${g.id}:${i}`, type: 'grammar', ref: g.key, stem: esc(q.q).replace(/＿(.+?)＿/g, '<u>$1</u>').replace('★', '<b style="color:var(--primary)">★</b>'), exp: q.exp, gname: g.t, inst: q.inst }, q.opts[q.a], q.opts.filter((_, k) => k !== q.a))));
}
export function readingQs(id) {
  const ps = id ? D.reading.filter(r => r.id === id) : D.reading;
  return ps.flatMap(p => p.qs.map((q, i) => ({ id: `rd:${p.id}:${i}`, type: 'reading', passage: p.text, title: p.title, stem: esc(q.q), opts: q.opts, a: q.a, exp: q.exp, pid: p.id })));
}
export function listeningQs(id) {
  const ls = id ? D.listening.filter(l => l.id === id) : D.listening;
  return ls.map(l => finish({ id: `ls:${l.id}`, type: 'listening', audio: l.lines, situation: l.situation, stem: esc(l.q), exp: l.exp, pid: l.id, part: l.type }, l.opts[l.a], l.opts.filter((_, k) => k !== l.a)));
}

// ---------- 對外 ----------
const vocabFor = (type, onlyLearned) => {
  let v = D.vocabList;
  if (type === 'kanji-read' || type === 'orthography') v = v.filter(w => HAS_KANJI.test(w.w));
  if (onlyLearned) { const l = v.filter(w => isLearned(w.key)); if (l.length >= 8) v = l; }
  return v;
};

export function makeQuestions(type, n, { onlyLearned = false, keys = null } = {}) {
  switch (type) {
    case 'kana': {
      let pool = keys ? keys.map(k => D.items.get(k)).filter(x => x?.type === 'kana') : D.kanaList;
      if (onlyLearned && !keys) { const l = pool.filter(k => isLearned(k.key)); if (l.length >= 8) pool = l; }
      return sample(pool, n).map(genKana);
    }
    case 'meaning': return sample(keys ? keys.map(k => D.items.get(k)).filter(x => x?.type === 'vocab') : vocabFor(type, onlyLearned), n).map(genMeaning);
    case 'kanji-read': return sample(vocabFor(type, onlyLearned), n).map(genKanjiRead);
    case 'orthography': return sample(vocabFor(type, onlyLearned), n).map(genOrtho);
    case 'context': return sample(D.questions.context, n).map(q => fromFixed(q, 'context'));
    case 'paraphrase': return sample(D.questions.paraphrase, n).map(q => fromFixed(q, 'paraphrase'));
    case 'grammar': {
      let all = grammarQs();
      if (onlyLearned) { const l = all.filter(q => isLearned(q.ref)); if (l.length >= 5) all = l; }
      return sample(all, n);
    }
    case 'reading': return pickGroups(readingQs(), n);
    case 'listening': return sample(listeningQs(), n);
    default: return [];
  }
}

// 讀解題同一篇文章的題目放在一起
function pickGroups(qs, n) {
  const groups = shuffle(uniq(qs.map(q => q.pid)));
  const out = [];
  for (const g of groups) { if (out.length >= n) break; out.push(...qs.filter(q => q.pid === g)); }
  return out;
}

// 依今天學過的內容出小測驗
export function quizForKeys(keys, n = 5) {
  const items = keys.map(k => D.items.get(k)).filter(Boolean);
  const qs = [];
  for (const it of shuffle(items)) {
    if (qs.length >= n) break;
    if (it.type === 'kana') qs.push(genKana(it));
    else if (it.type === 'vocab') qs.push(HAS_KANJI.test(it.w) && Math.random() < .5 ? genKanjiRead(it) : genMeaning(it));
    else if (it.type === 'kanji') { const w = D.vocabList.find(v => v.w.includes(it.k) && HAS_KANJI.test(v.w)); if (w) qs.push(genKanjiRead(w)); }
    else if (it.type === 'grammar') { const g = grammarQs(it.id); if (g.length) qs.push(sample(g, 1)[0]); }
  }
  return qs;
}

// 模擬考：題型與時間參考 N5 官方說明，題數依本 App 題庫安排
export function buildMock() {
  return [
    { name: '言語知識（文字・語彙）', minutes: 20, qs: [...makeQuestions('kanji-read', 7), ...makeQuestions('orthography', 5), ...makeQuestions('context', 6), ...makeQuestions('paraphrase', 3)] },
    { name: '言語知識（文法）・讀解', minutes: 40, qs: [...makeQuestions('grammar', 13), ...pickGroups(readingQs(), 6)] },
    { name: '聽解', minutes: 30, qs: makeQuestions('listening', 12) },
  ];
}
