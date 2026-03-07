# Password Reset System - Complete Guide

## Overview

The Password Reset System is an enterprise-grade authentication feature providing secure, time-limited password reset capability with comprehensive audit logging, rate limiting, and token management. Implements industry best practices including SHA-256 token hashing, expiration policies, and anti-brute-force protections.

## Table of Contents

1. [Architecture](#architecture)
2. [Security Model](#security-model)
3. [Database Schema](#database-schema)
4. [Token Lifecycle](#token-lifecycle)
5. [Frontend Implementation](#frontend-implementation)
6. [API Reference](#api-reference)
7. [Email Integration](#email-integration)
8. [Rate Limiting](#rate-limiting)
9. [Audit & Compliance](#audit--compliance)
10. [Troubleshooting](#troubleshooting)

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────┐
│         Password Reset System                        │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────────┐      ┌──────────────────┐    │
│  │   Frontend       │◄────►│   Supabase       │    │
│  │   Components     │      │   Functions      │    │
│  │   & Hooks        │      │   (RPC)          │    │
│  └──────────────────┘      └──────────────────┘    │
│         │                          │                 │
│         │                          ▼                 │
│         │                ┌──────────────────┐       │
│         │                │ PostgreSQL DB:   │       │
│         │                │ - Tokens         │       │
│         │                │ - Audit Logs     │       │
│         │                │ - Rate Limits    │       │
│         │                └──────────────────┘       │
│         │                                            │
│         ├───────────────► Email Service             │
│         │                 (SendGrid/Resend)         │
│         │                                            │
│         ▼                                            │
│  ┌──────────────────┐                               │
│  │  Auth.users      │                               │
│  │  (Update Pass)   │                               │
│  └──────────────────┘                               │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Data Flow

```
User Request Reset
    ↓
Rate Limit Check
    ↓
Generate Token (SHA-256)
    ↓
Store Token Hash (never plaintext)
    ↓
Send Email with Reset Link
    ↓
User Clicks Link
    ↓
Token Validation
    ↓
Password Submission
    ↓
Password Hash Check
    ↓
Mark Token as Used
    ↓
Update auth.users password
    ↓
Success Response
```

## Security Model

### Token Security

**Non-Plaintext Storage**:
```
1. Generate token: 32-byte random value (256 bits)
2. Create salt: UUID string
3. Hash token: SHA-256(token + salt)
4. Store: hash only, never plaintext
5. Validate: Hash submitted token and compare
```

**Why This Matters**:
- Token not visible in database dumps
- Protects against SQL injection payload discovery
- Prevents accidental token exposure in logs
- Matches industry standard (e.g., password reset tokens)

### Time-Based Expiration

```
Token Created: 2024-02-28 14:30:00 UTC
Validity: 24 hours (configurable)
Expires At: 2024-02-29 14:30:00 UTC

Check: SELECT * FROM password_reset_tokens 
       WHERE expires_at < now() AND NOT is_used
       -- These tokens are invalid
```

### Rate Limiting

Three-tier protection:

```
┌─────────────────────────────────────┐
│    Rate Limit Schema                │
├─────────────────────────────────────┤
│                                      │
│  Attempt 1-5:  ALLOWED              │
│  Attempt 6:    LOCKED (1 hour)      │
│  After Unlock: Reset counter        │
│  On Success:   Clear all limits     │
│                                      │
└─────────────────────────────────────┘

Example: User tries 7 times in 10 minutes
│
├─ Attempts 1-5: All succeed, tokens sent
├─ Attempt 6: LOCKED
├─ Attempt 7: Rejected (still locked)
└─ After 1 hour: Unlocked, counter reset
```

## Database Schema

### Tables

#### `password_reset_tokens`
Core token storage with temporal and security features.

```sql
CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY,
  user_id uuid (FK: auth.users),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  token_salt text NOT NULL,
  is_used boolean DEFAULT false,
  used_at timestamp with time zone,
  used_ip_address inet,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_ip_address inet,
  user_agent text,
  reset_from_email boolean DEFAULT false
);

CREATE INDEX idx_token_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_token_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_token_is_used ON password_reset_tokens(is_used);
CREATE INDEX idx_token_created_at ON password_reset_tokens(created_at DESC);
```

**Key Features**:
- `token_hash`: SHA-256 hash (never plaintext)
- `token_salt`: UUID used in hash (prevents rainbow tables)
- `is_used`: Track one-time use
- `expires_at`: Automatic invalidation
- `ip_address` fields: Security auditing

#### `password_reset_audit_log`
Complete audit trail for compliance.

```sql
CREATE TABLE password_reset_audit_log (
  id uuid PRIMARY KEY,
  user_id uuid (FK: auth.users),
  action text CHECK (action IN (
    'token_created',
    'token_validated', 
    'token_used',
    'token_expired',
    'token_revoked',
    'rate_limit_hit'
  )),
  email_address text NOT NULL,
  ip_address inet,
  user_agent text,
  result text CHECK (result IN ('success', 'failed', 'expired', 'invalid')),
  error_reason text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_audit_user_id ON password_reset_audit_log(user_id);
CREATE INDEX idx_audit_action ON password_reset_audit_log(action);
CREATE INDEX idx_audit_created_at ON password_reset_audit_log(created_at DESC);
```

**Actions Tracked**:
- `token_created`: Reset request made
- `token_validated`: Token checked for validity
- `token_used`: Password successfully reset
- `token_expired`: Token expired before use
- `token_revoked`: Admin revoked token
- `rate_limit_hit`: Attempt blocked by rate limit

#### `password_reset_rate_limit`
Rate limiting state per user/email.

```sql
CREATE TABLE password_reset_rate_limit (
  id uuid PRIMARY KEY,
  user_id uuid (FK: auth.users),
  email_address text NOT NULL,
  attempt_count integer DEFAULT 1,
  first_attempt_at timestamp,
  last_attempt_at timestamp,
  is_locked boolean DEFAULT false,
  locked_until timestamp,
  CONSTRAINT unique_rate_limit UNIQUE(user_id, email_address)
);

CREATE INDEX idx_rate_limit_user_id ON password_reset_rate_limit(user_id);
CREATE INDEX idx_rate_limit_email ON password_reset_rate_limit(email_address);
CREATE INDEX idx_rate_limit_locked_until ON password_reset_rate_limit(locked_until);
```

## Token Lifecycle

### Complete Flow Example

```
Timeline: Reset Request for user@example.com

T=00:00 - User requests password reset
├─ Check: Email exists in auth.users ✓
├─ Check: Rate limit allows request (0/5 attempts) ✓
├─ Generate: Token "a1b2c3d4..." (256 bits)
├─ Generate: Salt "uuid-1234-5678"
├─ Hash: SHA-256(token + salt) -> "hash123..."
├─ Store: Token hash in DB (NOT plaintext)
├─ Create: Link "/auth/reset-password?token=a1b2c3d4..."
├─ Send: Email with link to user@example.com
├─ Log: audit_log entry (token_created, success)
└─ Response: "Check your email"

T=00:05 - User clicks link in email
├─ Browser: Extracts token from URL
├─ Browser: Calls validate_password_reset_token(token)
├─ DB: Looks up token...wait, we store HASH not token!
│    How does validation work?
│
│    Answer: We hash the submitted token again
│    and compare hashes (SHA-256(submitted + salt) == stored_hash)
│
├─ Validation: Hash matches ✓
├─ Validation: is_used = false ✓
├─ Validation: expires_at > now() ✓
├─ Log: audit_log entry (token_validated, success)
└─ Response: { valid: true, email: "user@example.com" }

T=00:08 - User submits new password
├─ Password: "MyNewPass123!"
├─ Check: Password strength (8+ chars, numbers, special)
├─ Call: use_password_reset_token(token, newPassword)
├─ Validation: Hash token again ✓
├─ Validation: Check user_id matches ✓
├─ Update: SET is_used = true, used_at = now()
├─ Update: auth.users password hash
├─ Clear: Rate limit counter (successful reset)
├─ Log: audit_log entry (token_used, success)
└─ Response: { success: true, redirect: "/auth/login" }

T=00:10 - Old token checked again
├─ Check: is_used = true ✓
├─ Response: "Token already used"
└─ Log: audit_log entry (token_used, failed)

Token Cleanup (Daily Task)
├─ Delete: All tokens where expires_at < now()
├─ Delete: Audit logs older than 90 days
├─ Delete: Rate limits older than 24 hours with no recent attempts
└─ Summary: "Deleted 42 expired tokens"
```

## Frontend Implementation

### Hooks Overview

```typescript
// Request reset (send email)
const { requestReset, loading, error, success } = usePasswordResetRequest();
await requestReset('user@example.com');

// Validate token (check if still valid)
const { validateToken, validating } = usePasswordResetValidation();
const result = await validateToken(token);

// Reset password (submit new password)
const { resetPassword, loading, error } = usePasswordReset();
await resetPassword(token, 'NewPassword123!');

// Check eligibility (rate limit status)
const { status } = usePasswordResetStatus();
await checkStatus('user@example.com');
```

### ResetPasswordPage Component

Professional three-step UI:

**Step 1: Token Validation**
```
┌─────────────────────────────┐
│  🔐 Reset Password          │
├─────────────────────────────┤
│                              │
│  Check your email for a     │
│  password reset link        │
│                              │
│  [← Back] [Sign In]         │
└─────────────────────────────┘
```

**Step 2: New Password**
```
┌─────────────────────────────┐
│  🔐 Create New Password     │
├─────────────────────────────┤
│                              │
│  Email: user@example.com    │
│                              │
│  New Password: [•••••]      │
│  ▯▭▭▭▭ Fair                 │
│  • Add uppercase letters     │
│  • Add special characters    │
│                              │
│  Confirm: [•••••]          │
│  ✓ Passwords match          │
│                              │
│  [Reset Password]           │
│                              │
│  Sign In | Sign Up          │
└─────────────────────────────┘
```

**Step 3: Success**
```
┌─────────────────────────────┐
│  ✓ Password Reset Success   │
├─────────────────────────────┤
│                              │
│  Your password has been     │
│  successfully reset.        │
│                              │
│  Redirecting in 3s...       │
│                              │
│  [Go to Sign In]            │
│  [Back to Home]             │
└─────────────────────────────┘
```

### Usage Example

```typescript
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import { useNavigate } from 'react-router-dom';

// Add to router
<Route path="/auth/reset-password" element={<ResetPasswordPage />} />

// Link from forgot password form
const handleForgotPassword = async (email: string) => {
  const { requestReset } = usePasswordResetRequest();
  const result = await requestReset(email);
  
  if (result.success) {
    alert('Check your email for reset link');
  }
};
```

## API Reference

### RPC Functions

#### `create_password_reset_token(p_email, p_token_validity_hours?)`

Create a secure password reset token.

**Parameters**:
```typescript
p_email: string                      // User email
p_token_validity_hours: integer      // 24 (default)
```

**Returns**:
```typescript
{
  success: boolean                   // true if created
  message: string                    // Human-readable message
  token: string                      // 64-char hex (plain token only)
  expires_in_hours: number           // Validity duration
  expires_at: string                 // ISO timestamp
  error?: string                     // Error if failed
}
```

**Security Notes**:
- Token returned in response for demonstration
- In production, never return token - send via email only
- Token is 256 bits (64 hex characters)

#### `validate_password_reset_token(p_token)`

Validate token without using it.

**Parameters**:
```typescript
p_token: string                      // 64-char hex token
```

**Returns**:
```typescript
{
  valid: boolean                     // true if valid
  user_id?: string                   // If valid
  email?: string                     // If valid
  message: string                    // Description
  expires_at?: string                // If valid
  error?: string                     // If invalid
}
```

**Error Cases**:
- `Invalid token format` - not 64 hex chars
- `Token not found` - never existed
- `Token already used` - one-time use only
- `Token expired` - past expiration time

#### `use_password_reset_token(p_token, p_new_password)`

Validate token and reset password.

**Parameters**:
```typescript
p_token: string                      // 64-char hex
p_new_password: string               // New password
```

**Password Requirements**:
- Minimum 8 characters
- At least 1 number
- At least 1 special character (!@#$%^&*(),.?":{}|<>)

**Returns**:
```typescript
{
  success: boolean
  message: string
  user_id?: string                   // If successful
  email?: string                     // If successful
  error?: string                     // If failed
}
```

**Side Effects**:
- Marks token as used
- Clears rate limit counter
- Records successful reset in audit log

#### `cleanup_expired_password_reset_tokens()`

Admin-only cleanup of expired tokens (admin only).

**Returns**:
```typescript
{
  success: boolean
  message: string
  deleted_tokens: number             // Count of deleted tokens
}
```

**Runs**:
- Deletes tokens where expires_at < now()
- Deletes audit logs > 90 days old
- Deletes rate limits older than 24 hours

#### `get_password_reset_status(p_email)`

Check reset eligibility for email.

**Parameters**:
```typescript
p_email: string                      // Email to check
```

**Returns**:
```typescript
{
  can_request_reset: boolean         // Allowed to request
  is_rate_limited: boolean           // Currently locked
  attempts_remaining: number         // 0-5
  active_tokens: number              // Unused, valid tokens
  locked_until?: string              // If rate limited
}
```

## Email Integration

### Email Template

**Subject**: "Reset Your EXTRACLASS Password"

**HTML Body**:
```html
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h1>Password Reset Request</h1>
  
  <p>We received a request to reset your password.</p>
  
  <p>Click the button below to create a new password:</p>
  
  <a href="https://extraclass.com/auth/reset-password?token={{TOKEN}}"
     style="display: inline-block; padding: 12px 24px; 
            background: #3b82f6; color: white; text-decoration: none;
            border-radius: 4px; margin: 20px 0;">
    Reset Password
  </a>
  
  <p style="color: #666; font-size: 14px;">
    Or copy this link: https://extraclass.com/auth/reset-password?token={{TOKEN}}
  </p>
  
  <p style="color: #999; font-size: 12px;">
    This link expires in 24 hours. If you didn't request this, 
    please ignore this email.
  </p>
</div>
```

### Email Service Setup (SendGrid Example)

```typescript
// Environment variables
VITE_SENDGRID_API_KEY=SG.xxxxx
VITE_SENDGRID_FROM_EMAIL=noreply@extraclass.com

// Send reset email
async function sendPasswordResetEmail(email: string, token: string) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email }],
        subject: 'Reset Your EXTRACLASS Password'
      }],
      from: { email: import.meta.env.VITE_SENDGRID_FROM_EMAIL },
      content: [{
        type: 'text/html',
        value: generateEmailHTML(token)
      }]
    })
  });
  
  return response.ok;
}
```

## Rate Limiting

### Policy Details

```
Maximum Attempts: 5 per user/email
Lockout Duration: 1 hour
Reset Trigger: Successful password reset
Window: Rolling 24-hour window
```

### Example Scenarios

**Scenario 1: Legitimate User**
```
1. User forgets password
2. Requests reset → OK (1/5)
3. Checks email → OK (2/5)
4. Requests reset again → OK (3/5)
5. Clicks link, resets password → LOCKED CLEARED
6. Attempts login with new password → SUCCESS
```

**Scenario 2: Attacker Trying Enumeration**
```
1. Try email1@example.com → OK (1/5)
2. Try email2@example.com → OK (1/5)  [different email]
3. Try email1@example.com → OK (2/5)
4. Try email1@example.com → OK (3/5)
5. Try email1@example.com → OK (4/5)
6. Try email1@example.com → OK (5/5)
7. Try email1@example.com → REJECTED (locked for 1 hour)
```

## Audit & Compliance

### Audit Log Entry Examples

```
id | action | email | result | error_reason | created_at
---|--------|-------|--------|-------------|----------
1  | token_created | user@ex.com | success | null | 2024-02-28 14:30:00
2  | token_validated | user@ex.com | success | null | 2024-02-28 14:35:00
3  | token_used | user@ex.com | success | null | 2024-02-28 14:40:00
4  | rate_limit_hit | test@ex.com | failed | Too many attempts | 2024-02-28 14:45:00
```

### Compliance Reports

```typescript
// Get all resets in last 30 days
const { data: logs } = await supabase
  .from('password_reset_audit_log')
  .select('*')
  .eq('action', 'token_used')
  .eq('result', 'success')
  .gte('created_at', thirtyDaysAgo);

// Detect suspicious patterns
const suspiciousUsers = logs.reduce((acc, log) => {
  const count = (acc[log.user_id] || 0) + 1;
  return { ...acc, [log.user_id]: count };
}, {});

const suspicious = Object.entries(suspiciousUsers)
  .filter(([_, count]) => count > 3)
  .map(([userId, _]) => userId);
```

## Troubleshooting

### "Invalid token format" Error

**Cause**: Token doesn't match expected format

**Solutions**:
1. Token must be exactly 64 hex characters (0-9, a-f)
2. Check URL copying - no spaces
3. Verify email link format
4. Token is case-insensitive but must be lowercase

### "Token already used" Error

**Cause**: Token can only be used once

**Solutions**:
1. User must request new reset link
2. Old token is invalidated after use
3. Admin can revoke unused tokens
4. Check audit log to verify when token was used

### "Token expired" Error

**Cause**: Token past expiration time

**Solutions**:
1. Token valid for 24 hours by default
2. Request new reset link
3. Admin can change expiration in settings
4. Check system time synchronization

### Email Not Received

**Causes & Solutions**:
1. **Check spam folder** - Email service may flag as spam
2. **Verify email address** - User might have typo
3. **Check SendGrid logs** - See delivery status
4. **Rate limit preventing send** - Wait 1 hour if locked
5. **Email service down** - Check service status

### Rate Limit Not Clearing

**Problem**: User locked out after 5 attempts

**Solutions**:
1. Wait 1 hour (automatic unlock)
2. Successful reset clears immediately
3. Admin can manually clear rate limit
4. Check reset success in audit log

## Best Practices

1. **Token Validity**: Keep at 24 hours (security vs usability)
2. **Email Security**: Use TLS/SSL for transport
3. **Password Requirements**: Enforce strong passwords
4. **Audit Review**: Weekly review of reset patterns
5. **Rate Limiting**: Balance security with user experience
6. **Testing**: Test both success and failure paths
7. **Communication**: Clear error messages in UI
8. **Logging**: Always log attempts for compliance

## Support

For issues:
1. Check audit logs for error patterns
2. Verify email service connectivity
3. Test token generation manually
4. Review SQL functions for syntax errors
5. Contact development with sanitized error logs
