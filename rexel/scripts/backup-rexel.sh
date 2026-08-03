#!/usr/bin/env bash
#
# REXEL 移管ツール — バックアップとパッケージング
#
# WordPress Studio のサイトから、変更内容（画像・フォント・文言・テーマ）を
# まとめてバックアップし、本番 WordPress にアップロードできる形の zip を作ります。
#
# 元のサイトフォルダは一切変更しません（読み取りとコピーのみ）。
#
# 使い方:
#   ./backup-rexel.sh /path/to/Studio/REXEL [テーマスラッグ] [出力先フォルダ]
#
# 例:
#   ./backup-rexel.sh ~/Studio/REXEL
#   ./backup-rexel.sh ~/Studio/REXEL rexel ~/Desktop
#
set -euo pipefail

SITE_ROOT="${1:-}"
THEME_SLUG="${2:-}"
OUT_BASE="${3:-$HOME/Desktop}"

if [ -z "$SITE_ROOT" ]; then
  cat >&2 <<'USAGE'
使い方: ./backup-rexel.sh <Studioサイトのフォルダ> [テーマスラッグ] [出力先]

例:
  ./backup-rexel.sh ~/Studio/REXEL
  ./backup-rexel.sh ~/Studio/REXEL rexel ~/Desktop

テーマスラッグを省略すると、標準テーマ以外を自動で探します。
出力先を省略するとデスクトップに保存します。
USAGE
  exit 1
fi

[ -d "$SITE_ROOT" ] || { echo "エラー: フォルダがありません: $SITE_ROOT" >&2; exit 1; }
SITE_ROOT="$(cd "$SITE_ROOT" && pwd)"

# wp-content が1階層下にある場合も拾う
if [ ! -d "$SITE_ROOT/wp-content" ]; then
  for candidate in "$SITE_ROOT"/*/wp-content; do
    if [ -d "$candidate" ]; then SITE_ROOT="$(dirname "$candidate")"; break; fi
  done
fi

WP_CONTENT="$SITE_ROOT/wp-content"
THEMES_DIR="$WP_CONTENT/themes"

[ -d "$WP_CONTENT" ] || { echo "エラー: wp-content が見つかりません: $SITE_ROOT" >&2; exit 1; }
command -v zip >/dev/null 2>&1 || { echo "エラー: zip コマンドが必要です。" >&2; exit 1; }

STAMP="$(date '+%Y%m%d-%H%M%S')"
OUT="$OUT_BASE/rexel-backup-$STAMP"
mkdir -p "$OUT/01_テーマzip" "$OUT/02_メディア" "$OUT/03_データベース" "$OUT/04_サイト全体" "$OUT/05_レポート"

# zip から除外する雑多なファイル
EXCLUDES=(-x '*/.DS_Store' '*/__MACOSX/*' '*/node_modules/*' '*/.git/*' '*/.svn/*' '*.log')

echo "==================================================================="
echo " REXEL バックアップ作成"
echo " 元サイト : $SITE_ROOT"
echo " 出力先   : $OUT"
echo "==================================================================="
echo

# --- テーマスラッグの決定 --------------------------------------------------
if [ -z "$THEME_SLUG" ]; then
  echo "[1/7] テーマを自動判定中..."
  for d in "$THEMES_DIR"/*/; do
    [ -d "$d" ] || continue
    s="$(basename "$d")"
    case "$s" in
      twenty*|.*) continue ;;    # WordPress 標準テーマは除外
    esac
    THEME_SLUG="$s"
    break
  done
  if [ -z "$THEME_SLUG" ]; then
    # 標準テーマしか無い場合は最初のものを使う
    for d in "$THEMES_DIR"/*/; do
      [ -d "$d" ] || continue
      THEME_SLUG="$(basename "$d")"; break
    done
  fi
  echo "      → $THEME_SLUG を対象にします"
else
  echo "[1/7] 対象テーマ: $THEME_SLUG"
fi

THEME_DIR="$THEMES_DIR/$THEME_SLUG"
[ -d "$THEME_DIR" ] || { echo "エラー: テーマがありません: $THEME_DIR" >&2; exit 1; }
echo

# --- 1. テーマ zip（本番の「テーマのアップロード」用） ---------------------
echo "[2/7] テーマ zip を作成中..."
(
  cd "$THEMES_DIR"
  zip -rq "$OUT/01_テーマzip/$THEME_SLUG.zip" "$THEME_SLUG" "${EXCLUDES[@]}"
)
echo "      → 01_テーマzip/$THEME_SLUG.zip ($(du -h "$OUT/01_テーマzip/$THEME_SLUG.zip" | cut -f1))"

# 子テーマなら親テーマも同梱
PARENT_SLUG=""
if [ -f "$THEME_DIR/style.css" ]; then
  # 親テーマ指定が無いテーマでは grep が非マッチ終了するため || true で吸収する
  PARENT_SLUG="$(grep -m1 -i '^[[:space:]]*Template:' "$THEME_DIR/style.css" 2>/dev/null \
    | sed 's/.*[Tt]emplate:[[:space:]]*//' | tr -d '\r[:space:]' || true)"
