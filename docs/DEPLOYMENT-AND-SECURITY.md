# BLACK WIDOW ARCHIVE — 部署与安全配置

本 ZIP 已整合前端页面与数据库迁移，但不会包含 Supabase 项目密钥、管理员密码或邮件服务密钥。

## 1. Supabase 数据库

1. 在 Supabase 项目 SQL Editor 中按顺序执行 `drizzle/migrations/0000_archive_schema.sql`、`0001_restrict_uploads_read.sql`、`0002_final_archive_setup.sql`。
2. 在 Storage 建立 `item-images` 与 `uploads` 两个 bucket。`item-images` 按当前 RLS 策略允许匿名访客读取商品图片；`uploads` 不允许访客读取，仅允许访客上传、管理员读取。现有客户端代码对图片路径生成签名 URL。
3. 确认 `anon` 可以读取 `items`，但不能新增、修改或删除 `items`；仅有 `user_roles` 中 `admin` 角色的账号可以管理商品和投稿。
4. 迁移 0002 会移除“第一个注册用户自动成为管理员”的触发器。不要恢复该触发器。

## 2. 首次管理员

1. 在 Supabase Authentication 中由项目所有者手动创建 `cayyee6@gmail.com` 账号并设置密码。
2. 从 Authentication 用户列表复制该用户 UUID。
3. 由项目所有者在 SQL Editor 执行以下语句，将 UUID 替换为真实值：

```sql
insert into public.user_roles (user_id, role)
values ('替换为管理员用户UUID', 'admin')
on conflict (user_id, role) do nothing;
```

前端登录页仅接受 `cayyee6@gmail.com`，但真正的授权边界仍是数据库 RLS 与 `user_roles`，不可只依赖前端邮箱判断。

## 3. 邮件通知

邮件通知使用 Supabase Edge Function `notify-submission`，邮件发送服务为 Resend。

- 部署函数：`supabase functions deploy notify-submission`
- 设置密钥：`supabase secrets set RESEND_API_KEY=你的ResendAPIKey RESEND_FROM='BLACK WIDOW ARCHIVE <已验证发件地址>'`
- 在 Resend 验证发件域名/地址。
- 当前函数为支持匿名访客而关闭 JWT 强制验证，正式公开上线前建议加上 CAPTCHA 与基于 IP 的限流，降低恶意邮件触发风险。
- 目标收件邮箱已设为 `cayyee6@gmail.com`。

投稿记录会先写入数据库，再尝试发送邮件。邮件发送失败不会删除已经保存的投稿，页面会提示邮件通知失败。

## 4. 环境变量

从 Supabase 项目设置取得项目 URL 与 anon/publishable key，按项目现有 `src/integrations/supabase/client.ts` 的变量名配置 Lovable 环境变量。绝不可把 service role key 放进浏览器端环境变量或提交到 Git。

## 5. 上线前检查

- 执行 `npm install`、`npm test`、`npm run lint`、`npm run build`。
- 确认正式商品资料已录入；旧版 4 条示例商品会由迁移 0002 清除。
- 确认匿名访客能浏览商品、提交三类投稿、提交错误报告。
- 确认匿名访客不能访问管理员数据、不能写入商品表、不能读取 `item_private`。
- 确认管理员能登录、管理商品和投稿。
- 测试邮件通知成功与失败两种情况。
- 配置可运行 TanStack Start SSR / server functions 的部署平台；GitHub Pages 静态托管不适用于当前架构。

## 6. 访客个人收藏

访客收藏状态仅存储在当前浏览器 Local Storage，不写入 Supabase。提供 JSON 导入/导出备份；清除浏览器数据可能丢失收藏。不同设备和浏览器之间不会自动同步。
