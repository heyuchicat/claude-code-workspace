import { BusinessProduct } from "./types";

// Googleビジネスプロフィールの商品・サービス(Products)のダミークライアント(デモモード用)。

const globalForMock = globalThis as unknown as {
  __meoMockProducts?: BusinessProduct[];
  __meoMockProductSeq?: number;
};

function getProducts(): BusinessProduct[] {
  if (!globalForMock.__meoMockProducts) {
    globalForMock.__meoMockProducts = [
      {
        id: "mock_product_1",
        locationId: "gbp_loc_001",
        category: "フード",
        name: "本日のランチセット",
        description: "日替わりメイン+サラダ+ドリンク付き",
        priceYen: 1200,
        photoUrl: "https://picsum.photos/seed/product1/600/400",
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    ];
    globalForMock.__meoMockProductSeq = 1;
  }
  return globalForMock.__meoMockProducts;
}

function nextSeq(): number {
  globalForMock.__meoMockProductSeq = (globalForMock.__meoMockProductSeq ?? 0) + 1;
  return globalForMock.__meoMockProductSeq;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchProducts(): Promise<BusinessProduct[]> {
  await delay(150);
  return [...getProducts()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export type CreateProductInput = {
  locationId: string;
  category: string;
  name: string;
  description: string;
  priceYen: number | null;
  photoUrl: string;
};

export async function createProduct(input: CreateProductInput): Promise<BusinessProduct> {
  await delay(200);
  const product: BusinessProduct = {
    id: `mock_product_${nextSeq()}`,
    ...input,
    createdAt: new Date().toISOString(),
  };
  getProducts().push(product);
  return product;
}

export async function deleteProduct(productId: string): Promise<void> {
  await delay(150);
  const products = getProducts();
  const index = products.findIndex((p) => p.id === productId);
  if (index !== -1) products.splice(index, 1);
}
