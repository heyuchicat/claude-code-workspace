#!/usr/bin/env bash
#
# REXEL 移管ツール — フェーズ0: 現状調査
#
# WordPress Studio のサイトフォルダを読み取り専用で調べ、移管方針を決めるために
# 必要な事実（データベースの種類・有効テーマ・変更されたファイルなど）を報告します。
# このスクリプトは一切ファイルを書き換えません。
#
# 使い方:
#   ./inspect-studio-site.sh /path/to/Studio/REXEL
#
set -uo pipefail   # -e は付けない（途中で失敗しても全項目を報告したいため）

SITE_ROOT="${1:-}"

if [ -z "$SITE_ROOT" ]; then
  cat >&2 <<'USAGE'
使い方: ./inspect-studio-site.sh <Studioサイトのフォルダ>

例:
  ./inspect-studio-site.sh ~/Studio/REXEL

Studio のサイトフォルダは、アプリのサイト画面で
「サイトフォルダを開く / Open site folder」から確認できます。
wp-content や wp-config.php が直下にあるフォルダを指定してください。
USAGE
  exit 1
fi

if [ ! -d "$SITE_ROOT" ]; then
  echo "エラー: フォルダが見つかりません: $SITE_ROOT" >&2
  exit 1
fi

# 絶対パスに正規化
SITE_ROOT="$(cd "$SITE_ROOT" && pwd)"

