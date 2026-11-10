import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ItemImage } from "@/components/ItemImage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { personLabel, readCollectionState, writeCollectionState, uploadFiles, loadArchiveItems, type Item, type CollectionState } from "@/lib/archive";

export const Route = createFileRoute("/item/$id")({
  head: () => ({
    meta: [
      { title: "周边详情 — BLACK WIDOW ARCHIVE" },
      { name: "description", content: "Black Widow 周边档案详情。" },
      { property: "og:title", content: "周边详情 — BLACK WIDOW ARCHIVE" },
      { property: "og:description", content: "Black Widow 周边档案详情。" },
    ],
  }),
  component: ItemPage,
});

function ItemPage() {
  const { id } = Route.useParams();
  const { data: item, isLoading } = useQuery({
    queryKey: ["item", id],
    queryFn: async () => {
      const items = await loadArchiveItems();
      return items.find((entry) => entry.id === id) ?? null;
    },
  });
  // Only admins can read item_private (RLS); visitors always get null.
  const { data: priv } = useQuery({
    queryKey: ["item-private", id],
    queryFn: async () => (await supabase.from("item_private").select("purchase_price").eq("item_id", id).maybeSingle()).data,
  });
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [report, setReport] = useState(false);
  const [collection, setCollection] = useState<CollectionState>(() => readCollectionState());
  const [editingOwned, setEditingOwned] = useState(false);
  const [quantityDraft, setQuantityDraft] = useState(1);

  if (isLoading) return <p className="p-10 text-center archive-label">Loading…</p>;
  if (!item) return <p className="p-10 text-center text-muted-foreground">找不到该周边。<Link to="/" className="underline">返回</Link></p>;

  const updateCollection = (value: "wishlist" | null) => setCollection(old => {
    const next = { ...old };
    if (value) next[item.id] = { status: value, quantity: 0 };
    else delete next[item.id];
    writeCollectionState(next);
    return next;
  });
  const openOwnedEditor = () => {
    setQuantityDraft(collection[item.id]?.status === "owned" ? collection[item.id].quantity : 1);
    setEditingOwned(true);
  };
  const saveOwnedQuantity = () => {
    const quantity = Math.max(1, Math.floor(quantityDraft) || 1);
    setCollection(old => {
      const next = { ...old, [item.id]: { status: "owned" as const, quantity } };
      writeCollectionState(next);
      return next;
    });
    setEditingOwned(false);
  };
  const removeOwned = () => {
    setCollection(old => {
      const next = { ...old };
      delete next[item.id];
      writeCollectionState(next);
      return next;
    });
    setEditingOwned(false);
  };
  const cur = item.images[idx];
  const displayBrand = item.brand ?? (item.series?.trim().toLowerCase() === "funko" ? "FUNKO" : null);
  const displaySeries = item.series?.trim().toLowerCase() === "funko" ? null : item.category === "卡片类" ? (item.card_series ?? item.series) : item.series;
  const seriesLinkEnabled = item.category === "卡片类"
    ? item.card_series_link_enabled === true
    : item.category === "手办类"
      ? item.series_link_enabled === true
      : Boolean(displaySeries);
  const rows: [string, string | null | undefined][] = [
    ["地区", item.region],
    ...(displayBrand ? [["品牌", displayBrand] as [string, string]] : []),
    ["系列", displaySeries],
    ...(item.set_name?.trim() ? [["Set", item.set_name] as [string, string]] : []),
    ["类别", item.category],
    ...( (item.category === "卡片类" || item.category === "手办类") && item.item_type?.trim()
      ? [["第二层", item.item_type] as [string, string]] : []),
    
    ...(item.size?.trim() ? [["尺寸", item.size] as [string, string]] : []),
    ...(item.box_number?.trim() ? [["盒号", item.box_number] as [string, string]] : []),
    ...(item.item_number?.trim() ? [["商品编号（Item Number）", item.item_number] as [string, string]] : []),
    ...(item.card_number?.trim() ? [["卡片编号", item.card_number] as [string, string]] : []),
    ...(item.category === "卡片类" && item.card_title?.trim() ? [["卡片名称", item.card_title] as [string, string]] : []),
    ...(item.category === "手办类" && item.product_spec?.trim() ? [["产品规格", item.product_spec] as [string, string]] : []),
    ...(item.category === "手办类" && item.release_type?.trim() ? [["发行属性", item.release_type] as [string, string]] : []),
    ...((item.characters?.trim() || item.character_preset?.trim()) ? [["人物", [item.character_preset === "natasha_romanoff" ? "娜塔莎·罗曼诺夫（Natasha Romanoff）" : "", item.characters?.trim() ?? ""].filter(Boolean).join("、")] as [string, string]] : []),
    ...(item.original_price?.trim() ? [["原价", item.original_price] as [string, string]] : []),
    ...(priv ? [["入手价格 Purchase Price（仅管理员）", priv.purchase_price || "—"] as [string, string]] : []),
    ...(item.notes?.trim() ? [["备注 Notes", item.notes] as [string, string]] : []),
  ];

  return (
    <section className="mx-auto max-w-5xl px-3 py-8 sm:px-6">
      <Link to="/" hash="collection" className="archive-label hover:text-foreground" onClick={(event) => { if (sessionStorage.getItem("bwa-collection-scroll-y") !== null) { event.preventDefault(); window.history.back(); } }}>← The Collection</Link>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div className="mx-auto w-full max-w-[280px] sm:max-w-[340px]">
          <button onClick={() => cur && setZoom(true)} className="block w-full cursor-zoom-in" aria-label="放大查看">
            <ItemImage url={cur} alt={item.name} className="rounded" />
          </button>
          {item.images.length > 1 && (
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {item.images.map((p, i) => (
                <button key={p} onClick={() => setIdx(i)} className={`rounded ring-offset-2 ring-offset-background ${i === idx ? "ring-1 ring-primary" : "opacity-60"}`}>
                  <ItemImage url={p} alt="" className="rounded" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="archive-label">ITEM DETAILS</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight">{item.name}</h1>
          <div className="mt-3 rounded border bg-card p-3">
            <p className="archive-label">MY COLLECTION</p>
            <p className="mt-1 text-[11px] text-muted-foreground">仅保存在当前浏览器</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {editingOwned ? (
                <>
                  <span className="rounded-full border border-primary bg-primary/15 px-3 py-2 text-xs text-primary">已拥有</span>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background p-1">
                    <button type="button" aria-label="减少数量" onClick={() => setQuantityDraft(value => Math.max(1, value - 1))} disabled={quantityDraft <= 1} className="flex h-8 w-8 items-center justify-center rounded-full border text-lg leading-none disabled:opacity-35">−</button>
                    <input aria-label="拥有数量" type="number" min="1" step="1" inputMode="numeric" value={quantityDraft} onChange={event => setQuantityDraft(Math.max(1, Math.floor(Number(event.target.value) || 1)))} className="w-10 border-0 bg-transparent text-center text-sm outline-none" />
                    <button type="button" aria-label="增加数量" onClick={() => setQuantityDraft(value => value + 1)} className="flex h-8 w-8 items-center justify-center rounded-full border text-lg leading-none">＋</button>
                  </div>
                  <button type="button" aria-label="确认拥有数量" title="确认" onClick={saveOwnedQuantity} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground shadow-sm transition hover:opacity-90">✓</button>
                  {collection[item.id]?.status === "owned" && <button type="button" onClick={removeOwned} className="text-xs text-muted-foreground underline">移除</button>}
                </>
              ) : (
                <>
                  <button type="button" aria-pressed={collection[item.id]?.status === "owned"} onClick={openOwnedEditor} className={`rounded-full border px-4 py-2 text-xs transition ${collection[item.id]?.status === "owned" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>已拥有{collection[item.id]?.status === "owned" ? ` ×${collection[item.id].quantity}` : ""}</button>
                  <button type="button" aria-pressed={collection[item.id]?.status === "wishlist"} onClick={() => updateCollection(collection[item.id]?.status === "wishlist" ? null : "wishlist")} className={`rounded-full border px-4 py-2 text-xs transition ${collection[item.id]?.status === "wishlist" ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-border text-muted-foreground"}`}>愿望单</button>
                </>
              )}
            </div>
          </div>
          <dl className="mt-5 rounded bg-card text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-2.5">
                <dt className="text-muted-foreground">{k}</dt><dd className="whitespace-pre-wrap break-words">{k === "品牌" && v ? <a href={`/?category=${encodeURIComponent(item.category)}&brand=${encodeURIComponent(v)}#collection`} className="inline-flex items-center gap-1 text-primary no-underline transition-colors hover:text-foreground">{v}<span aria-hidden="true" className="text-xs opacity-70">→</span></a> : k === "系列" && v && seriesLinkEnabled && ((item.category !== "卡片类" && item.category !== "手办类") || displayBrand) ? <a href={`/?category=${encodeURIComponent(item.category)}${displayBrand ? `&brand=${encodeURIComponent(displayBrand)}` : ""}&series=${encodeURIComponent(v)}#collection`} className="inline-flex items-center gap-1 text-primary no-underline transition-colors hover:text-foreground">{v}<span aria-hidden="true" className="text-xs opacity-70">→</span></a> : (v || "—")}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="mt-10 pt-4 text-center">
        <button onClick={() => setReport(true)} className="text-sm text-muted-foreground underline hover:text-primary">报告信息有误</button>
      </div>

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-4xl p-2">
          <DialogHeader className="sr-only"><DialogTitle>{item.name}</DialogTitle></DialogHeader>
          {cur && <img src={cur} alt={item.name} className="max-h-[85vh] w-full object-contain" />}
        </DialogContent>
      </Dialog>
      <ReportDialog open={report} onOpenChange={setReport} item={item} />
    </section>
  );
}

function ReportDialog({ open, onOpenChange, item }: { open: boolean; onOpenChange: (b: boolean) => void; item: Item }) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!content.trim()) { toast.error("请填写问题内容"); return; }
    setBusy(true);
    try {
      const images = await uploadFiles("uploads", files, "reports/");
      const { error } = await supabase.from("reports").insert({
        item_id: item.id, item_name: item.name, item_url: window.location.href, content: content.trim(), images,
      });
      if (error) throw error;
      const notice = await supabase.functions.invoke("notify-submission", { body: { kind: "商品资料错误报告", item: item.name, content: content.trim(), item_url: window.location.href } });
      if (notice.error) toast.warning("报告已保存，但邮件通知尚未发送。");
      toast.success("感谢反馈，已提交！");
      setContent(""); setFiles([]); onOpenChange(false);
    } catch { toast.error("提交失败，请稍后再试"); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>报告信息有误</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">商品：{item.name}</p>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} rows={5}
          placeholder="请描述哪里有误…" className="w-full rounded border bg-background p-2 text-sm" />
        <input type="file" accept="image/*" multiple onChange={(e) => setFiles([...(e.target.files ?? [])])} className="text-xs" />
        <button disabled={busy} onClick={submit} className="rounded bg-primary py-2 text-sm text-primary-foreground disabled:opacity-50">{busy ? "提交中…" : "提交"}</button>
      </DialogContent>
    </Dialog>
  );
}
