# N5 日語學習 App

以通過 JLPT N5 為目標的個人化日語學習 PWA。純 HTML／CSS／JavaScript，不需要建置工具，可以直接部署到 GitHub Pages，用 iPhone Safari 加入主畫面使用。

## 功能

- **個人化計畫**：依考試日期、程度、每日分鐘數自動排出每日任務；沒做完的內容隔天自動重新分配。
- **五十音**：平假名、片假名（清音、濁音・半濁音、拗音），點擊發音、辨識測驗、聽音選字。
- **單字**：742 個 N5 單字，14 個分類，含假名、中文、詞性、例句、同形異義提醒。
- **漢字**：101 個 N5 漢字，音讀、訓讀、中文意思、常見詞彙、筆順動畫（KanjiVG）。
- **文法**：42 課，繁體中文解說、句型、使用情境、例句、常見錯誤、練習題。
- **閱讀／聽力**：8 篇短文、12 段對話（裝置內建日語語音，可調速、看逐字稿）。
- **智慧複習**：四段記憶程度（完全不會／有點印象／大致熟悉／已經掌握）的間隔重複。
- **測驗**：9 種題型的分類測驗、綜合測驗、三科分別計時的模擬考（換算分數＋及格判定）。
- **錯題筆記、收藏、學習日曆、學習時間、正確率與弱點分析**。
- **資料備份**：匯出／匯入 JSON、重設。紀錄只存在裝置的 localStorage，不需註冊。

> 所有測驗題目都是自編練習題，依 N5 題型設計，**不是 JLPT 官方考古題**。

## 檔案結構

```
index.html            App 入口
manifest.webmanifest  PWA 設定（名稱、圖示、顏色）
sw.js                 離線快取（更新程式後要改 VERSION）
css/app.css           樣式（櫻花粉主題）
js/
  main.js             路由、底部導覽、學習時間、Service Worker
  store.js            學習紀錄（localStorage）、匯出匯入
  srs.js              間隔重複
  plan.js             每日計畫、預計完成日
  quizgen.js          題目產生（自編）
  tts.js              日語語音
  ui.js               共用元件
  views/              各畫面（home、session、learn、review、quiz、me、onboarding、runners）
data/n5/*.json        N5 教材
data/src/             單字、漢字的原始文字檔
tools/build-data.mjs  把 data/src 轉成 JSON 並檢查格式
icons/                App 圖示
```

## 本機預覽

```bash
cd ~/Desktop/日檢App製作
python3 -m http.server 8000
```

打開 http://localhost:8000 。本機預設不啟用離線快取；網址加上 `?sw=1` 可測試離線功能，加上 `?date=2027-02-15` 可模擬日期。

## 修改教材

- 單字：編輯 `data/src/vocab.txt`（每行 `寫法|讀音|中文|詞性|例句|例句中文|注意`）
- 漢字：編輯 `data/src/kanji.txt`
- 改完執行 `node tools/build-data.mjs`，會重新產生 JSON 並檢查格式。
- 文法、閱讀、聽力、題庫直接編輯 `data/n5/` 裡的 JSON。
- 之後要擴充 N4 等級，新增 `data/n4/` 同樣結構的檔案即可（`loadData('n4')`）。

## 部署到 GitHub Pages

1. 在 GitHub 建立一個 **Public** repository（免費帳號的 Pages 需要公開）。
2. 把這個資料夾推上去（main 分支）。
3. Repository → **Settings → Pages** → Source 選 `Deploy from a branch`，Branch 選 `main`、資料夾 `/ (root)`，按 Save。
4. 約 1–2 分鐘後網址會是 `https://<帳號>.github.io/<repo 名稱>/`。

**更新程式後**：把 `sw.js` 最上面的 `VERSION` 改一個新號碼（例如 `n5-v1.0.1`），使用者下次開啟時會看到「有新版本」提示。

> 學習紀錄只存在使用者的裝置上，不會上傳到 GitHub。不要把個人備份檔（`n5-backup-*.json`）或任何金鑰放進 repository。

## 安裝到 iPhone

用 Safari 開啟網址 → 分享 → 加入主畫面。

若沒有聲音：設定 › 輔助使用 › 朗讀內容 › 聲音 › 日文，下載一個日文聲音。

## 授權與來源

- 漢字筆順：KanjiVG © Ulrich Apel，CC BY-SA 3.0
- 考試資訊請以 JLPT 官方網站與台灣主辦單位（LTTC）公告為準
