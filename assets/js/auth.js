// =========================================================
// MERCYLIFE TRAINING COLLEGE - AUTHENTICATION (SUPABASE ONLY)
// No demo default admin, no localStorage passwords, no role switcher bypass.
// =========================================================
import { supabase, dbService } from './supabase.js';
import { CONFIG } from './config.js';

/** @typedef {'administrator'|'principal'|'registrar'|'finance_officer'|'lecturer'|'librarian'|'reception'|'student'} AppRole */

/**
 * Map profile row + auth user into the shape the UI expects.
 */
function mapProfileToAppUser(authUser, profile) {
  if (!authUser) return null;
  const role = (profile?.role || authUser.user_metadata?.role || 'student').toLowerCase();
  return {
    id: authUser.id,
    email: authUser.email || profile?.email || '',
    full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email || 'User',
    role,
    title: profile?.title || authUser.user_metadata?.title || '',
    phone: profile?.phone || '',
    status: profile?.status || 'active',
    is_demo: false,
    avatar_url: profile?.avatar_url || null
  };
}

/**
 * Load profile from public.profiles for the signed-in auth user.
 */
async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[auth] profile fetch failed', error);
    throw new Error(error.message || 'Could not load user profile');
  }
  return data;
}

/**
 * Authenticate with Supabase Auth only.
 * Does not fall back to localStorage users or demo accounts.
 */
export async function authenticateUser(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error('Email and password are required.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });

  if (error || !data?.user) {
    throw new Error(error?.message || 'Invalid email or password.');
  }

  const profile = await fetchProfile(data.user.id);
  if (profile && profile.status === 'suspended') {
    await supabase.auth.signOut();
    throw new Error('This account has been suspended by the administrator.');
  }

  const userObj = mapProfileToAppUser(data.user, profile);
  if (!userObj) {
    throw new Error('Authentication succeeded but profile is missing. Contact the administrator.');
  }

  // Cache for synchronous UI helpers only — source of truth remains Supabase session
  try {
    localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_USER_CACHE, JSON.stringify(userObj));
  } catch (e) {}

  try {
    await dbService.logAudit('LOGIN', `User signed in (${userObj.email})`, userObj.id);
  } catch (e) {
    console.warn('[auth] audit log failed', e);
  }

  return userObj;
}

/**
 * Returns the current app user from Supabase session + profile.
 * NEVER returns a default administrator when logged out.
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error('[auth] getSession', sessionError);
    return null;
  }

  const session = sessionData?.session;
  if (!session?.user) {
    try {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_USER_CACHE);
    } catch (e) {}
    return null;
  }

  try {
    const profile = await fetchProfile(session.user.id);
    if (profile && profile.status === 'suspended') {
      await supabase.auth.signOut();
      return null;
    }
    const userObj = mapProfileToAppUser(session.user, profile);
    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_USER_CACHE, JSON.stringify(userObj));
    } catch (e) {}
    return userObj;
  } catch (e) {
    console.error('[auth] getCurrentUser', e);
    return null;
  }
}

/**
 * Synchronous cache read for non-critical UI (navbar label). Prefer getCurrentUser().
 */
export function getCachedUser() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_USER_CACHE);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export async function setCurrentUser(_user) {
  // Kept for compatibility; session is managed by Supabase Auth.
  const user = await getCurrentUser();
  return user;
}

export async function logout() {
  try {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_USER_CACHE);
  } catch (e) {}
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('[auth] signOut', e);
  }
  window.location.href = 'login.html';
}

/**
 * Page guard: requires a live Supabase session and optional role list.
 * Administrators and principals may access all modules unless restricted elsewhere.
 */
export async function enforcePageAccess(allowedRoles = []) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    const redirect = encodeURIComponent(window.location.pathname.split('/').pop() || 'dashboard.html');
    window.location.href = `login.html?redirect=${redirect}`;
    return false;
  }

  if (currentUser.role === 'administrator' || currentUser.role === 'principal') {
    return true;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    alert(
      `Access Restricted: Your role (${String(currentUser.role).replace(/_/g, ' ')}) cannot open this module.`
    );
    window.location.href = 'dashboard.html';
    return false;
  }

  return true;
}

/**
 * Create a real Supabase Auth user via Edge Function (service role server-side).
 * Browser never holds the service-role key.
 */
export async function createUserAccount(userData) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new Error('You must be signed in as an administrator to create users.');
  }

  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: {
      email: userData.email,
      password: userData.password,
      full_name: userData.full_name,
      role: userData.role,
      title: userData.title || '',
      phone: userData.phone || '',
      status: userData.status || 'active'
    }
  });

  if (error) {
    throw new Error(error.message || 'Failed to create user');
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return data?.user || data;
}

/**
 * Update profile fields / status via Edge Function (not localStorage).
 */
export async function updateUserAccount(userId, updateData) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new Error('You must be signed in as an administrator.');
  }

  const { data, error } = await supabase.functions.invoke('admin-update-user', {
    body: { user_id: userId, ...updateData }
  });

  if (error) {
    throw new Error(error.message || 'Failed to update user');
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return data;
}

/**
 * Soft-delete / deactivate via Edge Function.
 */
export async function deleteUserAccount(userId) {
  return updateUserAccount(userId, { status: 'suspended', deactivate: true });
}

/**
 * List staff/users from profiles (admin). Requires RLS allowing admin read.
 */
export async function getAllSystemUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, title, phone, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Could not load users');
  }
  return (data || []).map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    role: p.role,
    title: p.title,
    phone: p.phone,
    status: p.status || 'active',
    is_demo: false
  }));
}

/** @deprecated Demo mode removed from production auth */
export function isDemoUsersDisabled() {
  return true;
}

/** @deprecated */
export function setDemoUsersDisabled(_disabled) {
  /* no-op in production */
}

/** @deprecated Role switcher removed — returns false */
export function switchRole(_roleKey) {
  console.warn('[auth] switchRole is disabled in production');
}

export function getCustomUsers() {
  return [];
}
