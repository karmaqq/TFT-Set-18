let currentZoom = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.1;
const PHOTO_MODE_ZOOM = 1.5;
let isPhotoMode = false;
let photoModeTooltip = null;

export function initPhotoMode() {
  const body = document.body;
  const photoModeBtn = document.getElementById("photo-mode-btn");

  if (photoModeBtn) {
    createPhotoModeTooltip(photoModeBtn);
    setupPhotoModeButton(photoModeBtn, body);
    setupKeyboardControls(body);
    setupMouseWheel(body);
    setupFullscreenListener(body);
  }
}

function setupPhotoModeButton(btn, body) {
  btn.addEventListener("click", async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
    }

    isPhotoMode = true;
    currentZoom = PHOTO_MODE_ZOOM;
    body.classList.add("photo-mode");
    applyZoom(body);
  });
}

function setupKeyboardControls(body) {
  window.addEventListener("keydown", (e) => {
    if (!isPhotoMode) return;

    if (e.key === "Escape") {
      exitPhotoMode(body);
    }

    if (e.ctrlKey) {
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        currentZoom = Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP);
        applyZoom(body);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        currentZoom = Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP);
        if (currentZoom === 1) exitPhotoMode(body);
        else applyZoom(body);
      } else if (e.key === "0") {
        e.preventDefault();
        exitPhotoMode(body);
      }
    }
  });
}

function setupMouseWheel(body) {
  window.addEventListener(
    "wheel",
    (e) => {
      if (!isPhotoMode || !e.ctrlKey) return;

      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom + delta));

      if (currentZoom === 1) exitPhotoMode(body);
      else applyZoom(body);
    },
    { passive: false },
  );
}

function applyZoom(body) {
  if (currentZoom > 1) {
    body.classList.add("zooming");
    body.style.transform = `scale(${currentZoom})`;
  }
}

function exitPhotoMode(body) {
  isPhotoMode = false;
  currentZoom = 1;
  body.classList.remove("photo-mode", "zooming");
  body.style.transform = "scale(1)";

  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
}

function setupFullscreenListener(body) {
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && isPhotoMode) {
      exitPhotoMode(body);
    }
  });
}

function createPhotoModeTooltip(btnElement) {
  photoModeTooltip = document.createElement("div");
  photoModeTooltip.className = "photo-mode-tooltip";
  photoModeTooltip.innerHTML = `
        <div class="tooltip-header">
            <span class="tooltip-icon">📸</span>
            <strong>Fotoğraf Modu</strong>
        </div>
        <div class="tooltip-content">
            <p>Takımını Tam Ekranda Görüntüle</p>
            <div class="tooltip-shortcuts">
                <div class="shortcut-item"><kbd>ESC</kbd> <span>Çıkış</span></div>
                <div class="shortcut-item"><kbd>Ctrl</kbd> + <kbd>Scroll</kbd> <span>Zoom</span></div>
            </div>
        </div>`;
  document.body.appendChild(photoModeTooltip);
  btnElement.addEventListener("mouseenter", (e) =>
    showPhotoModeTooltip(e.target),
  );
  btnElement.addEventListener("mouseleave", hidePhotoModeTooltip);
  btnElement.addEventListener("click", hidePhotoModeTooltip);
}

function showPhotoModeTooltip(btnElement) {
  if (!photoModeTooltip) return;
  const btnRect = btnElement.getBoundingClientRect();
  photoModeTooltip.style.top = `${btnRect.bottom + 10}px`;
  photoModeTooltip.style.left = `${btnRect.left + btnRect.width / 2}px`;
  photoModeTooltip.style.transform = "translateX(-50%)";
  photoModeTooltip.classList.add("visible");
}

function hidePhotoModeTooltip() {
  photoModeTooltip?.classList.remove("visible");
}
