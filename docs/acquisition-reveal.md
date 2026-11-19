# 獲得與解鎖演出

`presentAcquisition(batch)` 是應用程式層的共用展示入口。賽事、任務、商店或背包先完成各自的進度或交易，再將本次新增項目交給展示佇列。Vue 應用程式只掛載一個 `AcquisitionReveal`，外部功能端可以直接從 TypeScript、JavaScript 或 Vue 呼叫同一個函式。

## 接口

```ts
import { ACQUISITION_KIND, presentAcquisition } from './acquisition-reveal.ts';

presentAcquisition({
  id: `garage:car:${receipt.operationId}`,
  items: [{
    id: 'crimson-gt',
    kind: ACQUISITION_KIND.CAR,
    status: 'unlocked',
    name: { en: 'Vantaire GT', 'zh-TW': '夜鋒 GT' },
    artwork: {
      src: 'feature-assets/garage-public/car-picker/crimson-gt@3x.webp',
      style: 'cutout',
    },
  }],
});
```

上例的 `receipt` 由呼叫端的解鎖服務提供。請在服務回傳本次成功新增的結果後呼叫，例如 `if (receipt.status === 'completed' && receipt.isNew)`。會員交易請用包含來源及帳號／存檔世代的操作 ID，這樣重試、重送同一張收據或重新渲染時，彈窗只會出現一次。若同一次完成多項，傳入一個 `items` 陣列即可。第一項是開場主視覺。其他項目可切換預覽，按一次「繼續」就能返回原流程。

| 欄位 | 用法 |
| --- | --- |
| `batch.id` | 來源加上唯一操作識別。空批次和已展示批次會回傳 `false`，成功入列回傳 `true`。 |
| `kind` | 呼叫端使用 `ACQUISITION_KIND`。`AcquisitionKind` 從常數推導，值維持 `car`、`track`、`paint`、`equipment`、`clothing`、`item`、`medal`、`currency`，可直接供 JSON 與 CSS 使用。種類決定配色、圖示及音效。 |
| `status` | `unlocked` 顯示「已解鎖」，`earned` 顯示「已獲得」。 |
| `name` 和 `description` | 項目名稱與選填描述。傳入 `en` 和 `zh-TW`，並優先使用原有目錄的名稱。 |
| `artwork` | 選填。依現有素材使用 `cover`（賽道／車漆圖）、`cutout`（車款／服裝透明圖）或 `icon`（裝備／資源）。推薦以相對於 Vite BASE_URL 的 public 路徑傳入。缺圖時顯示種類圖示。 |
| `quantity` 和 `scope` | 選填。數量以目前語系格式顯示。試玩項目傳 `scope: 'demo'`，顯示「試玩獎勵」。 |

## 現有呼叫端

- 賽後由 `acquisition-race-reveal.ts` 讀取實際結算差異，將新解鎖的車款、賽道、車漆、勳章與試玩資源放進同一批。畫面在結果頁顯示後開啟。試玩收據延遲完成時，佇列會等到下個可展示的畫面。
- 試玩任務領取使用成功收據中的正數入帳差額，並包含本次達成的試玩獎盃。商店兌換以成功收據與庫存確認為準。
- 夜鋒 GT 在經典生涯賽結算首次達到 18 星時，會成為同批獎勵的第一項。關閉彈窗後，可由結算頁的「前往車庫」選車。其他車款和服裝的發放端可使用上面的接口。
- 生涯存檔載入、雲端同步、上裝、試看、比賽內即時補給和舊項目沿用各自流程。展示端只處理呼叫端發布的新取得事件。

佇列以 FIFO 顯示獨立操作。比賽進行、倒數、暫停時延後展示。原生 dialog 負責焦點、Escape、瀏覽器返回和背景互動隔離。手機使用相同內容，橫向把展示圖與標題並排。系統「減少動態」、遊戲舒適模式及關閉特效都會使用靜態畫面。每批首次顯示時，依首項種類播放一次揭曉音效。切換項目時播放短音，點選已選項目則維持原狀。車款、賽道與勳章揭曉時，背景音樂會短暫降低。音效遵循遊戲的 SFX 音量、靜音及瀏覽器頁面狀態。呼叫端完成發放後只需提交獎勵，揭曉音效由彈窗負責。
