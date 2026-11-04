-- Remove public first-user-admin escalation. Admin accounts must be created
-- deliberately in Supabase Auth and granted the role by a trusted operator.
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
DROP FUNCTION IF EXISTS public.first_user_admin();

-- Preserve the acrylic-block subtype before moving it under charms.
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS item_type text;
UPDATE public.items SET item_type = '亚克力砖' WHERE category = '亚克力砖';

-- Normalize legacy category labels to the agreed final 20-category taxonomy.
UPDATE public.items SET category = CASE category
  WHEN '卡片' THEN '卡片类'
  WHEN '立牌' THEN '立牌类'
  WHEN '手办' THEN '手办类'
  WHEN '挂件' THEN '挂件类'
  WHEN '亚克力砖' THEN '挂件类'
  ELSE category END;

-- Remove only the four explicitly seeded demo records from the starter project.
DELETE FROM public.items WHERE notes = '示例数据';

-- Add fields needed for richer visitor submissions while retaining the existing
-- JSON-like content payload for compatibility with current admin tooling.
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS item_name text;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS series text;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS brand text;


ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS item_id uuid REFERENCES public.items(id) ON DELETE SET NULL;

-- If an account was created before this migration, only the explicitly named
-- owner account may retain the admin role.
DELETE FROM public.user_roles ur
USING auth.users au
WHERE ur.user_id = au.id AND au.email <> 'cayyee6@gmail.com';
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'cayyee6@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