fi
if [ -n "$PARENT_SLUG" ] && [ -d "$THEMES_DIR/$PARENT_SLUG" ]; then
  echo "      子テーマを検出。親テーマ ($PARENT_SLUG) も書き出します..."
  (
    cd "$THEMES_DIR"
    zip -rq "$OUT/01_テーマzip/$PARENT_SLUG.zip" "$PARENT_SLUG" "${EXCLUDES[@]}"
  )
  echo "      → 01_テーマzip/$PARENT_SLUG.zip （こちらを先にアップロードすること）"
fi
echo

# --- 2. メディア（uploads） ------------------------------------------------
echo "[3/7] メディアファイル（uploads）を保存中..."
if [ -d "$WP_CONTENT/uploads" ]; then
  (
    cd "$WP_CONTENT"
    zip -rq "$OUT/02_メディア/uploads.zip" "uploads" "${EXCLUDES[@]}"
  )
  echo "      → 02_メディア/uploads.zip ($(du -h "$OUT/02_メディア/uploads.zip" | cut -f1))"
  if [ -d "$WP_CONTENT/uploads/fonts" ]; then
    (
      cd "$WP_CONTENT/uploads"
      zip -rq "$OUT/02_メディア/fonts-only.zip" "fonts" "${EXCLUDES[@]}"
    )
    echo "      → 02_メディア/fonts-only.zip （フォントライブラリのフォント）"
  fi
else
  echo "      uploads フォルダがありません（スキップ）"
fi
echo

# --- 3. データベース -------------------------------------------------------
echo "[4/7] データベースを保存中..."
SQLITE_FILE=""
for f in "$WP_CONTENT/database/.ht.sqlite" "$WP_CONTENT/database/.ht.sqlite3"; do
  [ -f "$f" ] && { SQLITE_FILE="$f"; break; }
done
if [ -z "$SQLITE_FILE" ]; then
  SQLITE_FILE="$(find "$WP_CONTENT" -maxdepth 3 -type f \
    \( -name '*.sqlite' -o -name '*.sqlite3' -o -name '.ht.sqlite*' \) 2>/dev/null | head -1)"
fi

DB_KIND="none"
if [ -n "$SQLITE_FILE" ]; then
  DB_KIND="sqlite"
  cp "$SQLITE_FILE" "$OUT/03_データベース/$(basename "$SQLITE_FILE")"
  echo "      → 03_データベース/$(basename "$SQLITE_FILE") （SQLite 原本）"
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$SQLITE_FILE" .dump > "$OUT/03_データベース/dump-sqlite.sql" 2>/dev/null || true
    if [ -s "$OUT/03_データベース/dump-sqlite.sql" ]; then
      echo "      → 03_データベース/dump-sqlite.sql （中身確認用のテキスト出力）"
    fi
  fi
  echo
  echo "      【重要】これは SQLite です。エックスサーバー等の本番は MySQL のため、"
  echo "      このファイルをアップロードしても動きません。移行は"
  echo "      All-in-One WP Migration 経由で行ってください（MIGRATION-GUIDE.md 参照）。"
else
  echo "      SQLite ファイルは見つかりませんでした。"
  echo "      MySQL 構成の場合は phpMyAdmin 等で別途エクスポートしてください。"
fi
echo

# --- 4. wp-content 全体（保険のフルバックアップ） --------------------------
echo "[5/7] wp-content 全体をバックアップ中...（時間がかかる場合があります）"
(
  cd "$SITE_ROOT"
  zip -rq "$OUT/04_サイト全体/wp-content-full.zip" "wp-content" "${EXCLUDES[@]}"
)
echo "      → 04_サイト全体/wp-content-full.zip ($(du -h "$OUT/04_サイト全体/wp-content-full.zip" | cut -f1))"

if [ -f "$SITE_ROOT/wp-config.php" ]; then
  cp "$SITE_ROOT/wp-config.php" "$OUT/04_サイト全体/wp-config.php.参考"
  echo "      → 04_サイト全体/wp-config.php.参考"
  echo "        ※ 接続情報が入っています。本番へはアップロードせず、共有もしないでください。"
fi
echo

# --- 5. 変更ファイルのレポート ---------------------------------------------
echo "[6/7] 変更内容のレポートを作成中..."

if stat -f '%m' . >/dev/null 2>&1; then
  file_mtime()      { stat -f '%m' "$1" 2>/dev/null; }
  file_mtime_human(){ stat -f '%Sm' -t '%Y-%m-%d %H:%M' "$1" 2>/dev/null; }
else
  file_mtime()      { stat -c '%Y' "$1" 2>/dev/null; }
  file_mtime_human(){ stat -c '%y' "$1" 2>/dev/null | cut -c1-16; }
fi

