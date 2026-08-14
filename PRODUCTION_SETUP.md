# Mercylife ERP — Production setup

## 1. Environment

Copy `.env.example` to `.env.local` for local development (or configure the same variables in Vercel):

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_ALLOW_MOCK_READ=false
```

Never put `SUPABASE_SERVICE_ROLE_KEY` in Vite or browser code.

## 2. Database

1. Run `schema.sql` in Supabase SQL Editor (if not already applied).
2. Run `schema_secure_rls.sql` to replace open policies and enable role-based RLS.

## 3. Bootstrap the first administrator

In Supabase **Authentication → Users**, create:

- Email: `admin@mercylifecollege.ac.ke` (or your choice)
- Password: strong password

Then in SQL Editor:

```sql
INSERT INTO public.profiles (id, email, full_name, role, title, status)
VALUES (
  '<auth-user-uuid>',
  'admin@mercylifecollege.ac.ke',
  'System Administrator',
  'administrator',
  'Chief System Administrator',
  'active'
)
ON CONFLICT (id) DO UPDATE
SET role = 'administrator', status = 'active';
```

## 4. Edge Functions

Deploy from project root (Supabase CLI):

```bash
supabase functions deploy admin-create-user
supabase functions deploy admin-update-user
```

Service role is injected automatically by Supabase for functions.

## 5. App

```bash
npm install
npm run dev
# or
npm run build && npm run preview
```

Sign in as the bootstrap admin → **Settings → User accounts** → create staff/students.  
Those accounts are real Auth users and work on any device.

## 6. What was removed for production

- Default “logged in as administrator” without credentials
- Demo role switcher
- localStorage password directory
- Silent mock success when Supabase writes fail
- Fake Unsplash URL on upload failure
- Example Supabase URL/key fallback
