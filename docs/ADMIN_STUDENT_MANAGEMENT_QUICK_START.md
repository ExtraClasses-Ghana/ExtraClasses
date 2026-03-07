# Admin Student Management - Quick Start & Routing Guide

## 🚀 Quick Start (5 minutes)

### 1. Deploy Database Migration

```bash
# In your project root
cd c:\Users\owusu\Downloads\ExtraClass\ExtraClasses

# Push migration to Supabase
supabase db push

# Verify functions exist
supabase db show
```

### 2. Add Route to Admin Navigation

**Find your admin routing file** (likely one of these):
- `src/App.tsx`
- `src/pages/admin/index.tsx`
- `src/routes/admin.tsx`
- `src/components/admin/AdminLayout.tsx`

**Add this import** at the top:
```typescript
import AdminStudentsManagement from "@/pages/admin/AdminStudentsManagement";
```

**Add this route** in your admin routes:
```typescript
{
  path: "/admin/students",
  element: <ProtectedRoute><AdminStudentsManagement /></ProtectedRoute>
}

// Or if using nested admin routes
{
  path: "students",
  element: <AdminStudentsManagement />
}
```

### 3. Add Menu Link

Find your admin navigation menu (usually in `AdminDashboardLayout` or similar) and add:

```typescript
import { Users } from "lucide-react";

// In your navigation items array
{
  href: "/admin/students",
  label: "Student Management",
  icon: <Users className="w-4 h-4" />,
  // Optional:
  description: "Manage and monitor student accounts"
}
```

### 4. Run Your Dev Server

```bash
npm run dev
```

Navigate to `http://localhost:5173/#/admin/students`

---

## 📋 Finding Your Routing Configuration

### Method 1: Search for existing admin routes

```bash
grep -r "AdminDashboard\|AdminAnalytics" src/
```

This shows you the pattern used in your project.

### Method 2: Look in App.tsx

Open `src/App.tsx` and search for:
```typescript
path: "/admin"
path: "admin"
element: <Admin
```

### Method 3: Check admin components

Look in `src/pages/admin/` directory structure - most projects have:
- `AdminDashboard.tsx` ← See how this is routed
- `AdminLayout.tsx` ← Often wraps all admin pages
- Route definitions nearby

---

## 🎯 Common Routing Patterns

### Pattern 1: Flat Routes (Most Common)

```typescript
// In App.tsx or main route config
const adminRoutes = [
  { path: "/admin/dashboard", element: <AdminDashboard /> },
  { path: "/admin/teachers", element: <AdminTeachers /> },
  { path: "/admin/students", element: <AdminStudentsManagement /> }, // ADD THIS
];
```

### Pattern 2: Nested Admin Routes

```typescript
// In App.tsx
{
  path: "/admin",
  element: <AdminLayout />,
  children: [
    { path: "dashboard", element: <AdminDashboard /> },
    { path: "teachers", element: <AdminTeachers /> },
    { path: "students", element: <AdminStudentsManagement /> }, // ADD THIS
  ]
}
```

### Pattern 3: Using React Router's Route component

```typescript
// In App.tsx or routes file
<Route path="/admin/students" element={
  <ProtectedRoute requiredRole="admin">
    <AdminStudentsManagement />
  </ProtectedRoute>
} />
```

### Pattern 4: With lazy loading

```typescript
import { lazy } from "react";

const AdminStudentsManagement = lazy(() => 
  import("@/pages/admin/AdminStudentsManagement")
);

// Then reference without .tsx
{
  path: "/admin/students",
  element: <AdminStudentsManagement />
}
```

---

## 🔍 Step-by-Step Route Finding

### For TypeScript/React Router Projects:

1. **Open `src/App.tsx`**
   ```bash
   code src/App.tsx
   ```

2. **Look for patterns like**:
   - `<Route path=`
   - `<Routes>`
   - `element={<`
   - `children: [`

3. **Find existing admin route**:
   - Search for `AdminDashboard` or `AdminLayout`
   - Copy the pattern used for that route

