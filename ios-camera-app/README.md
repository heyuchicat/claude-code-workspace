# iPhone カメラアプリ (PWA)

iPhoneのSafariから使えるカメラアプリです。ネイティブアプリではなくWebアプリ(PWA)として作られており、HTTPS環境にホストしてSafariで開くだけで使えます。

## 主な機能

- 前面/背面カメラの切り替え
- 写真撮影(シャッターボタン、フラッシュ演出、触覚フィードバック)
- 対応端末ではフラッシュ(トーチ)のON/OFF切り替え。非対応の場合は撮影時に画面を光らせて代用
- 撮影した写真をブラウザ内(IndexedDB)に保存し、一覧・拡大表示
- 写真の端末への保存(ダウンロード)・削除
- ホーム画面に追加してアプリのように起動(PWA / manifest.json)
- オフラインでもアプリ本体を開けるようService Workerでキャッシュ

## 使い方

1. このディレクトリを何らかのHTTPS対応の静的ホスティング(GitHub Pages, Vercel, Netlify など)にデプロイします。
   - カメラAPI(`getUserMedia`)はセキュリティ上の理由から `https://` または `localhost` でのみ動作します。
2. iPhoneのSafariでデプロイ先のURLを開きます。
3. カメラへのアクセスを許可します。
4. 共有ボタン →「ホーム画面に追加」で、アプリのようにアイコンから起動できるようになります。

## ローカルでの動作確認

```sh
cd ios-camera-app
python3 -m http.server 8080
```

`http://localhost:8080` にPCのブラウザ(Chrome/Safari)でアクセスすれば、`localhost` なのでHTTPSなしでもカメラAPIが動作します。iPhone実機で試す場合はHTTPS配信が必要です。

## ファイル構成

- `index.html` — 画面構造
- `style.css` — iOS風のカメラUI
- `app.js` — カメラ制御・撮影・写真管理のロジック
- `manifest.json` / `sw.js` — PWA化(ホーム画面追加・オフライン対応)
- `icons/` — アプリアイコン
