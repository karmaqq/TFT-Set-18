import { safeLowercase } from "./utils.js";

let TRAIT_THRESHOLDS = {};
let currentTraitsData = new Map();
let traitListEl = null;

export function initTraits(traitThresholds) {
  TRAIT_THRESHOLDS = traitThresholds;
  traitListEl = document.getElementById("traits-section");
}

function normalizeKey(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

function findTraitInfo(key) {
  const nk = normalizeKey(key);

  for (const [k, v] of Object.entries(TRAIT_THRESHOLDS.specialTraits || {})) {
    if (normalizeKey(k) === nk) return { data: v, type: "special" };
  }
  for (const [k, v] of Object.entries(TRAIT_THRESHOLDS.originTraits || {})) {
    if (normalizeKey(k) === nk) return { data: v, type: "origin" };
  }
  for (const [k, v] of Object.entries(TRAIT_THRESHOLDS.classTraits || {})) {
    if (normalizeKey(k) === nk) return { data: v, type: "class" };
  }
  return null;
}

export function updateTraits(selectedComp) {
  if (!traitListEl) return;

  traitListEl.innerHTML = "";
  currentTraitsData.clear();

  const traitCounts = selectedComp.reduce((acc, champ) => {
    champ.traits.forEach((t) => {
      const cleanName = safeLowercase(t);
      acc[cleanName] = (acc[cleanName] || 0) + 1;
    });
    return acc;
  }, {});

  if ((traitCounts["lunar"] || 0) >= 3 && (traitCounts["solar"] || 0) >= 3) {
    traitCounts["eclipse"] = 1;
  }

  if ((traitCounts["rivalkhazix"] || 0) > 0 && (traitCounts["rivalrengar"] || 0) > 0) {
    delete traitCounts["rivalkhazix"];
    delete traitCounts["rivalrengar"];
    traitCounts["rival"] = 0;
  }

  const processedTraits = Object.entries(traitCounts)
    .map(([key, count]) => {
      const info = findTraitInfo(key);
      if (!info) return null;

      const { data: traitData, type: traitType } = info;

      let stepsArray =
        traitData.thresholds ||
        (Array.isArray(traitData) ? traitData : [traitData]);
      stepsArray = stepsArray.map((s) =>
        typeof s === "number" ? { count: s } : s,
      );

      const activeTier = [...stepsArray]
        .reverse()
        .find((s) => count >= s.count);
      const reachedTierCount = stepsArray.filter(
        (s) => count >= s.count,
      ).length;
      const isActive = !!activeTier;

      let weight = isActive ? 50 : 0;
      if (isActive) {
        if (activeTier?.rank === "tier-prismatic") weight = 95;
        else if (traitType === "special") weight = 80;
        else if (traitType === "origin") weight = 70;
        else weight = 60;
        weight += reachedTierCount * 2;
      } else {
        weight += count / stepsArray[0].count;
      }

      const finalData = {
        traitName: traitData.name,
        traitDisplayName: traitData.turkce || traitData.name,
        traitIcon: traitData.icon,
        count,
        traitData,
        activeTier,
        isActive,
        weight,
        steps: stepsArray,
        type: traitType,
      };

      currentTraitsData.set(safeLowercase(traitData.name), finalData);
      return finalData;
    })
    .filter(Boolean);

  processedTraits
    .sort(
      (a, b) => b.weight - a.weight || a.traitName.localeCompare(b.traitName),
    )
    .forEach((data) => traitListEl.appendChild(createTraitElement(data)));
}

function createTraitElement(data) {
  const li = document.createElement("li");
  const { traitName, traitDisplayName, traitIcon, count, activeTier, isActive, steps, type } = data;

  const reachedTierCount = steps.filter((s) => count >= (s.count || s)).length;
  const tierClass = isActive
    ? activeTier.rank || `tier-${reachedTierCount}`
    : "inactive";

  li.className = `trait-item ${isActive ? "active" : ""} ${tierClass} trait-type-${type}`;
  li.setAttribute("data-trait-key", safeLowercase(traitName));

  const iconSrc = `img/traits/${traitIcon}.png`;

  li.innerHTML = `
        <div class="trait-hex-container">
            <div class="trait-hex-outer">
                <div class="trait-hex-inner">
                    <img src="${iconSrc}" class="t-icon" onerror="this.src='img/traits/default.png'">
                </div>
            </div>
        </div>
        <div class="trait-count-badge-box">${count}</div>
        <div class="trait-info-wrapper">
            <div class="t-name">${traitDisplayName}</div>
            <div class="t-steps-row">
                ${
                  isActive
                    ? steps
                        .map((s) => {
                          const v = s.count || s;
                          const isCurrent =
                            activeTier && v === activeTier.count;
                          return `<span class="t-step ${isCurrent ? "is-current" : count >= v ? "is-reached" : "is-off"}">${v}</span>`;
                        })
                        .join('<span class="t-sep">></span>')
                    : `<span class="t-step is-off">${count} / ${steps[0].count || steps[0]}</span>`
                }
            </div>
        </div>`;

  return li;
}

export function initTraitSidebar() {
  const panel = document.querySelector(".left-panel");
  if (!panel) return;

  let startX = 0;

  panel.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
    },
    { passive: true },
  );

  panel.addEventListener(
    "touchmove",
    (e) => {
      const currentX = e.touches[0].clientX;
      const diff = currentX - startX;

      if (diff > 40) {
        panel.classList.add("expanded");
      } else if (diff < -40) {
        panel.classList.remove("expanded");
      }
    },
    { passive: true },
  );

  panel.addEventListener("click", (e) => {
    if (!panel.classList.contains("expanded")) {
      panel.classList.add("expanded");
      e.stopPropagation();
    }
  });

  document.addEventListener("click", (e) => {
    if (panel.classList.contains("expanded") && !panel.contains(e.target)) {
      panel.classList.remove("expanded");
    }
  });
}

export function getTraitsData() {
  return currentTraitsData;
}
