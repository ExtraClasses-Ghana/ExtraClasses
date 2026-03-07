# PDF Watermark System - Complete Guide

## Overview

The PDF Watermark System is a comprehensive solution for protecting PDF documents with customizable watermarks, headers, footers, and compression settings. It combines server-side configuration management with client-side watermark application capabilities.

## Table of Contents

1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [Configuration](#configuration)
4. [Frontend Implementation](#frontend-implementation)
5. [API Reference](#api-reference)
6. [Usage Examples](#usage-examples)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

## Architecture

### Components

```
┌─────────────────────────────────────────────────────┐
│            PDF Watermark System                      │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────┐      ┌──────────────┐             │
│  │   Frontend   │◄────►│  Supabase    │             │
│  │   Hooks      │      │  Functions   │             │
│  └──────────────┘      └──────────────┘             │
│         │                      │                     │
│         │                      ▼                     │
│         │          ┌─────────────────────┐          │
│         │          │  Database Tables:    │         │
│         │          │  - Settings          │         │
│         │          │  - Preferences       │         │
│         │          │  - Export Logs       │         │
│         │          └─────────────────────┘         │
│         │                                            │
│         ▼                                            │
│  ┌─────────────────────┐                            │
│  │  PDF Application    │                            │
│  │  (Browser Canvas)   │                            │
│  └─────────────────────┘                            │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Data Flow

1. **Configuration Level**: Admin sets global watermark settings
2. **User Level**: Users configure their export preferences
3. **Export Level**: When exporting PDF, watermark is applied based on settings
4. **Audit Level**: Export operation is logged for compliance tracking

## Database Schema

### Tables

#### `pdf_generation_settings`
Global configuration for all PDF generation operations.

```sql
CREATE TABLE pdf_generation_settings (
  id uuid PRIMARY KEY,
  organization_id uuid,
  watermark_enabled boolean DEFAULT true,
  watermark_type text ('logo' | 'text' | 'both'),
  watermark_logo_url text,
  watermark_logo_opacity numeric(0-1),
  watermark_text text,
  watermark_position text,
  watermark_scale numeric(0-1),
  footer_enabled boolean,
  footer_text text,
  header_enabled boolean,
  header_text text,
  page_numbers_enabled boolean,
  compression_enabled boolean,
  compression_quality integer (1-100),
  created_at timestamp,
  updated_at timestamp,
  updated_by uuid
);
```

**Key Fields**:
- `watermark_enabled`: Toggle watermarking on/off globally
- `watermark_type`: logo, text, or both
- `watermark_position`: Placement of watermark (7 preset positions)
- `compression_quality`: JPEG quality (85 recommended)

#### `watermark_preferences`
User-specific watermark preferences.

```sql
CREATE TABLE watermark_preferences (
  id uuid PRIMARY KEY,
  user_id uuid (FK: auth.users),
  watermark_enabled boolean,
  apply_to_exports boolean,
  apply_on_print boolean,
  include_page_numbers boolean,
  include_timestamp boolean,
  include_username boolean,
  created_at timestamp,
  updated_at timestamp
);
```

**Key Fields**:
- `apply_to_exports`: Apply watermark to downloads
- `apply_on_print`: Apply watermark when printing
- `include_timestamp`: Add export timestamp to watermark
- `include_username`: Include exporter's username

#### `pdf_export_logs`
Audit trail of all PDF export operations.

```sql
CREATE TABLE pdf_export_logs (
  id uuid PRIMARY KEY,
  user_id uuid (FK: auth.users),
  document_type text,
  document_name text,
  export_method text ('download' | 'print' | 'email'),
  file_size integer,
  watermark_applied boolean,
  encryption_applied boolean,
  metadata jsonb,
  created_at timestamp,
  ip_address inet,
  user_agent text
);
```

## Configuration

### Global Settings

Admins manage global PDF generation settings through the API:

```typescript
// Update watermark settings
const { data, error } = await supabase.rpc('update_watermark_settings', {
  p_watermark_enabled: true,
  p_watermark_type: 'both',
  p_watermark_logo_url: 'https://example.com/logo.png',
  p_watermark_logo_opacity: 0.15,
  p_watermark_text: 'EXTRACLASS',
  p_watermark_position: 'center',
  p_watermark_scale: 0.3,
  p_footer_enabled: true,
  p_footer_text: '© EXTRACLASS - All Rights Reserved',
  p_compression_quality: 85
});
```

### Watermark Positions

Seven preset positions available:

```
┌─────────────────────────┐
│TL      TC          TR   │
│                         │
│                         │
│        CENTER           │
│                         │
│                         │
│BL      BC          BR   │
└─────────────────────────┘

- TL: top-left
- TC: top-center
- TR: top-right
- BL: bottom-left
- BC: bottom-center
- BR: bottom-right
```

## Frontend Implementation

### Hooks

#### `useWatermarkSettings()`
Fetch global watermark configuration.

```typescript
const { settings, loading, error, refetch } = useWatermarkSettings();

if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;

return (
  <div>
    <p>Watermark Type: {settings?.watermark_type}</p>
    <p>Opacity: {settings?.watermark_logo_opacity}</p>
  </div>
);
```

#### `useWatermarkPreferences(userId)`
Manage user-specific preferences.

```typescript
const { preferences, updatePreferences } = useWatermarkPreferences(userId);

const handleUpdatePreferences = async () => {
  await updatePreferences({
    watermark_enabled: true,
    apply_to_exports: true,
    apply_on_print: false,
    include_page_numbers: true
  });
};
```

#### `usePDFWatermark()`
Apply watermark to PDF canvas.

```typescript
const { applyWatermark, settings } = usePDFWatermark();

// Apply watermark to canvas
const watermarkedCanvas = applyWatermark(canvas, {
  pageNumber: 1,
  totalPages: 5
});
```

#### `usePDFExportLog()`
Log PDF export operations.

```typescript
const { logExport } = usePDFExportLog();

await logExport({
  documentType: 'student_booking',
  documentName: 'Booking_2024.pdf',
  exportMethod: 'download',
  fileSize: 102400,
  watermarkApplied: true,
  metadata: { student_id: '123' }
});
```

### Component Integration

```typescript
import { usePDFWatermark, usePDFExportLog } from '@/hooks/usePDFWatermark';

export function ExportPDFButton({ data }) {
  const { applyWatermark } = usePDFWatermark();
  const { logExport } = usePDFExportLog();

  const handleExport = async () => {
    // Generate PDF with jsPDF
    const pdf = new jsPDF();
    
    // Get canvas and apply watermark
    const canvas = await html2canvas(document.getElementById('content'));
    const watermarkedCanvas = applyWatermark(canvas);
    
    // Add to PDF
    const img = watermarkedCanvas.toDataURL('image/png');
    pdf.addImage(img, 'PNG', 0, 0, 210, 297);
    
    // Log export
    await logExport({
      documentType: 'student_payment',
      documentName: 'Payment_Receipt.pdf',
      exportMethod: 'download',
      watermarkApplied: true
    });
    
    // Download
    pdf.save('Payment_Receipt.pdf');
  };

  return <button onClick={handleExport}>Export PDF</button>;
}
```

## API Reference

### RPC Functions

#### `get_watermark_settings()`
Retrieve current watermark configuration.

**Returns**:
```typescript
{
  watermark_enabled: boolean
  watermark_type: 'logo' | 'text' | 'both'
  watermark_logo_url: string | null
  watermark_logo_opacity: number
  watermark_text: string
  watermark_position: string
  watermark_scale: number
  footer_enabled: boolean
  footer_text: string
  header_enabled: boolean
  header_text: string | null
  page_numbers_enabled: boolean
  compression_enabled: boolean
  compression_quality: number
}
```

#### `update_watermark_settings()`
Update watermark configuration (admin only).

**Parameters**:
- `p_watermark_enabled`: boolean (optional)
- `p_watermark_type`: 'logo' | 'text' | 'both' (optional)
- `p_watermark_logo_url`: string (optional)
- `p_watermark_logo_opacity`: numeric (optional)
- `p_watermark_text`: string (optional)
- `p_watermark_position`: string (optional)
- `p_watermark_scale`: numeric (optional)
- `p_footer_enabled`: boolean (optional)
- `p_footer_text`: string (optional)
- `p_compression_quality`: integer (optional)

**Returns**:
```typescript
{
  success: boolean
  message: string
  settings: {
    watermark_enabled: boolean
    watermark_type: string
    watermark_position: string
    compression_quality: number
  }
}
```

#### `log_pdf_export()`
Log a PDF export operation for audit trail.

**Parameters**:
- `p_document_type`: string (required)
- `p_document_name`: string (required)
- `p_export_method`: 'download' | 'print' | 'email' (required)
- `p_file_size`: integer (optional)
- `p_watermark_applied`: boolean (default: true)
- `p_encryption_applied`: boolean (default: false)
- `p_metadata`: jsonb (optional)

**Returns**:
```typescript
{
  success: boolean
  message: string
}
```

## Usage Examples

### Example 1: Export Student Booking PDF with Watermark

```typescript
import { useWatermarkSettings, usePDFExportLog } from '@/hooks/usePDFWatermark';
import jsPDF from 'jspdf';

function StudentBookingExport({ booking }) {
  const { settings } = useWatermarkSettings();
  const { logExport } = usePDFExportLog();

  const exportToPDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Add content
    pdf.setFontSize(16);
    pdf.text('Booking Receipt', 20, 20);
    pdf.setFontSize(12);
    pdf.text(`Student: ${booking.student_name}`, 20, 30);
    pdf.text(`Teacher: ${booking.teacher_name}`, 20, 40);
    pdf.text(`Date: ${booking.date}`, 20, 50);
    
    // Apply watermark if enabled
    if (settings?.watermark_enabled) {
      const watermarkImg = settings.watermark_logo_url;
      const img = new Image();
      img.src = watermarkImg;
      img.onload = () => {
        // Apply watermark at center with opacity
        pdf.setGlobalAlpha(settings.watermark_logo_opacity);
        pdf.addImage(img, 'PNG', 85, 130, 40, 40);
        pdf.setGlobalAlpha(1);
      };
    }
    
    // Log the export
    await logExport({
      documentType: 'student_booking',
      documentName: `Booking_${booking.id}.pdf`,
      exportMethod: 'download',
      watermarkApplied: !!(settings?.watermark_enabled),
      metadata: { booking_id: booking.id }
    });
    
    pdf.save(`Booking_${booking.id}.pdf`);
  };

  return <button onClick={exportToPDF}>Export Booking PDF</button>;
}
```

### Example 2: Teacher Earnings Report with Custom Header

```typescript
async function generateEarningsReport(teacherId) {
  const { settings } = useWatermarkSettings();
  
  const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape
  
  // Add header if enabled
  if (settings?.header_enabled && settings.header_text) {
    pdf.setFontSize(10);
    pdf.text(settings.header_text, 10, 10);
  }
  
  // Add earnings data
  pdf.setFontSize(14);
  pdf.text('Earnings Report', 15, 25);
  
  // Table data
  const data = [
    ['Date', 'Sessions', 'Amount'],
    ['2024-01-15', '5', '$150.00'],
    ['2024-01-20', '3', '$90.00']
  ];
  
  // Use autoTable or manual table drawing
  pdf.autoTable({
    head: [data[0]],
    body: data.slice(1),
    startY: 35
  });
  
  // Add footer if enabled
  if (settings?.footer_enabled && settings.footer_text) {
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(9);
      pdf.text(settings.footer_text, 10, pdf.internal.pageSize.getHeight() - 10);
    }
  }
  
  return pdf;
}
```

## Security Considerations

### 1. Watermark Protection Level
- Watermarks provide **visual protection**, not cryptographic protection
- For truly sensitive documents, combine with PDF encryption
- Watermarks deter casual copying/redistribution

### 2. RLS Policies
- Admin-only access to `pdf_generation_settings`
- Users can only view their own `watermark_preferences`
- Users can only see their own `pdf_export_logs`

### 3. Audit Trail
- All PDF exports are logged with:
  - User ID
  - IP address
  - User agent
  - Export method
  - Timestamp
- Admins can review to detect suspicious patterns

### 4. Rate Limiting
- Consider implementing rate limiting on PDF export requests
- Prevent bulk exporting of sensitive documents

### 5. File Size Limits
- Enforce maximum PDF file size
- Use compression settings to control output size
- Monitor for unusually large exports

## Troubleshooting

### Watermark Not Appearing

**Problem**: Watermark applied but not visible in exported PDF

**Solutions**:
1. Check `watermark_enabled` is true in settings
2. Verify `watermark_logo_url` is accessible and valid
3. Check opacity value (0.15 may be too transparent)
4. Ensure watermark application code is called after PDF content

### Logo URL Issues

**Problem**: "Failed to load image" error

**Solutions**:
1. Verify logo URL is publicly accessible
2. Check CORS headers on image server
3. Use absolute URLs, not relative paths
4. Test URL directly in browser

### Compression Issues

**Problem**: PDF file size too large

**Solutions**:
1. Increase compression_quality (trade quality for size)
2. Enable `compression_enabled` in settings
3. Reduce image resolution in source content
4. Use appropriate image formats (JPEG > PNG for photos)

### Performance Issues

**Problem**: PDF generation is slow

**Solutions**:
1. Disable unnecessary watermark features
2. Reduce watermark image size
3. Lower page count in export
4. Use lazy loading for large PDFs
5. Consider server-side PDF generation for large batches

## Best Practices

1. **Logo Optimization**: Use SVG or small PNG logos for watermarks
2. **Opacity Balance**: 0.10-0.20 opacity preserves document readability
3. **Position Placement**: Center watermarks are most professional
4. **Compression**: 85-90 quality maintains good appearance while reducing size
5. **Audit Compliance**: Regularly review export logs for compliance
6. **User Communication**: Inform users about watermark policies
7. **Testing**: Test on different PDF readers for consistency

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review audit logs for export patterns
3. Test with sample documents
4. Contact development team with specific error messages
