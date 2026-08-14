// =========================================================
// MERCYLIFE TRAINING COLLEGE - CONFIGURATION & CONSTANTS
// Production: credentials from Vite env only (no example fallback).
// =========================================================

export const CONFIG = {
  COLLEGE_NAME: "Mercylife Training College",
  OWNER: "Mercylite Hospital",
  MOTO: "Excellence in Medical Training & Healthcare Innovation",
  EMAIL: "info@mercylifecollege.ac.ke",
  PHONE: "+254 712 345 678",
  LOCATION: "Mercylite Medical Complex, Kiambu Road, Kenya",
  WEBSITE: "https://mercylifecollege.ac.ke",

  /** localStorage key *names* only — never store secrets here */
  STORAGE_KEYS: {
    CURRENT_USER_CACHE: "mercylife_current_user_cache",
    THEME_MODE: "mercylife_theme_mode",
    SCHOOL_INFO: "mercylife_school_info"
  },

  CURRENT_ACADEMIC_YEAR: "2026/2027",
  CURRENT_SEMESTER: "Semester 1",

  /** When true, dbService may read demo seed data if Supabase is empty (DEV ONLY). Writes never silently succeed on mock. */
  ALLOW_MOCK_READ_FALLBACK:
    String(import.meta.env?.VITE_ALLOW_MOCK_READ || "").toLowerCase() === "true",

  GRADING_SCALE: [
    { grade: "A", min: 75, max: 100, gpa: 4.0, remark: "Distinction" },
    { grade: "B", min: 65, max: 74, gpa: 3.0, remark: "Credit" },
    { grade: "C", min: 50, max: 64, gpa: 2.0, remark: "Pass" },
    { grade: "D", min: 40, max: 49, gpa: 1.0, remark: "Subsidiary Pass" },
    { grade: "F", min: 0, max: 39, gpa: 0.0, remark: "Fail" }
  ]
};

/**
 * Supabase browser credentials.
 * Set in .env / Vercel:
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ...
 * Service role must NEVER appear here.
 */
export function getSupabaseCredentials() {
  const url = (import.meta.env?.VITE_SUPABASE_URL || "").trim();
  const anonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY || "").trim();

  if (!url || !anonKey) {
    console.error(
      "[config] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Configure environment variables."
    );
  }

  return { url, anonKey };
}

export function getSchoolInfo() {
  const defaultInfo = {
    name: CONFIG.COLLEGE_NAME,
    owner: CONFIG.OWNER,
    tagline: CONFIG.MOTO,
    email: CONFIG.EMAIL,
    phone: CONFIG.PHONE,
    address: CONFIG.LOCATION,
    poBox: "P.O. Box 12345-00100, Nairobi",
    website: CONFIG.WEBSITE,
    principal: "Prof. Catherine Muthoni",
    principalTitle: "College Principal & Chief Executive",
    registrar: "Dr. Samuel Maina",
    examBoard: "Nursing Council of Kenya / TVETA",
    currency: "KSh",
    logoUrl: ""
  };

  try {
    const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.SCHOOL_INFO);
    if (stored) {
      return { ...defaultInfo, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn("[config] school info parse failed", e);
  }
  return defaultInfo;
}

export function saveSchoolInfo(info) {
  localStorage.setItem(CONFIG.STORAGE_KEYS.SCHOOL_INFO, JSON.stringify(info));
}
