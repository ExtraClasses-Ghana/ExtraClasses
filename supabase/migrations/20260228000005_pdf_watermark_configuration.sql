-- =============================================================================
-- PDF Generation & Watermark Configuration
-- Migration: 20260228000005
--
-- Stores watermark and PDF generation preferences with RLS policies
-- =============================================================================

-- ============================================================================
-- SECTION 1: PDF GENERATION SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pdf_generation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  watermark_enabled boolean DEFAULT true,
  watermark_type text NOT NULL CHECK (watermark_type IN ('logo', 'text', 'both')) DEFAULT 'logo',
  watermark_logo_url text,
  watermark_logo_opacity numeric(3,2) DEFAULT 0.15 CHECK (watermark_logo_opacity >= 0 AND watermark_logo_opacity <= 1),
  watermark_text text DEFAULT 'EXTRACLASS',
  watermark_text_opacity numeric(3,2) DEFAULT 0.1 CHECK (watermark_text_opacity >= 0 AND watermark_text_opacity <= 1),
  watermark_position text DEFAULT 'center' CHECK (watermark_position IN ('top-left', 'top-center', 'top-right', 'center', 'bottom-left', 'bottom-center', 'bottom-right')),
  watermark_scale numeric(3,2) DEFAULT 0.3 CHECK (watermark_scale > 0 AND watermark_scale <= 1),
  footer_enabled boolean DEFAULT true,
  footer_text text DEFAULT '© EXTRACLASS - All Rights Reserved',
  header_enabled boolean DEFAULT true,
  header_text text,
  page_numbers_enabled boolean DEFAULT true,
  page_numbers_position text DEFAULT 'footer' CHECK (page_numbers_position IN ('header', 'footer')),
  compression_enabled boolean DEFAULT true,
  compression_quality integer DEFAULT 85 CHECK (compression_quality >= 1 AND compression_quality <= 100),
  document_title_prefix text DEFAULT 'EXTRACLASS',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pdf_generation_settings_organization_id ON public.pdf_generation_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_pdf_generation_settings_updated_at ON public.pdf_generation_settings(updated_at DESC);

-- ============================================================================
-- SECTION 2: WATERMARK PREFERENCES TABLE (User-specific)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.watermark_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  watermark_enabled boolean DEFAULT true,
  apply_to_exports boolean DEFAULT true,
  apply_on_print boolean DEFAULT true,
  include_page_numbers boolean DEFAULT true,
  include_timestamp boolean DEFAULT true,
  include_username boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watermark_preferences_user_id ON public.watermark_preferences(user_id);

-- ============================================================================
-- SECTION 3: PDF EXPORT AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pdf_export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_name text,
  export_method text NOT NULL CHECK (export_method IN ('download', 'print', 'email')),
  file_size integer,
  watermark_applied boolean DEFAULT true,
  encryption_applied boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_pdf_export_logs_user_id ON public.pdf_export_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_export_logs_created_at ON public.pdf_export_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_export_logs_export_method ON public.pdf_export_logs(export_method);

