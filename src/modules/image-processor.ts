import { PhotonImage, resize, rotate, adjust_brightness, adjust_contrast, grayscale, crop, SamplingFilter } from '@cf-wasm/photon';
import { ImageProcessingParams } from '../types/image';
import { ExtendedImageFormat, processImageWithJSquash, processImageWithJSquashAndPhoton } from '../utils/jsquash';

/**
 * Get content type based on format
 */
export const getContentType = (format: ExtendedImageFormat): string => {
  switch (format) {
    case 'avif':
      return 'image/avif';
    case 'jxl':
      return 'image/jxl';
    case 'webp':
      return 'image/webp';
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
    default:
      return 'image/png';
  }
};

/**
 * Convert image bytes to PhotonImage
 */
export const bytesToPhotonImage = (bytes: Uint8Array): PhotonImage => {
  return PhotonImage.new_from_byteslice(bytes);
};

/**
 * Apply image processing operations using Photon
 */
const applyPhotonOperations = (image: PhotonImage, params: ImageProcessingParams): PhotonImage => {
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
 * Process image with Photon (for standard formats)
 */
export const processImageWithPhoton = (
  inputBytes: Uint8Array,
  targetFormat: 'webp' | 'jpeg' | 'png',
  params: ImageProcessingParams = {}
): {
  bytes: Uint8Array;
  contentType: string;
} => {
  const inputImage = bytesToPhotonImage(inputBytes);

  // Apply image operations
  const processedImage = applyPhotonOperations(inputImage, params);

  // Convert to target format
  let outputBytes: Uint8Array;
  const format = params.format || targetFormat;
  const quality = params.quality || 90;

  switch (format) {
    case 'webp':
      outputBytes = processedImage.get_bytes_webp();
      break;
    case 'jpeg':
      outputBytes = processedImage.get_bytes_jpeg(quality);
      break;
    case 'png':
    default:
      outputBytes = processedImage.get_bytes();
      break;
  }

  // Free memory
  inputImage.free();
  if (processedImage !== inputImage) {
    processedImage.free();
  }

  return {
    bytes: outputBytes,
    contentType: getContentType(format),
  };
};

/**
 * Process image with the appropriate processor based on format
 */
export const processImage = async (
  inputBytes: Uint8Array,
  targetFormat: ExtendedImageFormat,
  params: ImageProcessingParams = {}
): Promise<{
  bytes: Uint8Array;
  contentType: string;
}> => {
  const format = params.format || targetFormat;
  const quality = params.quality !== undefined ? params.quality : 90;

  // For standard formats, use Photon for processing
  if (format === 'webp' || format === 'jpeg' || (format === 'png' && !params.optimize)) {
    return processImageWithPhoton(inputBytes, format as 'webp' | 'jpeg' | 'png', params);
  }

  // For advanced formats (avif, jxl) or optimized PNG, use a hybrid approach:
  // 1. Use Photon for image processing (faster and more efficient)
  // 2. Use jSquash for encoding to the target format
  if (params.width || params.height || params.rotate || params.brightness ||
      params.contrast || params.grayscale || params.crop) {
    // Process with Photon first
    const inputImage = bytesToPhotonImage(inputBytes);
    const processedImage = applyPhotonOperations(inputImage, params);

    // Then encode with jSquash
    const result = await processImageWithJSquashAndPhoton(
      processedImage,
      format,
      quality,
      params
    );

    // Free memory
    inputImage.free();
    if (processedImage !== inputImage) {
      processedImage.free();
    }

    return result;
  }

  // If no processing is needed, just use jSquash directly
  return await processImageWithJSquash(inputBytes, format, quality, params);
};
