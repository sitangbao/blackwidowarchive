import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ItemImage } from "@/components/ItemImage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CATEGORIES, CATEGORY_OPTIONS, REGIONS, STATUSES, PERSON_COUNTS, statusLabel, uploadFiles, useSignedUrls, type Item,
} from "@/lib/archive";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "管理后台 — BLACK WIDOW ARCHIVE" },
      { name: "description", content: "BLACK WIDOW ARCHIVE 管理员后台。" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "管理后台 — BLACK WIDOW ARCHIVE" },
      { property: "og:description", content: "管理员后台" },
    ],
  }),
  component: AdminPage,
});

const input = "w-full rounded border bg-background px-2.5 py-2 text-sm";
const btn = "rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50";
const ghost = "rounded border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground";

function AdminPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((ev, s) => {
      if (ev === "SIGNED_IN" || ev === "SIGNED_OUT") setUser(s?.user ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!user) { setIsAdmin(null); return; }
    void supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  if (user === undefined) return <p className="p-10 text-center archive-label">Loading…</p>;
  if (!user) return <Login />;
  if (isAdmin === null) return <p className="p-10 text-center archive-label">Verifying…</p>;
  if (!isAdmin) return (
    <div className="p-10 text-center text-sm text-muted-foreground">此账号没有管理员权限。
      <button onClick={() => supabase.auth.signOut()} className="ml-2 underline">退出</button></div>
  );
  return <Dashboard />;
}

function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    if (email.trim().toLowerCase() !== "cayyee6@gmail.com") { setBusy(false); toast.error("此邮箱没有管理员登录权限"); return; }
    const res = await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (res.error) { toast.error(res.error.message); return; }
    
  };
  return (
    <section className="mx-auto max-w-sm px-4 py-20">
      <p className="archive-label">Restricted Access</p>
      <h1 className="mt-2 font-display text-4xl tracking-wide">ADMIN LOGIN</h1>
      <form onSubmit={go} className="mt-6 space-y-3">
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        <input type="password" required minLength={8} placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} className={input} />
        <button disabled={busy} className={`${btn} w-full py-2`}>登录</button>
      </form>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">仅限授权管理员使用。首次管理员账号需在 Supabase Auth 中安全创建，并由数据库管理员授予 admin 角色。</p>
    </section>
  );
}

type Tab = "stats" | "items" | "subs" | "reports";

function Dashboard() {
  const [tab, setTab] = useState<Tab>("stats");
  const qc = useQueryClient();
  const items = useQuery({ queryKey: ["items"], queryFn: async () => ((await supabase.from("items").select("*").order("created_at", { ascending: false })).data ?? []) as Item[] });
  const subs = useQuery({ queryKey: ["subs"], queryFn: async () => (await supabase.from("submissions").select("*").order("created_at", { ascending: false })).data ?? [] });
  const reports = useQuery({ queryKey: ["reports"], queryFn: async () => (await supabase.from("reports").select("*").order("created_at", { ascending: false })).data ?? [] });
  const refresh = () => qc.invalidateQueries();
  const tabs: [Tab, string][] = [["stats", "统计"], ["items", "商品"], ["subs", `投稿（${subs.data?.filter((s) => s.status === "pending").length ?? 0}）`], ["reports", `报告（${reports.data?.filter((s) => s.status === "pending").length ?? 0}）`]];

  return (
    <section className="mx-auto max-w-6xl px-3 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl tracking-wide">ADMIN</h1>
        <button onClick={async () => { qc.clear(); await supabase.auth.signOut(); }} className={ghost}>退出登录</button>
      </div>
      <div className="mt-4 flex gap-1 overflow-x-auto border-b">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap px-4 py-2 text-sm ${tab === k ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "stats" && <Stats items={items.data ?? []} subs={subs.data ?? []} reports={reports.data ?? []} />}
        {tab === "items" && <ItemsAdmin items={items.data ?? []} onChange={refresh} />}
        {tab === "subs" && <Inbox table="submissions" rows={subs.data ?? []} onChange={refresh} />}
        {tab === "reports" && <Inbox table="reports" rows={reports.data ?? []} onChange={refresh} />}
      </div>
    </section>
  );
}

