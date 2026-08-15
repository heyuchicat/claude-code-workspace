(() => {
  "use strict";

  const video = document.getElementById("preview");
  const canvas = document.getElementById("capture-canvas");
  const statusOverlay = document.getElementById("status-overlay");
  const statusMessage = document.getElementById("status-message");
  const retryBtn = document.getElementById("retry-btn");
  const flashOverlay = document.getElementById("flash-overlay");
  const flashToggleBtn = document.getElementById("flash-toggle");
  const shutterBtn = document.getElementById("shutter-btn");
  const switchCameraBtn = document.getElementById("switch-camera-btn");
  const galleryBtn = document.getElementById("gallery-btn");
  const thumbPreview = document.getElementById("thumb-preview");
  const galleryView = document.getElementById("gallery-view");
  const galleryGrid = document.getElementById("gallery-grid");
  const galleryEmpty = document.getElementById("gallery-empty");
  const galleryCount = document.getElementById("gallery-count");
  const galleryCloseBtn = document.getElementById("gallery-close-btn");
  const photoView = document.getElementById("photo-view");
  const photoViewImg = document.getElementById("photo-view-img");
  const photoBackBtn = document.getElementById("photo-back-btn");
  const photoDownloadBtn = document.getElementById("photo-download-btn");
  const photoDeleteBtn = document.getElementById("photo-delete-btn");

  const state = {
    facingMode: "environment",
    stream: null,
    track: null,
    torchSupported: false,
    flashOn: false,
    photos: [], // {id, blob, url, createdAt}
    currentPhotoId: null,
  };

  // ---------- IndexedDB: 撮影した写真の永続化 ----------
  const DB_NAME = "camera-app-db";
  const STORE_NAME = "photos";
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function dbGetAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbPut(record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function dbDelete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ---------- カメラ起動 ----------
  function stopStream() {
    if (state.stream) {
      state.stream.getTracks().forEach((t) => t.stop());
      state.stream = null;
      state.track = null;
    }
  }

  function showStatus(message, showRetry) {
    statusMessage.textContent = message;
    retryBtn.classList.toggle("hidden", !showRetry);
    statusOverlay.classList.remove("hidden");
  }

  function hideStatus() {
    statusOverlay.classList.add("hidden");
  }

  async function startCamera() {
    stopStream();
    showStatus("カメラを起動しています…", false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showStatus("このブラウザはカメラに対応していません。iPhoneのSafariで開いてください。", false);
      return;
    }

    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: state.facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      state.stream = stream;
      state.track = stream.getVideoTracks()[0];
      video.srcObject = stream;
      video.classList.toggle("mirrored", state.facingMode === "user");

      const caps = state.track.getCapabilities ? state.track.getCapabilities() : {};
      state.torchSupported = !!caps.torch;
      flashToggleBtn.classList.toggle("hidden", !state.torchSupported);
      if (!state.torchSupported) state.flashOn = false;
      updateFlashUI();

      hideStatus();
    } catch (err) {
      let msg = "カメラを起動できませんでした。";
      if (err && err.name === "NotAllowedError") {
        msg = "カメラへのアクセスが許可されていません。設定アプリ > Safari > カメラ で許可してください。";
      } else if (err && err.name === "NotFoundError") {
        msg = "利用できるカメラが見つかりませんでした。";
      }
      showStatus(msg, true);
    }
  }

  retryBtn.addEventListener("click", startCamera);

  switchCameraBtn.addEventListener("click", () => {
    state.facingMode = state.facingMode === "environment" ? "user" : "environment";
    startCamera();
  });

  // ---------- フラッシュ(トーチ)切り替え ----------
  async function updateFlashUI() {
    flashToggleBtn.classList.toggle("active", state.flashOn);
  }

  flashToggleBtn.addEventListener("click", async () => {
    if (!state.track) return;
    state.flashOn = !state.flashOn;
    updateFlashUI();
    if (state.torchSupported) {
      try {
        await state.track.applyConstraints({ advanced: [{ torch: state.flashOn }] });
      } catch (e) {
        // トーチ制御に失敗した場合は撮影時のスクリーンフラッシュのみで代用
      }
    }
  });

  // ---------- 撮影 ----------
  async function preCaptureScreenFlash() {
    return new Promise((resolve) => {
      flashOverlay.style.transition = "none";
      flashOverlay.style.opacity = "0.95";
      requestAnimationFrame(() => {
        setTimeout(() => {
          flashOverlay.style.transition = "opacity 200ms ease-out";
          flashOverlay.style.opacity = "0";
          resolve();
        }, 120);
      });
    });
  }

  function shutterClickFlash() {
    flashOverlay.classList.remove("flash-active");
    // reflow でアニメーションを再トリガー
    void flashOverlay.offsetWidth;
    flashOverlay.classList.add("flash-active");
  }

  async function capturePhoto() {
    if (!state.track || video.readyState < 2) return;

    // トーチ非対応で、かつフラッシュONの場合は撮影前に画面を光らせる
    if (state.flashOn && !state.torchSupported) {
      await preCaptureScreenFlash();
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    if (state.facingMode === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);

    shutterClickFlash();
    if (navigator.vibrate) navigator.vibrate(20);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const record = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        blob,
        createdAt: Date.now(),
      };
      await dbPut(record);
      addPhotoToState(record);
      updateThumb();
    }, "image/jpeg", 0.92);
  }

  shutterBtn.addEventListener("click", capturePhoto);

  // ---------- 写真の状態管理 ----------
  function addPhotoToState(record) {
    const url = URL.createObjectURL(record.blob);
    state.photos.unshift({ id: record.id, url, createdAt: record.createdAt });
  }

  function updateThumb() {
    const latest = state.photos[0];
    thumbPreview.style.backgroundImage = latest ? `url(${latest.url})` : "none";
  }

  async function loadPhotosFromDB() {
    const records = await dbGetAll();
    records.sort((a, b) => b.createdAt - a.createdAt);
    state.photos = records.map((r) => ({
      id: r.id,
      url: URL.createObjectURL(r.blob),
      createdAt: r.createdAt,
    }));
    updateThumb();
  }

  // ---------- ギャラリー一覧 ----------
  function renderGallery() {
    galleryGrid.innerHTML = "";
    galleryCount.textContent = state.photos.length ? `${state.photos.length}枚` : "";
    galleryEmpty.classList.toggle("hidden", state.photos.length > 0);

    for (const photo of state.photos) {
      const btn = document.createElement("button");
      btn.className = "gallery-item";
      btn.style.backgroundImage = `url(${photo.url})`;
      btn.addEventListener("click", () => openPhotoView(photo.id));
      galleryGrid.appendChild(btn);
    }
  }

  function openGallery() {
    renderGallery();
    galleryView.classList.remove("hidden");
  }

  function closeGallery() {
    galleryView.classList.add("hidden");
  }

  galleryBtn.addEventListener("click", openGallery);
  galleryCloseBtn.addEventListener("click", closeGallery);

  // ---------- 個別写真表示 ----------
  function openPhotoView(id) {
    const photo = state.photos.find((p) => p.id === id);
    if (!photo) return;
    state.currentPhotoId = id;
    photoViewImg.src = photo.url;
    photoView.classList.remove("hidden");
  }

  function closePhotoView() {
    photoView.classList.add("hidden");
    state.currentPhotoId = null;
  }

  photoBackBtn.addEventListener("click", closePhotoView);

  photoDownloadBtn.addEventListener("click", () => {
    const photo = state.photos.find((p) => p.id === state.currentPhotoId);
    if (!photo) return;
    const a = document.createElement("a");
    a.href = photo.url;
    a.download = `photo-${photo.createdAt}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  photoDeleteBtn.addEventListener("click", async () => {
    const id = state.currentPhotoId;
    if (!id) return;
    await dbDelete(id);
    const idx = state.photos.findIndex((p) => p.id === id);
    if (idx >= 0) {
      URL.revokeObjectURL(state.photos[idx].url);
      state.photos.splice(idx, 1);
    }
    updateThumb();
    closePhotoView();
    renderGallery();
  });

  // ---------- 初期化 ----------
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopStream();
    } else if (!state.stream) {
      startCamera();
    }
  });

  loadPhotosFromDB();
  startCamera();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
