# BLACK WIDOW ARCHIVE

非官方、非商业性质的 Natasha Romanoff / Black Widow 官方周边图鉴与个人收藏管理工具。

## 项目技术
- TanStack Start / TanStack Router
- React + TypeScript
- Supabase Auth / Database / Storage
- Lovable Vite TanStack configuration

## 本次整合
本项目已按最终方案更新：首页 Hero、20 个商品分类、分类悬浮筛选、卡片与手办品牌筛选、UPPER DECK 系列筛选、个人本地收藏、底部导航、商品详情、三类投稿、关于页面、管理员登录限制、邮件通知 Edge Function，以及数据库迁移。

## 开发
```sh
npm install
npm run dev
```

## 上线前必须完成
请先阅读 [`docs/DEPLOYMENT-AND-SECURITY.md`](docs/DEPLOYMENT-AND-SECURITY.md)，按说明执行 Supabase 数据库迁移、创建/授权管理员、配置 Storage、部署邮件通知 Edge Function，并设置环境变量。不要把 Supabase service role key 或邮件 API key 放入浏览器端环境变量。

## 技术栈
TanStack Start · TypeScript · React · Tailwind CSS · Supabase
