// 1つのGoogleアカウントが複数店舗(ロケーション)を管理している場合に、
// アプリ内の店舗名とGoogle側のロケーション名を突き合わせて一致するものを判定する。

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s　]+/g, "");
}

function isMatch(locationName: string, businessName: string): boolean {
  const name = normalize(locationName);
  const target = normalize(businessName);
  if (!target) return false;
  return name.includes(target) || target.includes(name);
}

// 店舗選択ドロップダウンの初期値を決めるためのフォールバック付き選択。
// 一致しなければ先頭のロケーションを返す。
export function pickDefaultLocationId(
  locations: { id: string; name: string }[],
  businessName: string
): string {
  if (locations.length === 0) return "";
  const match = locations.find((loc) => isMatch(loc.name, businessName));
  return (match ?? locations[0]).id;
}

// サーバー側で、1つのGoogleアカウント配下の全ロケーションから、
// その店舗(businessName)に対応するものだけに絞り込む。
// 代理店が複数の顧客を同じGoogleアカウントで管理している場合、
// 他の顧客のロケーションが誤って見えてしまわないようにするため。
// 一致するものが無い場合は絞り込まず全件返す(取りこぼしを防ぐためのフォールバック)。
export function filterMatchingLocations<T extends { id: string; name: string }>(
  locations: T[],
  businessName: string
): T[] {
  if (locations.length <= 1) return locations;
  const matches = locations.filter((loc) => isMatch(loc.name, businessName));
  return matches.length > 0 ? matches : locations;
}
