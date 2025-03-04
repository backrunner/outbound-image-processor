import { PhotonImage, resize, rotate, adjust_brightness, adjust_contrast, grayscale, crop, SamplingFilter } from '@cf-wasm/photon';
import { ImageProcessingParams } from '../types/image';

/**
 * Supported image formats
 */
export type ImageFormat = 'webp' | 'jpeg' | 'png';

/**
 * Convert image bytes to PhotonImage
 */
export const bytesToPhotonImage = (bytes: Uint8Array): PhotonImage => {
  return PhotonImage.new_from_byteslice(bytes);
};

/**
 * Get the best image format based on Accept header
 */
export const getBestImageFormat = (accept: string): ImageFormat => {
  const accepts = accept.toLowerCase();

  if (accepts.includes('image/webp')) {
    return 'webp';
  }

  if (accepts.includes('image/jpeg')) {
    return 'jpeg';
  }

  return 'png';
};

/**
 * Convert PhotonImage to specified format
 */
export const convertToFormat = (image: PhotonImage, format: ImageFormat, quality: number = 90): Uint8Array => {
  switch (format) {
    case 'webp':
      return image.get_bytes_webp();
    case 'jpeg':
      return image.get_bytes_jpeg(quality);
    case 'png':
    default:
      return image.get_bytes();
  }
};

/**
 * Get content type based on format
 */
export const getContentType = (format: ImageFormat): string => {
  return `image/${format}`;
};

/**
 * Apply image processing operations
 */
const applyImageOperations = (image: PhotonImage, params: ImageProcessingParams): PhotonImage => {
  let processedImage = image;

  // Resize
  if (params.width || params.height) {
    const width = params.width || image.get_width();
    const height = params.height || image.get_height();

    // Use Lanczos3 filter for best quality
    processedImage = resize(processedImage, width, height, SamplingFilter.Lanczos3);
  }

  // Rotate
  if (params.rotate) {
    processedImage = rotate(processedImage, params.rotate);
  }

  // Brightness
  if (params.brightness) {
    adjust_brightness(processedImage, params.brightness);
  }

  // Contrast
  if (params.contrast) {
    adjust_contrast(processedImage, params.contrast);
  }

  // Grayscale
  if (params.grayscale) {
    grayscale(processedImage);
  }

  // Crop
  if (params.crop) {
    const { x, y, width, height } = params.crop;
    processedImage = crop(processedImage, x, y, x + width, y + height);
  }

  return processedImage;
};

/**
 * Process image with PhotonImage
 */
export const processImage = (
  inputBytes: Uint8Array,
  targetFormat: ImageFormat,
  params: ImageProcessingParams = {}
): {
  bytes: Uint8Array;
  contentType: string;
} => {
  const inputImage = bytesToPhotonImage(inputBytes);

  // Apply image operations
  const processedImage = applyImageOperations(inputImage, params);

  // Convert to target format
  const outputBytes = convertToFormat(
    processedImage,
    params.format || targetFormat,
    params.quality
  );

  // Free memory
  inputImage.free();
  if (processedImage !== inputImage) {
    processedImage.free();
  }

  return {
    bytes: outputBytes,
    contentType: getContentType(params.format || targetFormat),
  };
};
