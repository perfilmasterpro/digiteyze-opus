-- RLS policies for storage.objects on task-attachments bucket
-- Path convention: {workspace_id}/{task_id}/{uuid}-{filename}

CREATE POLICY "task_attachments_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND public.is_workspace_member((split_part(name, '/', 1))::uuid)
  );

CREATE POLICY "task_attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND public.is_workspace_member((split_part(name, '/', 1))::uuid)
  );

CREATE POLICY "task_attachments_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND public.is_workspace_member((split_part(name, '/', 1))::uuid)
  );

CREATE POLICY "task_attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND public.is_workspace_member((split_part(name, '/', 1))::uuid)
  );