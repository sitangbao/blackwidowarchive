DROP POLICY IF EXISTS "public read archive files" ON storage.objects;
CREATE POLICY "public read item images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id='item-images');
CREATE POLICY "admin read uploads" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='uploads' AND public.has_role(auth.uid(),'admin'));