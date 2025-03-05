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
}
