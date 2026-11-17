# Skyline Rush｜第 3～10 賽道與 Phase 4–5 圖集

[14 條賽道空拍總覽](track-artwork-overview.webp)

14 條賽道各有一張空拍概念圖、四張路段場景圖、俯視路線圖、縱剖面與橫剖面，共 112 張。場景圖為重繪的概念美術。第 3～10 張的本版規劃圖採用 [10 km 設計資料](route-designs.json)。六張 Phase 4–5 賽道的俯視路線和縱剖面取樣自 GitHub `57da090` 的 [現有 CourseGraph](phase-4-5-course-graphs.json)。遊戲內的路線、場景及正式 WebGL 展示圖仍需整合或擷取。

第 3～10 張的中心線從設計控制點的里程、航向及高程計算。航向由北向順時針計算，高程以各地圖局部基準表示。設計採每車道 5 m 的四車道橫剖面。第 3～10 張依序提高視線判讀、煞車、連續轉向及飛行落地的要求。

**第 3～10 張遊戲整合里程：** 單場起點到終點的主線里程以 10 km 為基準，容許 ±2 km（8～12 km，含上下限）。各圖依彎道、地標與飛行段的節奏安排終點。定案後，同步遊戲里程、俯視路線圖及剖面圖的對應標註。

| 賽道 | 主要地標與變更 | 圖面里程 |
| --- | --- | --- |
| 03 峽谷天橋 · Canyon Skyway | 紅砂岩切壁與斷裂直梁橋 | 10.00 km |
| 04 極光山道 · Aurora Pass | 冰湖、雪鞍與避雪直廊 | 10.00 km |
| 05 天際螺旋 · Sky Spiral | 塔身承托的螺旋路與分離式跳台 | 10.00 km |
| 06 台北古都 · Taipei Heritage | 總統府街廓、城門和寺廟街 | 10.00 km |
| 07 東京夜行 · Tokyo Afterdark | 雨夜十字路口與平頂電車下穿 | 10.00 km |
| 08 山岳鐵道 · Alpine Rail Pass | 岩壁、側置齒軌與開放雪崩坡 | 10.00 km |
| 09 海岸天際 · Coastal Horizon | 白色燈塔、迎風海岬與背風海灣 | 10.00 km |
| 10 星際軌道 · Cosmic Orbit | 低重力飛行線、方形超速通道與對接站 | 10.00 km |

## 小地圖更新與驗收

規劃階段使用各圖的俯視路線圖審閱彎道、地標與飛行段。正式小地圖隨遊戲路線整合更新。

- **第 3～10 張：** 各張主線與終點定案在 8～12 km 後，首頁與比賽中的小地圖使用同一套新中心線。詳見[經典賽道小地圖規範](../../../classic-road-minimap.md)。
- **第 11～16 張：** 小地圖由 CourseGraph 產生。單純調整地標或場景美術時沿用現有投影。主線、地面支線或飛行段有變動時，隨 CourseGraph 更新。詳見[CourseGraph 路線投影](../../../../src/course-route-map.ts)。
- **逐圖驗收：** 確認首頁與比賽中的路線輪廓一致、起點與終點位置正確，以及車輛標記沿實際路線移動。第 11～16 張的路線一致性與車輛標記更新，沿用[現有瀏覽器測試](../../../../tests/coming-soon-minimap-browser.spec.js)。

## 03 峽谷天橋 · Canyon Skyway

沿紅砂岩台地起跑，進入斷裂直梁橋，穿過沿岩壁切出的低線，最後以峽谷回頭彎和高原長彎收尾。

先讓玩家看見斷點與落點，再考驗岩落區煞車與順風出彎。保留 FLY 或精準跳台的越隙玩法。斷梁區保留一個可辨識的危險越隙段，路肩提高岩落預警的可見性。

[空拍](canyon/01-aerial-overview.webp) · 場景 [1](canyon/02-cliff-ledge.webp) / [2](canyon/03-broken-slab.webp) / [3](canyon/04-rock-cut-hairpin.webp) / [4](canyon/05-mesa-sweep.webp) · [俯視路線](canyon/06-route-plan.svg) · [縱剖面](canyon/07-longitudinal-profile.svg) · [橫剖面](canyon/08-cross-section.svg)

## 04 極光山道 · Aurora Pass

冰湖快線轉入針葉林爬坡，穿過避雪直廊，從極光下的雪鞍下坡。

外側冰帶分段出現，保留可預判的高抓地線。後半段用坡度和視野壓縮提高控速難度。可行安全路線始終保有抓地力，與外側黑冰用雪屑、粗糙度和刻線區別。

[空拍](aurora/01-aerial-overview.webp) · 場景 [1](aurora/02-black-ice-lakeshore.webp) / [2](aurora/03-fir-lined-s-bends.webp) / [3](aurora/04-avalanche-gallery.webp) / [4](aurora/05-aurora-switchback.webp) · [俯視路線](aurora/06-route-plan.svg) · [縱剖面](aurora/07-longitudinal-profile.svg) · [橫剖面](aurora/08-cross-section.svg)

