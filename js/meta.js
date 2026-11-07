/* ═══════════════════════════════════════════════════════════════════════════ */
/*                          META SAYFASI                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

import { loadCompIntoTeam } from "./planner.js";
import { getStarAnchors, getItemLayout } from "./utils.js";

const TIER_ORDER = ["S", "A", "B", "C", "X"];
const BOARD_ROWS = 4;
const BOARD_COLS = 7;
const DEFAULT_STARS = 1;

let metaTiersEl = null;
let compsData = [];
let champLookup = new Map();

/* ─────────────────── initMeta ─────────────────── */

export function initMeta(compsData_, championsData) {
  compsData = compsData_;
  metaTiersEl = document.getElementById("meta-tiers");
  if (!metaTiersEl) return;

  buildChampLookup(championsData);

  const patchEl = document.getElementById("meta-patch");
  if (patchEl) patchEl.textContent = `Patch ${compsData.patch || ""}`;

  const countEl = document.getElementById("meta-comp-count");
  if (countEl) countEl.textContent = `${compsData.metalar.length} Komp`;

  renderTiers();
}

/* ─────────────────── Yardımcılar ─────────────────── */

function buildChampLookup(champions) {
  champLookup = new Map();
  champions.forEach((c) => champLookup.set(c.name, c));
}

function resolveChamp(name) {
  return champLookup.get(name) || null;
}

function getCompPosition(birim, takenSet) {
  if (birim.sira && birim.slot) {
    const pos = (birim.sira - 1) * BOARD_COLS + (birim.slot - 1);
    return pos;
  }
  for (let i = 0; i < BOARD_ROWS * BOARD_COLS; i++) {
    if (!takenSet.has(i)) return i;
  }
  return undefined;
}

function buildPlacedUnits(comp) {
  const taken = new Set();
  return comp.birimler.map((b) => {
    const champ = resolveChamp(b.ad);
    const pos = getCompPosition(b, taken);
    if (pos !== undefined) taken.add(pos);
    return {
      ad: b.ad,
      champ,
      yildiz: b.yildiz || DEFAULT_STARS,
      esyalar: b.esyalar || b.items || [],
      sira: b.sira || Math.floor((pos ?? 0) / BOARD_COLS) + 1,
      slot: b.slot || ((pos ?? 0) % BOARD_COLS) + 1,
      pos,
    };
  });
}



function getCarryIndexes(comp, units) {
  const carryList = Array.isArray(comp.carry) ? comp.carry : [comp.carry];
  const indexes = new Set();
  carryList.forEach((ad) => {
    const idx = units.findIndex((u) => u.ad === ad);
    if (idx !== -1) indexes.add(idx);
  });
  return indexes;
}

function getTankIndexes(comp, units) {
  const tankList = Array.isArray(comp.tank) ? comp.tank : [];
  const indexes = new Set();
  tankList.forEach((ad) => {
    const idx = units.findIndex((u) => u.ad === ad);
    if (idx !== -1) indexes.add(idx);
  });
  return indexes;
}

/* ─────────────────── Splash Gruplama ─────────────────── */

