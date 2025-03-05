interface Env {
  /**
   * R2 bucket for storing images
   */
  IMAGE_SOURCE: R2Bucket;

  /**
   * Trusted hosts for CORS
   */
  TRUSTED_HOSTS: string[];

  /**
   * Domain to use for cache keys
   * Default: image-cache.workers.dev
   */
  CACHE_DOMAIN?: string;

  /**
   * API key for authenticated operations like cache deletion
   */
  API_KEY?: string;

  /**
   * Maximum age for cached images in seconds
   * Default: 31536000 (1 year)
   */
  CACHE_MAX_AGE?: number;
}
