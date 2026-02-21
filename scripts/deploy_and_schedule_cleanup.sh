#!/usr/bin/env bash
set -euo pipefail

# Usage:
#  SUPABASE_PROJECT_REF="your-project-ref" SUPABASE_ACCESS_TOKEN="your-token" ./scripts/deploy_and_schedule_cleanup.sh

PROJECT_REF=${SUPABASE_PROJECT_REF:-}
ACCESS_TOKEN=${SUPABASE_ACCESS_TOKEN:-}

if [ -z "$PROJECT_REF" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "Please set SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN environment variables before running."
  exit 1
fi

echo "Deploying cleanup-history function..."
supabase functions deploy cleanup-history --project-ref "$PROJECT_REF"

echo "Creating schedule (daily) for cleanup-history..."
# The schedule expression below runs once daily at 02:00 UTC. Adjust as needed.
SCHEDULE_EXPR="0 2 * * *"

# Create schedule via supabase CLI (if supported). If your CLI version doesn't support schedules,
# run the equivalent in the Supabase dashboard or use the HTTP API.
supabase functions schedule create cleanup-history --project-ref "$PROJECT_REF" --schedule "$SCHEDULE_EXPR" || true

echo "Deployment complete. If schedule creation failed, please create the schedule in the Supabase dashboard:
 - Go to Functions -> cleanup-history -> Schedules -> Create schedule
 - Use the cron expression: $SCHEDULE_EXPR
 - Use the service role key when calling the function (or leave public if you prefer)"
