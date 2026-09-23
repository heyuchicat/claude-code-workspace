# MEO Sync

Instagram連携・複数店舗管理・クチコミ返信・インサイト分析・予約投稿・Q&A・順位チェックを
一元管理する MEO(地図エンジン最適化)ツールです。GMOの「MEO対策ツール」のような
統合ダッシュボードを目指したセルフホスト型のプロダクトです。

## できること

- **複数店舗管理**: 店舗(テナント)ごとにInstagram/Googleアカウントを個別に接続・管理
- **Instagram → Google 投稿連携**: Instagram投稿を1件ずつワンクリックでGoogleビジネスプロフィールへ投稿
- **クチコミ管理**: Googleクチコミの一覧表示・返信
- **公式インサイト分析**: 閲覧数・検索キーワード・電話タップ数・ルート検索数などをグラフ表示(Google公式API)
- **予約投稿**: 日時を指定してGoogleビジネスプロフィールへ自動公開(アプリ起動中は自動、設定不要)。
  画像はURL貼り付けの他、ファイルアップロードにも対応
- **Q&A管理**: Googleに寄せられた質問への回答
- **商品・サービスカタログ**: Googleビジネスプロフィール上に商品名・価格・写真を掲載し、検索結果・マップ上で目立たせる(Google Adsのような有料広告ではなく、プロフィール上の公式な商品掲載機能)。写真もファイルアップロード対応
- **検索順位チェック(実験的)**: Googleマップでの検索順位を自動チェック。実際にお客様が
  この店舗を見つけるのに使った検索キーワード(公式インサイトデータ)や、Google Ads連携時は
  広告で入札設定しているキーワードを候補として自動提案し、クリックするだけで追跡を開始できます。
  以降はアプリ起動中に自動で定期チェックし、順位の推移をグラフで確認できます。
  **⚠ Googleの利用規約に抵触しうる機能です。下記の注意事項を必ず読んでから使ってください。**
- **Google Ads連携**: 広告で使っている検索キーワードを取得し、順位チェックの候補に自動反映
  (Google Ads APIは別途Google Cloud ConsoleでのAPIアクセス申請が必要です)
- **口コミ依頼リンク・QRコード**: Googleクチコミ投稿ページへの直接リンクとQRコードを生成。
  店頭掲示やレシートへの印刷用
- **月次レポート自動送付**: 検索/マップ閲覧数の推移・構成比、ユーザーの反応(電話・ルート検索・
  サイトアクセス)、アクション率、曜日別電話分析、検索キーワードの表示回数、クチコミ推移、
  投稿実績、AI運用アシスタント診断(GBPプロフィール充足度チェック+AIコメント)をまとめた
  複数セクション構成のPDFレポートを生成し、手動ダウンロードまたはメール自動送付(アプリ起動中は自動、設定不要)
- **通知・アラート**: 低評価クチコミ受信時・検索順位低下時にメール/Slackへ自動通知(アプリ起動中は自動、設定不要)
- **競合比較**: Google Places APIで競合店を検索・登録し、評価(★・件数)を自店舗と比較表示
- **外部プラットフォームの参照リンク**: 食べログ・ホットペッパー等、他媒体の掲載ページURLを
  まとめて登録・一覧表示(自動連携ではなく手動登録)
- 管理者パスワードによるログイン保護
- SQLiteでの永続化(連携トークン・同期履歴・予約投稿・チェック履歴)

Instagram / Google のどちらかが未接続の店舗では、そのサービスは**ダミーデータのデモモード**で動作します。
APIキーなしでもすぐに触って動作確認できます。

## セットアップ(自分のPCで動かす)

このアプリは自分のPC上でずっと動かして使う、個人〜少人数運用を想定したセルフホスト型です。
`.env` の手編集は基本的に不要で、以下の2コマンドだけで起動できます。

```bash
npm install
npm run dev
```

(`npm run dev` は内部でDBの初期化(`prisma migrate deploy`)も自動実行します)

`http://localhost:3000` をブラウザで開くと、**初回だけ**セットアップ画面が表示されます。
ここでログイン用のパスワードを設定してください(このパソコン専用の管理者パスワードです)。
設定が終わるとそのままログインした状態になり、店舗一覧画面に入れます。

