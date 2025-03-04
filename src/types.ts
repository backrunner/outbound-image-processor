interface Env {
  /**
   * R2 bucket for storing images
   */
  IMAGE_SOURCE: R2Bucket;

  /**
   * Trusted hosts for CORS
   */
  TRUESTED_HOSTS: string[];
}
