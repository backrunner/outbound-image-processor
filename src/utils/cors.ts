/**
 * Check if the origin is allowed
 */
export const isAllowedOrigin = (origin: string | null, trustedHosts: string[]): boolean => {
  if (!origin) return false;
  return trustedHosts.some(host => origin.endsWith(host));
};

/**
 * Get CORS headers
 */
export const getCorsHeaders = (origin: string | null, trustedHosts: string[]): Headers => {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  });

  if (origin && isAllowedOrigin(origin, trustedHosts)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  return headers;
};
