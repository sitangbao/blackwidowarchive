import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Upload } from "lucide-react";
import { ItemImage } from "@/components/ItemImage";
import { readCollectionState, writeCollectionState, loadArchiveItems, type Item, type CollectionState } from "@/lib/archive";
export const Route = createFileRoute("/collection")({ head: () => ({ meta: [{ title: "MY COLLECTION — BLACK WIDOW ARCHIVE" }] }), component: MyCollection });
function MyCollection() {
 const { data: items = [] } = useQuery({ queryKey:["items"], queryFn: loadArchiveItems });
 const [state,setState]=useState<CollectionState>(()=>readCollectionState());
 const exportData=()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),items:state},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="black-widow-archive-collection-backup.json";a.click();URL.revokeObjectURL(url);};
 const importData=async(file?:File)=>{if(!file)return;try{const obj=JSON.parse(await file.text());const next=obj.items;if(!next||typeof next!=="object")throw new Error();if(!confirm("导入备份会覆盖目前这台设备上的收藏状态，确定继续吗？"))return;setState(next);writeCollectionState(next);}catch{alert("备份文件格式不正确。");}};
 const counts=useMemo(()=>({owned:items.filter(x=>state[x.id]==="owned").length,wishlist:items.filter(x=>state[x.id]==="wishlist").length}),[items,state]);
 return <section className="mx-auto max-w-6xl px-3 py-10 pb-28 sm:px-6"><p className="archive-label">PERSONAL ARCHIVE</p><h1 className="mt-1 font-display text-5xl">MY COLLECTION</h1><p className="mt-2 text-sm text-muted-foreground">你的收藏状态只保存在当前浏览器，不会更改公共图鉴或影响其他访客。</p>
 <div className="mt-5 flex flex-wrap gap-2"><button onClick={exportData} className="flex items-center gap-2 rounded border px-3 py-2 text-xs"><Download size={14}/>导出备份</button><label className="flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-xs"><Upload size={14}/>导入备份<input type="file" accept="application/json,.json" className="hidden" onChange={e=>void importData(e.target.files?.[0])}/></label></div>
 <div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded border bg-card p-3"><p className="archive-label">OWNED</p><p className="font-display text-3xl text-primary">{counts.owned}</p><p className="text-xs text-muted-foreground">已拥有</p></div><div className="rounded border bg-card p-3"><p className="archive-label">WISHLIST</p><p className="font-display text-3xl text-primary">{counts.wishlist}</p><p className="text-xs text-muted-foreground">愿望单</p></div></div>
 <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">{items.filter(it=>state[it.id]==="owned" || state[it.id]==="wishlist").map(it=><div key={it.id} className="overflow-visible rounded border bg-card"><Link to="/item/$id" params={{id:it.id}} className="block"><div className="flex aspect-square items-center justify-center overflow-hidden rounded-t bg-background p-2"><ItemImage url={it.images[0]} alt={it.name} className="h-[82%] w-[82%] rounded"/></div><div className="space-y-1 px-2 pt-2"><p className="line-clamp-2 min-h-[2.5em] text-[11px] leading-snug sm:text-xs">{it.name}</p><p className="text-[9px] leading-snug text-muted-foreground sm:text-[10px]">{it.category} · {it.region}</p><p className="truncate text-[9px] text-muted-foreground sm:text-[10px]">Natasha Romanoff</p></div></Link></div>)}</div>
 <p className="mt-6 text-xs leading-relaxed text-muted-foreground">提示：清除浏览器网站数据可能会丢失本地收藏。建议定期导出备份；导入备份会覆盖当前设备的收藏状态。</p></section>;
}
