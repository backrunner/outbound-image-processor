import { validateImage } from './modules/image-validator';
import { parseImageParams } from './types/image';
import { generateCacheKey, getCachedImage, cacheImage, removeCachedImage } from './utils/cache';
import { getCorsHeaders } from './utils/cors';
import { processImage } from './utils/image';
import { getBestExtendedFormat } from './utils/jsquash';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			// Handle OPTIONS request
			if (request.method === 'OPTIONS') {
				return new Response(null, {
					headers: getCorsHeaders(request.headers.get('Origin'), env.TRUSTED_HOSTS),
				});
			}

			// Get image key from URL
			const url = new URL(request.url);
			const key = url.pathname.slice(1);

			if (!key) {
				return new Response('Not Found', {
					status: 404,
					headers: getCorsHeaders(request.headers.get('Origin'), env.TRUSTED_HOSTS)
				});
			}

			// Handle DELETE request - remove all cache for the specified key
			if (request.method === 'DELETE') {
				// Check if the request has proper authorization
				const authHeader = request.headers.get('Authorization');
				if (!authHeader || !env.API_KEY || authHeader !== `Bearer ${env.API_KEY}`) {
					return new Response('Unauthorized', {
						status: 401,
						headers: getCorsHeaders(request.headers.get('Origin'), env.TRUSTED_HOSTS)
					});
				}

				// Remove any existing cache for this key
				await removeCachedImage(caches.default, key, undefined, env.CACHE_DOMAIN);

				return new Response('Cache cleared successfully', {
					status: 200,
					headers: getCorsHeaders(request.headers.get('Origin'), env.TRUSTED_HOSTS)
				});
			}

			// Only allow GET requests for retrieving images
			if (request.method !== 'GET') {
				return new Response('Method Not Allowed', {
					status: 405,
					headers: {
						...getCorsHeaders(request.headers.get('Origin'), env.TRUSTED_HOSTS),
						'Allow': 'GET, DELETE, OPTIONS'
					}
				});
			}

			// Parse image processing parameters
			const params = parseImageParams(url.searchParams, env);

			// Get image from R2
			const object = await env.IMAGE_SOURCE.get(key);

			if (!object) {
				// Remove any existing cache for this key
				ctx.waitUntil(removeCachedImage(caches.default, key, undefined, env.CACHE_DOMAIN));

				return new Response('Not Found', {
					status: 404,
					headers: getCorsHeaders(request.headers.get('Origin'), env.TRUSTED_HOSTS)
				});
			}

			// Get image bytes
			const bytes = new Uint8Array(await object.arrayBuffer());

			// Validate image size and dimensions
			const validationResult = await validateImage(bytes, env);

			if (!validationResult.valid || validationResult.resized) {
				const errorMessage = validationResult.error || 'Image dimensions exceed the maximum allowed limits';
				return new Response(errorMessage, {
					status: 400,
					headers: getCorsHeaders(request.headers.get('Origin'), env.TRUSTED_HOSTS)
				});
			}

			// Extract object metadata for cache validation
			const objectMetadata = {
				etag: object.httpEtag,
				uploaded: object.uploaded
			};

			// Generate cache key with validation result and object metadata
			const cacheKey = generateCacheKey(key, params, validationResult, objectMetadata, env.CACHE_DOMAIN);

			// Try to get from cache first
			const cachedResponse = await getCachedImage(caches.default, cacheKey);
			if (cachedResponse) {
				const headers = getCorsHeaders(request.headers.get('Origin'), env.TRUSTED_HOSTS);
				cachedResponse.headers.forEach((value, key) => {
					if (key !== 'Access-Control-Allow-Origin') {
						headers.set(key, value);
					}
				});
				return new Response(cachedResponse.body, { headers });
			}

			// If we get here, either there was no cache or the object has been modified
			// Check if there's an old cache entry without the metadata
			const oldCacheKey = generateCacheKey(key, params, validationResult, undefined, env.CACHE_DOMAIN);
			const oldCachedResponse = await getCachedImage(caches.default, oldCacheKey);
			if (oldCachedResponse) {
				// Object has been modified, remove old cache
				ctx.waitUntil(removeCachedImage(caches.default, key, params, env.CACHE_DOMAIN));
			}

			// Get the best format based on Accept header
			const accept = request.headers.get('Accept') || '';
			const targetFormat = getBestExtendedFormat(accept);

			// Process image normally
			const { bytes: outputBytes, contentType } = await processImage(bytes, targetFormat, params);

			// Create response with appropriate headers
			const headers = getCorsHeaders(request.headers.get('Origin'), env.TRUSTED_HOSTS);
			headers.set('Content-Type', contentType);
			headers.set('Cache-Control', `public, max-age=${env.CACHE_MAX_AGE || 31536000}`);

			// Add image dimensions to response headers
			if (validationResult.width && validationResult.height) {
				headers.set('X-Image-Width', String(validationResult.width));
				headers.set('X-Image-Height', String(validationResult.height));
			}

			const response = new Response(outputBytes, { headers });

			// Cache the response
			ctx.waitUntil(cacheImage(caches.default, cacheKey, response, env.CACHE_MAX_AGE));

			return response;
		} catch (error) {
			console.error('Error processing image:', error);
			return new Response('Internal Server Error', {
				status: 500,
				headers: getCorsHeaders(request.headers.get('Origin'), env.TRUSTED_HOSTS),
			});
		}
	},
} satisfies ExportedHandler<Env>;