4. **Add your new route using same pattern**

### For Next.js Projects:

If using Next.js:
1. Routes are file-based in `app/admin/` or `pages/admin/`
2. Create: `app/admin/students/page.tsx`
3. Content:
```typescript
import AdminStudentsManagement from "@/pages/admin/AdminStudentsManagement";

export default function Page() {
  return <AdminStudentsManagement />;
}
```

---

## 🧭 Adding Navigation Menu Link

### Default (Mantine/shadcn Menu):

```typescript
const adminMenuItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: <BarChart3 className="w-4 h-4" />
  },
  {
    href: "/admin/students", // ADD THIS
    label: "Student Management",
    icon: <Users className="w-4 h-4" />
  },
  // ... other items
];
```

### If using navigation config file:

Find: `src/config/navigation.ts` or `src/lib/navigation.ts`

Add to admin section:
```typescript
{
  id: "admin-students",
  title: "Student Management",
  href: "/admin/students",
  icon: "users",
  requiresAdmin: true
}
```

---

## ✅ Verification Checklist

After adding the route:

- [ ] Import statement added at top
- [ ] Route added to admin routes array
- [ ] Menu link added to navigation
- [ ] No TypeScript errors: `npm run build`
- [ ] Dev server runs: `npm run dev`
- [ ] Can navigate to: `http://localhost:5173/#/admin/students`
- [ ] Page loads (shows "Loading students..." initially)
- [ ] Student list appears after loading

---

## 🐛 Troubleshooting Routing

### 404 Not Found

**Fix**: Ensure route path exactly matches navigation href
```typescript
// Route and href must match exactly
{ path: "/admin/students", element: <...> }
{ href: "/admin/students", label: "..." }
```

### Component not loading

**Fix**: Check import path is correct
```typescript
// Should be exactly:
import AdminStudentsManagement from "@/pages/admin/AdminStudentsManagement";

// NOT:
import AdminStudentsManagement from "@/pages/admin"; // ❌ wrong
```

### "Cannot find module"

**Fix**: Verify file exists at correct location
```bash
ls -la src/pages/admin/AdminStudentsManagement.tsx
```

Should return the file, not "No such file"

### Route not appearing in menu

**Fix**: Ensure menu link is in the correct array
```typescript
// Must be in the ADMIN menu array, not main menu
const adminNavigation = [ // ✅ correct
  { href: "/admin/students", ... }
];

// NOT in main nav
const mainNavigation = [ // ❌ wrong place
  { href: "/admin/students", ... }
];
```

### "Insufficient privileges" error

**Fix**: User needs admin role
```sql
-- In Supabase SQL editor
INSERT INTO public.user_roles (user_id, role)
VALUES (auth.uid(), 'admin');
```

---

## 📂 File Locations Reference

| File | Purpose |
|------|---------|
| `src/pages/admin/AdminStudentsManagement.tsx` | Main component |
| `src/hooks/useStudentActions.ts` | React hooks |
| `supabase/migrations/20260228000002_*.sql` | Database migration |
| `src/integrations/supabase/types.ts` | TypeScript types |

---

## 🚀 After Deployment

1. **Deploy database**:
   ```bash
   supabase db push
   ```

2. **Add route** (follow patterns above)

3. **Start dev server**:
   ```bash
   npm run dev
   ```

4. **Test the feature**:
   - Navigate to `/admin/students`
   - See student list
   - Try suspend/block/delete actions
   - Confirm changes appear immediately

5. **Deploy to production**:
   ```bash
   npm run build
   # Deploy built files to your hosting
   ```

---

## 💡 Tips

- **No students showing?** Verify students exist: 
  ```sql
  SELECT COUNT(*) FROM public.user_roles WHERE role = 'student';
  ```

- **Loading forever?** Check browser console (F12) for errors

- **Want to test without real students?** Insert test data:
  ```sql
  -- See ADMIN_STUDENT_MANAGEMENT.md for test data scripts
  ```

---

**Version**: 1.0 | **Updated**: February 28, 2026
