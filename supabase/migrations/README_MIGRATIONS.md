# ExtraClass – Database migrations

**For a fresh Supabase project:** there is a single initial migration that creates the full schema.

| File | Purpose |
|------|--------|
| **20260125000000_extraclass_initial.sql** | Full schema: `profiles`, `teacher_profiles`, `user_roles`, `sessions`, `payments`, `messages`, `reviews`, `verification_documents`, `admin_notifications`, `system_settings`, `subjects`, `course_materials`, `complaints`, `video_sessions`, `video_signaling`, `contact_messages`, `user_blocks`, `user_presence`, `typing_indicators`, `teacher_withdrawals`, `audit_logs`, plus RLS, triggers, storage buckets, and seed data. |

**How to run on a new project**

1. Create a new Supabase project.
2. Link it: `supabase link --project-ref <your-ref>` (or use the dashboard).
3. Run migrations: `supabase db push` (or run the SQL of `20260125000000_extraclass_initial.sql` in the SQL Editor).

**Education level values (app-wide):**  
`Basic`, `JHS`, `SHS`, `College Of Healths`, `University`, `Cyber Secutity`, `Graphic Design`, `Web Design`
