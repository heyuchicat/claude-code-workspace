# MEO Sync

Instagram連携・複数店舗管理・クチコミ返信・インサイト分析・予約投稿・Q&A・順位チェックを
一元管理する MEO(地図エンジン最適化)ツールです。GMOの「MEO対策ツール」のような
統合ダッシュボードを目指したセルフホスト型のプロダクトです。

## できること

- **複数店舗管理**: 店舗(テナント)ごとにInstagram/Googleアカウントを個別に接続・管理
- **Instagram → Google 投稿連携**: Instagram投稿をワンクリック(または一括)でGoogleビジネスプロフィールへ投稿
- **クチコミ管理**: Googleクチコミの一覧表示・返信
- **公式インサイト分析**: 閲覧数・検索キーワード・電話タップ数・ルート検索数などをグラフ表示(Google公式API)
- **予約投稿**: 日時を指定してGoogleビジネスプロフィールへ自動公開(cron連携)
- **Q&A管理**: Googleに寄せられた質問への回答
- **商品・サービスカタログ**: Googleビジネスプロフィール上に商品名・価格・写真を掲載し、検索結果・マップ上で目立たせる(Google Adsのような有料広告ではなく、プロフィール上の公式な商品掲載機能)
- **検索順位チェック(実験的)**: Googleマップでの検索順位を自動チェック。**⚠ Googleの利用規約に抵触しうる機能です。下記の注意事項を必ず読んでから使ってください。**
- 管理者パスワードによるログイン保護
- SQLiteでの永続化(連携トークン・同期履歴・予約投稿・チェック履歴)

Instagram / Google のどちらかが未接続の店舗では、そのサービスは**ダミーデータのデモモード**で動作します。
APIキーなしでもすぐに触って動作確認できます。

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

`.env` を開き、最低限以下は必ず設定してください。

| 変数 | 内容 |
|---|---|
| `ADMIN_PASSWORD` | ダッシュボードにログインするためのパスワード |
| `SESSION_SECRET` | セッションcookie署名用のランダム文字列(`openssl rand -hex 32` などで生成) |
| `CRON_SECRET` | 予約投稿の自動公開エンドポイントを保護する秘密鍵 |

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

`http://localhost:3000` を開き、`ADMIN_PASSWORD` でログインすると店舗一覧が表示されます。
店舗を作成して選択すると、店舗ごとのダッシュボード(投稿連携・クチコミ・インサイト・予約投稿・Q&A・順位チェック)に入れます。

## 実際のInstagram/Googleアカウントと連携する(本番利用)

各店舗のダッシュボードにある「連携する」ボタンから、実際のアカウントとOAuth連携できます。
事前に以下の準備が必要です。準備が完了するまでは、その部分はデモモードのまま安全に使えます。

### Instagram

1. [Meta for Developers](https://developers.facebook.com/apps/) でアプリを作成
2. 「Instagram API with Instagram Login」プロダクトを追加
3. OAuthリダイレクトURIに `<あなたのURL>/api/auth/instagram/callback` を登録(店舗ごとにURLが変わることはありません。店舗の判別はstateパラメータで行います)
4. アプリID・アプリシークレットを `.env` の `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` に設定

### Google ビジネスプロフィール

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) で OAuth クライアントIDを作成(種類: ウェブアプリケーション)
2. リダイレクトURIに `<あなたのURL>/api/auth/google/callback` を登録
3. クライアントID・シークレットを `.env` の `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` に設定
4. **重要:** Business Profile APIs(投稿・クチコミ・インサイト・Q&Aで使用)は、Googleへの利用申請と承認が別途必要です。
   申請が未承認の間はAPI呼び出しが権限エラーになります。承認状況はご自身でGoogle側にご確認ください。
