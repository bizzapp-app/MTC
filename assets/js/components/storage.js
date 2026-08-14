// =========================================================
// SUPABASE STORAGE HELPERS — fail closed (no fake success URLs)
// =========================================================
import { supabase } from '../supabase.js';

/**
 * Upload a file to a Storage bucket.
 * @returns {{ path: string, publicUrl: string }}
 * @throws on any failure
 */
export async function uploadFile(bucket, path, file, options = {}) {
  if (!bucket || !path || !file) {
    throw new Error('bucket, path, and file are required');
  }

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: options.upsert ?? false,
    contentType: file.type || options.contentType || undefined
  });

  if (error) {
    console.error('[storage] upload failed', error);
    throw new Error(error.message || 'Upload failed');
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
  if (!pub?.publicUrl) {
    throw new Error('Upload succeeded but public URL could not be resolved');
  }

  return { path: data.path, publicUrl: pub.publicUrl };
}
