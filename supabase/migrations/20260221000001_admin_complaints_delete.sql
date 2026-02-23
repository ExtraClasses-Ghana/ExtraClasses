-- Allow admins to delete complaints (e.g. spam or invalid reports)
CREATE POLICY "Admins can delete complaints"
  ON public.complaints
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