# wp-content が1階層下にある場合も拾う
if [ ! -d "$SITE_ROOT/wp-content" ]; then
  for candidate in "$SITE_ROOT"/*/wp-content; do
    if [ -d "$candidate" ]; then
      SITE_ROOT="$(dirname "$candidate")"
      break
    fi
  done
fi

WP_CONTENT="$SITE_ROOT/wp-content"

echo "==================================================================="
echo " REXEL — Studio サイト調査レポート"
echo " 日時      : $(date '+%Y-%m-%d %H:%M:%S')"
echo " サイト    : $SITE_ROOT"
echo "==================================================================="
echo

if [ ! -d "$WP_CONTENT" ]; then
  echo "!! wp-content フォルダが見つかりません。"
  echo "!! 指定したフォルダが WordPress のインストール先か確認してください。"
  echo
  echo "直下の内容:"
  ls -la "$SITE_ROOT" 2>/dev/null | head -30
  exit 1
fi

# --- stat の差異を吸収（macOS=BSD / Linux=GNU） ---------------------------
if stat -f '%m' . >/dev/null 2>&1; then
  file_mtime()      { stat -f '%m' "$1" 2>/dev/null; }
  file_mtime_human(){ stat -f '%Sm' -t '%Y-%m-%d %H:%M' "$1" 2>/dev/null; }
else
  file_mtime()      { stat -c '%Y' "$1" 2>/dev/null; }
  file_mtime_human(){ stat -c '%y' "$1" 2>/dev/null | cut -c1-16; }
fi

# --- 1. データベースの種類 -------------------------------------------------
echo "-------------------------------------------------------------------"
echo " 1. データベースの種類"
echo "-------------------------------------------------------------------"
DB_KIND="unknown"
SQLITE_FILE=""

for f in "$WP_CONTENT/database/.ht.sqlite" "$WP_CONTENT/database/.ht.sqlite3" \
         "$WP_CONTENT/db.sqlite" "$WP_CONTENT/database/wordpress.db"; do
  if [ -f "$f" ]; then
    SQLITE_FILE="$f"
    DB_KIND="sqlite"
    break
  fi
done

if [ -z "$SQLITE_FILE" ]; then
  found="$(find "$WP_CONTENT" -maxdepth 3 -type f \( -name '*.sqlite' -o -name '*.sqlite3' -o -name '.ht.sqlite*' \) 2>/dev/null | head -1)"
  if [ -n "$found" ]; then
    SQLITE_FILE="$found"
    DB_KIND="sqlite"
  fi
fi

if [ "$DB_KIND" = "sqlite" ]; then
  echo "  種類     : SQLite  ← Studio の標準構成"
  echo "  ファイル : $SQLITE_FILE"
  echo "  サイズ   : $(du -h "$SQLITE_FILE" 2>/dev/null | cut -f1)"
  echo
  echo "  【重要】エックスサーバー等の本番は MySQL/MariaDB です。"
  echo "  SQLite ファイルをそのままアップロードしても動きません。"
  echo "  → All-in-One WP Migration などのプラグイン経由での移行が必要です。"
  echo "     （詳細は MIGRATION-GUIDE.md のルートA を参照）"
elif [ -f "$SITE_ROOT/wp-config.php" ]; then
  echo "  SQLite ファイルは見つかりませんでした。"
  echo "  wp-config.php の設定:"
  grep -E "DB_(NAME|USER|HOST)" "$SITE_ROOT/wp-config.php" 2>/dev/null \
    | sed "s/'[^']*'\s*)/'***' )/2" | sed 's/^/    /'
  echo "  → MySQL 構成の可能性があります。"
else
  echo "  判定できませんでした。wp-config.php も SQLite ファイルもありません。"
fi

if [ -f "$WP_CONTENT/db.php" ]; then
  echo "  補足: wp-content/db.php が存在（SQLite Integration のドロップイン）"
fi
echo

# --- 2. テーマ -------------------------------------------------------------
echo "-------------------------------------------------------------------"
echo " 2. インストール済みテーマ"
echo "-------------------------------------------------------------------"
THEMES_DIR="$WP_CONTENT/themes"
if [ -d "$THEMES_DIR" ]; then
  for d in "$THEMES_DIR"/*/; do
    [ -d "$d" ] || continue
    slug="$(basename "$d")"
    name=""
    if [ -f "$d/style.css" ]; then
      name="$(grep -m1 -i '^[[:space:]]*Theme Name:' "$d/style.css" 2>/dev/null | sed 's/.*[Nn]ame:[[:space:]]*//' | tr -d '\r')"
    fi
    parent=""
    if [ -f "$d/style.css" ]; then
      parent="$(grep -m1 -i '^[[:space:]]*Template:' "$d/style.css" 2>/dev/null | sed 's/.*[Tt]emplate:[[:space:]]*//' | tr -d '\r')"
    fi
    size="$(du -sh "$d" 2>/dev/null | cut -f1)"
    kind="クラシックテーマ"
    [ -d "$d/templates" ] && kind="ブロックテーマ"
    [ -f "$d/theme.json" ] && kind="$kind (theme.json あり)"

    printf "  [%s]\n" "$slug"
    printf "     表示名   : %s\n" "${name:-（不明）}"
    printf "     種類     : %s\n" "$kind"
    [ -n "$parent" ] && printf "     親テーマ : %s  ← 子テーマです。親も一緒に移管が必要\n" "$parent"
    printf "     サイズ   : %s\n" "$size"
  done
else
  echo "  themes フォルダがありません。"
fi
echo

# --- 3. 有効テーマの判定（SQLite が読める場合） ----------------------------
echo "-------------------------------------------------------------------"
echo " 3. 現在有効なテーマ"
echo "-------------------------------------------------------------------"
ACTIVE_THEME=""
if [ "$DB_KIND" = "sqlite" ] && command -v sqlite3 >/dev/null 2>&1; then
  prefix="$(sqlite3 "$SQLITE_FILE" ".tables" 2>/dev/null | tr ' ' '\n' | grep -m1 'options$' | sed 's/options$//')"
  if [ -n "$prefix" ]; then
    ACTIVE_THEME="$(sqlite3 "$SQLITE_FILE" \
      "SELECT option_value FROM ${prefix}options WHERE option_name='stylesheet' LIMIT 1;" 2>/dev/null)"
    TEMPLATE_THEME="$(sqlite3 "$SQLITE_FILE" \
      "SELECT option_value FROM ${prefix}options WHERE option_name='template' LIMIT 1;" 2>/dev/null)"
    SITE_URL="$(sqlite3 "$SQLITE_FILE" \
      "SELECT option_value FROM ${prefix}options WHERE option_name='siteurl' LIMIT 1;" 2>/dev/null)"
    echo "  有効テーマ (stylesheet) : ${ACTIVE_THEME:-判定不可}"
    echo "  親テーマ   (template)   : ${TEMPLATE_THEME:-判定不可}"
    echo "  サイトURL               : ${SITE_URL:-判定不可}"
    echo "  テーブル接頭辞          : $prefix"
  else
    echo "  options テーブルが読めませんでした。"
  fi
