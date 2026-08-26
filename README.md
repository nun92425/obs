# OBS Lite — プレゼン/予餞会用 Web OBS

タブ切替なしで「動画 / 画像 / スライド / スマホ生中継 / 待機画面ループ / 画面共有（Canva対応）」をワンクリックで切替える、ブラウザだけで完結する簡易OBSです。

## 特徴

- **タブ切替なし**: 操作側(Control)と投影側(Program)の2画面構成。PREVIEW→TAKEで瞬時に切替。
- **全ソース常時表示**: 動画/画像/スライド/画面共有/スマホカメラ/待機画面をグリッドで一覧
- **スライド内製**: Canva風エディタ（テキスト/画像/図形 + 5種アニメ + 背景色）※Canvaは「画面共有」ソースでそのまま出力も可能
- **スマホ生中継**: QRで接続、WebRTC+TURNでWi-Fi/モバイルデータ両対応、複数台同時
- **画面共有**: `getDisplayMedia` でCanvaの再生画面をそのまま投影（タブ切替不要の要望に対応）
- **待機画面ループ**: 動画ループ + テロップ
- **2モード同期**:
  - 同一PC（拡張ディスプレイ）: BroadcastChannelでサーバ不要・オフライン可
  - 別PC（遠隔）: WebSocketシグナリングサーバ（Render用）+ PeerJS
- **保存**: IndexedDB永続化 + JSONエクスポート/インポートでリハーサル/本番切替

## 使い方

### 1. 同一PC（推奨・最も安定）

1. `npm run build && npm run preview` または `npm run dev` で起動
2. 操作画面で「出力ウィンドウを開く」→ プロジェクター側ディスプレイにドラッグして全画面（`F11` or 出力画面の「全画面切替」）
3. 素材を登録（動画/画像はドラッグ&ドロップ、スライドは「+ スライド作成」、Canvaなら「+ 画面共有」）
4. ソースをクリックでNEXT（黄）→ `Space` or `TAKE` でLIVE（赤）に送出
5. `B`でBLACK、`1-9`でソース選択、`Space`でFADE/CUT

### 2. 別PC（操作PCと投影PCを分ける）

- 両PCで同じURLにアクセス（`?room=XXXX` が自動付与）
- WSシグナリングサーバが必要:
  - ローカル: `npm run dev:server` (ws://localhost:3001) + `VITE_SIGNALING_URL`未設定なら自動でlocalhostに接続
  - Render: `render.yaml` で自動デプロイ（`PORT=10000`, `healthCheckPath: /health`）。デプロイ後にフロントの環境変数 `VITE_SIGNALING_URL=wss://<your-render>.onrender.com` を設定

### 3. スマホ生中継

1. 操作画面で「+ スマホカメラ」ソースを作成しクリック
2. 表示されたQRをスマホで読み取る（`?role=camera&room=...&peer=...`）
3. スマホ側でカメラ許可 → 自動で操作PCに接続、配信中表示
4. 操作画面でそのカメラソースをNEXT→TAKEで投影
5. 複数台はソースを複数作ってそれぞれQRを読み取り

> TURN: デフォルトで `openrelay.metered.ca` の無料TURNを使用。モバイルデータでもNAT越え可能。本番では `VITE_TURN_URL` / `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL` で有料TURN（Twilio等）に切替推奨。

### 4. Canvaスライドをそのまま使う場合

1. 「+ 画面共有」ソースを作成
2. 操作画面でそのソースをPREVIEWにし、「画面共有開始」をクリック
3. 共有する画面で「Chromeタブ」を選び、Canvaのプレゼン画面を選択（「音声を共有」ON推奨）
4. Canva側で再生開始 → そのまま投影画面に出力される

### 5. スライドを内製する場合

- 「+ スライド作成」→「エディタを開く」
- 左: スライド追加/複製/背景色、 中央: Konvaキャンバス（ドラッグで移動）、 右: 要素プロパティ（テキスト/色/アニメ5種/遅延/秒数）
- アニメ: `fadeIn / slideInLeft / slideInRight / zoomIn / pop`
- スライド送りはControl画面の「◀ 前 / 次 ▶」または出力中でも切替可能

### 6. 保存/復元

- ヘッダー「保存」でJSONダウンロード、`localStorage`+`IndexedDB`に自動保存
- 「読込」でJSONを選択して復元（リハーサル→本番の切替に便利）
- 動画/画像の実体はIndexedDBに保存（容量超過時は再選択が必要な旨を表示）

## 開発

```bash
npm install
npm run dev              # フロント http://localhost:5173
npm run dev:server       # シグナリング ws://localhost:3001 (別ターミナル)
npm run build            # フロントビルド -> dist/
npm run build:server     # サーバビルド -> dist-server/
npm run server           # サーバ起動
```

### 環境変数

`.env` 例:

```
VITE_SIGNALING_URL=wss://obs-signaling-xxxx.onrender.com
VITE_TURN_URL=turn:global.turn.twilio.com:3478?transport=udp
VITE_TURN_USERNAME=xxx
VITE_TURN_CREDENTIAL=yyy
```

## Renderデプロイ

### フロント（Static Site）

- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- 環境変数: `VITE_SIGNALING_URL` にシグナリングサービスのURLを設定して再ビルド

### シグナリング（Web Service）

- `render.yaml` 同梱済み。Renderダッシュボードで「Blueprint」から登録
- Build: `npm install && npm run build:server`
- Start: `node dist-server/index.js`
- Health Check: `/health`
- 無料枠でOK

## キーボードショートカット

- `Space`: TAKE (FADE/CUT)
- `B`: BLACKトグル
- `1-9`: ソース選択（上から順）
- 出力画面: 「全画面切替」ボタン or `F11`

## 技術スタック

- Vite + React + TypeScript + Tailwind (@tailwindcss/vite) + Zustand
- Konva / react-konva (スライドエディタ), Framer Motion, localForage (IndexedDB), PeerJS, qrcode.react, ws

## 今後の拡張案

- Web Audio APIによる本格ミキサー（マイク/BGM/動画個別バス、VUメーター）
- スライドの動画埋込、タイムライン編集
- 録画（MediaRecorderでProgramを保存）
