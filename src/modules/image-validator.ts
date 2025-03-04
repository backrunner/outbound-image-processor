import { bytesToImageData } from '../utils/jsquash';
import { bytesToPhotonImage } from '../utils/image';

/**
 * Default limits
 */
const DEFAULT_MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_MAX_WIDTH = 4096;
const DEFAULT_MAX_HEIGHT = 4096;
const DEFAULT_RESIZE_OVERSIZED = true;

/**
 * Interface for image validation result
 */
export interface ImageValidationResult {
  valid: boolean;
  width?: number;
  height?: number;
  size: number;
  error?: string;
  resized?: boolean;
  inputBytes?: Uint8Array;
}

/**
 * Check if the input bytes represent a valid image
 */
export const isValidImageBytes = (bytes: Uint8Array): boolean => {
  if (!bytes || bytes.length < 8) {
    return false;
  }

  // Check for JPEG signature (SOI marker)
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
    return true;
  }

  // Check for PNG signature
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0D &&
    bytes[5] === 0x0A &&
    bytes[6] === 0x1A &&
    bytes[7] === 0x0A
  ) {
    return true;
  }

  // Check for WebP signature (RIFF....WEBP)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes.length >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }

  // Check for AVIF signature (RIFF....avif)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes.length >= 12 &&
    bytes[8] === 0x61 &&
    bytes[9] === 0x76 &&
    bytes[10] === 0x69 &&
    bytes[11] === 0x66
  ) {
    return true;
  }

  // Check for GIF signature (GIF87a or GIF89a)
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return true;
  }

  // Check for JPEG 2000 signature (JP2)
  if (
    bytes[0] === 0x00 &&
    bytes[1] === 0x00 &&
    bytes[2] === 0x00 &&
    bytes[3] === 0x0C &&
    bytes[4] === 0x6A &&
    bytes[5] === 0x50 &&
    bytes[6] === 0x20 &&
    bytes[7] === 0x20
  ) {
    return true;
  }

  // Check for JPEG XL signature
  if (
    (bytes[0] === 0xFF && bytes[1] === 0x0A) ||
    (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x00 && bytes[3] === 0x0C &&
     bytes[4] === 0x4A && bytes[5] === 0x58 && bytes[6] === 0x4C && bytes[7] === 0x20)
  ) {
    return true;
  }

  // Check for BMP signature
  if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
    return true;
  }

  // Check for TIFF signature (Intel)
  if (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2A && bytes[3] === 0x00) {
    return true;
  }

  // Check for TIFF signature (Motorola)
  if (bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x00 && bytes[3] === 0x2A) {
    return true;
  }

  return false;
};

/**
 * Validate image size and dimensions
 */
export const validateImage = async (
  inputBytes: Uint8Array,
  env: Env
): Promise<ImageValidationResult> => {
  // First check if the bytes represent a valid image format
  if (!isValidImageBytes(inputBytes)) {
    return {
      valid: false,
      size: inputBytes.length,
      error: 'Invalid image format or corrupted image data'
    };
  }

  // Check file size
  const maxSize = env.MAX_IMAGE_SIZE || DEFAULT_MAX_IMAGE_SIZE;
  if (inputBytes.length > maxSize) {
    return {
      valid: false,
      size: inputBytes.length,
      error: `Image size exceeds the maximum allowed size of ${maxSize / (1024 * 1024)}MB`
    };
  }

  try {
    // Try to get dimensions using jsquash first (supports more formats)
    const imageData = await bytesToImageData(inputBytes);
    const width = imageData.width;
    const height = imageData.height;

    // Check dimensions
    const maxWidth = env.MAX_IMAGE_WIDTH || DEFAULT_MAX_WIDTH;
    const maxHeight = env.MAX_IMAGE_HEIGHT || DEFAULT_MAX_HEIGHT;
    const resizeOversized = env.RESIZE_OVERSIZED_IMAGES !== undefined
      ? env.RESIZE_OVERSIZED_IMAGES
      : DEFAULT_RESIZE_OVERSIZED;

    if (width > maxWidth || height > maxHeight) {
      if (resizeOversized) {
        // Return validation result with dimensions, but mark as needing resize
        return {
          valid: true,
          width,
          height,
          size: inputBytes.length,
          resized: true,
          inputBytes
        };
      } else {
        return {
          valid: false,
          width,
          height,
          size: inputBytes.length,
          error: `Image dimensions (${width}x${height}) exceed the maximum allowed (${maxWidth}x${maxHeight})`
        };
      }
    }

    // Image is valid
    return {
      valid: true,
      width,
      height,
      size: inputBytes.length,
      inputBytes
    };
  } catch (error) {
    // If jsquash fails, try with photon
    try {
      const photonImage = bytesToPhotonImage(inputBytes);
      const width = photonImage.get_width();
      const height = photonImage.get_height();

      // Check dimensions
      const maxWidth = env.MAX_IMAGE_WIDTH || DEFAULT_MAX_WIDTH;
      const maxHeight = env.MAX_IMAGE_HEIGHT || DEFAULT_MAX_HEIGHT;
      const resizeOversized = env.RESIZE_OVERSIZED_IMAGES !== undefined
        ? env.RESIZE_OVERSIZED_IMAGES
        : DEFAULT_RESIZE_OVERSIZED;

      if (width > maxWidth || height > maxHeight) {
        if (resizeOversized) {
          // Free memory before returning
          const result = {
            valid: true,
            width,
            height,
            size: inputBytes.length,
            resized: true,
            inputBytes
          };
          photonImage.free();
          return result;
        } else {
          // Free memory before returning
          const result = {
            valid: false,
            width,
            height,
            size: inputBytes.length,
            error: `Image dimensions (${width}x${height}) exceed the maximum allowed (${maxWidth}x${maxHeight})`
          };
          photonImage.free();
          return result;
        }
      }

      // Image is valid
      const result = {
        valid: true,
        width,
        height,
        size: inputBytes.length,
        inputBytes
      };
      photonImage.free();
      return result;
    } catch (photonError) {
      // Both methods failed
      return {
        valid: false,
        size: inputBytes.length,
        error: `Failed to determine image dimensions: ${error}`
      };
    }
  }
};
