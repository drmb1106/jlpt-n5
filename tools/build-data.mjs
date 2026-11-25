// 把 data/src/vocab.txt 轉成 data/n5/vocab.json，並檢查格式
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../data/src/vocab.txt', import.meta.url), 'utf8');
const categories = [], words = [], seen = new Set();
let cat = null, line = 0;
for (const raw of src.split('\n')) {
  line++;
  const l = raw.trim();
  if (!l || l.startsWith('#')) continue;
  if (l.startsWith('@')) { const [id, ...name] = l.slice(1).split(' '); cat = id; categories.push({ id, name: name.join(' ') }); continue; }
  const f = l.split('|');
  if (f.length < 6 || f.length > 7) throw new Error(`第 ${line} 行欄位數錯誤：${l}`);
  const [w, r, m, pos, ex, exm, note] = f;
  if (!/^[぀-ゟ゠-ヿー]+$/.test(r)) throw new Error(`第 ${line} 行讀音不是假名：${r}`);
  const id = `${w}_${r}`;
  if (seen.has(id)) throw new Error(`第 ${line} 行重複：${id}`);
  seen.add(id);
  if (ex && !ex.includes(w) && !/動詞/.test(pos)) console.warn(`提醒 第 ${line} 行：例句沒有出現「${w}」`);
  words.push({ id, w, r, m, pos, c: cat, ex, exm, ...(note ? { note } : {}) });
}
fs.writeFileSync(new URL('../data/n5/vocab.json', import.meta.url), JSON.stringify({ categories, words }));
console.log(`單字 ${words.length} 個，分類 ${categories.length} 個`);

// 漢字
const ksrc = fs.readFileSync(new URL('../data/src/kanji.txt', import.meta.url), 'utf8');
const kanji = [];
const kseen = new Set();
ksrc.split('\n').forEach((raw, i) => {
  const l = raw.trim();
  if (!l || l.startsWith('#')) return;
  const f = l.split('|');
  if (f.length !== 5) throw new Error(`kanji 第 ${i + 1} 行欄位數錯誤`);
  const [k, on, kun, m, ws] = f;
  if (kseen.has(k)) throw new Error(`kanji 重複：${k}`);
  kseen.add(k);
  const words = ws.split(';').filter(Boolean).map(x => { const [w, r, mm] = x.split(':'); if (!w || !r || !mm) throw new Error(`kanji ${k} 詞彙格式錯誤：${x}`); if (!w.includes(k)) throw new Error(`kanji ${k} 詞彙不含該字：${w}`); return { w, r, m: mm }; });
  kanji.push({ k, on: on ? on.split('、') : [], kun: kun ? kun.split('、') : [], m, words });
});
fs.writeFileSync(new URL('../data/n5/kanji.json', import.meta.url), JSON.stringify(kanji));
console.log(`漢字 ${kanji.length} 個`);
