# MEO Sync

Instagram の投稿を Google ビジネスプロフィール(旧 Google マイビジネス)の投稿として
自動連携する MEO(地図エンジン最適化)ツールです。

## できること

- Instagram / Google それぞれのアカウントをOAuthでログイン連携
- Instagram 投稿の一覧表示(キャプション・画像・いいね数など)
- Instagram 投稿を選んで Google ビジネスプロフィールへワンクリックで投稿(紐づけ)
- 未連携の投稿をまとめて一括同期
- 連携済み / 未連携の状態をダッシュボードで確認
- 管理者パスワードによるログイン保護
- SQLiteでの永続化(連携トークン・同期履歴)

Instagram / Google のどちらかが未連携の場合、そのサービスは**ダミーデータのデモモード**で動作します。
API キーなしでもすぐに触って動作確認できます。

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

(`postinstall` で Prisma Client が自動生成されます)

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を開き、最低限以下の2つは必ず設定してください。

| 変数 | 内容 |
|---|---|
| `ADMIN_PASSWORD` | ダッシュボードにログインするためのパスワード |
| `SESSION_SECRET` | セッションcookie署名用のランダム文字列(`openssl rand -hex 32` などで生成) |

Instagram / Google 連携用の変数(`INSTAGRAM_APP_ID` など)は空のままでも起動できます。
その場合は該当サービスがデモモードになります。

### 3. データベースのセットアップ

```bash
npx prisma migrate deploy
```

### 4. 起動

```bash
npm run dev
```

`http://localhost:3000` を開き、`ADMIN_PASSWORD` でログインするとダッシュボードが表示されます。

## 実際のInstagram/Googleアカウントと連携する(本番利用)

ダッシュボードの「連携する」ボタンから、実際のアカウントとOAuth連携できます。
事前に以下の準備が必要です。準備が完了するまでは、その部分はデモモードのまま安全に使えます。

### Instagram

1. [Meta for Developers](https://developers.facebook.com/apps/) でアプリを作成
2. 「Instagram API with Instagram Login」プロダクトを追加
3. OAuthリダイレクトURIに `<あなたのURL>/api/auth/instagram/callback` を登録
4. アプリID・アプリシークレットを `.env` の `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` に設定
5. `INSTAGRAM_REDIRECT_URI` を実際のURLに合わせて設定

### Google ビジネスプロフィール

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) で OAuth クライアントIDを作成(種類: ウェブアプリケーション)
2. リダイレクトURIに `<あなたのURL>/api/auth/google/callback` を登録
3. クライアントID・シークレットを `.env` の `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` に設定
4. `GOOGLE_REDIRECT_URI` を実際のURLに合わせて設定
5. **重要:** Business Profile APIs(投稿の作成・取得に使用)は、Googleへの利用申請と承認が別途必要です。
   申請が未承認の間はAPI呼び出しが権限エラーになります。承認状況はご自身でGoogle側にご確認ください。
6. Google側のAPI仕様(特にlocalPosts関連)は改訂されることがあるため、連携前に
   [公式ドキュメント](https://developers.google.com/my-business/content/overview)で
   最新のエンドポイントをご確認ください。`src/lib/google-business-client.ts` に実装箇所があります。

### 注意事項

- このリポジトリのコード内で実際のAPI呼び出しを動作確認することはできません(認証情報が無いため)。
  上記の設定を行ったうえで、必ず実環境でご自身で動作確認してください。
- 現在はシングルテナント設計(Instagram 1アカウント + Google 1店舗)です。複数店舗を扱う場合は
  `prisma/schema.prisma` の `Connection` モデルを店舗ごとに分離するよう拡張してください。

## ディレクトリ構成

```
src/
  app/
    page.tsx                     ダッシュボードUI
    login/                       ログイン画面
    api/
      auth/login/                管理者ログイン/ログアウト
      auth/status/               Instagram/Google接続状態
      auth/instagram/start,callback,disconnect/  Instagram OAuth
      auth/google/start,callback,disconnect/     Google OAuth
      instagram/account,posts/   Instagram投稿取得
      google/locations,posts/    Googleロケーション・投稿取得
      sync/, sync/all/           投稿の連携実行
  lib/
    types.ts                   ドメイン型定義
    mock-instagram.ts          Instagramのダミークライアント(デモモード用)
    mock-google-business.ts    Googleのダミークライアント(デモモード用)
    instagram-client.ts        Instagram実APIクライアント(OAuth・投稿取得)
    google-business-client.ts  Google実APIクライアント(OAuth・投稿作成/取得)
    data-source.ts             mock/実APIを接続状態に応じて切り替えるファサード
    connections.ts              OAuth接続情報(トークン)のDBアクセス
    store.ts                    連携履歴(LinkMapping)のDBアクセス
    sync-service.ts            「紐づけ」処理のコアロジック
    session.ts / proxy.ts       管理者ログインのセッション管理・保護
  generated/prisma/            Prisma Client(自動生成。gitignore対象)
prisma/schema.prisma          DBスキーマ(Connection, LinkMapping)
```

## デプロイ時の注意

- SQLiteはファイルベースのため、Vercelなど**書き込み可能な永続ディスクを持たない環境では動作しません**。
  Fly.io / Render / 自前サーバーなど、永続ボリュームを使える環境にデプロイするか、
  `prisma/schema.prisma` の datasource を Postgres 等に変更してください。
- `ADMIN_PASSWORD` / `SESSION_SECRET` / 各APIシークレットは本番では必ず推測困難な値に変更してください。

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー起動 |
| `npm run lint` | Lint実行 |
| `npm run db:migrate` | 本番用マイグレーション適用(`prisma migrate deploy`) |