以降は `npm run dev` で起動し、同じパスワードでログインするだけで使えます。
Instagram / Google 連携用の環境変数(`INSTAGRAM_APP_ID` など)は空のままでも起動でき、
その場合は該当サービスがデモモード(ダミーデータ)になります。

パソコンを閉じている間はアプリも停止します。外出先やスマホから常時使いたくなったら、
どこかのサーバーへのデプロイが必要です(検討する際はお知らせください)。

### 使い方の流れ

1. `npm run dev` を実行し、ブラウザで `http://localhost:3000` を開く
2. 初回のみ: パスワードを設定(セットアップ画面)
3. 「店舗を追加」で管理したい店舗を作成
4. 作成した店舗をクリックしてダッシュボードに入る
5. タブ(投稿連携・クチコミ・口コミ依頼・インサイト・競合比較・予約投稿・Q&A・商品・サービス・
   順位チェック・レポート・通知設定・外部リンク)を切り替えて操作
6. 実際のInstagram/Googleアカウントと連携したい場合は、各ダッシュボード上部の「連携する」ボタンから(下記「実際のInstagram/Googleアカウントと連携する」を参照)

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

### Google Ads連携(検索キーワードの自動取得)

順位チェックタブの「広告キーワードから追加」で、Google Adsで入札設定しているキーワードを
自動取得し、順位追跡の候補として使えます。

1. `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` は上記Googleビジネスプロフィールと共用します(新規発行不要)
2. `.env` の `GOOGLE_ADS_REDIRECT_URI` に `<あなたのURL>/api/auth/google-ads/callback` を設定し、
   Google Cloud ConsoleのOAuthクライアントのリダイレクトURI一覧にも追加してください
