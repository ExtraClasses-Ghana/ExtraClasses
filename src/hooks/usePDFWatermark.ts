import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type RpcResult<T> = { data: T | null; error: unknown };

type TableQuery = {
  select: (s?: string) => TableQuery;
  order: (col: string, opts?: { ascending?: boolean }) => TableQuery;
  limit: (n: number) => TableQuery;
  eq: (col: string, val: unknown) => TableQuery;
  update: (obj: Record<string, unknown>) => TableQuery;
  upsert: (obj: Record<string, unknown>) => TableQuery;
  single: () => Promise<RpcResult<unknown>>;
};

const sb = supabase as unknown as {
  rpc: <T = unknown>(fn: string, args?: unknown) => Promise<RpcResult<T>>;
  from: (table: string) => TableQuery;
};

interface WatermarkSettings {
  watermark_enabled: boolean;
  watermark_type: 'logo' | 'text' | 'both';
  watermark_logo_url: string | null;
  watermark_logo_opacity: number;
  watermark_text_opacity?: number;
  watermark_text: string;
  watermark_position: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  watermark_scale: number;
  footer_enabled: boolean;
  footer_text: string;
  header_enabled: boolean;
  header_text: string | null;
  page_numbers_enabled: boolean;
  compression_enabled: boolean;
  compression_quality: number;
}

interface UserWatermarkPreferences {
  watermark_enabled: boolean;
  apply_to_exports: boolean;
  apply_on_print: boolean;
  include_page_numbers: boolean;
  include_timestamp: boolean;
  include_username: boolean;
}

interface PDFExportOptions {
  documentType: string;
  documentName: string;
  exportMethod: 'download' | 'print' | 'email';
  fileSize?: number;
  watermarkApplied?: boolean;
  encryptionApplied?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Hook to fetch global watermark settings from database
 */
export function useWatermarkSettings() {
  const [settings, setSettings] = useState<WatermarkSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const rpcResult = await sb.rpc<WatermarkSettings[]>('get_watermark_settings');
      const data = rpcResult?.data;
      const err = rpcResult?.error;

      if (err) throw err;

      if (Array.isArray(data) && data.length > 0) {
        setSettings(data[0] as WatermarkSettings);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch watermark settings');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, error, refetch: fetchSettings };
}

/**
 * Hook to manage user watermark preferences
 */
export function useWatermarkPreferences(userId: string | undefined) {
  const [preferences, setPreferences] = useState<UserWatermarkPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await sb.from('watermark_preferences').eq('user_id', userId).single();

      const data = res?.data;
      const err = res?.error;

      if (err) throw err;

      if (data && typeof data === 'object') {
        setPreferences(data as UserWatermarkPreferences);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch preferences');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updatePreferences = useCallback(
    async (updates: Partial<UserWatermarkPreferences>) => {
      if (!userId) return;

      try {
        const res = await (sb.from('watermark_preferences').upsert({
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString(),
        }).select('*').single() as unknown as Promise<RpcResult<Record<string, unknown>>>);

        const data = res?.data;
        const err = res?.error;

        if (err) throw err;

        if (data && typeof data === 'object') {
          // narrow the result by checking required fields
          const d = data as Record<string, unknown>;
          if (
            typeof d.watermark_enabled === 'boolean' &&
            typeof d.apply_to_exports === 'boolean' &&
            typeof d.apply_on_print === 'boolean' &&
            typeof d.include_page_numbers === 'boolean' &&
            typeof d.include_timestamp === 'boolean' &&
            typeof d.include_username === 'boolean'
          ) {
            // after runtime validation we can safely treat as the interface
            const pref = d as unknown as UserWatermarkPreferences;
            setPreferences(pref);
          }
        }

        return { success: true, data };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update preferences');
        return { success: false, error };
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return { preferences, loading, error, updatePreferences, refetch: fetchPreferences };
}

/**
 * Hook to log PDF export operations
 */
export function usePDFExportLog() {
  const logExport = useCallback(async (options: PDFExportOptions) => {
    try {
      const rpcResult = await sb.rpc<Record<string, unknown>>('log_pdf_export', {
        p_document_type: options.documentType,
        p_document_name: options.documentName,
        p_export_method: options.exportMethod,
        p_file_size: options.fileSize,
        p_watermark_applied: options.watermarkApplied !== false,
        p_encryption_applied: options.encryptionApplied || false,
        p_metadata: options.metadata || {},
      });

      const data = rpcResult?.data as unknown;
      const err = rpcResult?.error as unknown;

      if (err) throw err;

      return { success: true, data };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to log PDF export');
      return { success: false, error };
    }
  }, []);

  return { logExport };
}

/**
 * Hook to get PDF export history
 */
export function usePDFExportHistory() {
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async (limit = 50) => {
    try {
      setLoading(true);
      setError(null);

      const res = await (sb.from('pdf_export_logs').order('created_at', { ascending: false }).limit(limit).select('*') as unknown as Promise<RpcResult<Array<Record<string, unknown>>>>);

      const data = res?.data;
      const err = res?.error;

      if (err) throw err;

      setLogs((Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []) || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch history');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { logs, loading, error, refetch: fetchHistory };
}

/**
 * Hook to apply watermark to PDF in browser
 * Requires jsPDF and similar libraries
 */
export function usePDFWatermark() {
  const { settings } = useWatermarkSettings();

  const applyWatermark = useCallback(
    (canvas: HTMLCanvasElement, pageInfo?: { pageNumber: number; totalPages: number }) => {
      if (!settings || !settings.watermark_enabled || !canvas) {
        return canvas;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return canvas;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Apply logo watermark
      if (
        (settings.watermark_type === 'logo' || settings.watermark_type === 'both') &&
        settings.watermark_logo_url
      ) {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
          ctx.globalAlpha = settings.watermark_logo_opacity;

          const calcWidth = img.width * settings.watermark_scale;
          const calcHeight = img.height * settings.watermark_scale;
          const x = centerX - calcWidth / 2;
          const y = centerY - calcHeight / 2;

          ctx.drawImage(img, x, y, calcWidth, calcHeight);
          ctx.globalAlpha = 1.0;
        };
        img.src = settings.watermark_logo_url;
      }

      // Apply text watermark
      if (settings.watermark_type === 'text' || settings.watermark_type === 'both') {
        ctx.save();
        ctx.globalAlpha = settings.watermark_text_opacity || 0.1;
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.rotate(-Math.PI / 6); // 30 degree rotation

        ctx.fillText(settings.watermark_text, centerX, centerY);
        ctx.restore();
      }

      // Add footer
      if (settings.footer_enabled && settings.footer_text) {
        ctx.font = '12px Arial';
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'center';
        ctx.fillText(settings.footer_text, canvas.width / 2, canvas.height - 20);
      }

      // Add page numbers
      if (settings.page_numbers_enabled && pageInfo) {
        ctx.font = '12px Arial';
        ctx.fillStyle = '#333333';
        const pageText = `Page ${pageInfo.pageNumber} of ${pageInfo.totalPages}`;
        ctx.textAlign = 'right';
        ctx.fillText(pageText, canvas.width - 20, canvas.height - 20);
      }

      return canvas;
    },
    [settings]
  );

  return { applyWatermark, settings };
}