REPORT="$OUT/05_レポート/変更ファイル一覧.txt"
# 該当ファイルが1件も無いと find/grep が非ゼロ終了するため、この区間だけ緩める
set +e
set +o pipefail
{
  echo "REXEL — 変更ファイル一覧"
  echo "作成日時 : $(date '+%Y-%m-%d %H:%M:%S')"
  echo "元サイト : $SITE_ROOT"
  echo "テーマ   : $THEME_SLUG"
  echo
  echo "== テーマ内のファイル（更新日時の新しい順） =="
  echo "   上のほうにあるファイルほど、最近手を入れた箇所です。"
  echo
  find "$THEME_DIR" -type f ! -path '*/node_modules/*' ! -path '*/.git/*' ! -name '.DS_Store' 2>/dev/null \
  | while IFS= read -r f; do
      m="$(file_mtime "$f")"
      [ -n "$m" ] && printf '%s\t%s\t%s\n' "$m" "$(file_mtime_human "$f")" "${f#$THEMES_DIR/}"
    done | sort -rn | cut -f2,3
  echo
  echo "== テーマ内の画像ファイル =="
  find "$THEME_DIR" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \
    -o -iname '*.gif' -o -iname '*.svg' -o -iname '*.webp' -o -iname '*.avif' \) 2>/dev/null \
    | sed "s|$THEMES_DIR/||" | sort
  echo
  echo "== フォントファイル（テーマ内 + uploads） =="
  find "$THEME_DIR" "$WP_CONTENT/uploads" -type f \
    \( -iname '*.woff' -o -iname '*.woff2' -o -iname '*.ttf' -o -iname '*.otf' -o -iname '*.eot' \) 2>/dev/null \
    | sed "s|$SITE_ROOT/||" | sort
} > "$REPORT" 2>/dev/null
set -e
set -o pipefail
echo "      → 05_レポート/変更ファイル一覧.txt"

# ファイルの指紋（後で照合するため）
HASHES="$OUT/05_レポート/ファイル一覧-ハッシュ.txt"
if command -v shasum >/dev/null 2>&1; then
  find "$THEME_DIR" -type f ! -path '*/node_modules/*' ! -name '.DS_Store' -exec shasum -a 256 {} \; 2>/dev/null \
    | sed "s|$THEMES_DIR/||" | sort -k2 > "$HASHES" || true
elif command -v sha256sum >/dev/null 2>&1; then
  find "$THEME_DIR" -type f ! -path '*/node_modules/*' ! -name '.DS_Store' -exec sha256sum {} \; 2>/dev/null \
    | sed "s|$THEMES_DIR/||" | sort -k2 > "$HASHES" || true
fi
[ -s "$HASHES" ] && echo "      → 05_レポート/ファイル一覧-ハッシュ.txt （移管後の照合用）"
echo

# --- 6. 目次 ---------------------------------------------------------------
echo "[7/7] 目次を作成中..."
cat > "$OUT/はじめにお読みください.txt" <<EOF
REXEL バックアップ
作成日時 : $(date '+%Y-%m-%d %H:%M:%S')
元サイト : $SITE_ROOT
テーマ   : $THEME_SLUG
DB種類   : $DB_KIND

-------------------------------------------------------------------
フォルダの中身
-------------------------------------------------------------------
01_テーマzip/
    $THEME_SLUG.zip
        本番 WordPress の「外観 → テーマ → 新規追加 → テーマのアップロード」
        にそのまま入れられる zip です。$( [ -n "$PARENT_SLUG" ] && echo "
    $PARENT_SLUG.zip
        親テーマ。$THEME_SLUG より先にアップロードしてください。" )

02_メディア/
    uploads.zip
        管理画面から追加した画像などのメディアファイル一式。
        FTP で本番の wp-content/uploads/ に展開します。$( [ -d "$WP_CONTENT/uploads/fonts" ] && echo "
    fonts-only.zip
        フォントライブラリのフォント。単体で差し替えたいとき用。" )

03_データベース/
    文言・ページ内容・サイトエディターでの変更・フォント設定が入っています。
    $( [ "$DB_KIND" = "sqlite" ] && echo "SQLite 形式のため、本番(MySQL)へは直接置けません。
    All-in-One WP Migration での移行が必要です。" || echo "phpMyAdmin 等で別途エクスポートしてください。" )

04_サイト全体/
    wp-content-full.zip   テーマ・プラグイン・メディアを丸ごと保存した保険用
    wp-config.php.参考    接続情報入り。本番へは置かない。人に渡さない。

05_レポート/
    変更ファイル一覧.txt          どのファイルをいつ触ったかの一覧
    ファイル一覧-ハッシュ.txt      移管後に中身が一致するか照合するため

-------------------------------------------------------------------
次にやること
-------------------------------------------------------------------
MIGRATION-GUIDE.md の手順に従って本番へ移管してください。

重要な注意:
  テーマ zip だけでは移管は完了しません。
  管理画面（サイトエディター・ブロックエディタ・カスタマイザー）で行った
  変更はテーマファイルではなくデータベースに保存されているため、
  データベースも一緒に移す必要があります。
EOF
echo "      → はじめにお読みください.txt"
echo

echo "==================================================================="
echo " 完了"
echo
echo "  保存先 : $OUT"
echo "  合計   : $(du -sh "$OUT" 2>/dev/null | cut -f1)"
echo
echo "  まず「はじめにお読みください.txt」を開いてください。"
echo "==================================================================="