elif [ "$DB_KIND" = "sqlite" ]; then
  echo "  sqlite3 コマンドが無いため判定できません。"
  echo "  （macOS には標準で入っています。無ければ: brew install sqlite）"
else
  echo "  データベースを読めないため判定できません。"
  echo "  WordPress 管理画面の「外観 → テーマ」で有効なテーマ名を確認してください。"
fi
echo

# --- 4. サイトエディターでの変更の有無（最重要） ----------------------------
echo "-------------------------------------------------------------------"
echo " 4. データベース側の見た目の変更（サイトエディター等）"
echo "-------------------------------------------------------------------"
echo "  ※ ここに件数があると、テーマzipだけでは移管できません。"
echo
if [ "$DB_KIND" = "sqlite" ] && command -v sqlite3 >/dev/null 2>&1 && [ -n "${prefix:-}" ]; then
  for ptype in wp_template wp_template_part wp_global_styles wp_navigation wp_font_family wp_font_face; do
    cnt="$(sqlite3 "$SQLITE_FILE" \
      "SELECT COUNT(*) FROM ${prefix}posts WHERE post_type='$ptype' AND post_status!='trash';" 2>/dev/null)"
    label=""
    case "$ptype" in
      wp_template)      label="テンプレート（サイトエディターで編集したページ構造）" ;;
      wp_template_part) label="テンプレートパーツ（ヘッダー・フッター等）" ;;
      wp_global_styles) label="グローバルスタイル（色・フォント設定）" ;;
      wp_navigation)    label="ナビゲーションメニュー" ;;
      wp_font_family)   label="フォントライブラリ（フォントファミリー）" ;;
      wp_font_face)     label="フォントライブラリ（フォントフェイス）" ;;
    esac
    printf "  %-18s : %-4s 件   %s\n" "$ptype" "${cnt:-?}" "$label"
  done
  echo
  pages="$(sqlite3 "$SQLITE_FILE" "SELECT COUNT(*) FROM ${prefix}posts WHERE post_type='page' AND post_status='publish';" 2>/dev/null)"
  posts="$(sqlite3 "$SQLITE_FILE" "SELECT COUNT(*) FROM ${prefix}posts WHERE post_type='post' AND post_status='publish';" 2>/dev/null)"
  atts="$(sqlite3 "$SQLITE_FILE" "SELECT COUNT(*) FROM ${prefix}posts WHERE post_type='attachment';" 2>/dev/null)"
  echo "  公開固定ページ     : ${pages:-?} 件"
  echo "  公開投稿           : ${posts:-?} 件"
  echo "  メディア(添付)     : ${atts:-?} 件  ← 管理画面から入れた画像はここ"
else
  echo "  データベースを読めないため確認できません。"
  echo "  WordPress 管理画面で「外観 → エディター」が存在し、そこで編集した"
  echo "  記憶があるなら、データベース移行が必須と考えてください。"
fi
echo

# --- 5. フォント -----------------------------------------------------------
echo "-------------------------------------------------------------------"
echo " 5. フォントファイル"
echo "-------------------------------------------------------------------"
font_count=0
for base in "$THEMES_DIR" "$WP_CONTENT/uploads"; do
  [ -d "$base" ] || continue
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    font_count=$((font_count + 1))
    printf "  %s  (%s)\n" "${f#$SITE_ROOT/}" "$(du -h "$f" 2>/dev/null | cut -f1)"
  done <<EOF
