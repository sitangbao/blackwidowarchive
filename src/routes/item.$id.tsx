import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ItemImage } from "@/components/ItemImage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { personLabel, readCollectionState, writeCollectionState, uploadFiles, loadArchiveItems, seriesIdFor, type Item, type CollectionState } from "@/lib/archive";

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

  if (isLoading) return <p className="p-10 text-center archive-label">Loading…</p>;
  if (!item) return <p className="p-10 text-center text-muted-foreground">找不到该周边。<Link to="/" className="underline">返回</Link></p>;

  const updateCollection = (value: "owned" | "wishlist" | null) => setCollection(old => { const next = { ...old }; if (value) next[item.id] = value; else delete next[item.id]; writeCollectionState(next); return next; });
  const cur = item.images[idx];
  const rows: [string, string | null | undefined][] = [
    ["地区", item.region], ["系列", item.series],
    ...(item.set_name?.trim() ? [["Set", item.set_name] as [string, string]] : []),
    ["类别", item.category],
    ...( (item.category === "卡片类" || item.category === "手办类") && item.item_type?.trim()
      ? [["第二层", item.item_type] as [string, string]] : []),
    ...(item.category === "卡片类" && item.brand?.trim() ? [["品牌／出版社", item.brand] as [string, string]] : []),
    ["尺寸", item.size],
    ...(item.category === "卡片类" ? [["商品编号", item.item_number] as [string, string | null]] : []),
    ...(item.characters?.trim() ? [["人物", item.characters] as [string, string]] : []),
    ...(item.original_price?.trim() ? [["原价", item.original_price] as [string, string]] : []),
    ...(priv ? [["入手价格 Purchase Price（仅管理员）", priv.purchase_price || "—"] as [string, string]] : []),
    ...(item.notes?.trim() ? [["备注 Notes", item.notes] as [string, string]] : []),
  ];

  return (
    <section className="mx-auto max-w-5xl px-3 py-8 sm:px-6">
      <Link to="/" hash="collection" className="archive-label hover:text-foreground">← The Collection</Link>
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
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" aria-pressed={collection[item.id] === "owned"} onClick={() => updateCollection(collection[item.id] === "owned" ? null : "owned")} className={`rounded-full border px-4 py-2 text-xs transition ${collection[item.id] === "owned" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>已拥有</button>
              <button type="button" aria-pressed={collection[item.id] === "wishlist"} onClick={() => updateCollection(collection[item.id] === "wishlist" ? null : "wishlist")} className={`rounded-full border px-4 py-2 text-xs transition ${collection[item.id] === "wishlist" ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-border text-muted-foreground"}`}>愿望单</button>
            </div>
          </div>
          <dl className="mt-5 rounded bg-card text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-2.5">
                <dt className="text-muted-foreground">{k}</dt><dd className="whitespace-pre-wrap break-words">{k === "系列" && v && item.series_link_enabled ? <a href={`/?seriesId=${encodeURIComponent(seriesIdFor(v))}#collection`} className="text-primary underline underline-offset-4 hover:text-foreground">{v}</a> : (v || "—")}</dd>
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
