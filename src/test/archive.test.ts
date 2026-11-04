import { describe, it, expect } from "vitest";
import { filterItems, countByCategory, brandsFor, type Item } from "@/lib/archive";

const base: Item = { id: "1", name: "A", region: "美谷", series: "S", set_name: null, category: "卡片类", item_type: null, brand: "Topps", size: null, item_number: null, original_price: "1", status: "owned", person_count: "single", keywords: null, notes: null, images: [] };
const items: Item[] = [
  base,
  { ...base, id: "2", name: "B", brand: "Upper Deck（UD）", person_count: "multi" },
  { ...base, id: "3", name: "C", category: "吧唧", brand: "Movic", status: "wishlist" },
];
const empty = { q: "", region: "", category: "", brand: "", item_type: "", series: "", status: "", person: "" };

describe("collection filters", () => {
  it("counts items per category", () => expect(countByCategory(items)).toEqual({ 卡片类: 2, 吧唧: 1 }));
  it("brands come only from items in the chosen category", () => expect(brandsFor(items, "卡片类")).toEqual(["Topps", "Upper Deck（UD）"]));
  it("person count filter selects multi-person items", () => expect(filterItems(items, { ...empty, person: "multi" }).map((i) => i.id)).toEqual(["2"]));
  it("brand filter applies within category", () => expect(filterItems(items, { ...empty, category: "卡片类", brand: "Topps" }).map((i) => i.id)).toEqual(["1"]));
});
