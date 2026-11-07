/* ═══════════════════════════════════════════════════════════════════════════ */
/*                          YARDIMCI ARAÇLAR                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

export function safeLowercase(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "");
}

export function parseStatIcons(text) {
  if (!text) return "";
  return text.replace(/\[([^\]]+)\]/g, (match, iconName) => {
    const name = iconName.toLowerCase().trim();
    return `<img src="img/stats/${name}.svg" 
                     class="stat-icon-img" 
                     alt="${name}"
                     onerror="this.onerror=null; this.src='img/stats/${name}.png'; this.onerror=function(){this.style.display='none'};">`;
  });
}

export function applySmartPosition(el, anchorRect, context = "trait") {
  if (!anchorRect) return;

  const padding = 15;
  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;
  const scrollY = window.scrollY;

  el.style.display = "block";
  const tWidth = el.offsetWidth;
  const tHeight = el.offsetHeight;

  let left, top;

  if (context === "champion") {
    left = anchorRect.left - tWidth - padding;
    if (left < 10) left = anchorRect.right + padding;
    top =
      anchorRect.top > viewHeight / 2
        ? anchorRect.bottom - tHeight + scrollY
        : anchorRect.top + scrollY;
  } else if (context === "team") {
    left = anchorRect.left + anchorRect.width / 2 - tWidth / 2;
    top = anchorRect.bottom + padding + scrollY;
  } else if (context === "trait") {
    left = anchorRect.right + padding;
    if (anchorRect.top < 200) {
      top = anchorRect.top + scrollY;
    } else if (anchorRect.bottom > viewHeight - 200) {
      top = anchorRect.bottom - tHeight + scrollY;
    } else {
      top = anchorRect.top + anchorRect.height / 2 - tHeight / 2 + scrollY;
    }
  } else if (context === "item") {
    left = anchorRect.left + anchorRect.width / 2 - tWidth / 2;
    top = anchorRect.top - tHeight - padding + scrollY;
  }

  if (left < 10) left = 10;
  if (left + tWidth > viewWidth - 10) left = viewWidth - tWidth - 10;
  if (top < scrollY + 10) top = scrollY + 10;
  if (top + tHeight > viewHeight + scrollY - 10)
    top = viewHeight + scrollY - tHeight - 10;

  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

export function initMobileTabs() {
  const champPanel = document.querySelector(".right-panel");
  const itemPanel = document.querySelector(".items-section");

  if (!champPanel || !itemPanel) return;

  const tabWrapper = document.createElement("div");
  tabWrapper.className = "mobile-toggle-container";
  tabWrapper.innerHTML = `
        <button class="mobile-toggle-btn active" data-target="champs">Şampiyonlar</button>
        <button class="mobile-toggle-btn" data-target="items">Eşyalar</button>
    `;

  const parentContainer = champPanel.parentElement;
  if (parentContainer) {
    parentContainer.insertBefore(tabWrapper, champPanel);
  }

  const btns = tabWrapper.querySelectorAll(".mobile-toggle-btn");

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      btns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const target = btn.dataset.target;
      if (target === "champs") {
        champPanel.classList.add("mobile-active");
        champPanel.classList.remove("mobile-hidden");
        itemPanel.classList.remove("mobile-active");
        itemPanel.classList.add("mobile-hidden");
      } else {
        champPanel.classList.remove("mobile-active");
        champPanel.classList.add("mobile-hidden");
        itemPanel.classList.add("mobile-active");
        itemPanel.classList.remove("mobile-hidden");
      }
    });
  });

  itemPanel.classList.add("mobile-hidden");
}

const jsonCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

/* ─────────────────── getItemLayout ─────────────────── */

export function getItemLayout(items, itemSize = 26) {
  const list = Array.isArray(items) ? items.slice(0, 3) : [];
  const count = list.length;
  const half = itemSize / 2;

  const rxMap = {
    1: ["50%"],
    2: [`calc(50% - ${half}px)`, `calc(50% + ${half}px)`],
    3: [`calc(50% - ${itemSize}px)`, "50%", `calc(50% + ${itemSize}px)`],
  };

  const slots = rxMap[count] || [];
  return list.map((id, i) => ({
    id,
    anchor: {
      rx: slots[i] || "50%",
      ry: "100%",
      offsetY: "-75%",
    },
  }));
}

export function getStarAnchors(stars) {
  const v1Top = { rx: "50%", ry: "0%", offsetY: "-5" };
  const e12 = { rx: "25%", ry: "12.5%" };
  const e13 = { rx: "75%", ry: "12.5%" };
  if (stars >= 3) return [e12, v1Top, e13];
  if (stars === 2) return [e12, e13];
  if (stars === 1) return [v1Top];
  return [];
}

export async function loadJSON(path) {
  const cached = jsonCache.get(path);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const response = await fetch(path, {
    cache: "no-cache",
    headers: { "Cache-Control": "no-cache" },
  });

  if (response.ok) {
    const data = await response.json();
    jsonCache.set(path, {
      data: data,
      timestamp: Date.now(),
    });
    return data;
  }
  return null;
}
