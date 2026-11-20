# 收藏介面圖示

素材為三張用 ChatGPT ImageGen 產出的透明原圖集，分為獎勵與操作、車庫鏡頭與開關、商城與收藏功能。共同風格為有色琺瑯、金屬倒角、透明留邊。圖集依 4 × 3 或 4 × 4 的格線分割，保留主體輪廓，再等比例縮小並輸出 lossless WebP。單張圖示的圖檔位於 `public/feature-assets/collectible-ui/`。

| 圖示 | 來源像素 | 顯示尺寸 |
| --- | --- | --- |
| 操作與選項 | 72 × 72 | 24 × 24 |
| 商城入口 `cart-panel` | 156 × 156 | 52 × 52 |
| 任務入口 `mission-panel` | 120 × 120 | 40 × 40 |
| 概念收藏、領取、領取完成 | 216 × 216 | 72 × 72，橫列任務依容器再縮小 |

`CollectibleIcon` 接收圖示檔名，沿用按鈕的無障礙名稱。未選中、選中、按住、停用、等待與成功都可辨識。動作減量或關閉特效時停用圖示縮放與過渡。選項內的車款、漆面及裝備商品圖仍用各自的藝術資產。

`tests/collectible-ui-browser.spec.js` 檢查所有檔案的 native 尺寸、透明留邊、選中造型，以及桌面、手機直向與橫向的控制項尺寸。

## 試玩金幣、服裝、檢視與車漆

四張更新圖示由 ChatGPT 生成，透明無損母檔位於 [webp/collectible-ui](webp/collectible-ui/)。

| 母檔 | 圖案 | 遊戲用圖檔 |
| --- | --- | --- |
| `currency-master.webp` | 黃金疊幣，正面為斜體 Skyline Rush 浮雕 S | `collectible-ui/currency@3x.webp`（72 px）；`wave3-demo/raster/wallet-coin@3x.webp`（144 px） |
| `clothing-master.webp` | 深藍及高亮青色的完整賽車連身服 | `collectible-ui/clothing@3x.webp` |
| `inspect-master.webp` | 四角金屬取景框與正面車頭 | `collectible-ui/inspect@3x.webp` |
| `paint-master.webp` | 鈷藍珠光、洋紅和金色三張烤漆色樣 | `collectible-ui/paint@3x.webp` |

母檔 288 × 288，輸出時以 Lanczos 等比例縮小並保留透明留邊。原始錢包金幣以 `wallet-coin-original@3x.webp` 保存在同一個目錄。
