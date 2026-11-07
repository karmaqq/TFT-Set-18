import { hideAllTooltips } from "./tooltips.js";
import { renderChampionPool, updateSelectedChampions } from "./champions.js";
import { getItemImg, allItemsMap } from "./items.js";
import { getItemLayout } from "./utils.js";

let selectedComp = [];
let onTeamUpdateCallback = null;
let championsData = [];
let lastPlantTier = 0;

const MAX_SLOTS = 28;
const MAX_TEAM_SIZE = 10;
const BOARD_COLS = 7;

export function initPlanner(champions, onUpdate) {
  championsData = champions;
  onTeamUpdateCallback = onUpdate;

  initBoardSlots();
  setupResetButton();
  setupGlobalDrop();

  renderChampionPool(selectedComp, handleChampionClick);
}

function findFirstFreeSlot() {
  const occupiedSlots = selectedComp.map((c) => c.slotId);
  return Array.from({ length: MAX_SLOTS }, (_, i) => i).find(
    (i) => !occupiedSlots.includes(i),
  );
}

function getPlantTier(elderwoodCount) {
  if (elderwoodCount >= 5) return 2;
  if (elderwoodCount >= 3) return 1;
  return 0;
}

function getDesiredPlants(tier) {
  return {
    tasKabuk: tier >= 2 ? 2 : tier >= 1 ? 1 : 0,
    canCicegi: tier >= 1 ? 1 : 0,
  };
}

function addPlant(name, row) {
  const plantData = championsData.find((c) => c.name === name);
  if (!plantData) return;

  const rowStart = row * BOARD_COLS;
  const slot = findRowFirstFreeSlot(rowStart);
  if (slot !== undefined) {
    selectedComp.push({ ...plantData, slotId: slot, freeSlot: true });
  }
}

function ensurePlants(tier) {
  const desired = getDesiredPlants(tier);
  const tasKabuk = selectedComp.filter(
    (c) => c.isSummon && c.name === "Taş Kabuk",
  ).length;
  const canCicegi = selectedComp.filter(
    (c) => c.isSummon && c.name === "Çançiçeği",
  ).length;

  for (let i = 0; i < desired.tasKabuk - tasKabuk; i++) addPlant("Taş Kabuk", 0);
  for (let i = 0; i < desired.canCicegi - canCicegi; i++)
    addPlant("Çançiçeği", 3);
}

function removeExtraPlants(tier) {
  const desired = getDesiredPlants(tier);
  let tasSeen = 0;
  let canSeen = 0;
  selectedComp = selectedComp.filter((c) => {
    if (!c.isSummon) return true;
    if (c.name === "Taş Kabuk") return ++tasSeen <= desired.tasKabuk;
    if (c.name === "Çançiçeği") return ++canSeen <= desired.canCicegi;
    return true;
  });
}

function applyPlantRules() {
  const elderwoodCount = selectedComp
    .filter((c) => !c.isSummon)
    .reduce((acc, c) => acc + (c.traits?.includes("Elderwood") ? 1 : 0), 0);

  const tier = getPlantTier(elderwoodCount);
  if (tier === lastPlantTier) return;

  if (tier > lastPlantTier) {
    ensurePlants(tier);
  } else {
    removeExtraPlants(tier);
  }

  lastPlantTier = tier;
}

function findRowFirstFreeSlot(rowStart) {
  const occupied = new Set(selectedComp.map((c) => c.slotId));
  for (let i = rowStart; i < rowStart + BOARD_COLS; i++) {
    if (!occupied.has(i)) return i;
  }
  return undefined;
}

function setupResetButton() {
  const resetBtn = document.getElementById("reset-team");
  if (resetBtn) resetBtn.addEventListener("click", resetTeam);
}

export function resetTeam() {
  selectedComp = [];
  lastPlantTier = 0;
  updateUI();
  renderChampionPool(selectedComp, handleChampionClick);
}

/* ─────────────────── loadCompIntoTeam ─────────────────── */

export function loadCompIntoTeam(champList) {
  selectedComp = champList.map((c) => ({
    ...c,
    items: (c.esyalar || c.items || []).slice(0, 3),
  }));
  lastPlantTier = 0;
  updateUI();
  renderChampionPool(selectedComp, handleChampionClick);
}

