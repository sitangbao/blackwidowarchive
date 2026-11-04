import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Hourglass } from "@/components/Hourglass";
import { ItemImage } from "@/components/ItemImage";
import { CATEGORIES, REGIONS, PERSON_COUNTS, CATEGORY_OPTIONS, UPPER_DECK_SERIES, brandsFor, countByCategory, filterItems, readCollectionState, useSignedUrls, type Filters, type Item } from "@/lib/archive";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "BLACK WIDOW ARCHIVE — Natasha Romanoff 周边收藏图鉴" }, { name: "description", content: "Marvel Natasha Romanoff / Black Widow 官方周边收藏图鉴。" }] }),
  component: Index,
});
const selectCls = "h-10 w-full min-w-0 rounded border bg-card px-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
function Index() {
  const { data: items = [], isLoading } = useQuery({ queryKey: ["items"], queryFn: async () => { const { data, error } = await supabase.from("items").select("*").order("created_at", { ascending: false }); if (error) throw error; return data as Item[]; } });
  const [f, setF] = useState<Filters>({ q: "", region: "", category: "", brand: "", item_type: "", series: "", status: "", person: "" });
  const [menu, setMenu] = useState(false);
  const [personal, setPersonal] = useState(() => readCollectionState());
  const counts = useMemo(() => countByCategory(items), [items]);
  const brands = useMemo(() => (f.category ? brandsFor(items, f.category) : []), [items, f.category]);
  const brandOptions = ["卡片类", "手办类"].includes(f.category) ? (CATEGORY_OPTIONS[f.category] ?? []) : brands;
  const shown = useMemo(() => filterItems(items, { ...f, status: "" }).filter(it => !f.status || (personal[it.id] ?? "not_owned") === f.status), [items, f, personal]);
  const urls = useSignedUrls("item-images", items.map((i) => i.images[0]).filter(Boolean));
  const categoryLabel = f.category || "周边收藏总数";
  const availableSeries = f.category === "卡片类" && f.brand === "UPPER DECK (UD)" ? [...UPPER_DECK_SERIES] : [...new Set(items.filter(i => i.category === f.category && i.brand === f.brand && i.series).map(i => i.series as string))].sort();
  const update = (key: keyof Filters, value: string) => setF(old => ({ ...old, [key]: value, ...(key === "category" ? { brand: "", item_type: "", series: "" } : {}), ...(key === "brand" ? { series: "" } : {}) }));
  return <>
    <section className="relative overflow-hidden border-b">
      <div className="hero-glow absolute inset-0" /><Hourglass className="pointer-events-none absolute right-[-5%] top-1/2 h-[115%] -translate-y-1/2 text-primary/10 sm:right-[8%]" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="font-display text-2xl tracking-[.18em] text-foreground sm:text-3xl">NATASHA ROMANOFF</p>
        <h1 className="mt-2 whitespace-nowrap font-display text-[clamp(2.2rem,8.5vw,5.5rem)] leading-[.9] tracking-wide sm:text-8xl">BLACK WIDOW <span className="text-primary">ARCHIVE</span></h1>
        <p className="mt-5 text-sm tracking-wide text-muted-foreground sm:text-base">娜塔莎·罗曼诺夫官方周边收藏图鉴</p>
      </div>
    </section>
    <section id="collection" className="mx-auto max-w-6xl scroll-mt-4 px-3 pb-28 sm:px-6">
      <div className="pt-10 pb-5"><p className="archive-label">THE COLLECTION</p><h2 className="mt-1 text-xl font-medium tracking-widest">周边收藏图鉴</h2></div>
      <div className="mb-5 rounded border bg-card/70 p-4">
        <p className="archive-label">COLLECTION OVERVIEW</p>
        <div className="mt-2 flex items-end justify-between gap-3"><div><p className="text-xs text-muted-foreground">{categoryLabel}</p><p className="font-display text-5xl leading-none text-primary">{isLoading ? "—" : (f.category ? counts[f.category] ?? 0 : items.length)}</p></div><p className="archive-label">TOTAL COLLECTIBLES</p></div>
      </div>
      <div className="sticky top-2 z-30 -mx-3 border-y bg-background/95 px-3 py-3 backdrop-blur sm:mx-0 sm:rounded sm:border">
        <div className="flex items-center gap-2">
          <button onClick={() => setMenu(v => !v)} className="flex h-10 shrink-0 items-center gap-2 rounded border bg-card px-3 text-xs tracking-wide"><span>CATEGORY FILTER</span><ChevronDown size={14} className={menu ? "rotate-180" : ""}/></button>
          <input value={f.q} onChange={e => update("q", e.target.value)} placeholder="搜索周边名称 / 系列 / 关键词" className={`${selectCls} flex-1`} />
        </div>
        {menu && <><button aria-label="关闭分类菜单" className="fixed inset-0 z-40 cursor-default" onClick={() => setMenu(false)} /><div className="absolute left-3 top-[calc(100%+6px)] z-50 max-h-[min(65vh,520px)] w-[min(88vw,360px)] overflow-y-auto rounded border bg-popover p-2 shadow-2xl sm:left-0">
          <button onClick={() => { update("category", ""); setMenu(false); }} className={`block w-full rounded px-3 py-2.5 text-left text-sm ${!f.category ? "bg-primary/15 text-primary" : "hover:bg-muted"}`}>全部类别 · {items.length}</button>
          {CATEGORIES.map(c => <button key={c} onClick={() => { update("category", c); setMenu(false); }} className={`flex w-full items-center justify-between rounded px-3 py-2.5 text-left text-sm ${f.category === c ? "bg-primary/15 text-primary" : "hover:bg-muted"}`}><span>{c}{c === "卡片类" ? " (CARDS)" : c === "手办类" ? " (FIGURES)" : ""}</span><span className="text-xs text-muted-foreground">{counts[c] ?? 0}</span></button>)}
        </div></>}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select value={f.region} onChange={e => update("region", e.target.value)} className={selectCls}><option value="">全部地区</option>{REGIONS.map(x => <option key={x}>{x}</option>)}</select>
          <select value={f.status} onChange={e => update("status", e.target.value)} className={selectCls}><option value="">全部收藏状态</option><option value="owned">已拥有</option><option value="not_owned">未拥有</option><option value="wishlist">愿望单</option></select>
          <select value={f.person} onChange={e => update("person", e.target.value)} className={selectCls}><option value="">全部人物数量</option>{PERSON_COUNTS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
          {f.category && !["卡片类", "手办类"].includes(f.category) && CATEGORY_OPTIONS[f.category] && <select value={f.item_type} onChange={e => update("item_type", e.target.value)} className={selectCls}><option value="">全部类型</option>{CATEGORY_OPTIONS[f.category].map(x => <option key={x}>{x}</option>)}</select>}
          {f.category && brandOptions.length > 0 && <select value={f.brand} onChange={e => update("brand", e.target.value)} className={selectCls}><option value="">全部品牌</option>{brandOptions.map(x => <option key={x}>{x}</option>)}</select>}
          {f.brand && availableSeries.length > 0 && <select value={f.series} onChange={e => update("series", e.target.value)} className={`${selectCls} col-span-2`}><option value="">全部系列</option>{availableSeries.map(x => <option key={x}>{x}</option>)}</select>}
        </div>
        {(f.category || f.brand || f.series || f.region || f.status || f.person || f.q) && <button onClick={() => setF({ q:"", region:"", category:"", brand:"", item_type:"", series:"", status:"", person:"" })} className="mt-2 text-xs text-muted-foreground underline">清除筛选</button>}
      </div>
      <div className="flex items-center justify-between py-4"><p className="archive-label">{isLoading ? "LOADING" : `${shown.length} RECORDS`}</p><Link to="/collection" className="text-xs text-primary underline">MY COLLECTION →</Link></div>
      {!isLoading && shown.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">没有符合条件的周边。</p>}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">{shown.map(it => <Link key={it.id} to="/item/$id" params={{ id: it.id }} className="group overflow-hidden rounded border border-border/60 bg-card transition hover:border-primary"><ItemImage url={urls[it.images[0] ?? ""]} alt={it.name}/><div className="p-2 sm:p-3"><p className="line-clamp-2 text-[11px] leading-snug sm:text-sm">{it.name}</p></div></Link>)}</div>
    </section>
  </>;
}
