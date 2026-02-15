-- Allow admins to delete notifications
CREATE POLICY "Admins can delete notifications"
ON public.admin_notifications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert notifications
CREATE POLICY "Admins can insert notifications"
ON public.admin_notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow teachers to update their own verification documents
CREATE POLICY "Teachers can update their own documents"
ON public.verification_documents
FOR UPDATE
USING (auth.uid() = teacher_id);