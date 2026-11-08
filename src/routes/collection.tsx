import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, FileImage, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { ItemImage } from "@/components/ItemImage";
import { normalizeCollectionState, readCollectionState, writeCollectionState, loadArchiveItems, statusLabel, type Item, type CollectionState } from "@/lib/archive";

export const Route = createFileRoute("/collection")({
  head: () => ({ meta: [{ title: "MY COLLECTION — BLACK WIDOW ARCHIVE" }] }),
  component: MyCollection,
});

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

async function loadExportImage(url: string) {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error("图片读取失败");
  const objectUrl = URL.createObjectURL(await response.blob());
  const image = new Image();
  image.src = objectUrl;
  await image.decode();
  return { image, objectUrl };
}

function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const chars = [...text];
  let line = "";
  let lineCount = 0;
  for (const char of chars) {
    const next = line + char;
    if (line && ctx.measureText(next).width > maxWidth) {
      ctx.fillText(line, x, y + lineCount * lineHeight);
      lineCount += 1;
      line = char;
      if (lineCount >= maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lineCount < maxLines) {
    if (lineCount === maxLines - 1 && ctx.measureText(line).width > maxWidth) {
      while (line && ctx.measureText(line + "…").width > maxWidth) line = line.slice(0, -1);
      line += "…";
    }
    ctx.fillText(line, x, y + lineCount * lineHeight);
  }
}

async function createCollectionPng(entries: { item: Item; quantity: number; status: string }[]) {
  const width = 1200;
  const padding = 48;
  const gap = 24;
  const columns = 3;
  const cardWidth = (width - padding * 2 - gap * (columns - 1)) / columns;
  const cardHeight = 455;
  const rowCount = Math.ceil(entries.length / columns);
  const headerHeight = 250;
  const footerHeight = 90;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = headerHeight + rowCount * (cardHeight + gap) + footerHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法生成图片");
  ctx.fillStyle = "#241c1e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f7edf0";
  ctx.textAlign = "center";
  ctx.font = "bold 54px 'Noto Sans SC', sans-serif";
  ctx.fillText("MY COLLECTION", width / 2, 88);
  ctx.fillStyle = "#d5aeb6";
  ctx.font = "20px 'Noto Sans SC', sans-serif";
  ctx.fillText("BLACK WIDOW ARCHIVE", width / 2, 128);
  ctx.fillStyle = "#b83b4b";
  ctx.fillRect(width / 2 - 48, 158, 96, 3);
  ctx.fillStyle = "#eadde0";
  ctx.font = "18px 'Noto Sans SC', sans-serif";
  ctx.fillText(`共 ${entries.length} 款收藏 · ${entries.filter(entry => entry.status === "owned").reduce((sum, entry) => sum + entry.quantity, 0)} 件已拥有`, width / 2, 205);
  ctx.textAlign = "left";

  const objectUrls: string[] = [];
  try {
    for (let index = 0; index < entries.length; index += 1) {
      const { item, quantity, status } = entries[index];
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = padding + col * (cardWidth + gap);
      const y = headerHeight + row * (cardHeight + gap);
      ctx.fillStyle = "#35262b";
      ctx.fillRect(x, y, cardWidth, cardHeight);
      const imageX = x + 24;
      const imageY = y + 20;
      const imageSize = cardWidth - 48;
      ctx.fillStyle = "#2a2023";
      ctx.fillRect(imageX, imageY, imageSize, 270);
      if (item.images[0]) {
        try {
          const loaded = await loadExportImage(item.images[0]);
          objectUrls.push(loaded.objectUrl);
          const ratio = Math.min(imageSize / loaded.image.width, 270 / loaded.image.height);
          const drawWidth = loaded.image.width * ratio;
          const drawHeight = loaded.image.height * ratio;
          ctx.drawImage(loaded.image, imageX + (imageSize - drawWidth) / 2, imageY + (270 - drawHeight) / 2, drawWidth, drawHeight);
        } catch {
          ctx.fillStyle = "#bd4857";
          ctx.font = "bold 34px 'Noto Sans SC', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("BWA", imageX + imageSize / 2, imageY + 145);
          ctx.textAlign = "left";
        }
      }
      ctx.fillStyle = "#fff5f7";
      ctx.font = "bold 20px 'Noto Sans SC', sans-serif";
      drawWrappedText(ctx, item.name, x + 24, y + 324, cardWidth - 48, 29, 2);
      ctx.fillStyle = "#d0b7bd";
      ctx.font = "15px 'Noto Sans SC', sans-serif";
      ctx.fillText(`${item.category} · ${item.region}`, x + 24, y + 394);
      ctx.fillStyle = status === "owned" ? "#e7a8b2" : "#e8c98b";
      ctx.font = "bold 16px 'Noto Sans SC', sans-serif";
      ctx.fillText(status === "owned" ? `已拥有 × ${quantity}` : statusLabel(status), x + 24, y + 427);
    }
  } finally {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
  }

  ctx.fillStyle = "#c6aab1";
  ctx.textAlign = "center";
  ctx.font = "15px 'Noto Sans SC', sans-serif";
  ctx.fillText("PERSONAL COLLECTION · BLACK WIDOW ARCHIVE", width / 2, canvas.height - 36);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error("图片生成失败")), "image/png");
  });
  return blob;
}

