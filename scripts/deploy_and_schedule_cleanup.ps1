# PowerShell script to deploy and schedule cleanup-history function
# Usage:
#  $env:SUPABASE_PROJECT_REF="your-project-ref"; $env:SUPABASE_ACCESS_TOKEN="your-token"; .\scripts\deploy_and_schedule_cleanup.ps1

if (-not $env:SUPABASE_PROJECT_REF -or -not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Error "Please set SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN environment variables before running."
  exit 1
}

$projectRef = $env:SUPABASE_PROJECT_REF

Write-Host "Deploying cleanup-history function..."
supabase functions deploy cleanup-history --project-ref $projectRef

Write-Host "Creating schedule (daily) for cleanup-history..."
# Runs daily at 02:00 UTC by default
$schedule = '0 2 * * *'

# Attempt to create schedule via CLI (may not be supported in older CLI versions)
supabase functions schedule create cleanup-history --project-ref $projectRef --schedule $schedule 2>$null

Write-Host "Done. If schedule creation failed, create the schedule in the Supabase dashboard using cron: $schedule"
