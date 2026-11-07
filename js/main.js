import { loadJSON, initMobileTabs } from "./utils.js";
import { initTooltips } from "./tooltips.js";
import { initNavigation } from "./header.js";
import {
  initTraits,
  updateTraits,
  getTraitsData,
  initTraitSidebar,
} from "./traits.js";
import { initChampions } from "./champions.js";
import { initItems, allItemsMap } from "./items.js";
import { initPlanner } from "./planner.js";
import { initPhotoMode } from "./photomode.js";
import { initMeta } from "./meta.js";

document.addEventListener("DOMContentLoaded", async () => {
  const [championsData, traitsData, itemData, compsData] = await Promise.all([
    loadJSON("data/championsdata.json"),
    loadJSON("data/traitsdata.json"),
    loadJSON("data/itemdata.json"),
    loadJSON("data/comps.json"),
  ]);

  initMobileTabs();
  initTraitSidebar();

  if (championsData?.champions && traitsData?.traits && itemData) {
    const champions = championsData.champions;
    const traits = traitsData.traits;

    initNavigation();
    initTraits(traits);
    initChampions(champions, traits);

    await initItems();
    initPhotoMode();

    initPlanner(champions, (selectedComp) => {
      updateTraits(selectedComp);
    });

    initMeta(compsData, champions);

    initTooltips(getTraitsData(), allItemsMap, champions, traits);
  }
});
