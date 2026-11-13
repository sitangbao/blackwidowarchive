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
  "卡片类", "徽章", "冰箱贴", "立牌类", "挂件类", "杯垫", "拍立得", "文具", "色纸", "贴纸",
  "相卡", "明信片", "海报", "文件夹", "杯子", "毛绒", "手办类", "影音", "服饰", "包袋类", "其他",
] as const;
export const CATEGORY_OPTIONS: Record<string, string[]> = {
  "卡片类": ["UPPER DECK (UD)", "KAKAWOW", "TOPPS", "FINDING CARD"],
  "手办类": ["FUNKO", "HOT TOYS", "MARVEL LEGENDS", "COSBABY", "LEGO", "POP MART", "BANDAI", "TITAN HERO SERIES"],
  "立牌类": ["亚克力立牌"],
  "挂件类": ["亚克力挂件", "亚克力砖", "金属挂件", "橡胶挂件", "布艺挂件"],
};
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
  id: string; name: string; region: string; series: string | null; card_series?: string | null; series_preset?: string | null; series_link_enabled?: boolean; card_series_link_enabled?: boolean; set_name: string | null;
  category: string; item_type: string | null; brand: string | null; brand_preset?: string | null; size: string | null; box_number?: string | null; item_number?: string | null; card_number?: string | null; card_title?: string | null;
  product_spec?: string | null; release_type?: string | null;
  original_price: string; status: string; person_count: string; characters?: string | null; character_preset?: string | null; keywords: string | null;
  notes: string | null; images: string[];
};

export type Filters = { q: string; region: string; category: string; brand: string; item_type: string; series: string; status: string; person: string };

export function formatCardSeriesName(value: string) {
  return value.replace(/[A-Za-z]+/g, word => word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase());
}

export function seriesIdFor(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/** Pure filter used by the collection grid (tested). */
function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

export function filterItems(items: Item[], f: Filters) {
  const q = normalizeSearchText(f.q);
  return items.filter((it) => {
    if (q) {
      const hay = normalizeSearchText([it.name, it.series, it.card_series, it.set_name, it.keywords, it.brand, it.item_type, it.box_number, it.item_number, it.card_number, it.card_title, it.character_preset, it.characters, it.category, it.region].filter(Boolean).join(" "));
      const terms = f.q.trim().toLocaleLowerCase().split(/\s+/).map(normalizeSearchText).filter(Boolean);
      if (!terms.every(term => hay.includes(term))) return false;
    }
    if (f.region && it.region !== f.region) return false;
    if (f.category && it.category !== f.category) return false;
    if (f.brand && it.brand !== f.brand) return false;
    if (f.category && f.item_type && it.item_type !== f.item_type) return false;
    const itemSeries = f.category === "卡片类" ? (it.card_series ?? it.series) : it.series;
    if (f.series && seriesIdFor(itemSeries ?? "") !== f.series && itemSeries !== f.series) return false;
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
export type CollectionStatus = "owned" | "not_owned" | "wishlist";
export type CollectionEntry = { status: CollectionStatus; quantity: number };
export type CollectionState = Record<string, CollectionEntry>;

export function normalizeCollectionState(input: unknown): CollectionState {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const result: CollectionState = {};
  for (const [id, raw] of Object.entries(input as Record<string, unknown>)) {
    if (raw === "owned" || raw === "not_owned" || raw === "wishlist") {
      result[id] = { status: raw, quantity: raw === "owned" ? 1 : 0 };
      continue;
    }
    if (raw && typeof raw === "object") {
      const entry = raw as { status?: unknown; quantity?: unknown };
      if (entry.status === "owned" || entry.status === "not_owned" || entry.status === "wishlist") {
        const quantity = Number(entry.quantity);
        result[id] = {
          status: entry.status,
          quantity: entry.status === "owned" && Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : entry.status === "owned" ? 1 : 0,
        };
      }
    }
  }
  return result;
}

export function readCollectionState(): CollectionState {
  if (typeof window === "undefined") return {};
  try { return normalizeCollectionState(JSON.parse(localStorage.getItem(COLLECTION_STORAGE_KEY) || "{}")); } catch { return {}; }
}
export function writeCollectionState(state: CollectionState) {
  if (typeof window !== "undefined") localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(state));
}
