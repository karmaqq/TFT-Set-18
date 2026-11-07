import { safeLowercase, parseStatIcons, applySmartPosition } from "./utils.js";

let globalTooltip = null;
let champTooltip = null;
let currentTraitsData = new Map();
let allItemsMap = new Map();
let championsData = [];
let traitNameMap = {};

export function initTooltips(traitsDataMap, itemsMap, champions, rawTraits) {
  currentTraitsData = traitsDataMap;
  allItemsMap = itemsMap;
  championsData = champions;

  if (rawTraits) {
    const all = {
      ...(rawTraits.specialTraits || {}),
      ...(rawTraits.originTraits || {}),
      ...(rawTraits.classTraits || {}),
    };
    Object.entries(all).forEach(([key, t]) => {
      traitNameMap[safeLowercase(t.name)] = {
        turkce: t.turkce || t.name,
        icon: t.icon,
      };
      traitNameMap[safeLowercase(key)] = {
        turkce: t.turkce || t.name,
        icon: t.icon,
      };
    });
  }

  globalTooltip = document.getElementById("global-trait-tooltip");
  champTooltip = document.getElementById("global-champ-tooltip");
  if (globalTooltip && champTooltip) {
    setupTooltipEvents();
  }
}

function setupTooltipEvents() {
  document.addEventListener("mouseover", handleMouseOver);
  document.addEventListener("mouseout", handleMouseOut);
}

function handleMouseOver(e) {
  const champEl = e.target.closest(".champ-item, .comp-champ");
  if (champEl) {
    showChampionTooltip(champEl);
    return;
  }
  const traitEl = e.target.closest(".trait-item");
  if (traitEl) {
    showTraitTooltip(traitEl);
    return;
  }
  const itemCard = e.target.closest(".item-card");
  if (itemCard) {
    showItemTooltip(itemCard);
    return;
  }
}

function handleMouseOut(e) {
  if (e.target.closest(".champ-item, .comp-champ")) {
    hideChampTooltip();
  }
  if (e.target.closest(".trait-item, .item-card")) {
    hideGlobalTooltip();
  }
}

function showChampionTooltip(champEl) {
  const champName = champEl.getAttribute("data-name");
  const champ = championsData.find((c) => c.name === champName);
  if (!champ || !champTooltip) return;
  hideGlobalTooltip();
  champTooltip.innerHTML = generateChampionTooltipHTML(champ);
  champTooltip.className = `champ-tooltip cost-${champ.cost}`;
  const context = champEl.classList.contains("comp-champ")
    ? "team"
    : "champion";
  applySmartPosition(champTooltip, champEl.getBoundingClientRect(), context);
  champTooltip.style.display = "block";
}

function hideChampTooltip() {
  if (champTooltip) champTooltip.style.display = "none";
}

export function generateChampionTooltipHTML(champ) {
  const traitsHTML = champ.traits
    .map((t) => {
      const traitInfo = traitNameMap[safeLowercase(t)];
      const displayName = traitInfo?.turkce || t;
      const iconFile = traitInfo?.icon || safeLowercase(t);
      return `
            <div class="ct-trait-item">
                <img src="img/traits/${iconFile}.png" class="ct-trait-icon" onerror="this.style.display='none'">
                <span class="ct-trait-name">${displayName}</span>
            </div>`;
    })
    .join("");
  return `
        <div class="ct-header">
            <span class="ct-name">${champ.name}</span>
            <div class="ct-cost border-cost-${champ.cost}">
                <img src="img/stats/gold.png" class="gold-icon" onerror="this.style.display='none'"> 
                ${champ.cost}
            </div>
        </div>
        <div class="ct-traits-list">${traitsHTML}</div>`;
}

function showTraitTooltip(traitEl) {
  const traitKey =
    traitEl.getAttribute("data-trait-key") ||
    safeLowercase(traitEl.querySelector(".t-name")?.textContent || "");
  const data = currentTraitsData.get(traitKey);
  if (!data || !globalTooltip) return;
  hideChampTooltip();
  globalTooltip.innerHTML = generateTraitTooltipHTML(data);
  applySmartPosition(globalTooltip, traitEl.getBoundingClientRect(), "trait");
  globalTooltip.style.display = "block";
}

