import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Hourglass } from "@/components/Hourglass";
import { ItemImage } from "@/components/ItemImage";
import { CATEGORIES, REGIONS, PERSON_COUNTS, CATEGORY_OPTIONS, UPPER_DECK_SERIES, brandsFor, countByCategory, filterItems, loadArchiveItems, readCollectionState, writeCollectionState, seriesIdFor, type Filters, type CollectionState } from "@/lib/archive";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "BLACK WIDOW ARCHIVE — Natasha Romanoff 周边收藏图鉴" }, { name: "description", content: "Marvel Natasha Romanoff / Black Widow 官方周边收藏图鉴。" }] }),
  component: Index,
});
const selectCls = "h-10 w-full min-w-0 rounded border bg-card px-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
function Index() {
  const { data: items = [], isLoading, isError, refetch } = useQuery({ queryKey: ["items"], queryFn: loadArchiveItems });
  const initialSeries = typeof window !== "undefined" ? ((() => { const p = new URLSearchParams(window.location.search); const id = p.get("seriesId"); return id ? id : (p.get("series") ?? ""); })()) : "";
  const [f, setF] = useState<Filters>({ q: "", region: "", category: "", brand: "", item_type: "", series: initialSeries, status: "", person: "" });
  const [personal, setPersonal] = useState<CollectionState>(() => readCollectionState());
  useEffect(() => {
    if (isLoading) return;
    const saved = sessionStorage.getItem("bwa-collection-scroll-y");
    if (saved === null) return;
    sessionStorage.removeItem("bwa-collection-scroll-y");
    const y = Number(saved);
    if (!Number.isFinite(y)) return;
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
  }, [isLoading]);
  const counts = useMemo(() => countByCategory(items), [items]);
  const brands = useMemo(() => (f.category ? brandsFor(items, f.category) : []), [items, f.category]);
  const brandOptions = ["卡片类", "手办类"].includes(f.category) ? (CATEGORY_OPTIONS[f.category] ?? []) : brands;
  const shown = useMemo(() => filterItems(items, { ...f, status: "" }).filter(it => !f.status || (personal[it.id] ?? "") === f.status), [items, f, personal]);
  const categoryLabel = f.category || "周边收藏总数";
  const seriesFilterLabel = items.find(it => seriesIdFor(it.series ?? "") === f.series)?.series ?? f.series;
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
        <div className="mt-2 flex items-end justify-between gap-3"><div><p className="text-xs text-muted-foreground">{categoryLabel}</p><p className="font-display text-5xl leading-none text-primary">{isLoading || isError ? "—" : (f.category ? counts[f.category] ?? 0 : items.length)}</p></div><p className="archive-label">TOTAL COLLECTIBLES</p></div>
      </div>
      <div className="mb-4 rounded border bg-background/95 px-3 py-3 backdrop-blur sm:rounded">
        <input value={f.q} onChange={e => update("q", e.target.value)} placeholder="搜索名称 / 系列 / 关键词 / 盒号 / 商品编号 / 卡片编号" className={selectCls} />
        {f.series && <div className="mt-2 flex items-center justify-between gap-2 rounded border border-primary/30 bg-primary/5 px-3 py-2"><p className="min-w-0 text-xs text-foreground">系列筛选：<span className="text-primary">{seriesFilterLabel}</span></p><button type="button" onClick={() => update("series", "")} className="shrink-0 text-xs text-muted-foreground underline">清除</button></div>}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select value={f.region} onChange={e => update("region", e.target.value)} className={selectCls}><option value="">全部地区</option>{REGIONS.map(x => <option key={x}>{x}</option>)}</select>
          <select value={f.category} onChange={e => update("category", e.target.value)} className={selectCls}><option value="">全部类别</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}{c === "卡片类" ? " (CARDS)" : c === "手办类" ? " (FIGURES)" : ""}</option>)}</select>
          <select value={f.status} onChange={e => update("status", e.target.value)} className={selectCls}><option value="">全部收藏状态</option><option value="owned">已拥有</option><option value="wishlist">愿望单</option></select>
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
      <div className="flex items-center justify-between py-4"><p className="archive-label">{isLoading ? "LOADING" : `${shown.length} COLLECTIBLES`}</p><Link to="/collection" className="text-xs text-primary underline">MY COLLECTION →</Link></div>
      {isError ? <div className="my-8 rounded border border-destructive/40 bg-card p-5 text-center"><p className="text-sm text-foreground">暂时无法读取周边资料，请稍后重试。</p><button type="button" onClick={() => refetch()} className="mt-3 rounded border border-primary px-4 py-2 text-xs text-primary">重新加载</button></div> : !isLoading && shown.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">没有符合条件的周边。</p> : null}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">{shown.map(it => <div key={it.id} className="overflow-visible rounded border border-border/60 bg-card transition hover:border-primary">
        <Link to="/item/$id" params={{ id: it.id }} className="block" onClick={(event) => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) sessionStorage.setItem("bwa-collection-scroll-y", String(window.scrollY)); }}>
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-t bg-card"><ItemImage url={it.images[0]} alt={it.name} category={it.category} className="h-[82%] w-[82%] rounded-t"/></div>
          <div className="px-2 pt-1.5 pb-2.5 sm:px-3"><p className="line-clamp-2 min-h-[2.5em] text-[12px] leading-snug sm:text-[15px]">{it.name}</p><div className="mt-1.5 flex flex-wrap items-center gap-1"><span className="rounded-full border border-border/70 bg-background/60 px-1.5 py-0.5 text-[9px] leading-none text-muted-foreground sm:text-[11px]">{it.category}</span><span className="rounded-full border border-border/70 bg-background/60 px-1.5 py-0.5 text-[8px] leading-none text-muted-foreground sm:text-[10px]">{it.region}</span></div></div>
        </Link>
      </div>)}</div>
    </section>
  </>;
}
