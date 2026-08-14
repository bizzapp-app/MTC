# MTC ERP — Project Audit & Fix Report

## Scope
Audited the uploaded repository recursively, including HTML pages, JavaScript modules, Supabase Edge Functions, SQL schemas, Vite/TypeScript configuration, package metadata, and local asset references.

## Checks completed
- All local HTML `href`/`src` references checked: no missing local targets found.
- All browser JavaScript files passed `node --check`.
- All Supabase table names referenced by the browser code exist in `schema.sql`.
- Environment-variable references reviewed.
- Supabase RLS and finance RPC reviewed for production-impacting authorization issues.
- Edge-function source reviewed.
- Package/build configuration reviewed.

## Changes made

### 1. Added `.env.example`
The production documentation referenced `.env.example`, but the repository did not contain one. Added a safe template containing:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ALLOW_MOCK_READ=false`

No real credentials were added.

### 2. Added `.gitignore`
The repository had no `.gitignore`. Added protection for `.env`, `.env.local`, other local environment files, `node_modules`, and build output so Supabase credentials are less likely to be committed accidentally.

### 3. Fixed Messaging/Announcements database mismatch
The UI was sending an `author` property to `announcements`, while the database column is `created_by`. This would cause Supabase inserts to fail.
- Fixed writes to use `created_by`.
- Fixed display to use `created_at` and `created_by`.

### 4. Fixed Library availability field mismatch
The database column is `available_quantity`, but the UI read `available`. This caused availability to display incorrectly.
- Fixed the UI to use `available_quantity`.

### 5. Fixed Attendance save button
The Attendance page previously displayed a success message without saving anything to Supabase.
- The save action now collects each student's selected status and remarks.
- It sends the records through `dbService.markAttendance()`.
- It uses the signed-in user's ID as `recorded_by`.
- Errors are reported instead of showing false success.

### 6. Hardened administrator role changes in `admin-update-user`
The Edge Function allowed a principal to modify a user's role to `administrator`, creating a privilege-escalation path.
- Principals can no longer create/modify administrator accounts through this function.
- Target profiles are verified before modification.
- Requested roles are validated against the application's allowed role list.

## Intentionally NOT changed
The request was to change only errors or issues that can prevent the application from working. Therefore I did not redesign UI, replace the application's architecture, or add unrelated features.

Some modules remain intentionally thin/incomplete in the supplied source (for example, some assignment/library actions are UI placeholders). Those are functional-scope gaps rather than safe bug fixes, so they were not silently redesigned.

## Build verification limitation
A full `npm run build` could not be executed in this audit environment because the repository dependencies were not available locally and package installation could not complete within the execution environment. Offline installation also failed because the required packages were not cached.

The following verification therefore was completed without the dependency install:
- JavaScript syntax validation: PASS
- Local HTML asset/reference validation: PASS
- Supabase table-reference/schema comparison: PASS

Before deployment, run:

```bash
npm install
npm run build
```

and deploy the Supabase SQL/Edge Functions described in `PRODUCTION_SETUP.md`.

## Production prerequisites outside the ZIP
The application still requires:
1. Supabase project URL and anon/publishable key in Vercel environment variables.
2. `schema.sql` followed by `schema_secure_rls.sql`.
3. Deployed `admin-create-user` and `admin-update-user` Edge Functions.
4. A bootstrap administrator profile.
5. Required Supabase Storage buckets/RLS for document uploads.
6. A live Supabase smoke test.