function setupGlobalDrop() {
  document.addEventListener("drop", (e) => {
    if (e.target.closest('[id^="slot-"]')) return;

    const itemId = e.dataTransfer.getData("item-id");
    if (itemId) {
      const itemOrigin = e.dataTransfer.getData("item-origin");
      if (itemOrigin !== "") {
        removeItemFromAnywhere(itemId);
        updateUI();
      }
      return;
    }

    const originSlot = e.dataTransfer.getData("origin-slot");
    if (originSlot !== "") {
      const slotIdx = parseInt(originSlot);
      const champToRemove = selectedComp.find((c) => c.slotId === slotIdx);
      if (champToRemove && !champToRemove.isFixed)
        removeChampion(champToRemove);
    }
  });
  document.addEventListener("dragover", (e) => e.preventDefault());
}

function initBoardSlots() {
  for (let i = 0; i < MAX_SLOTS; i++) {
    const slotEl = document.getElementById(`slot-${i}`);
    if (!slotEl) continue;

    slotEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      const isItemDrag = e.dataTransfer.types.includes("item-id");
      if (isItemDrag) {
        slotEl.classList.remove("slot-hover");
      } else {
        slotEl.classList.add("slot-hover");
      }
    });

    slotEl.addEventListener("dragleave", () =>
      slotEl.classList.remove("slot-hover"),
    );

    slotEl.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      slotEl.classList.remove("slot-hover");

      const itemId = e.dataTransfer.getData("item-id");
      if (itemId) {
        const itemOrigin = e.dataTransfer.getData("item-origin");
        if (itemOrigin !== "") removeItemFromAnywhere(itemId);

        const occupant = selectedComp.find((c) => c.slotId === i);
        if (!occupant || occupant.items.length >= 3) {
          if (itemOrigin !== "") updateUI();
          return;
        }
        occupant.items.push(itemId);
        updateUI();
        return;
      }

      const champName = e.dataTransfer.getData("text/plain");
      const originSlot = e.dataTransfer.getData("origin-slot");

      if (originSlot !== "") {
        moveChampion(parseInt(originSlot), i);
      } else {
        const champ = championsData.find((c) => c.name === champName);
        if (champ) addChampionToSlot(champ, i);
      }
    });
  }
}

function removeItemFromAnywhere(itemId) {
  selectedComp.forEach((c) => {
    if (c.items) {
      const idx = c.items.indexOf(itemId);
      if (idx !== -1) c.items.splice(idx, 1);
    }
  });
}

function handleChampionClick(champ) {
  hideAllTooltips();
  toggleChampion(champ);
}

function toggleChampion(champ) {
  const existing = selectedComp.find((c) => c.name === champ.name);
  if (existing) {
    if (existing.isFixed) return;
    removeChampion(existing);
  } else {
    addChampion(champ);
  }
}

function addChampion(champ) {
  const currentSize = selectedComp.filter((c) => !c.freeSlot).length;
  if (currentSize >= MAX_TEAM_SIZE) return;

  const firstFree = findFirstFreeSlot();
  if (firstFree !== undefined) {
    selectedComp.push({ ...champ, slotId: firstFree, yildiz: 1, items: [] });
    updateUI();
  }
}

function addChampionToSlot(champ, targetSlot) {
  const existing = selectedComp.find((c) => c.name === champ.name);
  const occupant = selectedComp.find((c) => c.slotId === targetSlot);

  if (existing) {
    if (existing.isFixed) return;
    moveChampion(existing.slotId, targetSlot);
  } else {
    const currentSize = selectedComp.filter((c) => !c.freeSlot).length;
    if (currentSize >= MAX_TEAM_SIZE) return;

    if (occupant && !occupant.isFixed) {
      selectedComp = selectedComp.filter((c) => c.slotId !== targetSlot);
    }
    selectedComp.push({ ...champ, slotId: targetSlot, yildiz: 1, items: [] });
    updateUI();
  }
}

function removeChampion(champ) {
  selectedComp = selectedComp.filter((c) => c.name !== champ.name);
  updateUI();
}

function moveChampion(fromSlotId, toSlotId) {
  if (fromSlotId === toSlotId) return;
  const mover = selectedComp.find((c) => c.slotId === fromSlotId);
  const target = selectedComp.find((c) => c.slotId === toSlotId);

  if (mover && !mover.isFixed) {
    selectedComp = selectedComp.map((c) => {
      if (c.slotId === fromSlotId) return { ...c, slotId: toSlotId };
      if (target && c.slotId === toSlotId && !target.isFixed)
        return { ...c, slotId: fromSlotId };
      return c;
    });
    updateUI();
  }
}

