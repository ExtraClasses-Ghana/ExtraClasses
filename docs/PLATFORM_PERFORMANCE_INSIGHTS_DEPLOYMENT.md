# Platform Performance Insights - Deployment Guide

## Overview

Complete guide for deploying the Platform Performance Insights analytics page to your ExtraClass admin dashboard.

## Pre-Deployment Checklist

- [ ] Database backup created
- [ ] Migration reviewed for accuracy
- [ ] React components syntax checked
- [ ] Dependencies (recharts) verified installed
- [ ] Admin routing configured
- [ ] Test environment ready

## Deployment Steps

### Step 1: Deploy Database Migration

The migration file `supabase/migrations/20260228000001_platform_performance_insights.sql` contains:
- 4 optimized database indexes
- 2 aggregate views for student demographics
- 5 analytics functions (3 base + 2 specialized)
- 3 admin-gated wrapper functions
- Comprehensive documentation

#### Deploy using Supabase CLI

```bash
# Navigate to project directory
cd c:\Users\owusu\Downloads\ExtraClass\ExtraClasses

# Push migration to Supabase
supabase db push

# Verify the migration status
supabase migration list
```

#### Deploy manually (via Supabase Dashboard)

1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy entire migration file content
4. Execute the query
5. Verify no errors in results

#### Deploy using psql

```bash
# Connect to your Supabase database
psql postgresql://[user]:[password]@[host]:5432/postgres \
  -f supabase/migrations/20260228000001_platform_performance_insights.sql
```

### Step 2: Verify Database Installation

Run these verification queries in Supabase SQL Editor:

```sql
-- Check indexes were created
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%demographics%' OR indexname LIKE 'idx_%sessions%complete%' 
  OR indexname LIKE 'idx_%teacher%subject%';

-- Test student demographics view
SELECT * FROM public.student_demographics_by_level LIMIT 5;

-- Test revenue trends function
SELECT * FROM public.get_revenue_trends_daily(7) LIMIT 3;

-- Test subject distribution function  
SELECT * FROM public.get_subject_teacher_distribution() LIMIT 5;

-- Test admin-gated functions (as logged-in admin)
SELECT * FROM public.get_student_demographics_admin() LIMIT 3;
```

### Step 3: Update Supabase Types

The types have already been updated in `src/integrations/supabase/types.ts` with:
- All new RPC function signatures
- Return type definitions
- Parameter specifications

No additional action needed, but verify by checking:
```bash
# TypeScript should not show errors
npm run lint

# Or just check the types file
cat src/integrations/supabase/types.ts | grep -A 5 "get_revenue_trends_admin"
```

### Step 4: Configure Admin Routing

Add the new insights page to your admin navigation. Update your admin routing file (typically `App.tsx` or routing configuration):

```typescript
import AdminPlatformInsights from "@/pages/admin/AdminPlatformInsights";

// Where you define admin routes:
const adminRoutes = [
  // ...existing routes...
  {
    path: "insights",
    element: <AdminPlatformInsights />,
    text: "Performance Insights",  // Navigation label
    icon: BarChart  // Use appropriate icon from lucide-react
  }
];
```

Or in your router setup:

```typescript
{
  path: "/admin/insights",
  element: <PrivateRoute><AdminPlatformInsights /></PrivateRoute>
}
```

### Step 5: Build and Test

```bash
# Install dependencies (if needed)
npm install

# Build TypeScript check
npm run build

# Start development server
npm run dev

# Navigate to http://localhost:5173/#/admin/insights

# Or specify the correct port if different
npm run dev -- --port 3000
```

### Step 6: Run Tests

```bash
# Run linting
npm run lint

# Run tests if you have them
npm run test

# Fix any TypeScript errors
npm run build
```

## Verification Checklist

After deployment, verify:

- [ ] Page loads without errors
- [ ] All charts render correctly
- [ ] Student demographics pie chart displays
- [ ] Revenue trend chart shows data
- [ ] Period buttons (daily/weekly/monthly) work
- [ ] Subject distribution tabs function
- [ ] Error handling displays for permission issues
- [ ] Loading states appear correctly
- [ ] Tables display data properly
- [ ] Navigation to page works from admin menu
- [ ] Mobile responsive layout functions
- [ ] Browser console has no errors

## Performance Validation

Check query performance:

```sql
-- Each should complete in < 200ms
EXPLAIN ANALYZE SELECT * FROM public.get_revenue_trends_daily(30);
EXPLAIN ANALYZE SELECT * FROM public.get_revenue_trends_weekly(12);
EXPLAIN ANALYZE SELECT * FROM public.get_revenue_trends_monthly(12);
EXPLAIN ANALYZE SELECT * FROM public.get_subject_teacher_distribution();
```

Expected results:
- Index scans used (not sequential scans)
- Execution time < 100ms for most queries
- Planning time < 10ms

## Troubleshooting Deployment

### Issue: Migration fails with syntax error

**Solution:**
1. Check SQL Editor for specific error line
2. Ensure all semicolons present
3. Verify PostgreSQL version compatibility
4. Check function parameter types match

### Issue: Functions not found in RPC

**Solution:**
1. Verify migration executed without errors
2. Check function names match exactly (case-sensitive)
3. Run `SELECT * FROM pg_proc WHERE proname LIKE '%dashboard%'`
4. Restart Supabase project if needed

### Issue: Permission denied on functions

**Solution:**
1. Verify GRANT statements executed
2. Check user has authenticated role
3. For admin functions, verify user has admin role:
   ```sql
   SELECT * FROM public.user_roles 
   WHERE user_id = auth.uid() AND role = 'admin';
   ```

### Issue: TypeScript compilation errors

**Solution:**
1. Verify types file updated correctly
2. Run `npm install` to update dependencies
3. Check for duplicate function names
4. Clear TypeScript cache: `rm -rf node_modules/.vite`

