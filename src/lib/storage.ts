import { SupabaseClient } from '@supabase/supabase-js';

// Simple in-memory cache for signed URLs to prevent waterfall requests and re-fetching
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Resolves a storage path (e.g. "couples/couple_id/file.jpg") to a signed URL if private,
 * or returns public/data URLs directly. Caches signed URLs for 1 hour.
 */
export async function resolveStorageUrl(
  supabase: SupabaseClient,
  imagePath: string | null | undefined,
  bucketName = 'couple-memories'
): Promise<string> {
  if (!imagePath) return '';

  // If already full HTTP URL or data URL
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    return imagePath;
  }

  // Check cache first
  const cached = signedUrlCache.get(imagePath);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(imagePath, 7200); // 2 hours validity

    if (error || !data?.signedUrl) {
      console.warn('[Storage] Failed to resolve signed URL:', imagePath, error?.message);
      return imagePath;
    }

    // Cache until 5 minutes before expiry
    signedUrlCache.set(imagePath, {
      url: data.signedUrl,
      expiresAt: now + (7200 - 300) * 1000,
    });

    return data.signedUrl;
  } catch (err) {
    console.error('[Storage] Error resolving storage URL:', err);
    return imagePath;
  }
}

/**
 * Batch resolves multiple storage paths in parallel using Promise.all
 */
export async function batchResolveStorageUrls<T extends { image_url: string }>(
  supabase: SupabaseClient,
  items: T[],
  bucketName = 'couple-memories'
): Promise<(T & { signed_url: string })[]> {
  if (!items || items.length === 0) return [];

  const resolved = await Promise.all(
    items.map(async (item) => {
      const url = await resolveStorageUrl(supabase, item.image_url, bucketName);
      return {
        ...item,
        signed_url: url,
      };
    })
  );

  return resolved;
}