$(find "$base" -type f \( -iname '*.woff' -o -iname '*.woff2' -o -iname '*.ttf' -o -iname '*.otf' -o -iname '*.eot' \) 2>/dev/null | head -60)
EOF
done
if [ "$font_count" -eq 0 ]; then
  echo "  自前のフォントファイルは見つかりませんでした。"
  echo "  → Google Fonts 等を CDN 読み込みしている可能性があります。"
  echo "    その場合、本番サーバーでも同じ URL が読めれば動きます。"
else
  echo
  echo "  合計 $font_count 件"
  if [ -d "$WP_CONTENT/uploads/fonts" ]; then
    echo "  ※ uploads/fonts があります = WordPress のフォントライブラリ機能を使用。"
    echo "    ファイルとデータベースの両方を移行しないとフォントが外れます。"
  fi
fi
echo

# --- 6. 最近変更されたテーマファイル ---------------------------------------
echo "-------------------------------------------------------------------"
echo " 6. 最近変更されたテーマファイル（新しい順・上位40件）"
echo "-------------------------------------------------------------------"
echo "  ここに出るファイルが「あなたが手を入れた箇所」の候補です。"
echo
TMP_LIST="$(mktemp)"
if [ -d "$THEMES_DIR" ]; then
  find "$THEMES_DIR" -type f \
    ! -path '*/node_modules/*' ! -path '*/.git/*' \
    ! -name '.DS_Store' ! -name '*.map' 2>/dev/null \
  | while IFS= read -r f; do
      m="$(file_mtime "$f")"
      [ -n "$m" ] && printf '%s\t%s\t%s\n' "$m" "$(file_mtime_human "$f")" "${f#$SITE_ROOT/}"
    done | sort -rn | head -40 > "$TMP_LIST"

  if [ -s "$TMP_LIST" ]; then
    while IFS="$(printf '\t')" read -r _epoch human path; do
      printf "  %s  %s\n" "$human" "$path"
    done < "$TMP_LIST"
  else
    echo "  （該当なし）"
  fi
fi
rm -f "$TMP_LIST"
echo

# --- 7. プラグイン ---------------------------------------------------------
echo "-------------------------------------------------------------------"
echo " 7. プラグイン"
echo "-------------------------------------------------------------------"
if [ -d "$WP_CONTENT/plugins" ]; then
  for d in "$WP_CONTENT/plugins"/*/; do
    [ -d "$d" ] || continue
    printf "  %s\n" "$(basename "$d")"
  done
else
  echo "  plugins フォルダがありません。"
fi
echo

# --- 8. 容量 ---------------------------------------------------------------
echo "-------------------------------------------------------------------"
echo " 8. 容量（移行方法の判断材料）"
echo "-------------------------------------------------------------------"
[ -d "$THEMES_DIR" ]           && echo "  themes  : $(du -sh "$THEMES_DIR" 2>/dev/null | cut -f1)"
[ -d "$WP_CONTENT/uploads" ]   && echo "  uploads : $(du -sh "$WP_CONTENT/uploads" 2>/dev/null | cut -f1)"
[ -d "$WP_CONTENT/plugins" ]   && echo "  plugins : $(du -sh "$WP_CONTENT/plugins" 2>/dev/null | cut -f1)"
echo "  wp-content 合計 : $(du -sh "$WP_CONTENT" 2>/dev/null | cut -f1)"
echo
echo "  ※ All-in-One WP Migration の無料版はインポート上限があります"
echo "    （環境により 40MB〜512MB 程度）。超える場合は MIGRATION-GUIDE.md の"
echo "    ルートB（手動移行）を使ってください。"
echo

echo "==================================================================="
echo " 調査完了"
echo
echo " 次のステップ:"
echo "   1. このレポートを保存する（画面をコピーするか、下記のように実行）"
echo "        ./inspect-studio-site.sh \"$SITE_ROOT\" > ~/Desktop/rexel-調査結果.txt"
echo "   2. バックアップを作成する"
echo "        ./backup-rexel.sh \"$SITE_ROOT\""
echo "   3. MIGRATION-GUIDE.md に従って本番へ移管する"
echo "==================================================================="