function Stats({ items, subs, reports }: { items: Item[]; subs: { status: string }[]; reports: { status: string }[] }) {
  const by = (k: keyof Item) => items.reduce<Record<string, number>>((m, i) => ({ ...m, [String(i[k])]: (m[String(i[k])] ?? 0) + 1 }), {});
  const box = (label: string, v: number | string) => (
    <div className="rounded bg-card p-4"><p className="archive-label">{label}</p><p className="mt-1 font-display text-3xl">{v}</p></div>
  );
  const status = by("status"), region = by("region"), cat = by("category");
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {box("商品总数", items.length)}
        {STATUSES.map((s) => box(s.label, status[s.value] ?? 0))}
        {box("待处理投稿", subs.filter((s) => s.status === "pending").length)}
        {box("待处理报告", reports.filter((s) => s.status === "pending").length)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded bg-card p-4"><p className="archive-label mb-2">按地区</p>
          {REGIONS.map((r) => <p key={r} className="flex justify-between text-sm"><span>{r}</span><span>{region[r] ?? 0}</span></p>)}</div>
        <div className="rounded bg-card p-4"><p className="archive-label mb-2">按类别</p>
          <div className="grid grid-cols-2 gap-x-6">{CATEGORIES.filter((c) => cat[c]).map((c) => <p key={c} className="flex justify-between text-sm"><span>{c}</span><span>{cat[c]}</span></p>)}</div></div>
      </div>
    </div>
  );
}

