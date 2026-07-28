CREATE POLICY "inbox_audio_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inbox-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "inbox_audio_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inbox-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "inbox_audio_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inbox-audio' AND (storage.foldername(name))[1] = auth.uid()::text);