# Education-Level Based Personalization Feature

## Overview

This feature segments the entire user experience by education level to improve content relevance and teacher-student matching. Users must specify their education level during sign-up, and all subsequent interactions (subject selection, teacher search, dashboard filters) are filtered accordingly.

## Architecture

### Database Schema

#### New Tables
- **education_levels**: Reference table with three levels (Basic, Secondary, Tertiary)
- **education_sub_categories**: Reference table with five Tertiary sub-categories (Nursing, Midwifery, Health College, Teacher Training College, Universities)

#### Modified Tables
- **profiles**: Added `education_level` (TEXT, nullable) and `education_sub_category` (TEXT, nullable)
- **teacher_profiles**: Added `education_level` (TEXT, nullable) and `education_sub_category` (TEXT, nullable)
- **subjects**: Added `education_level` (TEXT, nullable) and `education_sub_category` (TEXT, nullable) for filtering

### Education Levels

1. **Basic**: Primary/Basic Education (JHS)
2. **Secondary**: Secondary Education (SHS)
3. **Tertiary**: Higher Education with conditional sub-categories

### Tertiary Sub-Categories
- Nursing
- Midwifery
- Health College
- Teacher Training College
- Universities

## Feature Implementation

### 1. Sign-Up Flow (AuthModal)

**Location**: `src/components/auth/AuthModal.tsx`

**Changes**:
- Added mandatory "Education Level" dropdown with three options
- Added conditional "Field of Study/Teaching" dropdown for Tertiary level
- Both fields are required for registration
- Education level data stored in `profiles` table via Supabase auth user metadata

**Form Flow**:
1. Basic/Secondary/Tertiary selection
2. If Tertiary selected: field of study/teaching selection appears
3. Rest of signup form (email, password, etc.)

### 2. Teacher Onboarding (TeacherOnboardingModal)

**Location**: `src/components/auth/TeacherOnboardingModal.tsx`

**Changes**:
- Added Step 1: Education Level selection (previously had 5 steps, now 6)
- Step 4 (Subjects): Now dynamically filtered based on education level
- Subjects fetched from database using `useSubjectsByEducationLevel` hook
- Education level and sub-category stored in both `teacher_profiles` and `profiles` tables

**Step Progression**:
1. Education Level selection (+ Field for Tertiary)
2. About You (Bio)
3. Experience & Qualifications
4. Subjects (filtered by education level)
5. Languages & Location
6. Achievements & Rates

### 3. Hooks & Data Fetching

#### useEducationLevel.ts
- `useEducationLevels()`: Fetches all education levels from reference table
- `useEducationSubCategories()`: Fetches all sub-categories for Tertiary level

#### useSubjectsByEducationLevel.ts
- `useSubjectsByEducationLevel(educationLevel, educationSubCategory)`: Fetches subjects filtered by education level and optionally sub-category
- `useAllSubjects()`: Fetches all subjects without level filtering (for backward compatibility)

#### useTeachersByEducationLevel.ts
- `useTeachersByEducationLevel(educationLevel, educationSubCategory, subject)`: Fetches teachers filtered by education level
- `useAllTeachers(subject)`: Fetches verified teachers without education level filtering

#### useDashboardByEducationLevel.ts
- `useDashboardSessionsByEducationLevel()`: Fetches sessions where teacher's education level matches student's
- `useDashboardContentByEducationLevel()`: Fetches course materials filtered by student's education level

### 4. AuthContext Updates

**Location**: `src/contexts/AuthContext.tsx`

**Changes**:
- Updated `Profile` interface to include `education_level` and `education_sub_category`
- Updated `signUp()` method to accept and store education level data
- Real-time profile sync includes education level fields
- Updated `fetchUserData()` to include education level fields when loading profile

## Usage Examples

### In a Component

```tsx
import { useAuth } from "@/contexts/AuthContext";
import { useSubjectsByEducationLevel } from "@/hooks/useSubjectsByEducationLevel";

export function MyComponent() {
  const { profile } = useAuth();
  const { subjects, loading } = useSubjectsByEducationLevel(
    profile?.education_level,
    profile?.education_sub_category
  );

  return (
    <div>
      <p>Your Level: {profile?.education_level}</p>
      {profile?.education_level === "Tertiary" && (
        <p>Your Field: {profile?.education_sub_category}</p>
      )}
      
      <select>
        {subjects.map(subject => (
          <option key={subject.id} value={subject.name}>
            {subject.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Teacher Search (Filtered)

```tsx
import { useTeachersByEducationLevel } from "@/hooks/useTeachersByEducationLevel";
import { useAuth } from "@/contexts/AuthContext";

