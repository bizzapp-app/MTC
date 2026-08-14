-- =========================================================
-- MERCYLIFE TRAINING COLLEGE MANAGEMENT SYSTEM
-- SUPABASE POSTGRESQL DATABASE SCHEMA & SEED DATA
-- Owned by Mercylite Hospital
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------
-- 1. ENUMS & TYPE DEFINITIONS
-- ---------------------------------------------------------
CREATE TYPE user_role AS ENUM (
    'administrator',
    'principal',
    'registrar',
    'finance_officer',
    'lecturer',
    'librarian',
    'reception',
    'student'
);

CREATE TYPE student_status AS ENUM ('active', 'inactive', 'suspended', 'deferred', 'graduated', 'discontinued');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE exam_type AS ENUM ('cat', 'midterm', 'final', 'practical');
CREATE TYPE payment_method AS ENUM ('cash', 'bank', 'cheque', 'mpesa');
CREATE TYPE invoice_status AS ENUM ('unpaid', 'partially_paid', 'paid', 'overdue');
CREATE TYPE book_borrow_status AS ENUM ('borrowed', 'returned', 'overdue', 'lost');
CREATE TYPE attachment_status AS ENUM ('assigned', 'in_progress', 'completed', 'evaluated');

-- ---------------------------------------------------------
-- 2. USERS & PROFILES TABLE (Syncs with Supabase auth.users)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    phone TEXT,
    avatar_url TEXT,
    national_id TEXT,
    gender TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 3. ACADEMIC YEARS & SEMESTERS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year_code TEXT UNIQUE NOT NULL, -- e.g. '2025/2026'
    current_semester TEXT NOT NULL DEFAULT 'Semester 1', -- 'Semester 1', 'Semester 2', 'Semester 3'
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 4. INTAKES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.intakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- 'January 2026', 'May 2026', 'September 2026'
    academic_year_id UUID REFERENCES public.academic_years(id),
    status TEXT DEFAULT 'open', -- 'open', 'closed'
    start_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 5. COURSES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- e.g. 'DCM-101', 'DNS-202'
    name TEXT NOT NULL, -- e.g. 'Diploma in Clinical Medicine & Surgery'
    department TEXT NOT NULL, -- 'Clinical Medicine', 'Nursing', 'Health Records', 'Community Health', 'Laboratory Sciences'
    duration_months INT NOT NULL DEFAULT 36,
    fees_per_semester NUMERIC(12,2) NOT NULL,
    description TEXT,
    requirements TEXT, -- e.g. 'KCSE Mean Grade C Plain, C in Biology and Chemistry'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 6. UNITS / MODULES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- e.g. 'ANA-101'
    name TEXT NOT NULL, -- e.g. 'Human Anatomy & Physiology'
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    semester TEXT NOT NULL, -- 'Semester 1', etc.
    credit_hours INT DEFAULT 45,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 7. STAFF MANAGEMENT
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    staff_no TEXT UNIQUE NOT NULL, -- e.g. 'MTC/ST/001'
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    role user_role NOT NULL,
    department TEXT NOT NULL,
    qualification TEXT, -- 'MSc Nursing', 'MBChB', 'PhD Public Health'
    employment_status TEXT DEFAULT 'full_time', -- 'full_time', 'part_time', 'contract'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 8. STUDENTS TABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admission_no TEXT UNIQUE NOT NULL, -- e.g. 'MTC/2026/0101'
    full_name TEXT NOT NULL,
    gender TEXT NOT NULL,
    dob DATE,
    national_id TEXT UNIQUE,
    phone TEXT,
    email TEXT UNIQUE NOT NULL,
    guardian_name TEXT,
    guardian_phone TEXT,
    emergency_contact TEXT,
    address TEXT,
    county TEXT, -- e.g. 'Nairobi', 'Kiambu', 'Machakos', 'Nakuru'
    nationality TEXT DEFAULT 'Kenyan',
    religion TEXT,
    medical_conditions TEXT DEFAULT 'None',
    course_id UUID REFERENCES public.courses(id),
    current_semester TEXT DEFAULT 'Semester 1',
    academic_year_id UUID REFERENCES public.academic_years(id),
    intake_id UUID REFERENCES public.intakes(id),
    status student_status DEFAULT 'active',
    passport_photo_url TEXT,
    kcse_grade TEXT, -- e.g. 'C+'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 9. STUDENT DOCUMENTS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- 'KCSE Certificate', 'Birth Certificate', 'National ID', 'Passport Photo', 'Medical Report'
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 10. CLASSES & TIMETABLE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    lecturer_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    room_name TEXT NOT NULL, -- e.g. 'Lecture Hall A', 'Anatomy Lab 2', 'Skills Lab 1'
    day_of_week TEXT NOT NULL, -- 'Monday', 'Tuesday', etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INT DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 11. ATTENDANCE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status attendance_status NOT NULL DEFAULT 'present',
    remarks TEXT,
    recorded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 12. EXAMINATIONS & RESULTS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    title TEXT NOT NULL, -- e.g. 'Anatomy CAT 1', 'Midterm Practical Exam'
    exam_type exam_type NOT NULL DEFAULT 'cat',
    max_marks INT NOT NULL DEFAULT 100,
    exam_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exam_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    marks_obtained NUMERIC(5,2) NOT NULL,
    grade TEXT, -- 'A', 'B', 'C', 'D', 'F'
    remarks TEXT, -- 'Distinction', 'Credit', 'Pass', 'Fail'
    is_published BOOLEAN DEFAULT FALSE,
    recorded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_student_exam UNIQUE (exam_id, student_id)
);