### Issue: Charts not displaying data

**Possible causes:**
- No completed sessions in database
- Education levels not set on student profiles
- Subject names don't match between tables

**Solutions:**
```sql
-- Check if data exists
SELECT COUNT(*) FROM sessions WHERE status = 'completed';
SELECT COUNT(DISTINCT education_level) FROM profiles WHERE education_level IS NOT NULL;
SELECT COUNT(DISTINCT subject_name) FROM subjects WHERE is_active = true;
```

### Issue: Admin functions return "Insufficient privileges"

**Solution:**
1. Verify user is logged in
2. Check user_roles table contains admin entry:
   ```sql
   SELECT user_id, role FROM user_roles 
   WHERE user_id = auth.uid();
   ```
3. If missing, add admin role:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES (auth.uid(), 'admin')
   ON CONFLICT DO NOTHING;
   ```

## Rollback Procedure

If issues occur and you need to revert:

```sql
-- Drop all admin-gated wrapper functions
DROP FUNCTION IF EXISTS public.get_student_demographics_admin();
DROP FUNCTION IF EXISTS public.get_revenue_trends_admin(text, integer);
DROP FUNCTION IF EXISTS public.get_subject_distribution_admin();

-- Drop base functions
DROP FUNCTION IF EXISTS public.get_revenue_trends_daily(integer);
DROP FUNCTION IF EXISTS public.get_revenue_trends_weekly(integer);
DROP FUNCTION IF EXISTS public.get_revenue_trends_monthly(integer);
DROP FUNCTION IF EXISTS public.get_subject_teacher_distribution();
DROP FUNCTION IF EXISTS public.get_teachers_by_subject(text);
DROP FUNCTION IF EXISTS public.get_platform_performance_insights();

-- Drop views
DROP VIEW IF EXISTS public.student_demographics_by_level;
DROP VIEW IF EXISTS public.student_demographics_by_category;

-- Drop indexes
DROP INDEX IF EXISTS public.idx_profiles_education_level_created;
DROP INDEX IF EXISTS public.idx_profiles_education_sub_category;
DROP INDEX IF EXISTS public.idx_sessions_completed_created;
DROP INDEX IF EXISTS public.idx_teacher_profiles_subjects;
```

## Production Deployment

### Before going to production:

1. **Backup database**
   ```bash
   supabase db pull  # Saves current state
   ```

2. **Test in staging**
   - Deploy to staging environment first
   - Run full validation
   - Load test with expected data volume

3. **Monitor performance**
   - Check database CPU usage
   - Monitor query latency
   - Watch index hit rates

4. **Gradual rollout**
   - Enable for 10% of admin users first
   - Monitor for errors
   - Gradually roll out to 100%

### Production configuration:

```typescript
// In AdminPlatformInsights.tsx - consider adding for production
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Could implement caching:
const [lastFetch, setLastFetch] = useState(Date.now());
const [skipFetch, setSkipFetch] = useState(false);

useEffect(() => {
  if (Date.now() - lastFetch < CACHE_DURATION) {
    setSkipFetch(true);
  }
}, [lastFetch]);
```

## Performance Optimization

### Database-level:
- Indexes already optimized
- Partial indexes on frequently filtered values
- Aggregation done at database level

### Application-level:
- Recharts handles data rendering efficiently
- React hooks manage state properly
- Lazy loading for additional metrics

### Monitoring:
```sql
-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%revenue%' OR query LIKE '%demographic%' 
ORDER BY mean_time DESC;
```

## Post-Deployment Monitoring

### Daily checks:
1. No error logs related to analytics
2. Page loads within expected time
3. Charts render without issues

### Weekly checks:
1. Performance metrics stable
2. User feedback positive
3. No data inconsistencies

### Monthly reviews:
1. Adjust indexes if needed
2. Review slow query logs
3. Consider new metrics or views

## Files Changed

### Created:
- `supabase/migrations/20260228000001_platform_performance_insights.sql` (600+ lines)
- `src/hooks/usePlatformAnalytics.ts` (100+ lines)
- `src/pages/admin/AdminPlatformInsights.tsx` (450+ lines)
- `docs/PLATFORM_PERFORMANCE_INSIGHTS.md` (comprehensive guide)
- `docs/PLATFORM_PERFORMANCE_INSIGHTS_DEPLOYMENT.md` (this file)

### Modified:
- `src/integrations/supabase/types.ts` (added function signatures)

## Success Criteria

Deployment is successful when:

✅ All database functions execute without errors  
✅ React component loads on admin dashboard  
✅ All visualizations display correctly  
✅ Charts render with real data  
✅ Period switching works for revenue trends  
✅ Tab switching works for subject distribution  
✅ Admin permission checks working  
✅ Mobile responsive layout functional  
✅ TypeScript compilation passes  
✅ Linting passes without warnings  

## Support & Troubleshooting

For issues during deployment:

1. Check relevant error in browser console
2. Review deployment guide sections above
3. Check Supabase logs for RPC errors
4. Verify database migration in SQL Editor
5. Test individual functions manually
6. Check permission/RLS settings

## Timeline

- **Preparation**: 10 minutes (review migration)
- **Deployment**: 5 minutes (execute migration)
- **Verification**: 15 minutes (run checks)
- **Testing**: 20 minutes (manual testing)
- **Integration**: 10 minutes (add routing)

**Total**: ~60 minutes for full deployment

## Next Steps

After successful deployment:

1. Update admin menu to include new page
2. Add to admin documentation
3. Train admins on using new insights page
4. Set up monitoring/alerts
5. Plan for future enhancements

---

**Created**: February 28, 2026
**Version**: 1.0
**Last Updated**: February 28, 2026
