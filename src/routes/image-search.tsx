import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Camera, ImagePlus, LoaderCircle, ScanSearch } from "lucide-react";
import { ItemImage } from "@/components/ItemImage";
import { loadArchiveItems, type Item } from "@/lib/archive";

export const Route = createFileRoute("/image-search")({
  head: () => ({ meta: [{ title: "图片识别 — BLACK WIDOW ARCHIVE" }, { name: "description", content: "上传周边照片，在 BLACK WIDOW ARCHIVE 图鉴中寻找相似商品。" }] }),
  component: ImageSearch,
});

type Match = { item: Item; distance: number };
const HASH_SIZE = 8;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image load failed"));
    image.src = src;
  });
}

async function averageHash(src: string): Promise<number[]> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = HASH_SIZE;
  canvas.height = HASH_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("canvas unavailable");
  context.drawImage(image, 0, 0, HASH_SIZE, HASH_SIZE);
  const pixels = context.getImageData(0, 0, HASH_SIZE, HASH_SIZE).data;
  const gray: number[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    gray.push(pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
  }
  const average = gray.reduce((sum, value) => sum + value, 0) / gray.length;
  return gray.map(value => value >= average ? 1 : 0);
}

function distance(a: number[], b: number[]) {
  return a.reduce((sum, value, index) => sum + (value === b[index] ? 0 : 1), 0);
}

function ImageSearch() {
  const { data: items = [], isLoading, isError } = useQuery({ queryKey: ["items"], queryFn: loadArchiveItems });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const usableItems = useMemo(() => items.filter(item => item.images?.[0]), [items]);

  const search = async () => {
    if (!file) return;
    setBusy(true);
    setMatches(null);
    setMessage("");
    setProgress(0);
    try {
      const queryUrl = URL.createObjectURL(file);
      let queryHash: number[];
      try { queryHash = await averageHash(queryUrl); }
      finally { URL.revokeObjectURL(queryUrl); }
      const results: Match[] = [];
      let completed = 0;
      const batchSize = 10;
      for (let start = 0; start < usableItems.length; start += batchSize) {
        const batch = usableItems.slice(start, start + batchSize);
        const hashes = await Promise.all(batch.map(async item => {
          try { return { item, hash: await averageHash(item.images[0]) }; }
          catch { return null; }
        }));
        for (const result of hashes) {
          if (result) results.push({ item: result.item, distance: distance(queryHash, result.hash) });
        }
        completed += batch.length;
        setProgress(Math.min(100, Math.round(completed / usableItems.length * 100)));
      }
      results.sort((a, b) => a.distance - b.distance);
      const best = results.slice(0, 6);
      setMatches(best);
      if (!best.length || best[0].distance > 22) {
        setMessage("暂时没有找到足够相似的商品。它可能尚未收录，也可能是拍摄角度或光线造成差异。");
      } else {
        setMessage("以下是图鉴中外观最接近的商品，请对照卡面和编号确认。");
      }
    } catch {
      setMessage("图片读取失败，请换一张照片再试。");
      setMatches([]);
    } finally {
      setBusy(false);
    }
  };

  return <section className="mx-auto max-w-4xl px-4 py-8 pb-28 sm:px-6 sm:py-12">
    <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft size={15}/>返回图鉴</Link>
    <p className="archive-label mt-7">VISUAL SEARCH</p>
    <h1 className="mt-1 flex items-center gap-3 font-display text-4xl sm:text-5xl"><ScanSearch className="text-primary" size={34}/>图片识别</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">上传或拍摄一张黑寡妇周边照片，在现有图鉴中寻找外观相似的商品。</p>

    <div className="mt-7 rounded border bg-card p-4 sm:p-6">
      <label className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-primary/50 bg-background/60 p-4 text-center transition hover:bg-primary/5">
        {preview ? <img src={preview} alt="待识别图片预览" className="max-h-64 max-w-full rounded object-contain"/> : <><div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><ImagePlus size={26}/></div><p className="text-sm font-medium">选择商品照片</p><p className="mt-1 text-xs text-muted-foreground">也可以使用手机相机拍摄</p></>}
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={event => { setFile(event.target.files?.[0] ?? null); setMatches(null); setMessage(""); }}/>
      </label>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">支持 JPG、PNG、HEIC（取决于浏览器解码能力）</p>
        <button type="button" disabled={!file || busy || isLoading || isError} onClick={() => void search()} className="inline-flex items-center justify-center gap-2 rounded bg-primary px-5 py-2.5 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <><LoaderCircle size={16} className="animate-spin"/>比对中 {progress}%</> : <><ScanSearch size={16}/>开始识别</>}
        </button>
      </div>
      {busy && <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: progress + "%" }}/></div>}
      {isLoading && <p className="mt-3 text-xs text-muted-foreground">正在读取图鉴商品…</p>}
      {isError && <p className="mt-3 text-xs text-destructive">无法读取图鉴资料，请稍后重试。</p>}
    </div>

    {message && <div className="mt-6 rounded border bg-card p-4"><p className="text-sm leading-6">{message}</p><p className="mt-2 text-[11px] text-muted-foreground">目前使用本地图像相似度比较，不是 AI 物件识别；不会将照片上传到第三方识别服务。</p></div>}
    {matches && matches.length > 0 && <div className="mt-7">
      <div className="flex items-end justify-between gap-3"><div><p className="archive-label">POSSIBLE MATCHES</p><h2 className="mt-1 text-lg">相似商品</h2></div><p className="text-xs text-muted-foreground">{matches.length} 个结果</p></div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {matches.map(({ item, distance: diff }) => <Link key={item.id} to="/item/$id" params={{ id: item.id }} className="overflow-hidden rounded border border-border/70 bg-card transition hover:border-primary">
          <div className="flex aspect-square items-center justify-center bg-background"><ItemImage url={item.images[0]} alt={item.name} className="h-[88%] w-[88%] object-contain"/></div>
          <div className="p-3"><p className="line-clamp-2 min-h-10 text-xs leading-5">{item.name}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="text-[10px] text-muted-foreground">{item.category}</span><span className="text-[10px] text-primary">相似度约 {Math.round((64 - diff) / 64 * 100)}%</span></div></div>
        </Link>)}
      </div>
    </div>}
    <div className="mt-8 rounded border border-border/60 p-4">
      <p className="text-xs font-medium">目前版本的限制</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-5 text-muted-foreground">
        <li>只能在已收录商品图片中寻找相似图片。</li>
        <li>同一张卡的不同平行版本可能非常相似，仍需人工核对。</li>
        <li>未收录商品的自动名称识别、编号 OCR 和 AI 识别会留待下一阶段。</li>
      </ul>
    </div>
  </section>;
}