-- ---------------------------------------------------------
-- 13. FINANCE (INVOICES, PAYMENTS, BALANCES)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_no TEXT UNIQUE NOT NULL, -- e.g. 'INV-2026-001'
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    paid_amount NUMERIC(12,2) DEFAULT 0.00,
    balance NUMERIC(12,2) NOT NULL,
    due_date DATE NOT NULL,
    description TEXT NOT NULL, -- 'Semester 1 Tuition & Clinical Lab Fees'
    status invoice_status DEFAULT 'unpaid',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fee_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_no TEXT UNIQUE NOT NULL, -- e.g. 'RCP-2026-9081'
    invoice_id UUID REFERENCES public.fee_invoices(id) ON DELETE SET NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    amount_paid NUMERIC(12,2) NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'mpesa',
    reference_code TEXT NOT NULL, -- M-Pesa Code (e.g. QJK9128X) or Bank Ref
    payment_date DATE DEFAULT CURRENT_DATE,
    received_by TEXT DEFAULT 'Finance Office',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 14. CLINICAL ATTACHMENTS (MERCYLITE HOSPITAL & PARTNERS)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinical_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    hospital_name TEXT NOT NULL DEFAULT 'Mercylite Hospital',
    department TEXT NOT NULL, -- 'Emergency', 'Surgical Ward', 'Pediatrics', 'Outpatient', 'Maternity', 'ICU'
    supervisor_name TEXT NOT NULL,
    supervisor_phone TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    required_hours INT DEFAULT 300,
    completed_hours INT DEFAULT 0,
    status attachment_status DEFAULT 'assigned',
    assessment_score NUMERIC(5,2),
    logbook_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 15. LIBRARY MANAGEMENT
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.library_books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    isbn TEXT UNIQUE,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Clinical Medicine', 'Nursing', 'Anatomy', 'Pharmacology'
    quantity INT NOT NULL DEFAULT 1,
    available_quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.library_borrows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES public.library_books(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    borrow_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    fine_amount NUMERIC(10,2) DEFAULT 0.00,
    status book_borrow_status DEFAULT 'borrowed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 16. ANNOUNCEMENTS & MESSAGING
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'General', -- 'Academic', 'Clinical', 'Finance', 'Events'
    target_role TEXT DEFAULT 'all', -- 'all', 'student', 'lecturer'
    created_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 17. ASSIGNMENTS & DOWNLOADS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    deadline TIMESTAMPTZ NOT NULL,
    max_marks INT DEFAULT 100,
    created_by UUID REFERENCES public.staff(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    submission_notes TEXT,
    file_url TEXT,
    marks_obtained NUMERIC(5,2),
    feedback TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'Academic Calendar', 'Timetable', 'Admission Prospectus', 'School Rules'
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 18. ALUMNI RECORDS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alumni (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    graduation_date DATE NOT NULL,
    certificate_no TEXT UNIQUE NOT NULL,
    current_employer TEXT,
    job_title TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 19. AUDIT LOGS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT NOT NULL,
    action TEXT NOT NULL, -- 'LOGIN', 'CREATE_STUDENT', 'RECORD_PAYMENT', 'UPDATE_MARKS'
    details TEXT,
    ip_address TEXT DEFAULT '127.0.0.1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 20. ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS
-- ---------------------------------------------------------
-- Enable RLS on core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Open public policies REMOVED. Apply schema_secure_rls.sql after this file.
-- Minimal grants: authenticated only (RLS applied in schema_secure_rls.sql)
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;
-- anon: no table access by default
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;


-- ---------------------------------------------------------
-- 21. SEED DATA FOR MERCYLIFE TRAINING COLLEGE
-- ---------------------------------------------------------

-- Academic Year
INSERT INTO public.academic_years (year_code, current_semester, is_active)
VALUES ('2026/2027', 'Semester 1', true)
ON CONFLICT DO NOTHING;

-- Courses
INSERT INTO public.courses (code, name, department, duration_months, fees_per_semester, description, requirements) VALUES
('DCM-101', 'Diploma in Clinical Medicine & Surgery', 'Clinical Medicine', 36, 65000.00, 'Trains clinical officers in diagnostic, therapeutic, and surgical procedures.', 'KCSE Mean Grade C Plain with C in Biology, Chemistry and English'),
('DNS-201', 'Diploma in Kenya Registered Community Health Nursing', 'Nursing', 36, 60000.00, 'Comprehensive nursing program preparing registered nurses for healthcare delivery.', 'KCSE Mean Grade C Plain with C in Biology and Chemistry'),
('DCH-301', 'Diploma in Community Health & Development', 'Community Health', 24, 45000.00, 'Focuses on preventative healthcare, epidemiology, and public health management.', 'KCSE Mean Grade C- (Minus)'),
('HMT-401', 'Certificate in Health Records & Information Technology', 'Health Records', 18, 38000.00, 'Medical data management, health statistics, and electronic health record systems.', 'KCSE Mean Grade D+'),
('MLT-501', 'Diploma in Medical Laboratory Technology', 'Laboratory Sciences', 36, 62000.00, 'Diagnostic laboratory procedures, hematology, microbiology, and clinical chemistry.', 'KCSE Mean Grade C Plain with C in Chemistry and Biology')
ON CONFLICT DO NOTHING;

-- Books
INSERT INTO public.library_books (isbn, title, author, category, quantity, available_quantity) VALUES
('978-0702077005', 'Davidson Clinical Medicine 24th Ed', 'Ian Penman', 'Clinical Medicine', 15, 12),
('978-0199682577', 'Oxford Handbook of Clinical Medicine', 'Ian Wilkinson', 'Clinical Medicine', 20, 18),
('978-0323551496', 'Brunner & Suddarth Textbook of Medical-Surgical Nursing', 'Janice Hinkle', 'Nursing', 12, 9),
('978-0443069529', 'Ross & Wilson Anatomy and Physiology in Health and Illness', 'Anne Waugh', 'Anatomy', 25, 20),
('978-0702074967', 'Rang & Dale Pharmacology 9th Ed', 'James Ritter', 'Pharmacology', 10, 8)
ON CONFLICT DO NOTHING;
