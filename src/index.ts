import { processImage, getContentType } from './utils/image-processor';
import { parseImageParams } from './types/image';
import { generateCacheKey, getCachedImage, cacheImage } from './utils/cache';
import { getCorsHeaders } from './utils/cors';
import { getBestExtendedFormat } from './utils/jsquash';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			// Handle OPTIONS request
			if (request.method === 'OPTIONS') {
				return new Response(null, {
					headers: getCorsHeaders(request.headers.get('Origin'), env.TRUESTED_HOSTS),
				});
			}

			// Get image key from URL
			const url = new URL(request.url);
			const key = url.pathname.slice(1);

			if (!key) {
				return new Response('Not Found', { status: 404 });
			}

			// Parse image processing parameters
			const params = parseImageParams(url.searchParams, env);

			// Generate cache key
			const cacheKey = generateCacheKey(key, params);

			// Try to get from cache first
			const cachedResponse = await getCachedImage(caches.default, cacheKey);
			if (cachedResponse) {
				const headers = getCorsHeaders(request.headers.get('Origin'), env.TRUESTED_HOSTS);
				cachedResponse.headers.forEach((value, key) => {
					if (key !== 'Access-Control-Allow-Origin') {
						headers.set(key, value);
					}
				});
				return new Response(cachedResponse.body, { headers });
			}

			// Get image from R2
			const object = await env.IMAGE_SOURCE.get(key);

			if (!object) {
				return new Response('Not Found', { status: 404 });
			}

			// Get the best format based on Accept header
			const accept = request.headers.get('Accept') || '';
			const targetFormat = getBestExtendedFormat(accept);

			// Get image bytes
			const bytes = new Uint8Array(await object.arrayBuffer());

			// Process image
			const { bytes: processedBytes, contentType } = await processImage(bytes, targetFormat, params);

			// Create response with appropriate headers
			const headers = getCorsHeaders(request.headers.get('Origin'), env.TRUESTED_HOSTS);
			headers.set('Content-Type', contentType);
			headers.set('Cache-Control', `public, max-age=${env.CACHE_MAX_AGE || 31536000}`);

			const response = new Response(processedBytes, { headers });

			// Cache the response
			ctx.waitUntil(cacheImage(caches.default, cacheKey, response, env.CACHE_MAX_AGE));

			return response;
		} catch (error) {
			console.error('Error processing image:', error);
			return new Response('Internal Server Error', {
				status: 500,
				headers: getCorsHeaders(request.headers.get('Origin'), env.TRUESTED_HOSTS),
			});
		}
	},
} satisfies ExportedHandler<Env>;