-- ============================================================================
-- SECTION 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.watermark_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_generation_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 5: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Watermark Preferences: Users can only access their own
CREATE POLICY "Users view own watermark preferences" ON public.watermark_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own watermark preferences" ON public.watermark_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own watermark preferences" ON public.watermark_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- PDF Export Logs: Users can only view their own, admins can view all
CREATE POLICY "Users view own pdf export logs" ON public.pdf_export_logs FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users insert own pdf export logs" ON public.pdf_export_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- PDF Generation Settings: Only admins can view/update
CREATE POLICY "Admins only pdf generation settings" ON public.pdf_generation_settings
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================================
-- SECTION 6: GET WATERMARK SETTINGS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_watermark_settings()
RETURNS TABLE (
  watermark_enabled boolean,
  watermark_type text,
  watermark_logo_url text,
  watermark_logo_opacity numeric,
  watermark_text text,
  watermark_position text,
  watermark_scale numeric,
  footer_enabled boolean,
  footer_text text,
  header_enabled boolean,
  header_text text,
  page_numbers_enabled boolean,
  compression_enabled boolean,
  compression_quality integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pgs.watermark_enabled,
    pgs.watermark_type,
    pgs.watermark_logo_url,
    pgs.watermark_logo_opacity,
    pgs.watermark_text,
    pgs.watermark_position,
    pgs.watermark_scale,
    pgs.footer_enabled,
    pgs.footer_text,
    pgs.header_enabled,
    pgs.header_text,
    pgs.page_numbers_enabled,
    pgs.compression_enabled,
    pgs.compression_quality
  FROM public.pdf_generation_settings pgs
  WHERE pgs.organization_id IS NULL  -- Default organization settings
  ORDER BY pgs.created_at DESC
  LIMIT 1;
$$;

-- ============================================================================
-- SECTION 7: UPDATE WATERMARK SETTINGS FUNCTION (Admin only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_watermark_settings(
  p_watermark_enabled boolean DEFAULT NULL,
  p_watermark_type text DEFAULT NULL,
  p_watermark_logo_url text DEFAULT NULL,
  p_watermark_logo_opacity numeric DEFAULT NULL,
  p_watermark_text text DEFAULT NULL,
  p_watermark_position text DEFAULT NULL,
  p_watermark_scale numeric DEFAULT NULL,
  p_footer_enabled boolean DEFAULT NULL,
  p_footer_text text DEFAULT NULL,
  p_compression_quality integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_settings record;
BEGIN
  -- Verify admin role
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  -- Update or create default settings
  UPDATE public.pdf_generation_settings
  SET
    watermark_enabled = COALESCE(p_watermark_enabled, watermark_enabled),
    watermark_type = COALESCE(p_watermark_type, watermark_type),
    watermark_logo_url = COALESCE(p_watermark_logo_url, watermark_logo_url),
    watermark_logo_opacity = COALESCE(p_watermark_logo_opacity, watermark_logo_opacity),
    watermark_text = COALESCE(p_watermark_text, watermark_text),
    watermark_position = COALESCE(p_watermark_position, watermark_position),
    watermark_scale = COALESCE(p_watermark_scale, watermark_scale),
    footer_enabled = COALESCE(p_footer_enabled, footer_enabled),
    footer_text = COALESCE(p_footer_text, footer_text),
    compression_quality = COALESCE(p_compression_quality, compression_quality),
    updated_at = now(),
    updated_by = auth.uid()
  WHERE organization_id IS NULL
  RETURNING * INTO v_settings;

  -- If no existing settings, create default
  IF v_settings IS NULL THEN
    INSERT INTO public.pdf_generation_settings (
      organization_id,
      watermark_enabled,
      watermark_type,
      watermark_logo_url,
      watermark_logo_opacity,
      watermark_text,
      watermark_position,
      watermark_scale,
      footer_enabled,
      footer_text,
      compression_quality,
      updated_by
    ) VALUES (
      NULL,
      COALESCE(p_watermark_enabled, true),
      COALESCE(p_watermark_type, 'logo'),
      p_watermark_logo_url,
      COALESCE(p_watermark_logo_opacity, 0.15),
      COALESCE(p_watermark_text, 'EXTRACLASS'),
      COALESCE(p_watermark_position, 'center'),
      COALESCE(p_watermark_scale, 0.3),
      COALESCE(p_footer_enabled, true),
      COALESCE(p_footer_text, '© EXTRACLASS - All Rights Reserved'),
      COALESCE(p_compression_quality, 85),
      auth.uid()
    )
    RETURNING * INTO v_settings;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Watermark settings updated successfully',
    'settings', jsonb_build_object(
      'watermark_enabled', v_settings.watermark_enabled,
      'watermark_type', v_settings.watermark_type,
      'watermark_position', v_settings.watermark_position,
      'compression_quality', v_settings.compression_quality
    )
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- SECTION 8: LOG PDF EXPORT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_pdf_export(
  p_document_type text,
  p_document_name text,
  p_export_method text,
  p_file_size integer DEFAULT NULL,
  p_watermark_applied boolean DEFAULT true,
  p_encryption_applied boolean DEFAULT false,
  p_metadata jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  INSERT INTO public.pdf_export_logs (
    user_id,
    document_type,
    document_name,
    export_method,
    file_size,
    watermark_applied,
    encryption_applied,
    metadata
  ) VALUES (
    auth.uid(),
    p_document_type,
    p_document_name,
    p_export_method,
    p_file_size,
    p_watermark_applied,
    p_encryption_applied,
    COALESCE(p_metadata, '{}')
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'PDF export logged successfully'
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- SECTION 9: PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_watermark_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_watermark_settings(boolean, text, text, numeric, text, text, numeric, boolean, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_pdf_export(text, text, text, integer, boolean, boolean, jsonb) TO authenticated;

-- ============================================================================
-- SECTION 10: DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.pdf_generation_settings IS 'Global PDF generation settings including watermark, footer, and compression preferences';
COMMENT ON TABLE public.watermark_preferences IS 'User-specific watermark preferences for PDF exports';
COMMENT ON TABLE public.pdf_export_logs IS 'Audit trail of all PDF export operations with watermark and encryption details';
COMMENT ON FUNCTION public.get_watermark_settings() IS 'Retrieve current watermark and PDF generation settings';
COMMENT ON FUNCTION public.update_watermark_settings(boolean, text, text, numeric, text, text, numeric, boolean, text, integer) IS 'Update watermark and PDF generation settings (admin only)';
COMMENT ON FUNCTION public.log_pdf_export(text, text, text, integer, boolean, boolean, jsonb) IS 'Log a PDF export operation with encryption and watermark details';
