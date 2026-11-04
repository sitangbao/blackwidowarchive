CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role app_role not null, unique(user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null,
  series text,
  set_name text,
  category text not null,
  brand text,
  size text,
  item_number text,
  original_price text not null,
  status text not null default 'owned',
  person_count text not null default 'single',
  keywords text,
  notes text,
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read items" ON public.items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write items" ON public.items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.item_private (
  item_id uuid primary key references public.items(id) on delete cascade,
  purchase_price text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_private TO authenticated;
GRANT ALL ON public.item_private TO service_role;
ALTER TABLE public.item_private ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin only private" ON public.item_private FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  content text not null,
  urls text[] not null default '{}',
  images text[] not null default '{}',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
GRANT INSERT ON public.submissions TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone submit" ON public.submissions FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending' AND length(content) between 1 and 5000);
CREATE POLICY "admin manage subs" ON public.submissions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.reports (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete set null,
  item_name text not null,
  item_url text not null,
  content text not null,
  images text[] not null default '{}',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
GRANT INSERT ON public.reports TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone report" ON public.reports FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending' AND length(content) between 1 and 5000);
CREATE POLICY "admin manage reports" ON public.reports FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "public read archive files" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id IN ('item-images','uploads'));
CREATE POLICY "admin write item images" ON storage.objects FOR ALL TO authenticated USING (bucket_id='item-images' AND public.has_role(auth.uid(),'admin')) WITH CHECK (bucket_id='item-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "anyone upload visitor files" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id='uploads');

CREATE OR REPLACE FUNCTION public.first_user_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role='admin') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_admin AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.first_user_admin();

INSERT INTO public.items (name, region, series, set_name, category, brand, size, item_number, original_price, status, person_count, keywords, notes) VALUES
('Black Widow Base Card','美谷','Marvel Studios Black Widow','Base Set','卡片','Upper Deck（UD）','63×88mm','#01','$4.99','owned','single','natasha base','示例数据'),
('Natasha Chrome Refractor','美谷','Topps Chrome Marvel','Refractor','卡片','Topps','63×88mm','BW-12','$9.99','wishlist','single','chrome refractor','示例数据'),
('Avengers Team Badge','日谷','Avengers Endgame','Team','吧唧','Movic','57mm','','¥550','owned','multi','badge team','示例数据'),
('Red Room Acrylic Stand','国谷','Black Widow Movie','Acrylic','立牌','Marvel China','15cm','','¥69','not_owned','single','acrylic stand','示例数据');