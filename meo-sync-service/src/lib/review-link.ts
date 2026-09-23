import QRCode from "qrcode";

// Google公式のクチコミ投稿画面へ直接遷移するリンクを生成する。
// 参考: https://support.google.com/business/answer/7035772 (クチコミ投稿リンクの作成)
export function buildReviewRequestUrl(placeId: string): string {
  const url = new URL("https://search.google.com/local/writereview");
  url.searchParams.set("placeid", placeId);
  return url.toString();
}

export async function buildReviewRequestQrCodeDataUrl(placeId: string): Promise<string> {
  const url = buildReviewRequestUrl(placeId);
  return QRCode.toDataURL(url, { width: 320, margin: 1 });
}