5. Google側のAPI仕様(特にlocalPosts/reviews/questions関連)は改訂されることがあるため、連携前に
   [公式ドキュメント](https://developers.google.com/my-business/content/overview)で
   最新のエンドポイントをご確認ください。`src/lib/google-*.ts` に実装箇所があります。

### 予約投稿の自動公開(cron設定)

予約投稿は自動では公開されません。以下のエンドポイントを外部cron(Vercel Cron、システムcron、
GitHub Actionsのscheduleなど)から定期的に(例: 5分おき)呼び出してください。

```bash
curl -X POST https://<あなたのドメイン>/api/cron/publish-scheduled-posts \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 注意事項

- このリポジトリのコード内で実際のAPI呼び出しを動作確認することはできません(認証情報が無いため)。
  上記の設定を行ったうえで、必ず実環境でご自身で動作確認してください。

## ⚠ 検索順位チェック機能について(重要)

`src/lib/rank-checker.ts` は、Googleマップの検索結果ページをヘッドレスブラウザ(Playwright)で
自動的に開き、表示された店舗名の並び順から検索順位を推定する機能です。これは**Googleの公式APIではなく、
Googleの利用規約(自動化されたアクセスの禁止)に抵触する可能性がある行為**です。

- 頻繁な実行はGoogle側から異常なトラフィックとみなされ、一時的なブロックやCAPTCHA表示、
  最悪の場合は関連アカウント・IPのブロックにつながる可能性があります。
- 本実装は同時実行を1件に制限し、実行間隔に最低15秒を設けていますが、これはリスクを
  下げるだけであり、ゼロにするものではありません。
- CAPTCHA回避やブロック回避のための偽装(プロキシローテーション・ヘッダー偽装等)は
  意図的に実装していません。ブロックされた場合はエラーを返すだけです。
- Googleマップの画面構成(HTML構造)は頻繁に変更されるため、本実装が将来的に動作しなくなる
  可能性があります。
- **本番環境で有効化するかどうかは、法務・利用規約リスクを理解した上で自己責任で判断してください。**
- 本開発環境はサンドボックス化されておりGoogleへの outbound アクセスができないため、
  この機能は実際のGoogleマップに対しては動作確認できていません。ビルド・型チェックは
  通っていますが、実環境での動作確認を必ず行ってください。

Playwrightは `playwright-core` を使用しており、実行環境に **Chromiumブラウザ本体が
別途必要**です。本番デプロイ時は `npx playwright install chromium` 等でブラウザを
インストールするか、Playwrightのブラウザが同梱されたホスティング環境を使用してください。

## ディレクトリ構成

```
src/
  app/
    page.tsx                     ルート("/businesses"へリダイレクト)
    login/                       管理者ログイン画面
    businesses/                  店舗一覧画面
    businesses/[businessId]/     店舗ごとのダッシュボード(タブ切り替えUI)
      _components/                SyncTab, ReviewsTab, InsightsTab,
                                   ScheduledPostsTab, QATab, RankCheckTab
    api/
      auth/login/                 管理者ログイン/ログアウト
      auth/instagram/start,callback/  Instagram OAuth(店舗IDはstateパラメータで受け渡し)
      auth/google/start,callback/     Google OAuth(同上)
      businesses/                 店舗のCRUD
      businesses/[businessId]/
        auth/status, auth/*/disconnect  接続状態・接続解除
        instagram/account,posts   Instagram投稿取得
        google/locations,posts    Googleロケーション・投稿取得
        sync/, sync/all/          投稿の連携実行
        reviews/, reviews/reply/  クチコミ取得・返信
        insights/                 インサイト取得
        qa/, qa/answer/           Q&A取得・回答
        products/, products/[id]/  商品・サービスの登録・一覧・削除
        scheduled-posts/          予約投稿のCRUD
        rank-checks/              順位チェックの実行・履歴取得
      cron/publish-scheduled-posts/  予約投稿の自動公開(CRON_SECRET保護)
  lib/
    types.ts                    ドメイン型定義
    businesses.ts                店舗(テナント)のDBアクセス
    connections.ts                OAuth接続情報(トークン)のDBアクセス(店舗別)
    store.ts                     投稿連携履歴(LinkMapping)のDBアクセス
    review-store.ts / qa-store.ts  返信・回答の監査ログ
    scheduled-posts-store.ts     予約投稿のDBアクセス
    rank-checks-store.ts         順位チェック履歴のDBアクセス
    mock-*.ts                   各機能のダミークライアント(デモモード用)
    instagram-client.ts          Instagram実APIクライアント
    google-business-client.ts    Google実APIクライアント(OAuth・投稿)
    google-reviews-client.ts     Googleクチコミ実APIクライアント
    google-insights-client.ts    Google Performance API実クライアント
    google-qa-client.ts          Google Q&A実APIクライアント
    google-products-client.ts    Google商品・サービス(Products)実APIクライアント
    rank-checker.ts              検索順位チェック(Playwright, 実験的)
    data-source.ts               mock/実APIを接続状態に応じて切り替えるファサード
    sync-service.ts             「紐づけ」処理のコアロジック
    session.ts / proxy.ts        管理者ログインのセッション管理・保護
  generated/prisma/             Prisma Client(自動生成。gitignore対象)
prisma/schema.prisma           DBスキーマ(Business, Connection, LinkMapping,
                                ScheduledPost, QAEntry, ReviewReply, RankCheck)
```

## デプロイ時の注意

- SQLiteはファイルベースのため、Vercelなど**書き込み可能な永続ディスクを持たない環境では動作しません**。
  Fly.io / Render / 自前サーバーなど、永続ボリュームを使える環境にデプロイするか、
  `prisma/schema.prisma` の datasource を Postgres 等に変更してください。
- 検索順位チェック機能を使う場合は、実行環境に Chromium ブラウザが必要です(上記参照)。
  不要であれば `RankCheckTab` の呼び出しやAPIルートを無効化しても他機能には影響しません。
- `ADMIN_PASSWORD` / `SESSION_SECRET` / `CRON_SECRET` / 各APIシークレットは
  本番では必ず推測困難な値に変更してください。

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー起動 |
| `npm run lint` | Lint実行 |
| `npm run db:migrate` | 本番用マイグレーション適用(`prisma migrate deploy`) |
