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
    const item = await getJson(file.download_url);
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
      name: String(item.name),
      region: item.region ?? "",
      series: item.series_preset === "iron_man_2" ? "钢铁侠2" : item.series_preset === "avengers_1" ? "复仇者联盟1" : item.series_preset === "winter_soldier" ? "美国队长2:冬日战士" : item.series_preset === "age_of_ultron" ? "复仇者联盟2:奥创纪元" : item.series_preset === "civil_war" ? "美国队长3:内战" : item.series_preset === "infinity_war" ? "复仇者联盟3:无限战争" : item.series_preset === "endgame" ? "复仇者联盟4:终局之战" : item.series_preset === "black_widow" ? "黑寡妇" : (item.series ?? null),
      set_name: item.set_name ?? null,
      category: item.category ?? "",
      item_type: item.item_type ?? null,
      brand: item.brand_preset === "upper_deck" ? "UPPER DECK (UD)" : item.brand_preset === "kakawow" ? "KAKAWOW" : item.brand_preset === "topps" ? "TOPPS" : item.brand_preset === "finding_card" ? "FINDING CARD" : item.brand_preset === "hot_toys" ? "HOT TOYS" : item.brand_preset === "marvel_legends" ? "MARVEL LEGENDS" : item.brand_preset === "cosbaby" ? "COSBABY" : item.brand_preset === "lego" ? "LEGO" : item.brand_preset === "pop_mart" ? "POP MART" : item.brand_preset === "bandai" ? "BANDAI" : item.brand_preset === "titan_hero_series" ? "TITAN HERO SERIES" : (item.brand ?? null),
      size: item.size ?? null,
      item_number: item.item_number ?? null,
      original_price: item.original_price ?? "",
      status: item.status ?? "not_owned",
      person_count: item.person_count ?? "single",
      keywords: item.keywords ?? null,
      notes: [item.notes_preset === "blind_box" ? "盲盒" : item.notes_preset === "blind_box_hidden" ? "盲盒隐藏款" : null, item.notes ?? null].filter(Boolean).join("；") || null,
      images,
    });
  }

  items.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans"));
  await mkdir("public/archive-data", { recursive: true });
  await writeFile("public/archive-data/items.json", JSON.stringify(items, null, 2) + "\n", "utf8");
  console.log(`Generated public/archive-data/items.json with ${items.length} item(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
