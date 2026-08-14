# Mercylife ERP — honest production status (post-hardening)

## Fixed in this pass

1. **RLS completeness** — policies added for units, academic_years, intakes, student_documents, classes, exams, messages, assignments, assignment_submissions, downloads, alumni, staff (see end of `schema_secure_rls.sql`).
2. **Atomic finance payments** — `record_fee_payment()` SECURITY DEFINER RPC; client `dbService.recordPayment` calls RPC only (no split insert/update).
3. **Demo UI removed** from `settings.html`; demo toggle handlers neutralized.
4. **`.env` removed** from package; `.gitignore` ignores `.env`.
5. **dbService expanded** — units, exams, messages, assignments, submissions, documents, alumni, downloads, academic years, borrow/return.

## Still required on your side

- Run `schema.sql` then **full** `schema_secure_rls.sql` on Supabase.
- Deploy Edge Functions `admin-create-user` and `admin-update-user`.
- Bootstrap one admin Auth user + profiles row.
- Set `VITE_SUPABASE_*` in `.env` (never commit).
- `npm install && npm run build` on your machine.
- Create Storage buckets + Storage RLS for documents.
- Smoke-test: login → create user → fresh browser login → student → invoice → payment.

## Not claimed without your live project

- Build PASS (must run locally)
- Live RLS penetration test PASS
- Full UI parity for every thin module with production data