export function generateTraitTooltipHTML(data) {
  const { traitName, traitDisplayName, traitIcon, count, steps, traitData } = data;
  const finalIconPath = `img/traits/${traitIcon}.png`;
  const hasStepDescriptions = steps && steps.some((s) => s.desc);
  const thresholdsListHTML = !hasStepDescriptions
    ? ""
    : steps
        .map((s, index) => {
          const stepThreshold = s.count || s;
          const isReached = count >= stepThreshold;
          const nextStep = steps[index + 1];
          const nextStepCount = nextStep
            ? nextStep.count || nextStep
            : Infinity;
          const isCurrentActive = isReached && count < nextStepCount;
          return `
            <div class="t-tooltip-step ${isCurrentActive ? "is-current-active" : ""} ${isReached ? "is-passed" : ""}">
                <span class="t-threshold-val">${stepThreshold}</span>
                <span class="t-tooltip-desc">${parseStatIcons(s.desc || "")}</span>
            </div>`;
        })
        .join("");
  const divider = `<div class="t-tooltip-divider"></div>`;
  const hasTop = !!(traitData.generalDesc || traitData.preDesc);
  const hasBottom = !!(thresholdsListHTML || traitData.postDesc);
  return `
        <div class="t-tooltip-header">
            <div class="t-header-content">
                 <img src="${finalIconPath}" class="t-header-icon" onerror="this.src='img/traits/default.png'">
                 <span class="t-tooltip-title">${traitDisplayName || traitData.turkce || traitData.name}</span>
            </div>
        </div>
        ${hasTop || hasBottom ? divider : ""}
        <div class="t-tooltip-body">
            ${traitData.generalDesc ? `<p class="t-tooltip-general">${parseStatIcons(traitData.generalDesc)}</p>` : ""}
            ${traitData.generalDesc && traitData.preDesc ? divider : ""}
            ${traitData.preDesc ? `<p class="t-tooltip-pre-info">${parseStatIcons(traitData.preDesc)}</p>` : ""}
            ${hasTop && hasBottom ? divider : ""}
            ${thresholdsListHTML ? `<div class="t-tooltip-steps-list">${thresholdsListHTML}</div>` : ""}
            ${thresholdsListHTML && traitData.postDesc ? divider : ""}
            ${traitData.postDesc ? `<p class="t-tooltip-post-info ${traitData.postDescPlain ? "t-tooltip-post-info-plain" : ""}">${parseStatIcons(traitData.postDesc)}</p>` : ""}
        </div>`;
}

function showItemTooltip(itemCard) {
  const itemId = itemCard.getAttribute("data-id");
  const item = allItemsMap.get(itemId);
  if (!item || !globalTooltip) return;
  hideChampTooltip();
  globalTooltip.innerHTML = generateItemTooltipHTML(item);
  applySmartPosition(globalTooltip, itemCard.getBoundingClientRect(), "item");
  globalTooltip.style.display = "block";
}

export function generateItemTooltipHTML(item) {
  const componentsHTML =
    item.components && item.components.length > 0
      ? `
        <div class="item-recipe-group">
            <img src="img/items/${item.components[0]}.png" class="recipe-icon" onerror="this.src='img/items/default.png'">
            <span class="recipe-plus">+</span>
            <img src="img/items/${item.components[1]}.png" class="recipe-icon" onerror="this.src='img/items/default.png'">
        </div>
    `
      : `<div class="item-non-craftable">Üretilemez</div>`;
  const statsHTML = item.stats
    ? item.stats
        .map(
          (s) => `
        <div class="tooltip-stat">
            ${parseStatIcons(s.icon)} <span>${s.value}</span>
        </div>
    `,
        )
        .join("")
    : "";
  return `
        <div class="item-tooltip-top-section">
            <div class="item-header-left">
                <div class="item-tooltip-title">${item.name}</div>
                <div class="item-tooltip-stats-row">${statsHTML}</div>
            </div>
            <div class="item-header-right">${componentsHTML}</div>
        </div>
        <div class="item-tooltip-body">
            ${parseStatIcons(item.desc)}
        </div>`;
}

function hideGlobalTooltip() {
  if (globalTooltip) globalTooltip.style.display = "none";
}

export function hideAllTooltips() {
  hideChampTooltip();
  hideGlobalTooltip();
}