export function TeacherSearch() {
  const { profile } = useAuth();
  const { teachers, loading } = useTeachersByEducationLevel(
    profile?.education_level,
    profile?.education_sub_category
  );

  return (
    <div>
      {teachers.map(teacher => (
        <TeacherCard key={teacher.user_id} teacher={teacher} />
      ))}
    </div>
  );
}
```

### Dashboard (Filtered)

```tsx
import { useDashboardSessionsByEducationLevel } from "@/hooks/useDashboardByEducationLevel";

export function StudentDashboard() {
  const { sessions, loading } = useDashboardSessionsByEducationLevel();

  return (
    <div>
      {sessions.map(session => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}
```

## Database Seeding

Education levels and sub-categories are seeded automatically via migration:

```sql
-- Basic
INSERT INTO public.education_levels (level_name, sort_order) VALUES ('Basic', 1);

-- Secondary
INSERT INTO public.education_levels (level_name, sort_order) VALUES ('Secondary', 2);

-- Tertiary
INSERT INTO public.education_levels (level_name, sort_order) VALUES ('Tertiary', 3);

-- Tertiary Sub-Categories
INSERT INTO public.education_sub_categories (category_name, sort_order) VALUES 
  ('Nursing', 1),
  ('Midwifery', 2),
  ('Health College', 3),
  ('Teacher Training College', 4),
  ('Universities', 5);
```

## Data Consistency Rules

1. **Sign-Up**: Education level is mandatory for all users
2. **Teacher Onboarding**: Education level must be selected before viewing/selecting subjects
3. **Tertiary Requirement**: If Tertiary level is selected, field of study is mandatory
4. **Profile Updates**: Education level changes should update in both `profiles` and `teacher_profiles` tables
5. **Subject Filtering**: Only subjects matching teacher's education level can be selected
6. **Teacher Search**: Students only see teachers at their education level

## Migration Details

**File**: `supabase/migrations/20260220000000_add_education_level.sql`

**Key Changes**:
- Adds `education_level` and `education_sub_category` columns to `profiles`, `teacher_profiles`, and `subjects`
- Creates lookup tables with proper RLS policies
- Seeds initial data
- Creates indexes for filtering performance

## Future Enhancements

1. **Course Materials**: Update course_materials table with education level filtering
2. **Search Improvements**: Add faceted filtering by subject within education level
3. **Analytics**: Track which education levels have the most activity
4. **Admin Dashboard**: Tools to manage education levels and map subjects to levels
5. **Tertiary Subject Mapping**: More granular subject filtering within tertiary sub-categories
6. **Profile Validation**: Ensure education level consistency across related records

## Testing Checklist

- [ ] Sign-up form shows education level and conditional field
- [ ] Teacher onboarding Step 1 allows education level selection
- [ ] Subjects in teacher onboarding Step 4 are filtered by education level
- [ ] Student dashboard filters sessions by teacher's education level
- [ ] Teacher search filters teachers by student's education level
- [ ] Tertiary sub-category selection is required for Tertiary level
- [ ] Education level is stored and retrieved correctly
- [ ] Real-time profile updates include education level
- [ ] Profile queries include education level fields
- [ ] Database indexes improve filtering performance

## Troubleshooting

**Issue**: Education level not showing in profile
- Check if `profiles` table has the columns (run migration)
- Verify auth metadata is being passed during signup
- Check AuthContext is updating profile correctly

**Issue**: Subjects not filtering by education level
- Verify `subjects` table has `education_level` column
- Check `useSubjectsByEducationLevel` is being passed correct education level
- Ensure subjects are marked with appropriate education level in database

**Issue**: Teacher search not filtering
- Verify `teacher_profiles` has `education_level` column
- Check student profile has education level set
- Ensure teachers have education level set during onboarding

## Admin Tasks

1. **Map Existing Subjects**: Update existing subjects in database with education levels
2. **Review Tertiary Subjects**: Ensure tertiary subjects are properly categorized
3. **Create New Subjects**: When adding subjects, always set appropriate education level
4. **Monitor Adoption**: Track which education levels have most activity