function updateUI() {
  applyPlantRules();

  for (let i = 0; i < MAX_SLOTS; i++) {
    const slotEl = document.getElementById(`slot-${i}`);
    if (slotEl) {
      slotEl.innerHTML = "";
      slotEl.className = "empty-slot";
      slotEl.onclick = null;
      slotEl.removeAttribute("draggable");
    }
  }

  selectedComp.forEach((champ) => {
    const slotEl = document.getElementById(`slot-${champ.slotId}`);
    if (slotEl) {
      const champDiv = createCompChampElement(champ);
      slotEl.className = champDiv.className;
      slotEl.innerHTML = champDiv.innerHTML;
      slotEl.classList.add("has-champ");

      if (champ.isFixed) slotEl.classList.add("fixed-unit");

      appendStarPicker(slotEl, champ);

      appendItemRack(slotEl, champ);

      slotEl.onclick = (e) => {
        e.stopPropagation();
        if (!champ.isFixed) removeChampion(champ);
      };

      if (!champ.isFixed) {
        slotEl.setAttribute("draggable", "true");
        slotEl.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", champ.name);
          e.dataTransfer.setData("origin-slot", champ.slotId.toString());
          hideAllTooltips();
        });
      }
    }
  });

  const teamCountEl = document.getElementById("team-count");
  const actualSize = selectedComp.filter((c) => !c.freeSlot).length;
  if (teamCountEl) teamCountEl.textContent = actualSize;

  updateSelectedChampions(selectedComp);
  if (onTeamUpdateCallback) onTeamUpdateCallback(selectedComp);
}

function createCompChampElement(champ) {
  const div = document.createElement("div");
  div.className = "comp-champ";
  if (champ.isSummon) div.classList.add("summon-unit");

  const hex = document.createElement("div");
  hex.className = `comp-champ-hex cost-border-${champ.cost}`;

  const img = document.createElement("img");
  img.src = champ.img;
  img.onerror = () => (img.src = "img/profiles/default.png");
  hex.appendChild(img);

  div.appendChild(hex);

  return div;
}

function appendStarPicker(el, champ) {
  const picker = document.createElement("div");
  picker.className = "planner-star-picker";

  const applyLevel = (level) => {
    picker.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("on", +b.dataset.stars <= level);
    });
  };

  for (let i = 1; i <= 3; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.stars = i;
    btn.textContent = "★";

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      champ.yildiz = i;
      updateUI();
    });
    btn.addEventListener("dragstart", (e) => e.preventDefault());
    picker.appendChild(btn);
  }

  applyLevel(champ.yildiz || 1);
  el.appendChild(picker);
}

/* ─────────────────── Eşya Rafı ─────────────────── */

function appendItemRack(el, champ) {
  const rack = document.createElement("div");
  rack.className = "planner-item-rack";

  const layout = getItemLayout(champ.items, 26);
  layout.forEach((slotInfo) => {
    const item = allItemsMap.get(slotInfo.id);
    if (!item) return;

    const slot = document.createElement("div");
    slot.className = `planner-item-slot cost-border-${champ.cost}`;
    slot.style.setProperty("--rx", slotInfo.anchor.rx);
    slot.style.setProperty("--ry", slotInfo.anchor.ry);
    if (slotInfo.anchor.offsetY) {
      slot.style.transform = `translate(-50%, ${slotInfo.anchor.offsetY})`;
    }
    slot.setAttribute("draggable", "true");
    slot.title = item.name;

    const img = document.createElement("img");
    img.src = getItemImg(item.id);
    img.alt = item.name;
    img.onerror = () => (img.src = "img/items/default.png");
    slot.appendChild(img);

    slot.addEventListener("click", (e) => e.stopPropagation());
    slot.addEventListener("dragstart", (e) => {
      hideAllTooltips();
      e.stopPropagation();
      e.dataTransfer.setData("item-id", item.id);
      e.dataTransfer.setData("item-origin", champ.slotId.toString());
      e.dataTransfer.effectAllowed = "move";
    });

    rack.appendChild(slot);
  });

  el.appendChild(rack);
}
