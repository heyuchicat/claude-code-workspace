(() => {
  "use strict";

  const video = document.getElementById("preview");
  const canvas = document.getElementById("capture-canvas");
  const statusOverlay = document.getElementById("status-overlay");
  const statusMessage = document.getElementById("status-message");
  const retryBtn = document.getElementById("retry-btn");
  const flashOverlay = document.getElementById("flash-overlay");

  const hideBtn = document.getElementById("hide-btn");
  const recordTimer = document.getElementById("record-timer");
  const flashToggleBtn = document.getElementById("flash-toggle");
  const modePhotoBtn = document.getElementById("mode-photo-btn");
  const modeVideoBtn = document.getElementById("mode-video-btn");
  const shutterBtn = document.getElementById("shutter-btn");
  const switchCameraBtn = document.getElementById("switch-camera-btn");
  const galleryBtn = document.getElementById("gallery-btn");
  const thumbPreview = document.getElementById("thumb-preview");

  const disguiseView = document.getElementById("disguise-view");
  const disguiseAddress = document.getElementById("disguise-address");
  const disguiseUrlInput = document.getElementById("disguise-url-input");
  const disguiseFrame = document.getElementById("disguise-frame");
  const disguiseBackBtn = document.getElementById("disguise-back-btn");
  const disguiseForwardBtn = document.getElementById("disguise-forward-btn");
  const disguiseRecordBtn = document.getElementById("disguise-record-btn");
  const disguiseRecDot = document.getElementById("disguise-rec-dot");

  const galleryView = document.getElementById("gallery-view");
  const galleryGrid = document.getElementById("gallery-grid");
  const galleryEmpty = document.getElementById("gallery-empty");
  const galleryCount = document.getElementById("gallery-count");
  const galleryCloseBtn = document.getElementById("gallery-close-btn");

  const mediaView = document.getElementById("media-view");
  const mediaViewImg = document.getElementById("media-view-img");
  const mediaViewVideo = document.getElementById("media-view-video");
  const mediaBackBtn = document.getElementById("media-back-btn");
  const mediaDownloadBtn = document.getElementById("media-download-btn");
  const mediaDeleteBtn = document.getElementById("media-delete-btn");

  const state = {
    facingMode: "environment",
    stream: null,
    track: null,
    torchSupported: false,
    flashOn: false,
    mode: "photo", // "photo" | "video"
    mediaRecorder: null,
    recordedChunks: [],
    recordingStartTime: 0,
    recordTimerInterval: null,
    items: [], // {id, kind: "photo"|"video", url, thumbUrl, mimeType, createdAt}
    currentMediaId: null,
  };

  // ---------- IndexedDB: 撮影した写真・動画の永続化 ----------
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
    showStatus("起動しています…", false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showStatus("このブラウザはカメラに対応していません。iPhoneのSafariで開いてください。", false);
      return;
    }

    const videoConstraints = {
      facingMode: { ideal: state.facingMode },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    };

    let stream = null;
    try {
      // 動画には音声も記録できるようマイクも合わせて要求する
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: videoConstraints });
    } catch (err) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
      } catch (err2) {
        let msg = "起動できませんでした。";
        if (err2 && err2.name === "NotAllowedError") {
          msg = "カメラ・マイクへのアクセスが許可されていません。設定アプリ > Safari > カメラ/マイク で許可してください。";
        } else if (err2 && err2.name === "NotFoundError") {
          msg = "利用できるカメラが見つかりませんでした。";
        }
        showStatus(msg, true);
        return;
      }
    }

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
  }

  retryBtn.addEventListener("click", startCamera);

  switchCameraBtn.addEventListener("click", () => {
    if (state.mediaRecorder) return; // 録画中はカメラ切り替え不可
    state.facingMode = state.facingMode === "environment" ? "user" : "environment";
    startCamera();
  });

  // ---------- フラッシュ(トーチ)切り替え ----------
  function updateFlashUI() {
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

  // ---------- 写真/ビデオ モード切り替え ----------
  function setMode(mode) {
    state.mode = mode;
    modePhotoBtn.classList.toggle("active", mode === "photo");
    modeVideoBtn.classList.toggle("active", mode === "video");
    shutterBtn.classList.toggle("video-mode", mode === "video");
  }

  modePhotoBtn.addEventListener("click", () => {
    if (!state.mediaRecorder) setMode("photo");
  });
  modeVideoBtn.addEventListener("click", () => {
    if (!state.mediaRecorder) setMode("video");
  });

  // ---------- フレームのキャプチャ(写真・動画サムネイル共通) ----------
  function grabFrameBlob(quality) {
    return new Promise((resolve) => {
      if (!video.videoWidth) {
        resolve(null);
        return;
      }
      const w = video.videoWidth;
      const h = video.videoHeight;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (state.facingMode === "user") {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality || 0.9);
    });
  }

  // ---------- 写真撮影 ----------
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
    void flashOverlay.offsetWidth; // reflow でアニメーションを再トリガー
    flashOverlay.classList.add("flash-active");
  }

  function makeId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async function capturePhoto() {
    if (!state.track || video.readyState < 2) return;

    if (state.flashOn && !state.torchSupported) {
      await preCaptureScreenFlash();
    }

    const blob = await grabFrameBlob(0.92);
    if (!blob) return;

    shutterClickFlash();
    if (navigator.vibrate) navigator.vibrate(20);

    const record = {
      id: makeId(),
      kind: "photo",
      blob,
      mimeType: blob.type,
      createdAt: Date.now(),
    };
    await dbPut(record);
    addMediaToState(record);
    updateThumb();
  }

  // ---------- 動画撮影 ----------
  const VIDEO_MIME_CANDIDATES = [
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  function pickVideoMimeType() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return "";
    for (const type of VIDEO_MIME_CANDIDATES) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return "";
  }

  function updateRecordingUI(isRecording) {
    shutterBtn.classList.toggle("recording", isRecording);
    disguiseRecDot.classList.toggle("active", isRecording);
    recordTimer.classList.toggle("hidden", !isRecording);
    switchCameraBtn.disabled = isRecording;
    modePhotoBtn.disabled = isRecording;
    modeVideoBtn.disabled = isRecording;
  }

  function updateRecordTimerText() {
    const elapsedSec = Math.floor((Date.now() - state.recordingStartTime) / 1000);
    const m = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
    const s = String(elapsedSec % 60).padStart(2, "0");
    recordTimer.textContent = `${m}:${s}`;
  }

  function startRecordTimer() {
    state.recordingStartTime = Date.now();
    updateRecordTimerText();
    state.recordTimerInterval = setInterval(updateRecordTimerText, 500);
  }

  function stopRecordTimer() {
    if (state.recordTimerInterval) clearInterval(state.recordTimerInterval);
    state.recordTimerInterval = null;
    recordTimer.textContent = "00:00";
  }

  async function startRecording() {
    if (!state.stream || state.mediaRecorder) return;

    const mimeType = pickVideoMimeType();
    let recorder;
    try {
      recorder = mimeType ? new MediaRecorder(state.stream, { mimeType }) : new MediaRecorder(state.stream);
    } catch (e) {
      showStatus("この端末では動画撮影に対応していません。", true);
      return;
    }

    const thumbBlob = await grabFrameBlob(0.8);

    state.recordedChunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) state.recordedChunks.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(state.recordedChunks, { type: recorder.mimeType || mimeType || "video/webm" });
      state.recordedChunks = [];
      state.mediaRecorder = null;

      const record = {
        id: makeId(),
        kind: "video",
        blob,
        thumbBlob,
        mimeType: blob.type,
        createdAt: Date.now(),
      };
      await dbPut(record);
      addMediaToState(record);
      updateThumb();
    };

    state.mediaRecorder = recorder;
    recorder.start();
    if (navigator.vibrate) navigator.vibrate(15);
    startRecordTimer();
    updateRecordingUI(true);
  }

  function stopRecording() {
    if (!state.mediaRecorder) return;
    state.mediaRecorder.stop();
    if (navigator.vibrate) navigator.vibrate([15, 60, 15]);
    stopRecordTimer();
    updateRecordingUI(false);
  }

  function toggleVideoRecording() {
    if (state.mediaRecorder) stopRecording();
    else startRecording();
  }

  shutterBtn.addEventListener("click", () => {
    if (state.mode === "video") toggleVideoRecording();
    else capturePhoto();
  });

  disguiseRecordBtn.addEventListener("click", () => {
    setMode("video");
    toggleVideoRecording();
  });

  // ---------- 偽装ブラウザ画面 ----------
  function showDisguise() {
    disguiseView.classList.remove("hidden");
  }

  function exitDisguise() {
    disguiseView.classList.add("hidden");
  }

  hideBtn.addEventListener("click", showDisguise);

  let longPressTimer = null;
  let longPressFired = false;
  disguiseAddress.addEventListener("pointerdown", () => {
    longPressFired = false;
    longPressTimer = setTimeout(() => {
      longPressFired = true;
      disguiseUrlInput.blur();
      exitDisguise();
    }, 800);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
    disguiseAddress.addEventListener(evt, () => clearTimeout(longPressTimer));
  });

  // ---------- 偽装ブラウザ画面の実ブラウジング機能 ----------
  // 既定ホームはアプリ同梱のローカルページ(home.html)にしている。外部サイトは
  // フレーム表示を拒否する設定(X-Frame-Options / CSP frame-ancestors)を持つことが多く
  // -- Wikipediaも含め、Google検索・多くのSNS・銀行サイトなど -- 、それらに頼ると
  // 開いた瞬間に空白表示になりうるため、常に正常表示できる自前ページを既定にしている。
  const HOME_URL = "./home.html";
  // ユーザーがURLではなく検索語を入力した場合の検索先。フレーム表示の可否は
  // サイト側の設定次第で保証できないため、実機で開けるか確認しながら調整すること。
  const SEARCH_URL_TEMPLATE = "https://html.duckduckgo.com/html/?q=";

  function urlLooksLikeAddress(raw) {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return true;
    return /^[^\s]+\.[^\s]{2,}([/?#].*)?$/i.test(raw);
  }

  function resolveNavigationUrl(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^(javascript|data|vbscript|file):/i.test(trimmed)) return null;

    if (urlLooksLikeAddress(trimmed)) {
      return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    }
    return `${SEARCH_URL_TEMPLATE}${encodeURIComponent(trimmed)}`;
  }

  function navigateDisguiseTo(raw) {
    const url = resolveNavigationUrl(raw);
    if (!url) return;
    disguiseFrame.src = url;
    try {
      disguiseUrlInput.value = new URL(url).hostname;
    } catch (e) {
      disguiseUrlInput.value = raw;
    }
  }

  function goHome() {
    disguiseFrame.src = HOME_URL;
    disguiseUrlInput.value = "";
  }

  disguiseUrlInput.addEventListener("focus", () => {
    disguiseUrlInput.select();
  });

  disguiseUrlInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (longPressFired) return;
    navigateDisguiseTo(disguiseUrlInput.value);
    disguiseUrlInput.blur();
  });

  window.addEventListener("message", (e) => {
    if (!e.data || e.data.type !== "camera-app-navigate") return;
    navigateDisguiseTo(String(e.data.query || ""));
  });

  disguiseBackBtn.addEventListener("click", () => {
    try {
      disguiseFrame.contentWindow.history.back();
    } catch (e) {
      // クロスオリジンのフレームで履歴操作が拒否される場合は無視
    }
  });

  disguiseForwardBtn.addEventListener("click", () => {
    try {
      disguiseFrame.contentWindow.history.forward();
    } catch (e) {
      // クロスオリジンのフレームで履歴操作が拒否される場合は無視
    }
  });

  goHome();

  // ---------- 写真・動画の状態管理 ----------
  function addMediaToState(record) {
    const url = URL.createObjectURL(record.blob);
    const thumbUrl = record.kind === "video" && record.thumbBlob ? URL.createObjectURL(record.thumbBlob) : url;
    state.items.unshift({
      id: record.id,
      kind: record.kind,
      url,
      thumbUrl,
      mimeType: record.mimeType,
      createdAt: record.createdAt,
    });
  }

  function updateThumb() {
    const latest = state.items[0];
    thumbPreview.style.backgroundImage = latest ? `url(${latest.thumbUrl})` : "none";
  }

  async function loadMediaFromDB() {
    const records = await dbGetAll();
    records.sort((a, b) => b.createdAt - a.createdAt);
    state.items = records.map((r) => {
      const url = URL.createObjectURL(r.blob);
      const thumbUrl = r.kind === "video" && r.thumbBlob ? URL.createObjectURL(r.thumbBlob) : url;
      return { id: r.id, kind: r.kind || "photo", url, thumbUrl, mimeType: r.mimeType, createdAt: r.createdAt };
    });
    updateThumb();
  }

  // ---------- ギャラリー一覧 ----------
  function renderGallery() {
    galleryGrid.innerHTML = "";
    galleryCount.textContent = state.items.length ? `${state.items.length}件` : "";
    galleryEmpty.classList.toggle("hidden", state.items.length > 0);

    for (const item of state.items) {
      const btn = document.createElement("button");
      btn.className = "gallery-item" + (item.kind === "video" ? " is-video" : "");
      btn.style.backgroundImage = `url(${item.thumbUrl})`;
      btn.addEventListener("click", () => openMediaView(item.id));
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

  // ---------- 個別の写真・動画表示 ----------
  function openMediaView(id) {
    const item = state.items.find((p) => p.id === id);
    if (!item) return;
    state.currentMediaId = id;

    if (item.kind === "video") {
      mediaViewVideo.src = item.url;
      mediaViewVideo.classList.remove("hidden");
      mediaViewImg.classList.add("hidden");
      mediaViewImg.removeAttribute("src");
    } else {
      mediaViewImg.src = item.url;
      mediaViewImg.classList.remove("hidden");
      mediaViewVideo.classList.add("hidden");
      mediaViewVideo.pause();
      mediaViewVideo.removeAttribute("src");
    }
    mediaView.classList.remove("hidden");
  }

  function closeMediaView() {
    mediaView.classList.add("hidden");
    mediaViewVideo.pause();
    state.currentMediaId = null;
  }

  mediaBackBtn.addEventListener("click", closeMediaView);

  mediaDownloadBtn.addEventListener("click", () => {
    const item = state.items.find((p) => p.id === state.currentMediaId);
    if (!item) return;
    const ext = item.kind === "video" ? (item.mimeType && item.mimeType.includes("mp4") ? "mp4" : "webm") : "jpg";
    const a = document.createElement("a");
    a.href = item.url;
    a.download = `${item.kind}-${item.createdAt}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  mediaDeleteBtn.addEventListener("click", async () => {
    const id = state.currentMediaId;
    if (!id) return;
    await dbDelete(id);
    const idx = state.items.findIndex((p) => p.id === id);
    if (idx >= 0) {
      const item = state.items[idx];
      URL.revokeObjectURL(item.url);
      if (item.thumbUrl !== item.url) URL.revokeObjectURL(item.thumbUrl);
      state.items.splice(idx, 1);
    }
    updateThumb();
    closeMediaView();
    renderGallery();
  });

  // ---------- 初期化 ----------
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (!state.mediaRecorder) stopStream(); // 録画中はストリームを維持する
    } else if (!state.stream) {
      startCamera();
    }
  });

  loadMediaFromDB();
  startCamera();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
