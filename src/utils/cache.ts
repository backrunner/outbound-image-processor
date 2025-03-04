import { ImageProcessingParams } from '../types/image';

/**
 * Generate a cache key for the image
 */
export const generateCacheKey = (key: string, params: ImageProcessingParams): string => {
  // Sort params to ensure consistent cache keys
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  return `img:${key}${sortedParams ? `?${sortedParams}` : ''}`;
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
