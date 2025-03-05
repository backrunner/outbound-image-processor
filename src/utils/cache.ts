import { ImageProcessingParams } from '../types/image';
import { ImageValidationResult } from '../modules/image-validator';

// Default cache domain if not specified in environment variables
const DEFAULT_CACHE_DOMAIN = 'image-cache.workers.dev';

/**
 * Generate a cache key for the image
 */
export const generateCacheKey = (
  key: string,
  params: ImageProcessingParams,
  validationResult?: ImageValidationResult,
  objectMetadata?: { etag?: string; uploaded?: Date },
  cacheDomain?: string
): string => {
  // Sort params to ensure consistent cache keys
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => {
      // Handle special cases like crop object
      if (k === 'crop' && typeof v === 'object') {
        return `${k}=${v.x},${v.y},${v.width},${v.height}`;
      }
      return `${k}=${v}`;
    })
    .join('&');

  // Add image dimensions to cache key if available
  let dimensionsParam = '';
  if (validationResult?.width && validationResult?.height) {
    dimensionsParam = `&_w=${validationResult.width}&_h=${validationResult.height}`;
  }

  // Add object metadata to cache key if available
  let metadataParam = '';
  if (objectMetadata?.etag) {
    metadataParam += `&_etag=${encodeURIComponent(objectMetadata.etag)}`;
  }
  if (objectMetadata?.uploaded) {
    metadataParam += `&_ts=${objectMetadata.uploaded.getTime()}`;
  }

  // Create a fully-qualified URL for the cache key
  const domain = cacheDomain || DEFAULT_CACHE_DOMAIN;
  const queryParams = sortedParams || dimensionsParam || metadataParam
    ? `?${sortedParams}${dimensionsParam}${metadataParam}`
    : '';

  return `https://${domain}/${key}${queryParams}`;
};

/**
 * Get cached image response
 */
export const getCachedImage = async (
  cache: Cache,
  cacheKey: string
): Promise<Response | null> => {
  const response = await cache.match(cacheKey);
  return response || null;
};

/**
 * Cache image response
 */
export const cacheImage = async (
  cache: Cache,
  cacheKey: string,
  response: Response,
  maxAge: number = 31536000 // Default to 1 year
): Promise<void> => {
  // Clone the response before caching
  const clonedResponse = response.clone();

  // Set cache headers
  const headers = new Headers(clonedResponse.headers);
  headers.set('Cache-Control', `public, max-age=${maxAge}`);

  // Create new response with updated headers
  const cachedResponse = new Response(clonedResponse.body, {
    status: clonedResponse.status,
    statusText: clonedResponse.statusText,
    headers,
  });

  await cache.put(cacheKey, cachedResponse);
};

/**
 * Remove cached image
 */
export const removeCachedImage = async (
  cache: Cache,
  key: string,
  params?: ImageProcessingParams,
  cacheDomain?: string
): Promise<void> => {
  // If we have specific params, try to remove that specific cache entry
  if (params) {
    const cacheKey = generateCacheKey(key, params, undefined, undefined, cacheDomain);
    await cache.delete(cacheKey);
    return;
  }

  // Otherwise, we need to delete all cache entries that start with this key
  // Since Cloudflare Workers Cache API doesn't support wildcard deletion,
  // we can only delete the default version of the image
  const domain = cacheDomain || DEFAULT_CACHE_DOMAIN;
  const cacheKey = `https://${domain}/${key}`;
  await cache.delete(cacheKey);
};
