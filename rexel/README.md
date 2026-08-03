# REXEL 移管ツール

WordPress Studio（ローカル）で改修した REXEL のテーマを、
バックアップして本番の WordPress（エックスサーバー等）へ移すための一式です。

## なぜこれが必要か

REXEL の変更内容は、テーマファイルとデータベースの **2 か所に分かれて**保存されています。

- `style.css` などを直接編集した分 → テーマフォルダ
- サイトエディター・ブロックエディタ・カスタマイザーで変更した分 → **データベース**
- 管理画面から追加した画像・フォント → `wp-content/uploads/` ＋ データベース

そのため **テーマの zip をアップロードするだけでは、画像・文言・フォントが失われます**。
このツールは両方をまとめてバックアップし、移管ルートを判断できるようにします。

## 使い方

### 1. このリポジトリを自分の PC に取得する

```bash
cd ~/Desktop
git clone https://github.com/heyuchicat/claude-code-workspace.git
cd claude-code-workspace/rexel/scripts
chmod +x *.sh
```

### 2. Studio のサイトフォルダを調べる

```bash
./inspect-studio-site.sh ~/Studio/REXEL
```

`~/Studio/REXEL` は実際のパスに読み替えてください。
場所が分からない場合は、Studio アプリでサイトを開き
**「サイトフォルダを開く」**から確認できます。
`wp-content` と `wp-config.php` が直下にあるフォルダが正解です。

このスクリプトは読み取り専用で、サイトには一切変更を加えません。

### 3. バックアップを作る

```bash
./backup-rexel.sh ~/Studio/REXEL
```

デスクトップに `rexel-backup-<日時>` フォルダができます。
テーマ zip・メディア・データベース・レポートが整理された状態で入ります。

### 4. 本番へ移管する

[`MIGRATION-GUIDE.md`](./MIGRATION-GUIDE.md) の手順に従ってください。
フェーズ0 の調査結果に応じて、3 つの移管ルートから選ぶ形になっています。

## ローカルの Claude Code と一緒に使う場合

Studio のフォルダを直接見せながら作業したいときは、
Studio のサイトフォルダで Claude Code を起動してください。

```bash
cd ~/Studio/REXEL
claude
```

起動したら、次のように伝えると状況を踏まえて進められます。

```
~/Desktop/claude-code-workspace/rexel/MIGRATION-GUIDE.md を読んで、
このフォルダの REXEL サイトを本番の WordPress に移管する作業を手伝って。
まずフェーズ0の調査から。
```

## ファイル一覧

| ファイル | 内容 |
|---|---|
| `MIGRATION-GUIDE.md` | 移管手順の本体。移管ルートの選択、移管後の確認、トラブル対処 |
| `scripts/inspect-studio-site.sh` | 現状調査（読み取り専用）。DB種類・有効テーマ・変更箇所を報告 |
| `scripts/backup-rexel.sh` | バックアップとパッケージング。アップロード可能な zip を生成 |

## 注意

- スクリプトは Studio のサイトフォルダを**変更しません**（読み取りとコピーのみ）。
- バックアップに含まれる `wp-config.php.参考` にはデータベース接続情報が入っています。
  本番へアップロードしないでください。また公開・共有しないでください。
- 本番にすでに稼働中のサイトがある場合、移管作業で上書きされます。
  作業前に必ず本番側のバックアップを取ってください。