function ItemsAdmin({ items, onChange }: { items: Item[]; onChange: () => void }) {
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [del, setDel] = useState<Item | null>(null);
  const [q, setQ] = useState("");
  const urls = useSignedUrls("item-images", items.map((i) => i.images[0]).filter(Boolean));
  const shown = items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
  const doDelete = async () => {
    if (!del) return;
    if (del.images.length) await supabase.storage.from("item-images").remove(del.images);
    const { error } = await supabase.from("items").delete().eq("id", del.id);
    if (error) toast.error(error.message); else toast.success("已删除");
    setDel(null); onChange();
  };
  return (
    <>
      <div className="flex gap-2">
        <input placeholder="搜索商品" value={q} onChange={(e) => setQ(e.target.value)} className={input} />
        <button onClick={() => setEditing("new")} className={`${btn} whitespace-nowrap`}>+ 新增商品</button>
      </div>
      <div className="mt-4 divide-y rounded bg-card">
        {shown.map((it) => (
          <div key={it.id} className="flex items-center gap-3 p-2">
            <ItemImage url={urls[it.images[0] ?? ""]} alt="" className="w-12 shrink-0 rounded" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{it.name}</p>
              <p className="truncate text-xs text-muted-foreground">{it.region} · {it.category} · {statusLabel(it.status)} · {it.original_price}</p>
            </div>
            <button onClick={() => setEditing(it)} className={ghost}>编辑</button>
            <button onClick={() => setDel(it)} className="rounded border border-destructive px-3 py-1.5 text-sm text-destructive">删除</button>
          </div>
        ))}
        {!shown.length && <p className="p-6 text-center text-sm text-muted-foreground">暂无商品</p>}
      </div>
      {editing && <ItemEditor item={editing === "new" ? null : editing} onClose={() => { setEditing(null); onChange(); }} />}
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>「{del?.name}」及其图片将被永久删除，无法恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function L({ t, children }: { t: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="archive-label">{t}</span>{children}</label>;
}

type Form = Omit<Item, "id"> & { purchase_price: string };
const emptyForm: Form = {
  name: "", region: REGIONS[0], series: "", set_name: "", category: CATEGORIES[0], item_type: "", brand: "", size: "", box_number: "", item_number: "", card_number: "",
  original_price: "", status: "owned", person_count: "single", keywords: "", notes: "", images: [], purchase_price: "",
};

function ItemEditor({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const [f, setF] = useState<Form>(item ? { ...emptyForm, ...Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v ?? ""])) as Form, images: item.images } : emptyForm);
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState<string[]>([]);
  const urls = useSignedUrls("item-images", f.images);
  useEffect(() => {
    if (!item) return;
    void supabase.from("item_private").select("purchase_price").eq("item_id", item.id).maybeSingle()
      .then(({ data }) => data && setF((p) => ({ ...p, purchase_price: data.purchase_price ?? "" })));
  }, [item]);
  const up = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const addImgs = async (files: File[], replaceIdx?: number) => {
    setBusy(true);
    try {
      const paths = await uploadFiles("item-images", files, "items/");
      setF((p) => {
        const imgs = [...p.images];
        if (replaceIdx !== undefined) { const old = imgs[replaceIdx]; if (old) setRemoved((r) => [...r, old]); imgs[replaceIdx] = paths[0] ?? old ?? ""; } else imgs.push(...paths);
        return { ...p, images: imgs };
      });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!f.name.trim() || !f.original_price.trim()) { toast.error("商品名称和原价为必填"); return; }
    setBusy(true);
    const { purchase_price, ...rest } = f;
    const payload = { ...rest, box_number: f.category === "手办类" ? f.box_number : "", item_number: f.category === "手办类" ? f.item_number : "", card_number: f.category === "卡片类" ? f.card_number : "", item_type: f.item_type || null };
    const res = item
      ? await supabase.from("items").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", item.id).select("id").single()
      : await supabase.from("items").insert(payload).select("id").single();
    if (res.error) { setBusy(false); { toast.error(res.error.message); return; } }
    await supabase.from("item_private").upsert({ item_id: res.data.id, purchase_price: purchase_price || null });
    if (removed.length) await supabase.storage.from("item-images").remove(removed);
    setBusy(false); toast.success("已保存"); onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? "编辑商品" : "新增商品"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><L t="商品名称 *"><input value={f.name} onChange={up("name")} className={input} /></L></div>
          <L t="地区"><select value={f.region} onChange={up("region")} className={input}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select></L>
          <L t="类别"><select value={f.category} onChange={up("category")} className={input}>{CATEGORIES.map((r) => <option key={r} value={r}>{r}{r === "卡片类" ? " (CARDS)" : r === "手办类" ? " (FIGURES)" : ""}</option>)}</select></L>
          {CATEGORY_OPTIONS[f.category] && f.category !== "卡片类" && f.category !== "手办类" && <L t="商品类型"><select value={f.item_type ?? ""} onChange={up("item_type")} className={input}><option value="">请选择</option>{CATEGORY_OPTIONS[f.category].map(x => <option key={x}>{x}</option>)}</select></L>}
          <L t="系列"><input value={f.series ?? ""} onChange={up("series")} className={input} /></L>
          <L t="Set"><input value={f.set_name ?? ""} onChange={up("set_name")} className={input} /></L>
          <L t="品牌／出版社"><input value={f.brand ?? ""} onChange={up("brand")} className={input} /></L>
          <L t="尺寸"><input value={f.size ?? ""} onChange={up("size")} className={input} /></L>
          {f.category === "手办类" && <><L t="盒号"><input value={f.box_number ?? ""} onChange={up("box_number")} className={input} /></L><L t="商品编号（Item Number）"><input value={f.item_number ?? ""} onChange={up("item_number")} className={input} /></L></>}{f.category === "卡片类" && <L t="卡片编号"><input value={f.card_number ?? ""} onChange={up("card_number")} className={input} /></L>}
          <L t="人物数量（图片中）"><select value={f.person_count} onChange={up("person_count")} className={input}>{PERSON_COUNTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></L>
          <L t="原价 Original Price *"><input value={f.original_price} onChange={up("original_price")} className={input} /></L>
          <L t="入手价格 Purchase Price（仅管理员可见）"><input value={f.purchase_price} onChange={up("purchase_price")} className={input} /></L>
          <L t="收藏状态"><select value={f.status} onChange={up("status")} className={input}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></L>
          <L t="关键词"><input value={f.keywords ?? ""} onChange={up("keywords")} className={input} /></L>
          <div className="sm:col-span-2"><L t="备注 Notes"><textarea rows={3} value={f.notes ?? ""} onChange={up("notes")} className={input} /></L></div>
        </div>
        <div>
          <p className="archive-label mb-2">图片（第一张为封面）</p>
          <div className="grid grid-cols-4 gap-2">
            {f.images.map((p, i) => (
              <div key={p} className="space-y-1">
                <ItemImage url={urls[p]} alt="" className="rounded" />
                <div className="flex gap-1 text-[11px]">
                  <label className="flex-1 cursor-pointer rounded border text-center">替换
                    <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && addImgs([e.target.files[0]], i)} /></label>
                  <button onClick={() => { setRemoved((r) => [...r, p]); setF((s) => ({ ...s, images: s.images.filter((x) => x !== p) })); }} className="flex-1 rounded border text-destructive">删除</button>
                </div>
              </div>
            ))}
            <label className="flex aspect-square cursor-pointer items-center justify-center rounded border border-dashed text-xs text-muted-foreground">+ 上传
              <input type="file" accept="image/*" multiple hidden onChange={(e) => addImgs([...(e.target.files ?? [])])} /></label>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={ghost}>取消</button>
          <button disabled={busy} onClick={save} className={btn}>{busy ? "处理中…" : "保存"}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Row = { id: string; status: string; content: string; images: string[]; created_at: string; kind?: string; urls?: string[]; item_name?: string; item_url?: string; region?: string; category?: string; series?: string | null; brand?: string | null };

function Inbox({ table, rows, onChange }: { table: "submissions" | "reports"; rows: Row[]; onChange: () => void }) {
  const urls = useSignedUrls("uploads", rows.flatMap((r) => r.images));
  const toggle = async (r: Row) => {
    const { error } = await supabase.from(table).update({ status: r.status === "pending" ? "done" : "pending" }).eq("id", r.id);
    if (error) toast.error(error.message); onChange();
  };
  if (!rows.length) return <p className="p-6 text-center text-sm text-muted-foreground">暂无内容</p>;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="rounded bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="archive-label">{new Date(r.created_at).toLocaleString()} · {r.kind ?? r.item_name}</p>
            <button onClick={() => toggle(r)} className={r.status === "pending" ? btn : ghost}>{r.status === "pending" ? "待处理 → 标记已处理" : "已处理 → 标记待处理"}</button>
          </div>
          {r.item_url && <a href={r.item_url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-primary underline">{r.item_url}</a>}
          {r.item_name && <p className="mt-2 text-sm font-medium">关联商品／投稿商品：{r.item_name}</p>}
          {(r.region || r.category || r.series || r.brand) && <p className="mt-1 text-xs text-muted-foreground">{[r.region, r.category, r.series, r.brand].filter(Boolean).join(" · ")}</p>}
          <p className="mt-2 whitespace-pre-wrap text-sm">{r.content}</p>
          {!!r.urls?.length && <div className="mt-2 space-y-0.5">{r.urls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary underline">{u}</a>)}</div>}
          {!!r.images.length && <div className="mt-2 flex flex-wrap gap-2">{r.images.map((p) => urls[p] && <a key={p} href={urls[p]} target="_blank" rel="noreferrer"><img src={urls[p]} alt="" className="h-20 w-20 rounded object-cover" /></a>)}</div>}
        </div>
      ))}
    </div>
  );
}
