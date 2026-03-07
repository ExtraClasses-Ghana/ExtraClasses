# PDF Watermark & Password Reset - Quick Start Guide

## Quick Reference

### PDF Watermark System - 5 Minute Setup

#### 1. Add to Your Component

```typescript
import { usePDFWatermark, usePDFExportLog } from '@/hooks/usePDFWatermark';

export function MyPDFExport() {
  const { settings } = useWatermarkSettings();
  const { logExport } = usePDFExportLog();

  const handleExport = async () => {
    // ... generate PDF ...
    
    // Log export
    await logExport({
      documentType: 'student_booking',
      documentName: 'booking.pdf',
      exportMethod: 'download',
      watermarkApplied: !!settings?.watermark_enabled
    });
  };

  return <button onClick={handleExport}>Export PDF</button>;
}
```

#### 2. Configure Global Settings (Admin)

```typescript
const { data } = await supabase.rpc('update_watermark_settings', {
  p_watermark_enabled: true,
  p_watermark_type: 'both',
  p_watermark_logo_url: 'https://example.com/logo.png',
  p_watermark_text: 'EXTRACLASS',
  p_watermark_position: 'center'
});
```

#### 3. Apply Watermark to Canvas

```typescript
const { applyWatermark } = usePDFWatermark();
const watermarkedCanvas = applyWatermark(canvas, {
  pageNumber: 1,
  totalPages: 5
});
```

---

### Password Reset System - 5 Minute Setup

#### 1. Add Reset Page to Router

```typescript
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

// In your router setup
<Route path="/auth/reset-password" element={<ResetPasswordPage />} />
```

#### 2. Add Forgot Password Form

```typescript
import { usePasswordResetRequest } from '@/hooks/usePasswordReset';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const { requestReset, loading, success, error } = usePasswordResetRequest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestReset(email);
  };

  if (success) return <p>Check your email for reset link</p>;

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
      />
      <button disabled={loading} type="submit">
        {loading ? 'Sending...' : 'Reset Password'}
      </button>
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
    </form>
  );
}
```

#### 3. Send Reset Email (Backend)

```typescript
// When create_password_reset_token succeeds, send email:
const resetLink = `https://yourdomain.com/auth/reset-password?token=${token}`;

await sendEmail({
  to: email,
  subject: 'Reset Your Password',
  html: `Click here to reset: <a href="${resetLink}">${resetLink}</a>`
});
```

#### 4. Check Reset Eligibility (Optional)

```typescript
const { checkStatus } = usePasswordResetStatus();
const status = await checkStatus('user@example.com');

if (!status.can_request_reset) {
  alert(`Too many attempts. Try again after ${status.locked_until}`);
}
```

---

## Common Implementation Patterns

### Pattern 1: Student Booking Export

```typescript
import { usePDFExportLog, useWatermarkSettings } from '@/hooks/usePDFWatermark';
import jsPDF from 'jspdf';

function ExportBooking({ booking }) {
  const { settings } = useWatermarkSettings();
  const { logExport } = usePDFExportLog();

  return (
    <button onClick={async () => {
      const pdf = new jsPDF();
      
      // Add content
      pdf.text(`Booking: ${booking.id}`, 20, 20);
      pdf.text(`Student: ${booking.student}`, 20, 30);
      pdf.text(`Teacher: ${booking.teacher}`, 20, 40);
      pdf.text(`Date: ${booking.date}`, 20, 50);
      
      // Add watermark if enabled globally
      if (settings?.watermark_enabled) {
        // Apply watermark...
      }
      
      // Save and log
      const bytes = pdf.output('arraybuffer');
      await logExport({
        documentType: 'student_booking',
        documentName: `Booking_${booking.id}.pdf`,
        exportMethod: 'download',
        fileSize: bytes.byteLength
      });
      
      pdf.save(`Booking_${booking.id}.pdf`);
    }}>
      Export Booking
    </button>
  );
}
```

### Pattern 2: Password Reset in Auth Flow

```typescript
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

// Login form with forgot password link
function LoginForm() {
  return (
    <form>
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button type="submit">Sign In</button>
      
      <a href="/auth/forgot-password">Forgot password?</a>
    </form>
  );
}

// Forgot password form
function ForgotPasswordForm() {
  const { requestReset, success } = usePasswordResetRequest();
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('email') as string;
    await requestReset(email);
  };

  return success ? (
    <div>Check your email for reset link</div>
  ) : (
    <form onSubmit={handleSubmit}>
      <input type="email" name="email" placeholder="Your email" required />
      <button type="submit">Send Reset Link</button>
    </form>
  );
}

// Reset page (at /auth/reset-password?token=...)
<Route path="/auth/reset-password" element={<ResetPasswordPage />} />
```

### Pattern 3: Admin PDF Settings Panel

```typescript
function AdminPDFSettings() {
  const [logoUrl, setLogoUrl] = useState('');
  const [opacity, setOpacity] = useState(0.15);

  const handleUpdate = async () => {
    const { data } = await supabase.rpc('update_watermark_settings', {
      p_watermark_logo_url: logoUrl,
      p_watermark_logo_opacity: opacity
    });
    
    if (data.success) alert('Settings updated');
  };

  return (
    <div>
      <h2>PDF Watermark Settings</h2>
      
      <label>
        Logo URL:
        <input 
          value={logoUrl} 
          onChange={(e) => setLogoUrl(e.target.value)} 
        />
      </label>
      
      <label>
        Opacity:
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05"
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
        />
      </label>
      
      <button onClick={handleUpdate}>Save Settings</button>
    </div>
  );
}
```

---

## Common Errors & Fixes

### "Module not found: usePDFWatermark"

**Fix**: Ensure hook file exists at `src/hooks/usePDFWatermark.ts`

```bash
# Check file exists
ls src/hooks/usePDFWatermark.ts