## 05 天際螺旋 · Sky Spiral

用同一座塔的傾斜螺旋爬升保留原有輪廓，再加入上層平台、分離式跳台和雲端 S 彎。

保留三次跳台節奏。每次落地後留出直線回正距離，最後才讓飛行落地接煞車與轉向。俯視圖的環形重合處為塔身螺旋。上下層辨識以縱剖面的里程和高程為準。

[空拍](spiral/01-aerial-overview.webp) · 場景 [1](spiral/02-tower-approach.webp) / [2](spiral/03-banked-tower-helix.webp) / [3](spiral/04-launch-gap.webp) / [4](spiral/05-cloud-slalom.webp) · [俯視路線](spiral/06-route-plan.svg) · [縱剖面](spiral/07-longitudinal-profile.svg) · [橫剖面](spiral/08-cross-section.svg)

## 06 台北古都 · Taipei Heritage

總統府前起跑，繞行城門廣場，穿過寺廟街區和節慶路障，沿河堤加速收尾。

用 90 度街廓與減速彎取代景觀橋。寺廟與城門保留在道路側面，直角彎前預留煞車視距。寺廟與城門造型保留，車道繞過建築。街區路線預留制動區及出彎視距。

[空拍](taipei/01-aerial-overview.webp) · 場景 [1](taipei/02-presidential-office-boulevard.webp) / [2](taipei/03-historic-city-gate.webp) / [3](taipei/04-temple-market-chicane.webp) / [4](taipei/05-riverside-return.webp) · [俯視路線](taipei/06-route-plan.svg) · [縱剖面](taipei/07-longitudinal-profile.svg) · [橫剖面](taipei/08-cross-section.svg)

## 07 東京夜行 · Tokyo Afterdark

雨夜十字路口接高密度街區，利用平頂電車下穿的明暗轉折，出彎望向東京塔。

從第一個交通閘門建立反應節拍，後段將施工縮道和連續變向分開，讓濕地刻線能看清。平頂高架的支撐採直梁與立柱。信號閘門不和最窄的施工變向設於同一個彎心。

[空拍](tokyo/01-aerial-overview.webp) · 場景 [1](tokyo/02-scramble-crossing.webp) / [2](tokyo/03-construction-s-bends.webp) / [3](tokyo/04-flat-rail-underpass.webp) / [4](tokyo/05-tower-sprint.webp) · [俯視路線](tokyo/06-route-plan.svg) · [縱剖面](tokyo/07-longitudinal-profile.svg) · [橫剖面](tokyo/08-cross-section.svg)

## 08 山岳鐵道 · Alpine Rail Pass

道路與齒軌列車沿山腰分層並行，穿過岩壁洞口和防雪棚，再穿越雪崩坡下山。

上坡窄髮夾彎先考驗控速，後段在露天峭坡增加碎石與連續下坡壓力。列車保持在道路側邊的獨立高程。齒軌與主路同向時仍走獨立高程。雪崩坡保持露天，讓玩家看見碎石落點。

[空拍](alpine/01-aerial-overview.webp) · 場景 [1](alpine/02-uphill-hairpin.webp) / [2](alpine/03-granite-rail-portal.webp) / [3](alpine/04-avalanche-chute.webp) / [4](alpine/05-ridge-descent.webp) · [俯視路線](alpine/06-route-plan.svg) · [縱剖面](alpine/07-longitudinal-profile.svg) · [橫剖面](alpine/08-cross-section.svg)

## 09 海岸天際 · Coastal Horizon

以白色燈塔、迎風海岬、海堤與背風海灣構成全程。路面貼合岩岸，沿海段拉開海霧與浪花的層次。

由開闊高速彎進入不同風向的海岬，揚浪與側風分開出現，最後以海堤外傾轉入低地回程。迎風海岬的陣風、海堤的浪花與背風段各有自己的可見地標。

[空拍](coastal/01-aerial-overview.webp) · 場景 [1](coastal/02-lighthouse-rise.webp) / [2](coastal/03-windward-headland.webp) / [3](coastal/04-sea-wall-turn.webp) / [4](coastal/05-sheltered-bay.webp) · [俯視路線](coastal/06-route-plan.svg) · [縱剖面](coastal/07-longitudinal-profile.svg) · [橫剖面](coastal/08-cross-section.svg)

## 10 星際軌道 · Cosmic Orbit

在巨型行星、碎石帶與方形軌道站模組間競速，經過低重力飛行線、直肋超速通道與對接終點。

兩段低重力飛行都保留地面通路。太陽風、掃動屏障與飛行閘門分段輪替，最後考驗連續落地、閃避與選線。空中閘門排在道路側上方，主車道保留連續實體路面。外太空行星環屬於背景地形。

