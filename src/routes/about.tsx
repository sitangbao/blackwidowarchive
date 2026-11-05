import { createFileRoute, Link } from "@tanstack/react-router";
import { Hourglass } from "@/components/Hourglass";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "关于 — BLACK WIDOW ARCHIVE" },
      { name: "description", content: "关于 BLACK WIDOW ARCHIVE" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6 sm:py-12">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <span aria-hidden="true" className="text-lg leading-none">←</span>
        返回图鉴
      </Link>
      <Hourglass className="h-10 w-10 text-primary" />
      <p className="archive-label mt-6">ABOUT THIS ARCHIVE</p>
      <h1 className="mt-2 font-display text-5xl tracking-wide">ABOUT BLACK WIDOW ARCHIVE</h1>
      <div className="mt-8 space-y-7 rounded border bg-card p-5 text-sm leading-8 sm:p-8 sm:text-base">
        <p>BLACK WIDOW ARCHIVE 是一份非官方谷子图鉴与收藏管理工具，专门收录 Marvel 旗下 Natasha Romanoff / Black Widow 的官方周边，记录与整理个人收藏。</p>
        <div>
          <h2 className="mb-2 font-semibold">关于版权</h2>
          <p>BLACK WIDOW ARCHIVE 为非商业性质的粉丝项目，仅用于个人收藏记录与周边信息分享。</p>
          <p>本站涉及的 Marvel 角色名称、形象、商标及相关作品素材，其知识产权归 Marvel、Disney 及相关权利人所有；本站收录的官方周边图片、商品设计及其他相关素材，其权利归各自版权方、发行商、制造商或其他合法权利人所有。</p>
          <p>若本站内容涉及版权或其他权益问题，欢迎与我联系，我会及时核实并作出相应处理。</p>
        </div>
        <div>
          <h2 className="mb-2 font-semibold">关于更新</h2>
          <p>社畜精力有限，图鉴更新速度可能比较缓慢，还望多多见谅。感谢每一位愿意关注这份图鉴的人。</p>
        </div>
        <div>
          <h2 className="mb-2 font-semibold">关于投稿</h2>
          <p>如果你在浏览过程中发现任何商品资料有误、图片不符、信息遗漏，或有尚未收录的官方周边，欢迎通过网站的「投稿」页面告诉我。我会尽可能核实相关资料，并持续补充与更新这份图鉴。</p>
          <p>感谢你的支持！</p>
        </div>
      </div>
    </section>
  );
}