# Or create new hook file if missing
```

### "RPC not found: get_watermark_settings"

**Fix**: Run the migration to create functions

```bash
# Apply migrations
supabase migration up

# Or manually in Supabase dashboard
psql < supabase/migrations/20260228000005_pdf_watermark_configuration.sql
```

### "Invalid token format" in Password Reset

**Fix**: Token must be exactly 64 hex characters

```typescript
// ✗ Wrong
const token = "abc123";  // Too short

// ✓ Correct
const token = "a1b2c3d4e5f6...";  // 64 chars, hex only
```

### "Watermark not appearing in PDF"

**Fix**: Ensure watermark is applied before saving

```typescript
// ✗ Wrong order
pdf.save('file.pdf');
applyWatermark(canvas);  // Too late

// ✓ Correct order
const watermarked = applyWatermark(canvas);
pdf.addImage(watermarked.toDataURL(), 'PNG', 0, 0);
pdf.save('file.pdf');
```

---

## Environment Setup

### Required Environment Variables

```bash
# .env or .env.local

# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_KEY=eyJxxx...

# Email Service (for password reset)
VITE_SENDGRID_API_KEY=SG.xxx...
VITE_SENDGRID_FROM_EMAIL=noreply@extraclass.com

# Reset URL
VITE_PASSWORD_RESET_URL=https://yourdomain.com/auth/reset-password
```

### Install Dependencies

```bash
# PDF generation
npm install jspdf html2canvas

# Already included (check package.json)
npm install react react-router-dom lucide-react

# If not already installed
npm install supabase
```

---

## Testing Checklist

### PDF Watermark Testing

- [ ] Admin can update watermark settings
- [ ] Watermark logo appears on exported PDF
- [ ] Opacity setting works (0.1 - 0.5 recommended)
- [ ] Different positions render correctly
- [ ] Footer text appears
- [ ] Page numbers appear correctly
- [ ] Compression reduces file size
- [ ] Export is logged in audit trail

### Password Reset Testing

- [ ] User enters email → token created
- [ ] User receives email with reset link
- [ ] Click link validates token
- [ ] Password requirements enforced
- [ ] Confirm password matching validated
- [ ] Password strength indicator works
- [ ] Successful reset redirects to login
- [ ] Reusing token shows error
- [ ] Rate limiting after 5 attempts
- [ ] Audit log records all actions

---

## Database Verification

### Check PDF Watermark Tables

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'pdf_%' OR table_name LIKE 'watermark_%';

-- Check function signatures
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%watermark%' 
OR routine_name LIKE '%pdf%';

-- Sample data
SELECT * FROM pdf_generation_settings LIMIT 1;
SELECT * FROM watermark_preferences WHERE user_id = '...';
SELECT * FROM pdf_export_logs LIMIT 5;
```

### Check Password Reset Tables

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'password_reset%';

-- Check functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%password_reset%';

-- Sample data
SELECT COUNT(*) FROM password_reset_tokens;
SELECT COUNT(*) FROM password_reset_audit_log;
SELECT * FROM password_reset_rate_limit WHERE is_locked = true;
```

---

## Security Checklist

### PDF Watermark Security

- [ ] Watermark settings only updated by admins
- [ ] Users cannot disable watermarks
- [ ] Export logs track all operations
- [ ] Metadata stored securely
- [ ] File size limits enforced
- [ ] Sensitive data not in logs

### Password Reset Security

- [ ] Tokens stored as SHA-256 hashes (NOT plaintext)
- [ ] Tokens have expiration (24 hours)
- [ ] One-time use enforced
- [ ] Rate limiting prevents brute force
- [ ] All actions logged in audit trail
- [ ] Email sent securely (TLS)
- [ ] Reset link includes token in URL only
- [ ] Old tokens invalidated on new request

---

## Migration Checklist

### Before Going Live

- [ ] Test migrations in development/staging
- [ ] Verify RLS policies applied
- [ ] Check indexes created
- [ ] Test RPC functions directly
- [ ] Verify email service configured
- [ ] Test PDF generation with real files
- [ ] Load test rate limiting
- [ ] Backup database
- [ ] Review audit logs from testing
- [ ] Document admin procedures

---

## Quick Links

- [PDF Watermark Full Guide](./PDF_WATERMARK_SYSTEM.md)
- [Password Reset Full Guide](./PASSWORD_RESET_SYSTEM.md)
- [API Reference](#common-patterns)
- [Database Schema](#database-verification)

---

## Support Commands

```bash
# Check migrations applied
supabase migration list

# Run specific migration
supabase migration up 20260228000005

# View database schema
psql -h localhost -U postgres -d postgres -c "\\dt *.password_reset*"

# Check function status
psql -U postgres -d postgres -c "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';"

# Check RLS policies
psql -U postgres -d postgres -c "SELECT tablename, policyname FROM pg_policies;"

# View audit logs
SELECT * FROM password_reset_audit_log ORDER BY created_at DESC LIMIT 20;
SELECT * FROM pdf_export_logs ORDER BY created_at DESC LIMIT 20;
```