function groupBySplash() {
  const map = new Map();
  compsData.metalar.forEach((comp) => {
    const splash =
      comp.splash || (Array.isArray(comp.carry) ? comp.carry[0] : comp.carry);
    const key = `${comp.tier}:${splash}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(comp);
  });

  const groups = [];
  map.forEach((list) => {
    const comps = list.slice();
    groups.push({ splash: comps[0].splash, carry: comps[0].splash, comps, best: comps[0] });
  });
  return groups;
}

function buildTierTags(group) {
  const tags = document.createElement("div");
  tags.className = "meta-comp-tags";

  const seen = new Set();
  group.comps.forEach((comp) => {
    if (seen.has(comp.tier)) return;
    seen.add(comp.tier);
    const t = comp.rozet || comp.tier;
    const tag = document.createElement("span");
    tag.className = `meta-comp-tag meta-tag-${t.toLowerCase()}`;
    tag.textContent = t;
    tags.appendChild(tag);
  });

  if (group.comps.length > 1) {
    const count = document.createElement("span");
    count.className = "meta-comp-tags-count";
    count.textContent = `${group.comps.length}×`;
    tags.appendChild(count);
  }

  return tags;
}

/* ─────────────────── Tier Render ─────────────────── */

function renderTiers() {
  metaTiersEl.innerHTML = "";
  const groups = groupBySplash();

  TIER_ORDER.forEach((tier) => {
    const tierGroups = groups.filter((g) => g.best.tier === tier).slice(0, 10);

    const tierEl = document.createElement("section");
    tierEl.className = "meta-tier";
    tierEl.dataset.tier = tier;

    const head = document.createElement("div");
    head.className = "meta-tier-head";

    const headMeta = document.createElement("div");
    headMeta.className = "meta-tier-meta";

    const badge = document.createElement("span");
    badge.className = `meta-tier-badge meta-tier-badge-${tier.toLowerCase()}`;
    badge.textContent = tier;
    headMeta.appendChild(badge);

    head.appendChild(headMeta);

    const compsEl = document.createElement("div");
    compsEl.className = "meta-comp-grid";
    tierGroups.forEach((group) => {
      compsEl.appendChild(createCompCard(group, tierEl));
    });
    head.appendChild(compsEl);

    tierEl.appendChild(head);
    metaTiersEl.appendChild(tierEl);
  });
}

function createCompCard(group, tierEl) {
  const btn = document.createElement("button");
  btn.className = `meta-comp-card meta-tone-${group.best.tier.toLowerCase()}`;
  btn.type = "button";
  btn.dataset.carry = group.carry;

  const champ = resolveChamp(group.best.splash) || resolveChamp(group.carry);

  const token = document.createElement("span");
  token.className = "meta-comp-token";
  if (champ) token.classList.add(`cost-border-${champ.cost}`);
  const img = document.createElement("img");
  img.src = champ ? champ.img : "img/profiles/default.png";
  img.alt = group.carry;
  img.onerror = () => (img.src = "img/profiles/default.png");
  token.appendChild(img);
  btn.appendChild(token);

  btn.addEventListener("click", () => toggleDetail(tierEl, group));
  return btn;
}

/* ─────────────────── Detay Açma / Kapatma ─────────────────── */

let compModalKeyHandler = null;

function closeCompModal() {
  const overlay = document.querySelector(".meta-modal-overlay");
  if (overlay) overlay.remove();
  document.body.classList.remove("meta-modal-open");
  if (compModalKeyHandler) {
    document.removeEventListener("keydown", compModalKeyHandler);
    compModalKeyHandler = null;
  }
}

function toggleDetail(tierEl, group) {
  const overlay = document.createElement("div");
  overlay.className = "meta-modal-overlay";

  const detail = document.createElement("div");
  detail.className = "meta-comp-detail open";
  detail.dataset.carry = group.carry;
  detail.appendChild(buildDetailPanel(group, 0));

  const closeBtn = document.createElement("button");
  closeBtn.className = "meta-modal-close";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Kapat");
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", () => closeCompModal());

  overlay.appendChild(detail);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
  document.body.classList.add("meta-modal-open");

  compModalKeyHandler = (e) => {
    if (e.key === "Escape") closeCompModal();
  };
  document.addEventListener("keydown", compModalKeyHandler);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeCompModal();
  });
}

function setDetailComp(detail, group, activeIdx) {
  detail.innerHTML = "";
  detail.appendChild(buildDetailPanel(group, activeIdx));
}

function buildTabBar(group, activeIdx) {
  const bar = document.createElement("div");
  bar.className = "meta-comp-tabs";

  group.comps.forEach((comp, idx) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "meta-comp-tab";
    if (idx === activeIdx) tab.classList.add("active");

    const tier = document.createElement("span");
    tier.className = `meta-tab-tier meta-tab-tier-${comp.tier.toLowerCase()}`;
    tier.textContent = comp.tier;
    tab.appendChild(tier);

    const name = document.createElement("span");
    name.className = "meta-comp-tab-name";
    name.textContent = comp.isim;
    tab.appendChild(name);

    tab.addEventListener("click", () => {
      const detail = tab.closest(".meta-comp-detail");
      if (detail) setDetailComp(detail, group, idx);
    });

    bar.appendChild(tab);
  });

  return bar;
}

function buildDetailPanel(group, activeIdx) {
  const comp = group.comps[activeIdx];
  const units = buildPlacedUnits(comp);
  const carryIdx = getCarryIndexes(comp, units);
  const tankIdx = getTankIndexes(comp, units);

  const panel = document.createElement("div");
  panel.className = "meta-comp-panel";

  panel.appendChild(buildTabBar(group, activeIdx));

  const body = document.createElement("div");
  body.className = "meta-detail-body";
  body.appendChild(buildCarryCard(group));
  body.appendChild(buildPlannerCard(comp, units, carryIdx, tankIdx));

  const sideCol = document.createElement("div");
  sideCol.className = "meta-side-col";
  const flexCard = buildFlexPanel(comp);
  if (flexCard) sideCol.appendChild(flexCard);
  sideCol.appendChild(buildInfoCard(comp, units));

  body.appendChild(sideCol);

  panel.appendChild(body);

  return panel;
}

function buildCarryCard(group) {
  const comp = group.best;
  const carryName = Array.isArray(comp.carry) ? comp.carry[0] : comp.carry;
  const champ = resolveChamp(group.splash) || resolveChamp(carryName);

  const card = document.createElement("div");
  card.className = "meta-carry-card";

  const imgChamp = champ;
  const avatar = document.createElement("div");
  avatar.className = "meta-carry-avatar";
  if (imgChamp) avatar.classList.add(`cost-border-${imgChamp.cost}`);
  const img = document.createElement("img");
  img.src = imgChamp ? imgChamp.img : "img/profiles/default.png";
  img.alt = carryName;
  img.onerror = () => (img.src = "img/profiles/default.png");
  avatar.appendChild(img);
  card.appendChild(avatar);

  const info = document.createElement("div");
  info.className = "meta-carry-card-body";

  const name = document.createElement("span");
  name.className = "meta-carry-card-name";
  name.textContent = champ ? champ.name : carryName;
  info.appendChild(name);

  const tier = document.createElement("span");
  tier.className = `meta-carry-card-tier meta-tier-badge meta-tier-badge-${comp.tier.toLowerCase()}`;
  tier.textContent = `${comp.tier} Tier`;
  info.appendChild(tier);

  const play = document.createElement("div");
  play.className = "meta-carry-card-row";
  const playL = document.createElement("span");
  playL.className = "meta-carry-card-label";
  playL.textContent = "Playstyle";
  const playV = document.createElement("span");
  playV.className = "meta-carry-card-value";
  playV.textContent = comp.playstyle;
  play.appendChild(playL);
  play.appendChild(playV);
  info.appendChild(play);

  if (comp.sart) {
    const sart = document.createElement("div");
    sart.className = "meta-carry-card-row";
    const sartL = document.createElement("span");
    sartL.className = "meta-carry-card-label";
    sartL.textContent = "Şart";
    const sartV = document.createElement("span");
    sartV.className = "meta-carry-card-value meta-carry-card-value-warn";
    sartV.textContent = comp.sart;
    sart.appendChild(sartL);
    sart.appendChild(sartV);
    info.appendChild(sart);
  }

  card.appendChild(info);
  return card;
}

function buildPlannerCard(comp, units, carryIdx, tankIdx) {
  const card = document.createElement("div");
  card.className = "meta-planner-card";

  const title = document.createElement("span");
  title.className = "meta-planner-title";
  title.textContent = comp.isim;
  card.appendChild(title);

  const top = document.createElement("div");
  top.className = "meta-top-panels";

  const unitsPanel = document.createElement("div");
  unitsPanel.className = "meta-panel meta-panel-units";
  unitsPanel.appendChild(buildUnitStrip(units, carryIdx, tankIdx));
  top.appendChild(unitsPanel);

  card.appendChild(top);

  const body = document.createElement("div");
  body.className = "meta-planner-body";

  body.appendChild(buildMiniBoard(units, carryIdx, tankIdx));

  card.appendChild(body);

  return card;
}

function buildUnitStrip(units, carryIdx, tankIdx) {
  const strip = document.createElement("div");
  strip.className = "meta-unit-strip";

  const hiddenUnits = ["Taş Kabuk", "Çançiçeği"];

  units.forEach((u, idx) => {
    if (hiddenUnits.includes(u.ad)) return;

    let variant = "";
    if (carryIdx.has(idx)) variant = "carry";
    else if (tankIdx.has(idx)) variant = "tank";

    strip.appendChild(buildUnitHex(u.champ ? u.champ.name : u.ad, u.yildiz, variant, false, true, u.esyalar));
  });

  return strip;
}

/* ─────────────────── Hex Birim ─────────────────── */

function buildUnitHex(name, stars, variant, hideName, costBorder, items) {
  const wrap = document.createElement("div");
  wrap.className = "meta-unit-hex-wrap";

  const champ = resolveChamp(name);

  const hex = document.createElement("div");
  hex.className = "meta-unit-hex" + (variant ? ` meta-unit-hex-${variant}` : "");

  if (champ) {
    const inner = document.createElement("div");
    inner.className = "meta-unit-hex-inner";

    const img = document.createElement("img");
    img.src = champ.img;
    img.alt = champ.name;
    img.onerror = () => (img.src = "img/profiles/default.png");
    inner.appendChild(img);

    hex.appendChild(inner);

    if (costBorder) {
      hex.classList.add(`cost-border-${champ.cost}`);
    }
  }

  if (!hideName) {
    const nm = document.createElement("span");
    nm.className = "meta-unit-hex-name";
    nm.textContent = champ ? champ.name : name;
    hex.appendChild(nm);
  }

  wrap.appendChild(hex);

  if (stars) {
    getStarAnchors(stars).forEach((anchor) => {
      const st = document.createElement("span");
      st.className = `meta-unit-hex-star meta-star-${stars}`;
      st.style.setProperty("--rx", anchor.rx);
      st.style.setProperty("--ry", anchor.ry);
      if (anchor.offsetY) st.style.transform = `translate(-50%, ${anchor.offsetY}px)`;
      st.textContent = "★";
      wrap.appendChild(st);
    });
  }

  if (Array.isArray(items) && items.length && champ) {
    getItemLayout(items, 26).forEach((slotInfo) => {
      const it = document.createElement("div");
      it.className = `meta-unit-hex-item cost-border-${champ.cost}`;
      it.style.setProperty("--rx", slotInfo.anchor.rx);
      it.style.setProperty("--ry", slotInfo.anchor.ry);
      if (slotInfo.anchor.offsetY) {
        it.style.transform = `translate(-50%, ${slotInfo.anchor.offsetY})`;
      }

      const img = document.createElement("img");
      img.src = `img/items/${slotInfo.id}.avif`;
      img.onerror = () => (img.src = "img/items/default.png");
      it.appendChild(img);
      wrap.appendChild(it);
    });
  }

  return wrap;
}

/* ─────────────────── Seviye Hex ─────────────────── */

function buildLevelHex(level) {
  const wrap = document.createElement("div");
  wrap.className = "meta-unit-hex-wrap";

  const hex = document.createElement("div");
  hex.className = "meta-flex-lvl-hex";

  const inner = document.createElement("div");
  inner.className = "meta-flex-lvl-inner";

  const num = document.createElement("span");
  num.className = "meta-flex-lvl-num";
  num.textContent = level;
  inner.appendChild(num);

  hex.appendChild(inner);

  wrap.appendChild(hex);

  return wrap;
}

/* ─────────────────── Flex Paneli ─────────────────── */

function buildFlexPanel(comp) {
  const flex = Array.isArray(comp.flex) ? comp.flex : [];
  const swap = comp.swap && typeof comp.swap === "object" ? comp.swap : {};

  if (flex.length === 0 && Object.keys(swap).length === 0) return null;

  const panel = document.createElement("div");
  panel.className = "meta-flex-panel meta-panel";

  const row = document.createElement("div");
  row.className = "meta-swap-row";

  const items = [];
  Object.entries(swap).forEach(([base, alts]) => {
    (Array.isArray(alts) ? alts : []).forEach((alt) => {
      items.push({ base, alt });
    });
  });
  flex.forEach((entry) => {
    const unitNames = Array.isArray(entry.birimler) ? entry.birimler : [];
    unitNames.forEach((ad) => items.push({ seviye: entry.seviye, ad }));
  });

  const MAX = 4;
  items.slice(0, MAX).forEach((item) => {
    const newWrap =
      item.base !== undefined
        ? buildUnitHex(item.alt, null, "alt", true, true)
        : buildUnitHex(item.ad, null, null, true, true);
    newWrap.classList.add("meta-swap-new");

    if (item.base === undefined && item.seviye === undefined) {
      row.appendChild(newWrap);
      return;
    }

    const pair = document.createElement("div");
    pair.className = "meta-swap-pair";

    const oldWrap =
      item.base !== undefined
        ? buildUnitHex(item.base, null, "old", true, true)
        : buildLevelHex(item.seviye);
    oldWrap.classList.add("meta-swap-old");
    pair.appendChild(oldWrap);
    pair.appendChild(newWrap);

    row.appendChild(pair);
  });

  if (items.length > MAX) {
    const more = document.createElement("span");
    more.className = "meta-flex-more";
    more.textContent = `+${items.length - MAX}`;
    row.appendChild(more);
  }

  panel.appendChild(row);

  return panel;
}

function buildInfoCard(comp, units) {
  const card = document.createElement("div");
  card.className = "meta-info-card";

  if (comp.oyuncu_notu) {
    const note = document.createElement("p");
    note.className = "meta-comp-note";
    note.textContent = comp.oyuncu_notu;
    card.appendChild(note);
  }

  const edit = document.createElement("button");
  edit.className = "meta-edit-btn";
  edit.type = "button";
  edit.textContent = "Kompu Düzenle";
  edit.addEventListener("click", () => {
    const champList = units
      .filter((u) => u.champ && u.pos !== undefined)
      .map((u) => ({ ...u.champ, slotId: u.pos, esyalar: u.esyalar }));
    loadCompIntoTeam(champList);
    const plannerBtn = document.querySelector('.nav-btn[data-target="planner-view"]');
    if (plannerBtn) plannerBtn.click();
  });
  card.appendChild(edit);

  return card;
}

function buildMiniBoard(units, carryIdx, tankIdx, variant) {
  const board = document.createElement("div");
  board.className = variant === "preview" ? "meta-board meta-board-preview" : "meta-board";

  const posMap = new Map();
  units.forEach((u, idx) => {
    if (u.pos !== undefined) posMap.set(u.pos, idx);
  });

  for (let row = 0; row < BOARD_ROWS; row++) {
    const rowEl = document.createElement("div");
    rowEl.className = "meta-m-row";
    for (let col = 0; col < BOARD_COLS; col++) {
      const pos = row * BOARD_COLS + col;
      const unitIdx = posMap.get(pos);
      rowEl.appendChild(
        createMiniSlot(
          unitIdx !== undefined ? units[unitIdx] : null,
          unitIdx !== undefined && carryIdx.has(unitIdx),
          unitIdx !== undefined && tankIdx.has(unitIdx),
        ),
      );
    }
    board.appendChild(rowEl);
  }
  return board;
}

function createMiniSlot(unit, isCarry, isTank) {
  const slot = document.createElement("div");
  slot.className = "meta-m-slot";

  if (!unit || !unit.champ) {
    slot.classList.add("meta-m-empty");
    return slot;
  }

  slot.classList.add("meta-m-filled");
  slot.classList.add(`cost-border-${unit.champ.cost}`);
  if (isCarry) slot.classList.add("meta-m-carry");
  if (isTank) slot.classList.add("meta-m-tank");

  const img = document.createElement("img");
  img.src = unit.champ.img;
  img.alt = unit.champ.name;
  img.onerror = () => (img.src = "img/profiles/default.png");
  slot.appendChild(img);

  if (isCarry) {
    const carryTag = document.createElement("span");
    carryTag.className = "meta-carry-tag";
    carryTag.textContent = "Carry";
    slot.appendChild(carryTag);
  }

  if (isTank) {
    const tankTag = document.createElement("span");
    tankTag.className = "meta-tank-tag";
    tankTag.textContent = "Tank";
    slot.appendChild(tankTag);
  }

  getStarAnchors(unit.yildiz).forEach((anchor) => {
    const star = document.createElement("span");
    star.className = `meta-m-star meta-star-${unit.yildiz}`;
    star.style.setProperty("--rx", anchor.rx);
    star.style.setProperty("--ry", anchor.ry);
    if (anchor.offsetY) star.style.transform = `translate(-50%, ${anchor.offsetY}px)`;
    star.textContent = "★";
    slot.appendChild(star);
  });

  const itemIds = unit.esyalar;
  if (Array.isArray(itemIds) && itemIds.length) {
    getItemLayout(itemIds, 26).forEach((slotInfo) => {
      const it = document.createElement("div");
      it.className = `meta-m-item cost-border-${unit.champ.cost}`;
      it.style.setProperty("--rx", slotInfo.anchor.rx);
      it.style.setProperty("--ry", slotInfo.anchor.ry);
      if (slotInfo.anchor.offsetY) {
        it.style.transform = `translate(-50%, ${slotInfo.anchor.offsetY})`;
      }

      const img = document.createElement("img");
      img.src = `img/items/${slotInfo.id}.avif`;
      img.onerror = () => (img.src = "img/items/default.png");
      it.appendChild(img);
      slot.appendChild(it);
    });
  }

  return slot;
}