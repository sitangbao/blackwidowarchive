import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Hourglass } from "@/components/Hourglass";
import { ItemImage } from "@/components/ItemImage";
import { CATEGORIES, REGIONS, PERSON_COUNTS, CATEGORY_OPTIONS, UPPER_DECK_SERIES, brandsFor, countByCategory, filterItems, loadArchiveItems, readCollectionState, type Filters, type Item } from "@/lib/archive";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "BLACK WIDOW ARCHIVE — Natasha Romanoff 周边收藏图鉴" }, { name: "description", content: "Marvel Natasha Romanoff / Black Widow 官方周边收藏图鉴。" }] }),
  component: Index,
});
const selectCls = "h-10 w-full min-w-0 rounded border bg-card px-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
function Index() {
  const { data: items = [], isLoading } = useQuery({ queryKey: ["items"], queryFn: loadArchiveItems });
  const [f, setF] = useState<Filters>({ q: "", region: "", category: "", brand: "", item_type: "", series: "", status: "", person: "" });
  const [personal, setPersonal] = useState(() => readCollectionState());
  const counts = useMemo(() => countByCategory(items), [items]);
  const brands = useMemo(() => (f.category ? brandsFor(items, f.category) : []), [items, f.category]);
  const brandOptions = ["卡片类", "手办类"].includes(f.category) ? (CATEGORY_OPTIONS[f.category] ?? []) : brands;
  const shown = useMemo(() => filterItems(items, { ...f, status: "" }).filter(it => !f.status || (personal[it.id] ?? "not_owned") === f.status), [items, f, personal]);
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
    <section id="collection" className="mx-auto max-w-6xl scroll-mt-4 px-3 pb-40 sm:px-6">
      <div className="pt-10 pb-5"><p className="archive-label">THE COLLECTION</p><h2 className="mt-1 text-xl font-medium tracking-widest">周边收藏图鉴</h2></div>
      <div className="mb-5 rounded border bg-card/70 p-4">
        <p className="archive-label">COLLECTION OVERVIEW</p>
        <div className="mt-2 flex items-end justify-between gap-3"><div><p className="text-xs text-muted-foreground">{categoryLabel}</p><p className="font-display text-5xl leading-none text-primary">{isLoading ? "—" : (f.category ? counts[f.category] ?? 0 : items.length)}</p></div><p className="archive-label">TOTAL COLLECTIBLES</p></div>
      </div>
      <div className="mb-4 rounded border bg-background/95 px-3 py-3 backdrop-blur sm:rounded">
        <input value={f.q} onChange={e => update("q", e.target.value)} placeholder="搜索周边名称 / 系列 / 关键词" className={selectCls} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select value={f.region} onChange={e => update("region", e.target.value)} className={selectCls}><option value="">全部地区</option>{REGIONS.map(x => <option key={x}>{x}</option>)}</select>
          <select value={f.category} onChange={e => update("category", e.target.value)} className={selectCls}><option value="">全部类别</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}{c === "卡片类" ? " (CARDS)" : c === "手办类" ? " (FIGURES)" : ""}</option>)}</select>
          <select value={f.status} onChange={e => update("status", e.target.value)} className={selectCls}><option value="">全部收藏状态</option><option value="owned">已拥有</option><option value="not_owned">未拥有</option><option value="wishlist">愿望单</option></select>
          <select value={f.person} onChange={e => update("person", e.target.value)} className={selectCls}><option value="">全部人物数量</option>{PERSON_COUNTS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
        </div>
        {f.category && !["卡片类", "手办类"].includes(f.category) && CATEGORY_OPTIONS[f.category] && <div className="mt-3">
          <p className="mb-2 text-[11px] tracking-wider text-muted-foreground">类型</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => update("item_type", "")} className={`rounded-full border px-3 py-1.5 text-xs transition ${!f.item_type ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/60"}`}>全部类型</button>
            {CATEGORY_OPTIONS[f.category].map(x => <button type="button" key={x} onClick={() => update("item_type", x)} className={`rounded-full border px-3 py-1.5 text-xs transition ${f.item_type === x ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/60"}`}>{x}</button>)}
          </div>
        </div>}
        {f.category && brandOptions.length > 0 && <div className="mt-3">
          <p className="mb-2 text-[11px] tracking-wider text-muted-foreground">品牌</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => update("brand", "")} className={`rounded-full border px-3 py-1.5 text-xs transition ${!f.brand ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/60"}`}>全部品牌</button>
            {brandOptions.map(x => <button type="button" key={x} onClick={() => update("brand", x)} className={`rounded-full border px-3 py-1.5 text-xs transition ${f.brand === x ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/60"}`}>{x}</button>)}
          </div>
        </div>}
        {f.brand && availableSeries.length > 0 && <div className="mt-3">
          <p className="mb-2 text-[11px] tracking-wider text-muted-foreground">系列</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => update("series", "")} className={`rounded-full border px-3 py-1.5 text-xs transition ${!f.series ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/60"}`}>全部系列</button>
            {availableSeries.map(x => <button type="button" key={x} onClick={() => update("series", x)} className={`rounded-full border px-3 py-1.5 text-xs transition ${f.series === x ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/60"}`}>{x}</button>)}
          </div>
        </div>}
        {(f.category || f.brand || f.item_type || f.series || f.region || f.status || f.person || f.q) && <button type="button" onClick={() => setF({ q:"", region:"", category:"", brand:"", item_type:"", series:"", status:"", person:"" })} className="mt-3 text-xs text-muted-foreground underline">清除筛选</button>}
      </div>
      <div className="flex items-center justify-between py-4"><p className="archive-label">{isLoading ? "LOADING" : `${shown.length} RECORDS`}</p><Link to="/collection" className="text-xs text-primary underline">MY COLLECTION →</Link></div>
      {!isLoading && shown.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">没有符合条件的周边。</p>}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">{shown.map(it => <Link key={it.id} to="/item/$id" params={{ id: it.id }} className="group overflow-hidden rounded border border-border/60 bg-card transition hover:border-primary"><ItemImage url={it.images[0]} alt={it.name} category={it.category}/><div className="p-2 sm:p-3"><p className="line-clamp-2 text-[11px] leading-snug sm:text-sm">{it.name}</p></div></Link>)}</div>
    </section>
  </>;
}