function MyCollection() {
  const { data: items = [] } = useQuery({ queryKey: ["items"], queryFn: loadArchiveItems });
  const [state, setState] = useState<CollectionState>(() => readCollectionState());
  const [busy, setBusy] = useState(false);
  const entries = useMemo(() => items
    .filter(item => state[item.id]?.status === "owned" || state[item.id]?.status === "wishlist")
    .map(item => ({ item, status: state[item.id].status, quantity: state[item.id].quantity })), [items, state]);
  const counts = useMemo(() => ({
    owned: entries.filter(entry => entry.status === "owned").length,
    ownedQuantity: entries.filter(entry => entry.status === "owned").reduce((sum, entry) => sum + entry.quantity, 0),
    wishlist: entries.filter(entry => entry.status === "wishlist").length,
  }), [entries]);

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), items: state }, null, 2)], { type: "application/json;charset=utf-8" });
    downloadBlob(blob, "black-widow-archive-collection-backup.json");
    toast.success("收藏备份已导出");
  };

  const exportTable = () => {
    const header = ["商品名称", "分类", "地区", "系列", "收藏状态", "拥有数量", "盒号", "商品编号", "卡片编号"];
    const rows = entries.map(({ item, status, quantity }) => [
      item.name, item.category, item.region, item.series, statusLabel(status), status === "owned" ? quantity : "",
      item.box_number, item.item_number, item.card_number,
    ]);
    const csv = "\uFEFF" + [header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "black-widow-archive-my-collection.csv");
    toast.success("收藏表格已导出（CSV，可用 Excel 打开）");
  };

  const exportImage = async () => {
    if (!entries.length) { toast.error("目前没有可导出的收藏"); return; }
    setBusy(true);
    try {
      const blob = await createCollectionPng(entries);
      downloadBlob(blob, "black-widow-archive-my-collection.png");
      toast.success("收藏图片已生成");
    } catch {
      toast.error("图片生成失败，请减少收藏数量或稍后重试");
    } finally {
      setBusy(false);
    }
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const next = normalizeCollectionState(parsed.items);
      if (!Object.keys(next).length && Object.keys(parsed.items ?? {}).length) throw new Error("invalid backup");
      if (!window.confirm("导入备份会覆盖目前这台设备上的收藏状态，确定继续吗？")) return;
      setState(next);
      writeCollectionState(next);
      toast.success("收藏备份已恢复");
    } catch {
      toast.error("备份文件格式不正确");
    }
  };

  return <section className="mx-auto max-w-6xl px-3 py-10 pb-28 sm:px-6">
    <p className="archive-label">PERSONAL ARCHIVE</p>
    <h1 className="mt-1 font-display text-5xl">MY COLLECTION</h1>
    <p className="mt-2 text-sm text-muted-foreground">你的收藏状态只保存在当前浏览器，不会更改公共图鉴或影响其他访客。</p>

    <div className="mt-5 rounded border bg-card p-3">
      <p className="archive-label">EXPORT COLLECTION</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={exportTable} className="flex items-center justify-center gap-2 rounded border px-3 py-3 text-xs"><FileSpreadsheet size={16}/>导出表格（CSV）</button>
        <button type="button" disabled={busy} onClick={() => void exportImage()} className="flex items-center justify-center gap-2 rounded border px-3 py-3 text-xs disabled:opacity-50"><FileImage size={16}/>{busy ? "图片生成中…" : "导出图片（PNG）"}</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={exportBackup} className="flex items-center gap-2 rounded border px-3 py-2 text-xs"><Download size={14}/>备份收藏（JSON）</button>
        <label className="flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-xs"><Upload size={14}/>导入收藏<input type="file" accept="application/json,.json" className="hidden" onChange={event => { void importBackup(event.target.files?.[0]); event.currentTarget.value = ""; }}/></label>
      </div>
    </div>

    <div className="mt-5 grid grid-cols-3 gap-2">
      <div className="rounded border bg-card p-3"><p className="archive-label">OWNED</p><p className="font-display text-3xl text-primary">{counts.owned}</p><p className="text-xs text-muted-foreground">已拥有款数</p><p className="mt-1 text-[10px] text-muted-foreground">共 {counts.ownedQuantity} 件</p></div>
      <div className="rounded border bg-card p-3"><p className="archive-label">WISHLIST</p><p className="font-display text-3xl text-primary">{counts.wishlist}</p><p className="text-xs text-muted-foreground">愿望单</p></div>
      <div className="rounded border bg-card p-3"><p className="archive-label">TOTAL</p><p className="font-display text-3xl text-primary">{entries.length}</p><p className="text-xs text-muted-foreground">收藏款数</p></div>
    </div>

    {entries.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">还没有收藏商品。可以先到<Link to="/" className="mx-1 text-primary underline">周边图鉴</Link>添加收藏。</p> :
      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">{entries.map(({ item, status, quantity }) => <div key={item.id} className="overflow-visible rounded border bg-card">
        <Link to="/item/$id" params={{ id: item.id }} className="block">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-t bg-card"><ItemImage url={item.images[0]} alt={item.name} className="h-full w-full rounded-t"/></div>
          <div className="space-y-1 px-2 pt-2 pb-3">
            <p className="line-clamp-2 min-h-[2.5em] text-[11px] leading-snug sm:text-xs">{item.name}</p>
            <p className="text-[9px] leading-snug text-muted-foreground sm:text-[10px]">{item.category} · {item.region}</p>
            <p className="text-[10px] text-primary">{status === "owned" ? `已拥有 × ${quantity}` : "愿望单"}</p>
          </div>
        </Link>
      </div>)}</div>
    }
    <p className="mt-6 text-xs leading-relaxed text-muted-foreground">提示：清除浏览器网站数据可能会丢失本地收藏。建议定期备份 JSON；更换设备时，可在新设备导入备份。表格和图片用于查看／分享，JSON 用于完整恢复收藏状态。</p>
  </section>;
}
