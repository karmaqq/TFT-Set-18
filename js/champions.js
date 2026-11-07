import { safeLowercase } from "./utils.js";

let championsData = [];
let championsGridEl = null;
let currentViewMode = "cost";
let currentSearchTerm = "";
let lastSelectedChamps = [];
let lastOnChampClick = null;
let traitNameMap = new Map();

export function initChampions(champions, traitsData) {
  championsData = champions;
  championsGridEl = document.getElementById("champions-section");

  if (traitsData) {
    ["specialTraits", "originTraits", "classTraits"].forEach((group) => {
      Object.values(traitsData[group] || {}).forEach((t) => {
        if (t?.name && t?.turkce) {
          traitNameMap.set(safeLowercase(t.name), safeLowercase(t.turkce));
        }
      });
    });
  }

  if (championsGridEl) {
    if (window.innerWidth <= 480) {
      currentViewMode = "cost";
    }

    setupViewToggle();
    setupSearch();
  }
}

function setupViewToggle() {
  const toggleBtn = document.getElementById("toggle-pool-view");
  if (!toggleBtn) return;

  toggleBtn.onclick = (e) => {
    currentViewMode = currentViewMode === "all" ? "cost" : "all";
    e.target.textContent =
      currentViewMode === "all" ? "Maliyete Göre Sıralı" : "Hepsini Göster";
    renderChampionPool(lastSelectedChamps, lastOnChampClick);
  };
}

function setupSearch() {
  const searchInput = document.getElementById("champ-search");
  const clearBtn = document.getElementById("clear-champ-search");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      handleChampSearch(e.target.value);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
        handleChampSearch("");
        searchInput.focus();
      }
    });
  }
}

export function handleChampSearch(term) {
  currentSearchTerm = safeLowercase(term);
  const clearBtn = document.getElementById("clear-champ-search");
  if (clearBtn) {
    clearBtn.style.display = term.length > 0 ? "block" : "none";
  }
  applyChampFilter();
}

function applyChampFilter() {
  const cards = document.querySelectorAll(".champ-item");
  cards.forEach((card) => {
    const name = safeLowercase(card.getAttribute("data-name") || "");
    const traits = card.getAttribute("data-traits") || "";
    const isMatch =
      name.includes(currentSearchTerm) || traits.includes(currentSearchTerm);
    card.style.display = isMatch ? "flex" : "none";
  });

  if (currentViewMode === "cost") {
    const dividers = document.querySelectorAll(".pool-divider");
    dividers.forEach((div) => {
      let hasVisibleChamp = false;
      let nextEl = div.nextElementSibling;
      while (nextEl && !nextEl.classList.contains("pool-divider")) {
        if (nextEl.style.display !== "none") {
          hasVisibleChamp = true;
          break;
        }
        nextEl = nextEl.nextElementSibling;
      }
      div.style.display = hasVisibleChamp ? "flex" : "none";
    });
  }
}

export function renderChampionPool(
  selectedChamps = lastSelectedChamps,
  onChampClick = lastOnChampClick,
) {
  if (!championsGridEl) return;

  lastSelectedChamps = selectedChamps;
  lastOnChampClick = onChampClick;

  championsGridEl.innerHTML = "";

  let displayChamps = [...championsData]
    .filter((c) => !c.isSummon)
    .sort((a, b) => {
    const costA = a.cost === 0 ? 99 : a.cost;
    const costB = b.cost === 0 ? 99 : b.cost;
    if (costA !== costB) return costA - costB;
    return a.name.localeCompare(b.name);
  });

  if (currentViewMode === "cost") {
    let lastCost = null;
    displayChamps.forEach((c) => {
      if (lastCost !== c.cost) {
        const divider = document.createElement("div");
        if (c.cost === 0) {
          divider.className = "pool-divider cost-divider-special";
          divider.innerHTML = "<span>Özel Birimler</span>";
        } else {
          divider.className = `pool-divider cost-divider-${c.cost}`;
          divider.innerHTML = `<span>${c.cost} Altın</span>`;
        }
        championsGridEl.appendChild(divider);
        lastCost = c.cost;
      }

      const el = createChampElement(c, onChampClick);
      if (selectedChamps.some((sc) => sc.name === c.name)) {
        el.classList.add("selected");
      }
      championsGridEl.appendChild(el);
    });
  } else {
    displayChamps.forEach((c) => {
      const el = createChampElement(c, onChampClick);
      if (selectedChamps.some((sc) => sc.name === c.name)) {
        el.classList.add("selected");
      }
      championsGridEl.appendChild(el);
    });
  }

  applyChampFilter();
}

function createChampElement(champ, onChampClick = null) {
  const div = document.createElement("div");
  div.className = `champ-item cost-${champ.cost}`;

  const img = document.createElement("img");
  img.src = champ.img;
  img.onerror = () => (img.src = "img/profiles/default.png");
  div.appendChild(img);

  if (champ.isLocked) {
    const lockIcon = document.createElement("div");
    lockIcon.className = "permanent-lock";
    div.appendChild(lockIcon);
  }

  div.setAttribute("data-name", champ.name);

  const traitsArray = champ.traits || [];
  const searchableTraits = traitsArray.flatMap((t) => {
    const clean = safeLowercase(t);
    const tr = traitNameMap.get(clean);
    return tr && tr !== clean ? [clean, tr] : [clean];
  });
  div.setAttribute(
    "data-traits",
    searchableTraits.join(","),
  );

  if (onChampClick) {
    div.onclick = (e) => {
      e.stopPropagation();
      onChampClick(champ);
    };
  }

  div.setAttribute("draggable", "true");
  div.ondragstart = (e) => {
    div.classList.add("dragging");
    e.dataTransfer.setData("text/plain", champ.name);
    e.dataTransfer.setData("origin-slot", "");
  };

  div.ondragend = () => div.classList.remove("dragging");

  return div;
}

export function updateSelectedChampions(selectedChamps) {
  lastSelectedChamps = selectedChamps;
  document.querySelectorAll(".champ-item").forEach((el) => {
    const champName = el.getAttribute("data-name");
    const isSelected = selectedChamps.some((c) => c.name === champName);
    el.classList.toggle("selected", isSelected);
  });
}

export function getChampionsData() {
  return championsData;
}
