"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../dashboard.module.css";
import type { BusinessProduct, GoogleBusinessLocation } from "@/lib/types";

export default function ProductsTab({ businessId }: { businessId: string }) {
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [products, setProducts] = useState<BusinessProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceYen, setPriceYen] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadLocations = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}/google/locations`);
    const data = await res.json();
    setLocations(data.locations);
    setLocationId((prev) => prev || data.locations[0]?.id || "");
  }, [businessId]);

  const loadProducts = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    const res = await fetch(
      `/api/businesses/${businessId}/products?locationId=${encodeURIComponent(locationId)}`
    );
    const data = await res.json();
    setProducts(data.products ?? []);
    setLoading(false);
  }, [businessId, locationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts();
  }, [loadProducts]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          category,
          name,
          description,
          priceYen: priceYen === "" ? null : Number(priceYen),
          photoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "登録に失敗しました");
      setCategory("");
      setName("");
      setDescription("");
      setPriceYen("");
      setPhotoUrl("");
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/businesses/${businessId}/uploads`, {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "アップロードに失敗しました");
      setPhotoUrl(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(productId: string) {
    setDeletingId(productId);
    try {
      await fetch(`/api/businesses/${businessId}/products/${encodeURIComponent(productId)}`, {
        method: "DELETE",
      });
      await loadProducts();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <form className={styles.scheduleForm} onSubmit={handleCreate}>
        <h2 className={styles.sectionTitle}>商品・サービスを追加</h2>
        <label className={styles.locationSelect}>
          対象ロケーション:
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </label>
        <input
          className={styles.input}
          placeholder="カテゴリ(例: フード、ヘアカット等)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />
        <input
          className={styles.input}
          placeholder="商品・サービス名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <textarea
          className={styles.textarea}
          placeholder="説明"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className={styles.input}
          type="number"
          min={0}
          placeholder="価格(円・任意)"
          value={priceYen}
          onChange={(e) => setPriceYen(e.target.value)}
        />
        <input
          className={styles.input}
          placeholder="写真URL(https://... または下からアップロード)"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          required
        />
        <label className={styles.secondaryButton} style={{ display: "inline-block", cursor: "pointer" }}>
          {uploading ? "アップロード中..." : "画像をアップロード"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: "none" }}
          />
        </label>
        {uploadError && <p className={styles.error}>{uploadError}</p>}
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="プレビュー" className={styles.postImage} />
        )}
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.primaryButton} disabled={creating}>
          {creating ? "登録中..." : "登録する"}
        </button>
      </form>

      <section>
        <h2 className={styles.sectionTitle}>登録済みの商品・サービス</h2>
        {loading ? (
          <p className={styles.loading}>読み込み中...</p>
        ) : (
          <div className={styles.postGrid}>
            {products.length === 0 && (
              <p className={styles.emptyState}>まだ登録された商品・サービスはありません。</p>
            )}
            {products.map((p) => (
              <article key={p.id} className={styles.postCard}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.photoUrl} alt={p.name} className={styles.postImage} />
                <div className={styles.postBody}>
                  <p className={styles.postMeta}>{p.category}</p>
                  <p className={styles.postCaption}>
                    <strong>{p.name}</strong>
                    {p.priceYen != null && ` ・ ¥${p.priceYen.toLocaleString("ja-JP")}`}
                  </p>
                  <p className={styles.postCaption}>{p.description}</p>
                  <button
                    className={styles.linkButton}
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id}
                  >
                    {deletingId === p.id ? "削除中..." : "削除"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
