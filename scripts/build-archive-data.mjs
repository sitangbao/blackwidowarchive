import { mkdir, writeFile } from "node:fs/promises";

const owner = "sitangbao";
const repo = "blackwidowarchive";
const branch = "main";
const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/content/items?ref=${branch}`;
const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "black-widow-archive-build",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
};

async function getJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  return response.json();
}

const CARD_SERIES = {
  ud_2010_iron_man_2: "2010｜Iron Man 2",
  ud_2012_the_avengers: "2012｜The Avengers",
  ud_2014_winter_soldier: "2014｜Captain America: The Winter Soldier",
  ud_2015_age_of_ultron: "2015｜Avengers: Age of Ultron",
  ud_2016_civil_war: "2016｜Captain America: Civil War",
  ud_2018_infinity_war: "2018｜Avengers: Infinity War",
  ud_2019_mcu_10th_anniversary: "2019｜MCU 10th Anniversary",
  ud_2020_endgame_captain_marvel: "2020｜Avengers: Endgame & Captain Marvel",
  ud_2021_black_widow: "2021｜Black Widow",
  ud_2021_marvel_black_diamond: "2021｜Marvel Black Diamond",
  ud_2022_marvel_allure: "2022｜Marvel Allure",
};

const resolveCardSeries = (item) => CARD_SERIES[item.card_series_preset] ?? item.card_series ?? null;

// Standardize UD card names: no space after "UD", one space before the card type,
// and one space between the card type and its number.
const normalizeCardName = (item) => {
  const name = String(item.name ?? "");
  if (item.category !== "卡片类") return name;

  let normalized = name;
  if (/^UD\\s*/.test(normalized)) normalized = normalized.replace(/^UD\\s*/, "UD");
  normalized = normalized.replace(/[（(]\\s*(\\d+编)\\s*[）)]/g, "$1");

  if (/^UD/.test(normalized)) {
    const cardTypes = "双人衣料卡|三人衣料卡|普卡|衣料卡|镭射卡|银折|红折|蓝折|签字卡|概念卡|透明卡|贴纸卡|拼图卡|金属卡|角色卡|场景卡|金折";
    normalized = normalized.replace(new RegExp(`(${cardTypes})\\s*#`), "$1 #");
  }
  return normalized;
};
async function main() {
  const listingResponse = await fetch(apiUrl, { headers });
  let files = [];
  if (listingResponse.status === 404) {
    console.log("No content/items directory yet; building an empty archive.");
  } else {
    if (!listingResponse.ok) {
      const detail = await listingResponse.text();
      throw new Error(`Could not list content/items (${listingResponse.status}): ${detail.slice(0, 300)}`);
    }
    const listing = await listingResponse.json();
    if (!Array.isArray(listing)) throw new Error("GitHub content/items response was not a directory listing.");
    files = listing.filter((entry) => entry.type === "file" && entry.name.endsWith(".json"));
  }

  const items = [];
  for (const file of files) {
    // Cache-bust GitHub's raw file CDN so builds always read the latest committed item JSON.
    const item = await getJson(`${file.download_url}?v=${file.sha}`);
    if (!item || typeof item !== "object" || !item.id || !item.name) {
      throw new Error(`Invalid item JSON: ${file.name}`);
    }
    const images = Array.isArray(item.images)
      ? item.images
      : typeof item.images === "string" && item.images
        ? [item.images]
        : [];
    items.push({
      ...item,
      id: String(item.id),
      name: normalizeCardName(item),
      region: item.region ?? "",
      series: String(item.series ?? "").trim().toLowerCase() === "funko" ? null : item.series_preset === "iron_man_2" ? "钢铁侠2" : item.series_preset === "avengers_1" ? "复仇者联盟1" : item.series_preset === "winter_soldier" ? "美国队长2:冬日战士" : item.series_preset === "age_of_ultron" ? "复仇者联盟2:奥创纪元" : item.series_preset === "civil_war" ? "美国队长3:内战" : item.series_preset === "infinity_war" ? "复仇者联盟3:无限战争" : item.series_preset === "endgame" ? "复仇者联盟4:终局之战" : item.series_preset === "black_widow" ? "黑寡妇" : (item.series ?? null),
      card_series: resolveCardSeries(item),
      set_name: item.set_name ?? null,
      category: item.category ?? "",
      item_type: item.item_type ?? null,
      brand: item.brand_preset === "funko" ? "FUNKO" : item.brand_preset === "upper_deck" ? "UPPER DECK (UD)" : item.brand_preset === "kakawow" ? "KAKAWOW" : item.brand_preset === "topps" ? "TOPPS" : item.brand_preset === "finding_card" ? "FINDING CARD" : item.brand_preset === "panini" ? "PANINI" : item.brand_preset === "hot_toys" ? "HOT TOYS" : item.brand_preset === "marvel_legends" ? "MARVEL LEGENDS" : item.brand_preset === "cosbaby" ? "COSBABY" : item.brand_preset === "lego" ? "LEGO" : item.brand_preset === "pop_mart" ? "POP MART" : item.brand_preset === "bandai" ? "BANDAI" : item.brand_preset === "titan_hero_series" ? "TITAN HERO SERIES" : (item.brand ?? (String(item.series ?? "").trim().toLowerCase() === "funko" ? "FUNKO" : null)),
      size: item.size ?? null,
      box_number: item.box_number ?? null,
      item_number: item.item_number ?? null,
      card_number: item.card_number ?? null,
      card_title: item.card_title ?? null,
      original_price: item.original_price ?? "",
      status: item.status ?? "not_owned",
      person_count: item.person_count ?? "single",
      keywords: item.keywords ?? null,
      notes: [item.notes_preset === "blind_draw" ? "盲抽" : item.notes_preset === "set" ? "套装" : null, item.notes ?? null].filter(Boolean).join("；") || null,
      images,
    });
  }

  // Add Funko POP! box numbers to display names. Rock Candy and Button Pin are
  // separate Funko product lines and intentionally remain unchanged.
  const isFunkoPop = (item) => {
    const brand = String(item.brand_preset ?? item.brand ?? "").trim().toLowerCase();
    const legacySeries = String(item.series ?? "").trim().toLowerCase();
    const category = String(item.category ?? "").trim();
    const productLine = [
      item.name, item.item_type, item.series, item.series_preset,
      item.product_spec, item.keywords, item.notes,
    ].filter(Boolean).join(" ");
    const isFunko = brand === "funko" || brand === "funko pop" ||
      legacySeries === "funko" || item.brand_preset === "funko";
    const isFigure = category === "手办类" || category === "手办";
    const isExcludedLine = /rock\s*candy|button\s*pin/i.test(productLine);
    return isFunko && isFigure && !isExcludedLine;
  };
  for (const item of items) {
    if (!isFunkoPop(item)) continue;
    const boxNumber = String(item.box_number ?? "").trim();
    if (boxNumber && !String(item.name).endsWith(`#${boxNumber}`)) {
      item.name = `${item.name} #${boxNumber}`;
    }
  }

  // Restore the archive's established order: alphabetical baseline, then
  // curated ordering for Funko POP!, sticker brands, and card collections.
  items.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans"));

  const funkoPositions = items.flatMap((item, index) => isFunkoPop(item) ? [index] : []);
  const funkoItems = funkoPositions.map(index => items[index]).sort((a, b) =>
    String(a.box_number ?? "").localeCompare(String(b.box_number ?? ""), "en", { numeric: true })
  );
  funkoPositions.forEach((position, index) => { items[position] = funkoItems[index]; });

  // Keep PANINI, ABRIL, and PREZIOSI stickers grouped by series and item number.
  const stickerPositions = items.flatMap((item, index) =>
    item.category === "贴纸" && ["panini", "abril", "preziosi"].some(brand =>
      item.brand_preset === brand || String(item.brand ?? "").toLowerCase() === brand.toUpperCase().toLowerCase()
    ) ? [index] : []
  );
  const stickers = stickerPositions.map(index => items[index]).sort((a, b) => {
    const seriesCompare = String(a.series ?? "").localeCompare(String(b.series ?? ""), "zh-Hans", { numeric: true });
    if (seriesCompare) return seriesCompare;
    return String(a.item_number ?? "").localeCompare(String(b.item_number ?? ""), "en", { numeric: true });
  });
  stickerPositions.forEach((position, index) => { items[position] = stickers[index]; });

  const cardPositions = items.flatMap((item, index) => item.category === "卡片类" ? [index] : []);
  const cardTypeOrder = new Map([
    ["Base Card", 0], ["Base Card-Roll Call", 0], ["Base High Series", 0], ["Base", 0], ["普卡", 0],
    ["Silver Foil", 1], ["银折", 1], ["Red Foil", 2], ["红折", 2], ["Blue Foil", 3], ["蓝折", 3],
  ]);
  const getCardType = item => {
    if (item.item_type) return String(item.item_type).trim();
    const name = String(item.name ?? "");
    if (/普卡|Base Card/i.test(name)) return "Base Card";
    if (/银折|Silver Foil/i.test(name)) return "Silver Foil";
    if (/红折|Red Foil/i.test(name)) return "Red Foil";
    if (/蓝折|Blue Foil/i.test(name)) return "Blue Foil";
    return "";
  };
  const getCardNumber = item => {
    const stored = String(item.card_number ?? "").trim();
    return stored || (String(item.name ?? "").match(/#\\s*([A-Z]*-?\\d+)/i)?.[1] ?? "");
  };
  const cards = cardPositions.map(index => items[index]).sort((a, b) => {
    const seriesA = String(a.card_series ?? a.series ?? "");
    const seriesB = String(b.card_series ?? b.series ?? "");
    const seriesCompare = seriesA.localeCompare(seriesB, "zh-Hans", { numeric: true });
    if (seriesCompare) return seriesCompare;
    // Memorabilia cards, including multi-person variants, always appear last within each series.
    const isMemorabilia = item => /衣料卡|memorabilia/i.test([item.item_type, item.name, item.card_title].filter(Boolean).join(" "));
    const memorabiliaA = isMemorabilia(a), memorabiliaB = isMemorabilia(b);
    if (memorabiliaA !== memorabiliaB) return memorabiliaA ? 1 : -1;
    const numberCompare = () => getCardNumber(a).localeCompare(getCardNumber(b), "en", { numeric: true });
    const seriesLower = seriesA.trim().toLowerCase();
    const isAllure = seriesLower === "2022 marvel allure";
    if (isAllure) {
      const n = numberCompare();
      if (n) return n;
      const order = ["Base Card", "Base High Series", "Black Rainbow", "Magenta", "Orange Slice Die-Cut", "Portal", "Red Prism", "Steel", "Sunrise", "Yellow Taxi", "Storm", "Green Quartz", "White Diamond", "Blue Line", "Pink", "Purple Rainbow Die-Cut", "Infinity Stones - Mind Stone", "Infinity Stones - Power Stone", "Infinity Stones - Reality Stone", "Infinity Stones - Soul Stone", "Infinity Stones - Space Stone", "Infinity Stones - Time Stone", "Infinity Stones Gold Parallel - Mind Stone", "Infinity Stones Gold Parallel - Power Stone", "Infinity Stones Gold Parallel - Reality Stone", "Infinity Stones Gold Parallel - Soul Stone", "Infinity Stones Gold Parallel - Space Stone", "Infinity Stones Gold Parallel - Time Stone", "Infinity Stones White Parallel - Soul Stone", "Infinity Stones White Parallel - Space Stone"];
      const ra = order.indexOf(String(a.item_type ?? "").trim()), rb = order.indexOf(String(b.item_type ?? "").trim());
      return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb) || String(a.name ?? "").localeCompare(String(b.name ?? ""), "zh-Hans", { numeric: true });
    }
    const upperDeck = a.brand_preset === "upper_deck" || a.brand === "UPPER DECK (UD)";
    const numberFirst = upperDeck && [
      /2014.*captain america.*winter soldier/i,
      /2015.*avengers.*age of ultron/i,
      /2016.*captain america.*civil war/i,
      /2019.*mcu.*10th anniversary/i,
    ].some(re => re.test(seriesA));
    const isTenAnniversary = upperDeck && /2019.*mcu.*10th anniversary/i.test(seriesA);
    if (isTenAnniversary) {
      const tenYearRank = item => {
        const label = [item.item_type, item.name, item.card_title].filter(Boolean).join(" ").toLowerCase();
        if (/罗马特卡|罗马数字|roman(?:\s*numeral)?(?:\s*card)?/.test(label)) return 1;
        if (/人物卡|人物|character card|characters?/.test(label)) return 2;
        if (/拍摄花絮|幕后|behind[ -]?the[ -]?scenes|bts/.test(label)) return 3;
        if (/胶片特卡|胶片|film(?:\s*strip)?(?:\s*card)?/.test(label)) return 4;
        return 0;
      };
      const rankA = tenYearRank(a), rankB = tenYearRank(b);
      if (rankA !== rankB) return rankA - rankB;
      // Group regular cards by their shared artwork/title, then sort each artwork group by card number.
      const artworkKey = item => String(item.card_title ?? "").trim().toLowerCase() ||
        String(item.name ?? "").replace(/(?:普卡|银折|红折|蓝折|金折|\bbase card\b|\bfoil\b).*$/i, "").trim().toLowerCase();
      const artworkCompare = artworkKey(a).localeCompare(artworkKey(b), "zh-Hans", { numeric: true });
      if (artworkCompare) return artworkCompare;
      return numberCompare() || String(a.name ?? "").localeCompare(String(b.name ?? ""), "zh-Hans", { numeric: true });
    }
    if (numberFirst) {
      const isCivilWar = /2016.*captain america.*civil war/i.test(seriesA);
      // Walmart Civil War cards must be sorted before the generic number-first rule below.
      if (isCivilWar) {
        const walmartRank = item => {
          const label = [item.item_type, item.name, item.card_title].filter(Boolean).join(" ").toLowerCase();
          if (/红底普卡|red[ -]?background[ -]?base|red[ -]?base/.test(label)) return 0;
          if (/红底星星折|red[ -]?background.*star|red.*star[ -]?foil/.test(label)) return 1;
          if (/红底闪电折|red[ -]?background.*lightning|red.*lightning[ -]?foil/.test(label)) return 2;
          if (/蓝底普卡|blue[ -]?background[ -]?base|blue[ -]?base/.test(label)) return 3;
          if (/蓝底星星折|blue[ -]?background.*star|blue.*star[ -]?foil/.test(label)) return 4;
          if (/蓝底闪电折|blue[ -]?background.*lightning|blue.*lightning[ -]?foil/.test(label)) return 5;
          if (/角色简介|character bio|character profile/.test(label)) return 6;
          if (/电影剧照|movie still|film still/.test(label)) return 7;
          return null;
        };
        const wa = walmartRank(a), wb = walmartRank(b);
        if (wa !== null || wb !== null) {
          if (wa === null) return 1;
          if (wb === null) return -1;
          // Restore the original Walmart order: parallel type first, then card number.
          // Special inserts stay after all parallels: bios first, then movie stills.
          return wa - wb || numberCompare();
        }
      }
      const seriesSpecialRank = item => {
        const label = [item.item_type, item.name, item.card_title].filter(Boolean).join(" ").toLowerCase();
        if (/幕后|behind[ -]?the[ -]?scenes|bts/.test(label)) return 1;
        if (/人物卡|人物|character card|characters?/.test(label)) return 2;
        return 0;
      };
      const specialRankA = seriesSpecialRank(a), specialRankB = seriesSpecialRank(b);
      if (specialRankA !== specialRankB) return specialRankA - specialRankB;
      const n = numberCompare();
      if (n) return n;
      const rank = item => {
        const label = [item.item_type, item.name, item.card_title].filter(Boolean).join(" ");
        if (/普卡|Base Card/i.test(label)) return 0;
        if (isCivilWar) {
          if (/蓝折|Blue Foil/i.test(label)) return 1;
          if (/红折|Red Foil/i.test(label)) return 2;
          if (/金折|Gold Foil|Gold Parallel/i.test(label)) return 3;
          return 4;
        }
        return /银折|Silver Foil/i.test(label) ? 1 : /红折|Red Foil/i.test(label) ? 2 : /蓝折|Blue Foil/i.test(label) ? 3 : 4;
      };
      return rank(a) - rank(b) || String(a.name ?? "").localeCompare(String(b.name ?? ""), "zh-Hans", { numeric: true });
    }
    if (seriesLower === "2024 marvel studios series 2 cinematic") {
      const n = numberCompare();
      if (n) return n;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""), "zh-Hans", { numeric: true });
    }
    const ta = getCardType(a), tb = getCardType(b);
    const ra = cardTypeOrder.get(ta) ?? 4, rb = cardTypeOrder.get(tb) ?? 4;
    if (ra !== rb) return ra - rb;
    if (ra === 4 && ta !== tb) {
      const typeCompare = ta.localeCompare(tb, "zh-Hans", { numeric: true });
      if (typeCompare) return typeCompare;
    }
    const backgroundRank = item => String(item.name ?? "").includes("红底") ? 0 : String(item.name ?? "").includes("蓝底") ? 1 : 2;
    return backgroundRank(a) - backgroundRank(b) || numberCompare();
  });
  cardPositions.forEach((position, index) => { items[position] = cards[index]; });
  await mkdir("public/archive-data", { recursive: true });
  await writeFile("public/archive-data/items.json", JSON.stringify(items, null, 2) + "\n", "utf8");
  console.log(`Generated public/archive-data/items.json with ${items.length} item(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
