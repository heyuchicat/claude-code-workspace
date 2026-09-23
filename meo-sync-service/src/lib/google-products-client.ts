import { BusinessProduct } from "./types";
import { getValidGoogleAccessToken } from "./google-business-client";
import type { CreateProductInput } from "./mock-products";

// Googleビジネスプロフィールの商品・サービス(Products)の実APIクライアント。
// 注意: この機能は legacy mybusiness v4 の一部として実装しているが、Products APIは
// 業種(小売・飲食等)やアカウントによって提供状況が異なる場合がある。
// 実装時点の公式ドキュメント( https://developers.google.com/my-business/content/overview )
// でエンドポイントの現状を必ず確認すること。

const LEGACY_MYBUSINESS_BASE = "https://mybusiness.googleapis.com/v4";

type ApiProduct = {
  name: string; // "locations/{locationId}/products/{productId}"
  productAttributes?: {
    category?: string;
    title?: string;
    description?: string;
    price?: { units?: string; currencyCode?: string };
  };
  photoUrl?: string;
  createTime?: string;
};

function toBusinessProduct(raw: ApiProduct, locationId: string): BusinessProduct {
  return {
    id: raw.name,
    locationId,
    category: raw.productAttributes?.category ?? "",
    name: raw.productAttributes?.title ?? "",
    description: raw.productAttributes?.description ?? "",
    priceYen: raw.productAttributes?.price?.units
      ? Number(raw.productAttributes.price.units)
      : null,
    photoUrl: raw.photoUrl ?? "",
    createdAt: raw.createTime ?? new Date().toISOString(),
  };
}

export async function fetchRealProducts(
  businessId: string,
  locationId: string
): Promise<BusinessProduct[]> {
  const { accessToken } = await getValidGoogleAccessToken(businessId);

  const res = await fetch(`${LEGACY_MYBUSINESS_BASE}/${locationId}/products`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`商品・サービス一覧の取得に失敗しました: ${await res.text()}`);
  }
  const data = await res.json();
  return ((data.products ?? []) as ApiProduct[]).map((p) => toBusinessProduct(p, locationId));
}

export async function createRealProduct(
  businessId: string,
  input: CreateProductInput
): Promise<BusinessProduct> {
  const { accessToken } = await getValidGoogleAccessToken(businessId);

  const res = await fetch(`${LEGACY_MYBUSINESS_BASE}/${input.locationId}/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productAttributes: {
        category: input.category,
        title: input.name,
        description: input.description,
        price: input.priceYen != null
          ? { units: String(input.priceYen), currencyCode: "JPY" }
          : undefined,
      },
      photoUrl: input.photoUrl,
    }),
  });
  if (!res.ok) {
    throw new Error(`商品・サービスの登録に失敗しました: ${await res.text()}`);
  }
  const data = await res.json();
  return toBusinessProduct(data, input.locationId);
}

export async function deleteRealProduct(
  businessId: string,
  productResourceName: string
): Promise<void> {
  const { accessToken } = await getValidGoogleAccessToken(businessId);

  const res = await fetch(`${LEGACY_MYBUSINESS_BASE}/${productResourceName}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`商品・サービスの削除に失敗しました: ${await res.text()}`);
  }
}
