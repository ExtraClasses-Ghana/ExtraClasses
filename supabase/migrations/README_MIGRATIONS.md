# ExtraClass – Database migrations

**For a fresh Supabase project:** there is a single initial migration that creates the full schema.

| File | Purpose |
|------|--------|
| **20260125000000_extraclass_initial.sql** | Full schema including realtime for `teacher_profiles` and `verification_documents` so teacher dashboard, settings, and admin verification get live updates. |
| **20260126000001_extraclass_realtime_teacher_verification.sql** | Optional: run if your DB was created before realtime was added for teacher verification. Adds `teacher_profiles` and `verification_documents` to realtime and index on `verification_status`. |
| **20260127000000_extraclass_verification_status_only.sql** | Verification status only: ensures `teacher_profiles.verification_status` exists with values `pending`, `in_review`, `verified`, `rejected`; index; realtime for verification page and teacher dashboard/settings. |

**How to run on a new project**

1. Create a new Supabase project.
2. Link it: `supabase link --project-ref <your-ref>` (or use the dashboard).
3. Run migrations: `supabase db push` (or run the SQL of `20260125000000_extraclass_initial.sql` in the SQL Editor).

**Education level values (app-wide):**  
`Basic`, `JHS`, `SHS`, `College Of Healths`, `University`, `Cyber Secutity`, `Graphic Design`, `Web Design`
