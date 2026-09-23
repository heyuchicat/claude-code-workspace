// 1つのGoogleアカウントが複数店舗(ロケーション)を管理している場合、
// 「連携する」ボタンを押した店舗と関係ない場所がデフォルト選択されてしまうのを防ぐため、
// アプリ内の店舗名とGoogle側のロケーション名を突き合わせて一番近いものを選ぶ。
// 一致しなければ従来通り先頭のロケーションにフォールバックする。
export function pickDefaultLocationId(
  locations: { id: string; name: string }[],
  businessName: string
): string {
  if (locations.length === 0) return "";

  const normalize = (s: string) => s.toLowerCase().replace(/[\s　]+/g, "");
  const target = normalize(businessName);

  if (target) {
    const match = locations.find((loc) => {
      const name = normalize(loc.name);
      return name.includes(target) || target.includes(name);
    });
    if (match) return match.id;
  }

  return locations[0].id;
}
