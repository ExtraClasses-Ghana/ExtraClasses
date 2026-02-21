Cleanup-history function

This Supabase Edge Function deletes `payments` and `sessions` records older than 48 hours.

Deploy & schedule

1) Install Supabase CLI: https://supabase.com/docs/guides/cli

2) From project root, deploy the function:

```bash
# Bash
SUPABASE_PROJECT_REF="<your-project-ref>" SUPABASE_ACCESS_TOKEN="<your-access-token>" ./scripts/deploy_and_schedule_cleanup.sh

# PowerShell
$env:SUPABASE_PROJECT_REF = "<your-project-ref>"
$env:SUPABASE_ACCESS_TOKEN = "<your-access-token>"
.\scripts\deploy_and_schedule_cleanup.ps1
```

3) If your CLI doesn't support schedule creation, create a schedule in the Supabase dashboard:
- Open Supabase project -> Edge Functions -> cleanup-history -> Schedules -> Create schedule
- Cron expression: `0 2 * * *` (runs daily at 02:00 UTC). Adjust as needed.
- Set the function to run with the service role if you want it to run with elevated privileges.

Testing the function

Call the function manually (use service role key):

```bash
curl -X POST "https://<PROJECT_REF>.functions.supabase.co/cleanup-history" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "apikey: <SERVICE_ROLE_KEY>"
```

Logs

Use the Supabase dashboard Logs or the CLI `supabase functions logs cleanup-history` to inspect function runs.