[空拍](cosmic/01-aerial-overview.webp) · 場景 [1](cosmic/02-debris-weave.webp) / [2](cosmic/03-low-gravity-flight.webp) / [3](cosmic/04-hyperdrive-channel.webp) / [4](cosmic/05-docking-sequence.webp) · [俯視路線](cosmic/06-route-plan.svg) · [縱剖面](cosmic/07-longitudinal-profile.svg) · [橫剖面](cosmic/08-cross-section.svg)

## Phase 4–5 六張新賽道

里程以各賽道現有 CourseGraph 的地面主線沿 3D 中心線量測。俯視圖保留地面支線、飛行支線與必經檢查點。縱剖面用主線里程對齊支線的分流點和匯合點。橫剖面的道路寬度來自對應賽段，周圍構造物與地形為概念設計。

### 沙暴裂谷 · Dune Tempest · 13.95 km

以紅層岩脊、風蝕石柱與流沙谷取代橫跨賽道的拱形地標。

[空拍](dune-tempest/01-aerial-overview.webp) · 場景 [1](dune-tempest/02-dust-front.webp) / [2](dune-tempest/03-sandstone-fin-descent.webp) / [3](dune-tempest/04-dune-crest-split.webp) / [4](dune-tempest/05-sheltered-basin.webp) · [俯視路線](dune-tempest/06-route-plan.svg) · [縱剖面](dune-tempest/07-longitudinal-profile.svg) · [橫剖面](dune-tempest/08-cross-section.svg)

### 雨林失落神殿 · Monsoon Ruins · 12.56 km

核心地標改用矩形石刻、崩塌階台和貼瀑岩壁的連續路面。

[空拍](monsoon-ruins/01-aerial-overview.webp) · 場景 [1](monsoon-ruins/02-wet-jungle-entry.webp) / [2](monsoon-ruins/03-ruin-courtyard.webp) / [3](monsoon-ruins/04-waterfall-gorge.webp) / [4](monsoon-ruins/05-rainforest-ridge.webp) · [俯視路線](monsoon-ruins/06-route-plan.svg) · [縱剖面](monsoon-ruins/07-longitudinal-profile.svg) · [橫剖面](monsoon-ruins/08-cross-section.svg)

### 浮空群島 · Skyfall Archipelago · 16.46 km

由浮島高低差、垂瀑、開放飛行缺口與細直懸索成為主要視覺。

[空拍](skyfall-archipelago/01-aerial-overview.webp) · 場景 [1](skyfall-archipelago/02-island-edge-road.webp) / [2](skyfall-archipelago/03-straight-cable-deck.webp) / [3](skyfall-archipelago/04-island-flight-gap.webp) / [4](skyfall-archipelago/05-waterfall-switchbacks.webp) · [俯視路線](skyfall-archipelago/06-route-plan.svg) · [縱剖面](skyfall-archipelago/07-longitudinal-profile.svg) · [橫剖面](skyfall-archipelago/08-cross-section.svg)

### 熔火天脊 · Volcanic Crown · 15.96 km

沿玄武岩脊線行駛，使用直肋蒸氣廊、節理岩層與露天熔流呈現高差。

[空拍](volcanic-crown/01-aerial-overview.webp) · 場景 [1](volcanic-crown/02-basalt-rim.webp) / [2](volcanic-crown/03-vent-gallery.webp) / [3](volcanic-crown/04-lava-side-ridge.webp) / [4](volcanic-crown/05-crater-descent.webp) · [俯視路線](volcanic-crown/06-route-plan.svg) · [縱剖面](volcanic-crown/07-longitudinal-profile.svg) · [橫剖面](volcanic-crown/08-cross-section.svg)

### 霓虹暴雨都市 · Stormline Megacity · 14.46 km

以暴雨及垂直樓層為主，描繪平頂服務樓板、滯洪槽和變電塔。

[空拍](stormline-megacity/01-aerial-overview.webp) · 場景 [1](stormline-megacity/02-storm-boulevard.webp) / [2](stormline-megacity/03-flood-control-channel.webp) / [3](stormline-megacity/04-stacked-service-decks.webp) / [4](stormline-megacity/05-lightning-substation.webp) · [俯視路線](stormline-megacity/06-route-plan.svg) · [縱剖面](stormline-megacity/07-longitudinal-profile.svg) · [橫剖面](stormline-megacity/08-cross-section.svg)

### 極地冰原峽谷 · Frostbite Canyon · 13.80 km

冷色冰原保留水晶尖塔和凝結冰瀑，主要視線由冰壁、冰脊與冰裂谷構成。

[空拍](frostbite-canyon/01-aerial-overview.webp) · 場景 [1](frostbite-canyon/02-crystal-sentinels.webp) / [2](frostbite-canyon/03-frozen-waterfall.webp) / [3](frostbite-canyon/04-glacial-hairpin.webp) / [4](frostbite-canyon/05-basin-finish.webp) · [俯視路線](frostbite-canyon/06-route-plan.svg) · [縱剖面](frostbite-canyon/07-longitudinal-profile.svg) · [橫剖面](frostbite-canyon/08-cross-section.svg)
