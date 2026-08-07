# MEO Sync

Instagram の投稿を Google ビジネスプロフィール(旧 Google マイビジネス)の投稿として
自動連携する MEO(地図エンジン最適化)ツールの MVP プロトタイプです。

## できること

- Instagram 投稿の一覧表示(キャプション・画像・いいね数など)
- Google ビジネスプロフィールの店舗ロケーション表示
- Instagram 投稿を選んで Google ビジネスプロフィールへワンクリックで投稿(紐づけ)
- 未連携の投稿をまとめて一括同期
- 連携済み / 未連携の状態をダッシュボードで確認

このプロトタイプでは Instagram Graph API と Google Business Profile API を
**実際には呼び出さず、ダミーデータを返す mock クライアント**で動作します。
API キーなしですぐに動作確認できます。

## セットアップ

```bash
npm install
npm run dev
```

`http://localhost:3000` を開くとダッシュボードが表示されます。

## ディレクトリ構成

```
src/
  app/
    page.tsx                 ダッシュボードUI
    api/
      instagram/account/     Instagramアカウント取得
      instagram/posts/       Instagram投稿一覧 + 連携状態
      google/locations/      Googleビジネスプロフィールのロケーション一覧
      google/posts/          Google側に作成された投稿一覧
      sync/                  投稿を1件連携(POST)
      sync/all/              未連携投稿を一括連携(POST)
  lib/
    types.ts                 ドメイン型定義
    mock-instagram.ts        Instagram Graph API のダミークライアント
    mock-google-business.ts  Google Business Profile API のダミークライアント
    store.ts                 連携状態を保持するインメモリストア
    sync-service.ts          「紐づけ」処理のコアロジック
```

## 本番API接続への移行

このプロトタイプは、実APIクライアントと差し替えるだけで本番化できるように
mock 層(`mock-instagram.ts` / `mock-google-business.ts`)と
ビジネスロジック(`sync-service.ts`)を分離しています。

### 1. Instagram Graph API

- Facebook for Developers でアプリを作成し、Instagram Business アカウントを連携
- 必要スコープ: `instagram_basic`, `pages_show_list` など
- `mock-instagram.ts` の `fetchInstagramPosts` を
  `GET https://graph.instagram.com/{ig-user-id}/media` 呼び出しに置き換える
- アクセストークンの長期化・リフレッシュ処理が必要

### 2. Google Business Profile API

- Google Cloud プロジェクトを作成し `Business Profile APIs` を有効化
- OAuth2 で店舗オーナーのアカウント認可を取得(API利用には Google の承認が必要な場合あり)
- `mock-google-business.ts` の `createGoogleBusinessPost` を
  `POST https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts`
  呼び出しに置き換える

### 3. 永続化

現在は `store.ts` がインメモリ(プロセス内)で連携状態を保持しています。
本番運用ではここを Postgres 等の DB に置き換え、OAuthトークンや連携履歴を永続化してください。

### 4. 自動化

`syncAllUnlinkedPosts` を Cron / Webhook(Instagramの新規投稿通知)から定期実行することで、
Instagram投稿からGoogleビジネスプロフィール投稿までの完全自動化が可能です。

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー起動 |
| `npm run lint` | Lint実行 |