3. **重要:** 2026年9月9日付で開発者トークン(developer token)制度は廃止されました。現在は
   APIアクセスレベルが `GOOGLE_CLIENT_ID` を発行した**Google Cloudプロジェクト**に直接紐づきます。
   MCC(クライアントセンター)アカウントの「APIセンター」は使いません。
   [Google Cloud Console](https://console.cloud.google.com/google/ads-apis/overview)の
   Google Ads API概要ページから「Basicアクセス」を申請してください
   (OAuth同意画面のブランド確認が済んでいれば数分で自動承認されます)。
   `GOOGLE_ADS_DEVELOPER_TOKEN` は設定不要です(送っても無視されます)。
   承認が下りるまではAPI呼び出しがエラーになります
4. Google Ads APIのバージョンは頻繁に更新されるため、連携前に
   [公式ドキュメント](https://developers.google.com/google-ads/api/docs/start)で
   最新のエンドポイント・バージョンをご確認ください。`src/lib/google-ads-client.ts` に実装箇所があります
5. 取得するのは「広告主が入札対象に設定しているキーワード」であり、実際に検索されて
   広告が表示された語句(検索語句レポート)とは異なります

### 競合比較機能(Google Places API)

競合比較タブはOAuth連携とは別に、APIキー方式のGoogle Places API (New) を使用します。
Business Profile APIsのような利用申請・承認は不要です。

1. Google Cloud Consoleで対象プロジェクトの「Places API (New)」を有効化(要課金設定)
2. APIキーを発行し、`.env` の `GOOGLE_MAPS_API_KEY` に設定

### 月次レポートメール・アラート通知(SMTP/Slack)

各店舗の「通知設定」タブで通知先メールアドレス・Slack Webhook URLを設定できます。
メール送信を使う場合は、`.env` に `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` /
`SMTP_PASS` / `SMTP_FROM` を設定してください(未設定のままメール通知先を設定すると、
送信時にエラーが返ります)。Slack通知はWebhook URLの設定のみで、追加の環境変数は不要です。

### 月次レポートのAI運用アシスタント診断

月次レポートPDFの最終セクションに、Googleビジネスプロフィールの充足度チェックリスト(◯✕判定)と
AIによる診断コメントを含めています。

- チェックリスト(ビジネス名/カテゴリ/説明/住所/電話/営業時間/ウェブサイトURLの設定有無、
  投稿頻度、平均評価、クチコミ件数、クチコミ返信率)は`ANTHROPIC_API_KEY`が無くても
  常に実データから算出されます
- 診断コメント文(AIが生成する自然文)のみ`ANTHROPIC_API_KEY`が必要です。未設定の場合は
  チェック結果を機械的に要約した簡易文が代わりに使われます
- [console.anthropic.com](https://console.anthropic.com/)でAPIキーを発行し、`.env`の
  `ANTHROPIC_API_KEY`に設定してください。`ANTHROPIC_MODEL`で使用モデルを変更できます(既定: `claude-sonnet-4-5`)
- 元にした競合ツールのサンプルにあった「写真枚数」「ロゴ・カバー写真」「店舗HPのモバイル対応/
  表示速度」「都道府県平均との比較」は、本アプリがまだ取得していないデータ(写真一覧API、
  PageSpeed Insights連携、他店舗の集計データ)に依存するため、今回は含めていません

### 都道府県フィールドについて

「レポート」タブで店舗の都道府県を入力・保存できますが、**現時点ではレポートや画面のどこにも
表示・利用されていません**。将来、管理店舗数が増えた際に「同一都道府県内の管理店舗同士の平均」との
比較機能を追加する構想のため、先行してデータを蓄積できるようにしているだけです
(Google公式APIは他社を含む地域相場データを提供していないため、真の市場平均ではなく、
あくまで自社が管理する店舗同士の平均になる想定です)。

### 代理店として複数の顧客のGoogleビジネスプロフィールを管理する場合

顧客のGoogleアカウントのパスワードを教えてもらう必要はありません。Googleビジネスプロフィールには、
オーナー(顧客)が別のGoogleアカウントを「管理者(Manager)」として招待できる正規の権限委譲機能が
あります。

1. 顧客に、Googleビジネスプロフィールの管理画面(business.google.com)から
   「ユーザーを追加」→あなた(代理店)のGoogleアカウントのメールアドレスを入力して招待してもらう
   (具体的な画面操作はGoogle側の仕様変更があり得るため、Googleの公式ヘルプで最新手順をご確認ください)
2. 招待を承諾すると、あなたのGoogleアカウントでそのGoogleビジネスプロフィールを管理できるようになる
3. 本アプリでは、**あなた自身のGoogleアカウントで**各店舗の「Googleを連携する」ボタンから連携してください
   (顧客ごとに別のGoogleアカウントでログインする必要はなく、毎回同じあなたのアカウントでOKです)
4. もしあなたのGoogleアカウントが複数の顧客のビジネスプロフィールにアクセスできる場合、
   連携時に「どの顧客のアカウントをこの店舗に紐づけるか」を選ぶ画面が自動的に表示されます

### 自動実行される機能(設定不要・自動)

予約投稿の自動公開・順位チェック・低評価クチコミ等のアラート通知・月次レポート送付は、
**アプリを起動している間、内蔵のスケジューラが自動で実行します。** タスクスケジューラや
外部cronの設定は不要です。

| 用途 | 自動実行の頻度 |
|---|---|
| 予約投稿の自動公開 | 5分おき |
| 追跡登録したキーワードの順位チェック | 1日1回 |
| 低評価クチコミ・順位低下のアラート通知 | 1時間おき |
| 月次レポートのメール自動送付(`reportEmail`設定店舗のみ) | 1日1回チェックし、前回送付から30日以上経過していれば送付 |

注意: これはアプリ(Node.jsプロセス)が起動している間だけ動作します。PCを閉じて
アプリを停止している間は実行されません。

上級者向け: 同じ処理は `/api/cron/*` エンドポイントとしても残っており、
手動実行や動作確認、外部cronからの二重実行にも使えます(秘密鍵は「設定」画面で確認できます)。

```bash
curl -X POST http://localhost:3000/api/cron/publish-scheduled-posts \
  -H "Authorization: Bearer <設定画面に表示される秘密鍵>"
```

### 画像アップロードについて

予約投稿・商品/サービス登録では、画像URLの貼り付けの他に直接ファイルアップロードもできます。
アップロードされた画像は `public/uploads/<店舗ID>/` 配下に保存され、アプリ自身のホスト名で配信されます。

**重要:** Googleへ実際に投稿する際は、Google側のサーバーが画像URLを取得しに来ます。
`localhost` で動かしている間はGoogle側から到達できないため、アップロード画像を使ったGoogleへの
実投稿は、アプリを外部から到達可能なURLでデプロイした後にのみ動作します(デモモード・
URL貼り付けでの動作確認はlocalhostのままでも可能)。

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
    setup/                       初回セットアップ画面(管理者パスワード設定)
    login/                       管理者ログイン画面
    settings/                    設定画面(cron秘密鍵確認・パスワード変更)
    businesses/                  店舗一覧画面
    businesses/[businessId]/     店舗ごとのダッシュボード(タブ切り替えUI)
      _components/                SyncTab, ReviewsTab, ReviewRequestTab, InsightsTab,
                                   CompetitorsTab, ScheduledPostsTab, QATab, ProductsTab,
                                   RankCheckTab, ReportTab, NotificationSettingsTab,
                                   ExternalListingsTab
      select-google-account/      Google連携時、アクセス可能な顧客が複数ある場合の選択画面
      select-google-ads-account/  Google Ads連携時、アクセス可能な広告アカウントが複数ある場合の選択画面
    api/
      setup/                      初回セットアップ(GET状態確認 / POST作成)
      settings/                   cron秘密鍵の確認・再生成、パスワード変更
      auth/login/                 管理者ログイン/ログアウト
      auth/instagram/start,callback/  Instagram OAuth(店舗IDはstateパラメータで受け渡し)
      auth/google/start,callback/     Google OAuth(同上)
      auth/google-ads/start,callback/ Google Ads OAuth(同上)
      businesses/                 店舗のCRUD(PATCHで通知先メール・Slack Webhook設定)
      businesses/[businessId]/
        auth/status, auth/*/disconnect  接続状態・接続解除
        google-account-selection/  Google連携時の複数アカウント選択(一覧取得・確定)
        google-ads-account-selection/  Google Ads連携時の複数アカウント選択(同上)
        instagram/account,posts   Instagram投稿取得
        google/locations,posts    Googleロケーション・投稿取得
        sync/                     投稿の連携実行(1件ずつ)
        reviews/, reviews/reply/  クチコミ取得・返信
        review-link/              口コミ依頼リンク・QRコード生成
        insights/                 インサイト取得
        competitors/, competitors/search,compare/  競合店の検索・登録・比較
        qa/, qa/answer/           Q&A取得・回答
        products/, products/[id]/  商品・サービスの登録・一覧・削除
        scheduled-posts/          予約投稿のCRUD
        rank-checks/              順位チェックの実行・履歴取得
        tracked-keywords/         定期チェック登録キーワードのCRUD
        tracked-keywords/suggestions/  インサイトデータからのキーワード候補提案
        ad-keywords/              Google Ads検索キーワードの取得・保存
        report/                   月次レポートPDFの手動ダウンロード
        test-notification/        通知設定のテスト送信
        external-listings/        外部プラットフォーム参照リンクのCRUD
        uploads/                  画像アップロード(予約投稿・商品写真用)
      cron/publish-scheduled-posts/  予約投稿の自動公開(手動実行用。通常は内蔵スケジューラが自動実行)
      cron/check-tracked-keywords/   登録キーワードの順位チェック(同上)
      cron/check-alerts/             低評価クチコミ・順位低下のアラート通知(同上)
      cron/send-monthly-reports/     月次レポートのメール自動送付(同上)
  lib/
    types.ts                    ドメイン型定義
    admin-settings.ts             管理者パスワード・各種秘密鍵のDBアクセス
    businesses.ts                店舗(テナント)のDBアクセス
    connections.ts                OAuth接続情報(トークン)のDBアクセス(店舗別)
    pending-google-connection.ts  Google連携で複数アカウントから選択するまでの一時保管
    pending-google-ads-connection.ts  Google Ads連携で複数アカウントから選択するまでの一時保管
    store.ts                     投稿連携履歴(LinkMapping)のDBアクセス
    review-store.ts / qa-store.ts  返信・回答の監査ログ
    scheduled-posts-store.ts     予約投稿のDBアクセス
    rank-checks-store.ts         順位チェック履歴のDBアクセス
    tracked-keywords-store.ts    定期チェック登録キーワードのDBアクセス
    ad-keywords-store.ts         Google Ads検索キーワードのDBアクセス
    competitors-store.ts         競合店登録のDBアクセス
    external-listings-store.ts   外部プラットフォーム参照リンクのDBアクセス
    location-match.ts            店舗名とGoogleロケーション名の突き合わせ(他クライアント漏れ防止)
    scheduled-jobs.ts            予約投稿公開・順位チェック・アラート・月次レポート送付の実処理
    mock-*.ts                   各機能のダミークライアント(デモモード用)
    instagram-client.ts          Instagram実APIクライアント
    google-business-client.ts    Google実APIクライアント(OAuth・投稿)
    google-reviews-client.ts     Googleクチコミ実APIクライアント
    google-insights-client.ts    Google Performance API実クライアント
    google-qa-client.ts          Google Q&A実APIクライアント
    google-products-client.ts    Google商品・サービス(Products)実APIクライアント
    google-places-client.ts      Google Places API(競合比較用、APIキー方式)
    google-ads-client.ts         Google Ads実APIクライアント(OAuth・検索キーワード取得)
    rank-checker.ts              検索順位チェック(Playwright, 実験的)
    browser.ts                   Playwright Chromium起動の共通処理
    review-link.ts               口コミ依頼リンク・QRコード生成
    report-generator.ts          月次レポートHTML/PDF生成(複数セクション構成)
    gbp-diagnostics.ts           AI運用アシスタント(GBPプロフィール充足度チェック+AIコメント)
    ai-client.ts                 Anthropic Messages APIへの薄いラッパー
    mailer.ts                    SMTPメール送信
    notify.ts                    店舗宛の通知送信(メール/Slack)ファサード
    alerts.ts                    低評価クチコミ・順位低下の検知ロジック
    data-source.ts               mock/実APIを接続状態に応じて切り替えるファサード
    sync-service.ts             「紐づけ」処理のコアロジック
    scheduled-jobs.ts            予約投稿公開・順位チェック・アラート・月次レポート送付の実処理
                                  (cron APIルートと内蔵スケジューラの両方から呼ばれる)
    session.ts / proxy.ts        管理者ログインのセッション管理・保護
  instrumentation.ts             アプリ起動時に内蔵スケジューラを立ち上げる(cron設定不要化)
  generated/prisma/             Prisma Client(自動生成。gitignore対象)
prisma/schema.prisma           DBスキーマ(AdminSettings, Business, Connection,
                                PendingGoogleConnection, PendingGoogleAdsConnection,
                                LinkMapping, ScheduledPost, QAEntry, ReviewReply,
                                RankCheck, TrackedKeyword, AdKeyword, Competitor,
                                ExternalListing, AlertedReview)
```

## デプロイ時の注意

- SQLiteはファイルベースのため、Vercelなど**書き込み可能な永続ディスクを持たない環境では動作しません**。
  Fly.io / Render / 自前サーバーなど、永続ボリュームを使える環境にデプロイするか、
  `prisma/schema.prisma` の datasource を Postgres 等に変更してください。
- アップロード画像も同様に `public/uploads/` へファイル保存するため、SQLiteと同じ永続ボリュームが
  必要です。またGoogleへの実投稿にアップロード画像を使う場合は、Google側のサーバーが取得できる
  よう外部から到達可能なURLでデプロイしている必要があります(上記「画像アップロードについて」参照)。
- 検索順位チェック機能を使う場合は、実行環境に Chromium ブラウザが必要です(上記参照)。
  不要であれば `RankCheckTab` の呼び出しやAPIルートを無効化しても他機能には影響しません。
- 管理者パスワードはセットアップ画面で設定したもの、`SESSION_SECRET`/`CRON_SECRET`相当は
  初回セットアップ時にサーバー側で自動生成されDBに保存されます(手動設定は不要)。
  外部に公開する場合は、推測困難なパスワードを設定してください。
- Instagram/Google連携用のクライアントシークレットなど、`.env`に設定するAPIキー類は
  本番では必ず推測困難な値・正しい発行元のものを使用してください。

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー起動 |
| `npm run lint` | Lint実行 |
| `npm run db:migrate` | 本番用マイグレーション適用(`prisma migrate deploy`) |
