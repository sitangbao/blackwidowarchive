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
  const isFunkoPop = (item) =>
    item.brand_preset === "funko" &&
    item.category === "手办类" &&
    !/rock\s*candy|button\s*pin/i.test(String(item.name ?? ""));
  for (const item of items) {
    if (!isFunkoPop(item)) continue;
    const boxNumber = String(item.box_number ?? "").trim();
    if (boxNumber && !String(item.name).endsWith(`#${boxNumber}`)) {
      item.name = `${item.name} #${boxNumber}`;
    }
  }

  // Keep other products in their existing alphabetical positions.
  items.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans", { numeric: true }));
  // Funko POP! items occupy their existing grid positions, but are ordered by box number.
  const funkoPositions = items.flatMap((item, index) => isFunkoPop(item) ? [index] : []);
  const funkoItems = funkoPositions.map((index) => items[index]).sort((a, b) =>
    String(a.box_number ?? "").localeCompare(String(b.box_number ?? ""), "en", { numeric: true })
  );
  funkoPositions.forEach((position, index) => { items[position] = funkoItems[index]; });
  await mkdir("public/archive-data", { recursive: true });
  await writeFile("public/archive-data/items.json", JSON.stringify(items, null, 2) + "\n", "utf8");
  console.log(`Generated public/archive-data/items.json with ${items.length} item(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
