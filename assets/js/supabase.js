// =========================================================
// MERCYLIFE — Supabase client + production dbService
// Authoritative backend only. Writes never fake-succeed.
// =========================================================
import { createClient } from '@supabase/supabase-js';
import { getSupabaseCredentials } from './config.js';

const { url, anonKey } = getSupabaseCredentials();

export const supabase = createClient(
  url || 'https://invalid.local',
  anonKey || 'invalid',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

function assertOk(error, context) {
  if (error) {
    console.error(`[dbService] ${context}`, error);
    throw new Error(error.message || context);
  }
}

function genCode(prefix) {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${t}${r}`;
}

export const dbService = {
  // ---------- Students ----------
  async getStudents() {
    const { data, error } = await supabase
      .from('students')
      .select('*, courses(id, code, name)')
      .order('created_at', { ascending: false });
    assertOk(error, 'getStudents');
    return (data || []).map((s) => ({
      ...s,
      course_name: s.courses?.name || s.course_name || '',
      course_code: s.courses?.code || ''
    }));
  },

  async addStudent(studentData) {
    const payload = { ...studentData };
    delete payload.id;
    delete payload.course_name;
    delete payload.course_code;
    delete payload.courses;
    if (!payload.admission_no) {
      payload.admission_no = genCode('MTC');
    }
    const { data, error } = await supabase.from('students').insert([payload]).select().single();
    assertOk(error, 'addStudent');
    await this.logAudit('CREATE_STUDENT', `Created student ${data.admission_no} ${data.full_name}`);
    return data;
  },

  async updateStudent(id, patch) {
    const payload = { ...patch, updated_at: new Date().toISOString() };
    delete payload.id;
    delete payload.courses;
    delete payload.course_name;
    delete payload.course_code;
    const { data, error } = await supabase
      .from('students')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    assertOk(error, 'updateStudent');
    await this.logAudit('UPDATE_STUDENT', `Updated student ${id}`);
    return data;
  },

  // ---------- Courses ----------
  async getCourses() {
    const { data, error } = await supabase.from('courses').select('*').order('code');
    assertOk(error, 'getCourses');
    return data || [];
  },

  async addCourse(courseData) {
    const payload = { ...courseData };
    delete payload.id;
    const { data, error } = await supabase.from('courses').insert([payload]).select().single();
    assertOk(error, 'addCourse');
    await this.logAudit('CREATE_COURSE', `Created course ${data.code}`);
    return data;
  },

  async updateCourse(id, patch) {
    const payload = { ...patch };
    delete payload.id;
    const { data, error } = await supabase.from('courses').update(payload).eq('id', id).select().single();
    assertOk(error, 'updateCourse');
    return data;
  },

  // ---------- Finance ----------
  async getInvoices() {
    const { data, error } = await supabase
      .from('fee_invoices')
      .select('*, students(id, full_name, admission_no)')
      .order('created_at', { ascending: false });
    assertOk(error, 'getInvoices');
    return (data || []).map((inv) => ({
      ...inv,
      student_name: inv.students?.full_name || inv.student_name || '',
      admission_no: inv.students?.admission_no || ''
    }));
  },

  async addInvoice(invoiceData) {
    const amount = Number(invoiceData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Invoice amount must be a positive number');
    }
    const payload = {
      invoice_no: invoiceData.invoice_no || genCode('INV'),
      student_id: invoiceData.student_id,
      amount,
      paid_amount: Number(invoiceData.paid_amount || 0),
      balance: Number(invoiceData.balance != null ? invoiceData.balance : amount),
      due_date: invoiceData.due_date,
      description: invoiceData.description || 'Tuition fees',
      status: invoiceData.status || 'unpaid'
    };
    const { data, error } = await supabase.from('fee_invoices').insert([payload]).select().single();
    assertOk(error, 'addInvoice');
    await this.logAudit('CREATE_INVOICE', `Invoice ${data.invoice_no} amount ${data.amount}`);
    return data;
  },

  async getPayments() {
    const { data, error } = await supabase
      .from('fee_payments')
      .select('*, students(id, full_name, admission_no)')
      .order('payment_date', { ascending: false });
    assertOk(error, 'getPayments');
    return (data || []).map((p) => ({
      ...p,
      student_name: p.students?.full_name || p.student_name || ''
    }));
  },

  async recordPayment(paymentData) {
    const amountPaid = Number(paymentData.amount_paid);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      throw new Error('Payment amount must be a positive number');
    }
    if (!paymentData.reference_code || !String(paymentData.reference_code).trim()) {
      throw new Error('Payment reference is required');
    }
    if (!paymentData.student_id) {
      throw new Error('Student is required');
    }

    // Atomic DB function: insert payment + update invoice in one transaction
    const { data, error } = await supabase.rpc('record_fee_payment', {
      p_student_id: paymentData.student_id,
      p_amount_paid: amountPaid,
      p_payment_method: paymentData.payment_method || 'mpesa',
      p_reference_code: String(paymentData.reference_code).trim(),
      p_invoice_id: paymentData.invoice_id || null,
      p_notes: paymentData.notes || null,
      p_received_by: paymentData.received_by || 'Finance Office',
      p_payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0]
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('DUPLICATE_REFERENCE')) throw new Error('A payment with this reference already exists');
      if (msg.includes('FORBIDDEN')) throw new Error('You are not authorized to record payments');
      if (msg.includes('INVALID_AMOUNT')) throw new Error('Invalid payment amount');
      if (msg.includes('INVOICE_NOT_FOUND')) throw new Error('Invoice not found');
      if (msg.includes('INVOICE_STUDENT_MISMATCH')) throw new Error('Invoice does not belong to this student');
      assertOk(error, 'recordPayment');
    }

    return {
      id: data?.id,
      receipt_no: data?.receipt_no,
      amount_paid: data?.amount_paid ?? amountPaid,
      reference_code: data?.reference_code,
      invoice_id: data?.invoice_id,
      student_id: data?.student_id,
      payment_method: paymentData.payment_method || 'mpesa',
      payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
      notes: paymentData.notes || null
    };
  },

  // ---------- Clinical ----------
  async getClinicalAttachments() {
    const { data, error } = await supabase
      .from('clinical_attachments')
      .select('*, students(full_name, admission_no)')
      .order('start_date', { ascending: false });
    assertOk(error, 'getClinicalAttachments');
    return (data || []).map((c) => ({
      ...c,
      student_name: c.students?.full_name || c.student_name || ''
    }));
  },

  async addClinicalAttachment(row) {
    const payload = { ...row };
    delete payload.id;
    delete payload.student_name;
    delete payload.students;
    const { data, error } = await supabase.from('clinical_attachments').insert([payload]).select().single();
    assertOk(error, 'addClinicalAttachment');
    return data;
  },

  // ---------- Results ----------
  async getExamResults() {
    const { data, error } = await supabase
      .from('exam_results')
      .select('*, students(full_name, admission_no), exams(id, title, unit_id)')
      .order('created_at', { ascending: false });
    assertOk(error, 'getExamResults');
    return data || [];
  },

  async addExamResult(resultData) {
    const payload = { ...resultData };
    delete payload.id;
    delete payload.student_name;
    const { data, error } = await supabase.from('exam_results').insert([payload]).select().single();
    assertOk(error, 'addExamResult');
    await this.logAudit('UPDATE_MARKS', `Result for student ${payload.student_id}`);
    return data;
  },

  // ---------- Attendance ----------
  async getAttendance() {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    assertOk(error, 'getAttendance');
    return data || [];
  },

  async markAttendance(records) {
    const rows = (records || []).map((r) => {
      const copy = { ...r };
      delete copy.id;
      return copy;
    });
    if (!rows.length) return [];
    const { data, error } = await supabase.from('attendance').insert(rows).select();
    assertOk(error, 'markAttendance');
    await this.logAudit('MARK_ATTENDANCE', `Recorded ${rows.length} attendance row(s)`);
    return data || [];
  },

  // ---------- Library ----------
  async getBooks() {
    const { data, error } = await supabase.from('library_books').select('*').order('title');
    assertOk(error, 'getBooks');
    return data || [];
  },

  async addBook(book) {
    const payload = { ...book };
    delete payload.id;
    const { data, error } = await supabase.from('library_books').insert([payload]).select().single();
    assertOk(error, 'addBook');
    return data;
  },

  async getBorrows() {
    const { data, error } = await supabase
      .from('library_borrows')
      .select('*, library_books(title), students(full_name, admission_no)')
      .order('borrowed_at', { ascending: false });
    assertOk(error, 'getBorrows');
    return data || [];
  },

  // ---------- Announcements ----------
  async getAnnouncements() {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    assertOk(error, 'getAnnouncements');
    return data || [];
  },

  async addAnnouncement(announcementData) {
    const payload = { ...announcementData };
    delete payload.id;
    const { data, error } = await supabase.from('announcements').insert([payload]).select().single();
    assertOk(error, 'addAnnouncement');
    await this.logAudit('CREATE_ANNOUNCEMENT', payload.title || 'Announcement');
    return data;
  },

  // ---------- Staff ----------
  async getStaff() {
    const { data, error } = await supabase.from('staff').select('*').order('full_name');
    assertOk(error, 'getStaff');
    return data || [];
  },

  // ---------- Dashboard counts ----------
  async getDashboardStats() {
    const [students, courses, invoices, payments] = await Promise.all([
      this.getStudents().catch(() => []),
      this.getCourses().catch(() => []),
      this.getInvoices().catch(() => []),
      this.getPayments().catch(() => [])
    ]);
    const outstanding = (invoices || []).reduce((s, i) => s + Number(i.balance || 0), 0);
    const collected = (payments || []).reduce((s, p) => s + Number(p.amount_paid || 0), 0);
    return {
      studentCount: students.length,
      courseCount: courses.length,
      outstandingFees: outstanding,
      collectedFees: collected,
      activeStudents: students.filter((s) => s.status === 'active').length
    };
  },

  // ---------- Audit ----------

  async getUnits(courseId = null) {
    let q = supabase.from('units').select('*').order('code');
    if (courseId) q = q.eq('course_id', courseId);
    const { data, error } = await q;
    assertOk(error, 'getUnits');
    return data || [];
  },

  async addUnit(unit) {
    const payload = { ...unit };
    delete payload.id;
    const { data, error } = await supabase.from('units').insert([payload]).select().single();
    assertOk(error, 'addUnit');
    return data;
  },

  async getExams() {
    const { data, error } = await supabase.from('exams').select('*, units(code, name)').order('created_at', { ascending: false });
    assertOk(error, 'getExams');
    return data || [];
  },

  async addExam(exam) {
    const payload = { ...exam };
    delete payload.id;
    const { data, error } = await supabase.from('exams').insert([payload]).select().single();
    assertOk(error, 'addExam');
    return data;
  },

  async getMessages() {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (!uid) return [];
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: false });
    assertOk(error, 'getMessages');
    return data || [];
  },

  async sendMessage(msg) {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (!uid) throw new Error('Not signed in');
    const payload = {
      sender_id: uid,
      receiver_id: msg.receiver_id,
      subject: msg.subject,
      body: msg.body,
      is_read: false
    };
    const { data, error } = await supabase.from('messages').insert([payload]).select().single();
    assertOk(error, 'sendMessage');
    return data;
  },

  async getAssignments() {
    const { data, error } = await supabase.from('assignments').select('*').order('deadline', { ascending: true });
    assertOk(error, 'getAssignments');
    return data || [];
  },

  async addAssignment(row) {
    const payload = { ...row };
    delete payload.id;
    const { data, error } = await supabase.from('assignments').insert([payload]).select().single();
    assertOk(error, 'addAssignment');
    return data;
  },

  async getAssignmentSubmissions(assignmentId = null) {
    let q = supabase.from('assignment_submissions').select('*, students(full_name, admission_no)');
    if (assignmentId) q = q.eq('assignment_id', assignmentId);
    const { data, error } = await q;
    assertOk(error, 'getAssignmentSubmissions');
    return data || [];
  },

  async getStudentDocuments(studentId) {
    const { data, error } = await supabase
      .from('student_documents')
      .select('*')
      .eq('student_id', studentId)
      .order('uploaded_at', { ascending: false });
    assertOk(error, 'getStudentDocuments');
    return data || [];
  },

  async addStudentDocument(doc) {
    const payload = { ...doc };
    delete payload.id;
    const { data, error } = await supabase.from('student_documents').insert([payload]).select().single();
    assertOk(error, 'addStudentDocument');
    return data;
  },

  async getAlumni() {
    const { data, error } = await supabase
      .from('alumni')
      .select('*, students(full_name, admission_no)')
      .order('graduation_date', { ascending: false });
    assertOk(error, 'getAlumni');
    return data || [];
  },

  async getDownloads() {
    const { data, error } = await supabase.from('downloads').select('*').order('uploaded_at', { ascending: false });
    assertOk(error, 'getDownloads');
    return data || [];
  },

  async getAcademicYears() {
    const { data, error } = await supabase.from('academic_years').select('*').order('year_code', { ascending: false });
    assertOk(error, 'getAcademicYears');
    return data || [];
  },

  async returnBook(borrowId) {
    const { data, error } = await supabase
      .from('library_borrows')
      .update({ status: 'returned', returned_at: new Date().toISOString() })
      .eq('id', borrowId)
      .select()
      .single();
    assertOk(error, 'returnBook');
    return data;
  },

  async borrowBook(row) {
    const payload = { ...row, status: row.status || 'borrowed' };
    delete payload.id;
    const { data, error } = await supabase.from('library_borrows').insert([payload]).select().single();
    assertOk(error, 'borrowBook');
    return data;
  },

  async getAuditLogs() {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    assertOk(error, 'getAuditLogs');
    return data || [];
  },

  async logAudit(action, details) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData?.session?.user?.email || 'unknown';
      const { error } = await supabase.from('audit_logs').insert([
        {
          user_email: email,
          action,
          details: details || ''
        }
      ]);
      if (error) console.error('[dbService] logAudit', error);
    } catch (e) {
      console.error('[dbService] logAudit', e);
    }
  }
};
