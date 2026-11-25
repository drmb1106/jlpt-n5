// 教材資料：從 data/<level>/*.json 載入並建立索引
export const D = {};
const FILES = ['kana', 'vocab', 'kanji', 'grammar', 'reading', 'listening', 'questions', 'daily'];

export async function loadData(level = 'n5') {
  const res = await Promise.all(FILES.map(f =>
    fetch(`data/${level}/${f}.json`).then(r => { if (!r.ok) throw new Error(`${f}.json 載入失敗`); return r.json(); })));
  FILES.forEach((f, i) => { D[f] = res[i]; });
  buildIndex();
}

export const KANA_GROUPS = [
  { id: 'seion', name: '清音' },
  { id: 'dakuon', name: '濁音・半濁音' },
  { id: 'yoon', name: '拗音' },
];

function buildIndex() {
  D.items = new Map();
  D.kanaList = [];
  for (const script of ['hiragana', 'katakana']) {
    const s = script[0];
    for (const g of KANA_GROUPS) {
      for (const row of D.kana[script][g.id]) {
        for (const cell of row) {
          if (!cell) continue;
          const it = { key: `kana:${s}:${cell[0]}`, type: 'kana', kana: cell[0], ro: cell[1], script: s, group: g.id };
          D.kanaList.push(it); D.items.set(it.key, it);
        }
      }
    }
  }
  D.vocabList = D.vocab.words.map(w => ({ ...w, key: `v:${w.id}`, type: 'vocab' }));
  D.vocabList.forEach(w => D.items.set(w.key, w));
  D.catName = Object.fromEntries(D.vocab.categories.map(c => [c.id, c.name]));
  D.kanjiList = D.kanji.map(k => ({ ...k, key: `k:${k.k}`, type: 'kanji' }));
  D.kanjiList.forEach(k => D.items.set(k.key, k));
  D.grammarList = D.grammar.map(g => ({ ...g, key: `g:${g.id}`, type: 'grammar' }));
  D.grammarList.forEach(g => D.items.set(g.key, g));
}

export const item = key => D.items.get(key);
export const TYPE_NAME = { kana: '假名', vocab: '單字', kanji: '漢字', grammar: '文法' };
