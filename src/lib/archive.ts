import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export async function loadArchiveItems(): Promise<Item[]> {
  const response = await fetch("/archive-data/items.json", { cache: "no-store" });
  if (!response.ok) throw new Error("无法读取图鉴商品资料");
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("图鉴商品资料格式不正确");
  return data as Item[];
}

export const REGIONS = ["日谷", "美谷", "韩谷", "国谷"] as const;
export const CATEGORIES = [
  "卡片类", "吧唧", "冰箱贴", "立牌类", "挂件类", "杯垫", "橡胶夹子", "文具", "色纸", "贴纸",
  "相卡", "明信片", "海报", "文件夹", "杯子", "毛绒", "手办类", "影音", "服饰", "其他",
] as const;
export const CATEGORY_OPTIONS: Record<string, string[]> = {
  "卡片类": ["UPPER DECK (UD)", "KAKAWOW", "TOPPS", "FINDING CARD"],
  "手办类": ["HOT TOYS", "MARVEL LEGENDS", "COSBABY", "LEGO", "POP MART", "BANDAI", "TITAN HERO SERIES"],
  "立牌类": ["亚克力立牌"],
  "挂件类": ["亚克力挂件", "亚克力砖", "金属挂件", "橡胶挂件", "布艺挂件"],
};
export const UPPER_DECK_SERIES = [
  "2010 Iron Man 2", "2012 The Avengers", "2014 Captain America: The Winter Soldier",
  "2015 Avengers: Age of Ultron", "2016 Captain America: Civil War", "2018 Avengers: Infinity War",
  "2019 MCU 10th Anniversary", "2020 Avengers: Endgame & Captain Marvel", "2021 Black Widow",
  "2021 Marvel Black Diamond", "2022 Marvel Allure",
] as const;
export const STATUSES = [
  { value: "owned", label: "已拥有" },
  { value: "not_owned", label: "未拥有" },
  { value: "wishlist", label: "愿望单" },
] as const;
export const PERSON_COUNTS = [
  { value: "single", label: "单人" },
  { value: "multi", label: "多人" },
  { value: "other", label: "其他" },
] as const;
export const SUBMISSION_KINDS = ["新增周边", "信息修正", "留言反馈"] as const;

export const statusLabel = (s: string) => STATUSES.find((x) => x.value === s)?.label ?? s;
export const personLabel = (s: string) => PERSON_COUNTS.find((x) => x.value === s)?.label ?? s;

export type Item = {
  id: string; name: string; region: string; series: string | null; series_preset?: string | null; series_link_enabled?: boolean; set_name: string | null;
  category: string; item_type: string | null; brand: string | null; brand_preset?: string | null; size: string | null; item_number: string | null;
  original_price: string; status: string; person_count: string; characters?: string | null; character_preset?: string | null; keywords: string | null;
  notes: string | null; images: string[];
};

export type Filters = { q: string; region: string; category: string; brand: string; item_type: string; series: string; status: string; person: string };

export function seriesIdFor(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/** Pure filter used by the collection grid (tested). */
export function filterItems(items: Item[], f: Filters) {
  const q = f.q.trim().toLowerCase();
  return items.filter((it) => {
    if (q) {
      const hay = [it.name, it.series, it.set_name, it.keywords, it.brand, it.item_type].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.region && it.region !== f.region) return false;
    if (f.category && it.category !== f.category) return false;
    if (f.category && f.brand && it.brand !== f.brand) return false;
    if (f.category && f.item_type && it.item_type !== f.item_type) return false;
    if (f.series && seriesIdFor(it.series ?? "") !== f.series && it.series !== f.series) return false;
    if (f.status && it.status !== f.status) return false;
    if (f.person && it.person_count !== f.person) return false;
    return true;
  });
}

export function countByCategory(items: Item[]) {
  const m: Record<string, number> = {};
  for (const it of items) m[it.category] = (m[it.category] ?? 0) + 1;
  return m;
}

export function brandsFor(items: Item[], category: string) {
  return [...new Set(items.filter((i) => i.category === category && i.brand).map((i) => i.brand as string))].sort();
}

/** Resolve private-bucket storage paths to temporary signed URLs. */
export function useSignedUrls(bucket: string, input: (string | undefined)[]) {
  const paths = input.filter((x): x is string => !!x);
  const key = paths.join("|");
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!paths.length) return;
    let alive = true;
    supabase.storage.from(bucket).createSignedUrls(paths, 3600).then(({ data }) => {
      if (!alive || !data) return;
      const m: Record<string, string> = {};
      data.forEach((d) => { if (d.path && d.signedUrl) m[d.path] = d.signedUrl; });
      setUrls(m);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, key]);
  return urls;
}

export async function uploadFiles(bucket: string, files: File[], prefix = "") {
  const paths: string[] = [];
  for (const f of files) {
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${prefix}${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, f);
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

export const COLLECTION_STORAGE_KEY = "bwa-my-collection-v1";
export type CollectionState = Record<string, "owned" | "not_owned" | "wishlist">;
export function readCollectionState(): CollectionState {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(COLLECTION_STORAGE_KEY) || "{}"); } catch { return {}; }
}
export function writeCollectionState(state: CollectionState) {
  if (typeof window !== "undefined") localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(state));
}
