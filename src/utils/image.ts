import { PhotonImage, resize, rotate, adjust_brightness, adjust_contrast, grayscale, crop, SamplingFilter } from '@cf-wasm/photon';
import { ImageProcessingParams } from '../types/image';
import {
  ExtendedImageFormat,
  bytesToImageData,
  imageDataToFormat,
  photonToImageData,
  processImageWithJSquash,
  processImageWithJSquashAndPhoton,
  ImageData
} from './jsquash';

/**
 * Supported image formats
 */
export type ImageFormat = ExtendedImageFormat;

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

  if (accepts.includes('image/jxl')) {
    return 'jxl';
  }

  if (accepts.includes('image/avif')) {
    return 'avif';
  }

  if (accepts.includes('image/webp')) {
    return 'webp';
  }

  if (accepts.includes('image/jpeg')) {
    return 'jpeg';
  }

  return 'png';
};

/**
 * Get content type based on format
 */
export const getContentType = (format: ImageFormat): string => {
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
 * Apply image processing operations using Photon
 */
export const applyImageOperations = (image: PhotonImage, params: ImageProcessingParams): PhotonImage => {
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
 * Convert ImageData to PhotonImage
 * This is useful when we have already decoded an image with jsquash
 */
export const imageDataToPhotonImage = (imageData: ImageData): PhotonImage => {
  // Create a temporary canvas to get raw RGBA data
  // Since we're in a Cloudflare Worker environment, we need to manually create RGBA data
  const width = imageData.width;
  const height = imageData.height;
  const rgba = new Uint8Array(width * height * 4);

  // Copy data from ImageData to RGBA array
  // ImageData uses Uint8ClampedArray which is compatible with Uint8Array
  for (let i = 0; i < imageData.data.length; i++) {
    rgba[i] = imageData.data[i];
  }

  // Create PhotonImage from raw pixels
  return PhotonImage.new_from_byteslice(rgba);
};

/**
 * Process image with a unified pipeline:
 * 1. Decode with jsquash (supports more formats)
 * 2. Process with photon (faster operations)
 * 3. Encode with jsquash (supports more formats)
 */
export const processImage = async (
  inputBytes: Uint8Array,
  targetFormat: ImageFormat,
  params: ImageProcessingParams = {}
): Promise<{
  bytes: Uint8Array;
  contentType: string;
}> => {
  // Determine the output format
  const outputFormat = params.format || targetFormat;
  const quality = params.quality !== undefined ? params.quality : 90;

  // Check if we need to apply any image operations
  const needsProcessing = !!(
    params.width ||
    params.height ||
    params.rotate ||
    params.brightness ||
    params.contrast ||
    params.grayscale ||
    params.saturation ||
    params.crop ||
    params.fit ||
    params.position
  );

  try {
    if (needsProcessing) {
      // STEP 1: Decode input bytes to ImageData using jsquash
      const imageData = await bytesToImageData(inputBytes);

      // STEP 2: Convert ImageData to PhotonImage for processing
      const photonImage = imageDataToPhotonImage(imageData);

      // STEP 3: Apply image operations with Photon
      const processedImage = applyImageOperations(photonImage, params);

      // STEP 4: Convert processed PhotonImage back to ImageData for encoding
      const processedImageData = photonToImageData(processedImage);

      // STEP 5: Encode to target format with jsquash
      const result = await imageDataToFormat(processedImageData, outputFormat, quality, params);

      // Free memory
      photonImage.free();
      if (processedImage !== photonImage) {
        processedImage.free();
      }

      return result;
    } else {
      // If no processing is needed, just decode and re-encode with jsquash
      // This path is more efficient for format conversion only
      return await processImageWithJSquash(inputBytes, outputFormat, quality, params);
    }
  } catch (error: any) {
    console.error('Error processing image:', error);

    // Fallback: If jsquash decoding fails, try with photon directly
    try {
      const photonImage = bytesToPhotonImage(inputBytes);

      if (needsProcessing) {
        const processedImage = applyImageOperations(photonImage, params);
        const result = await processImageWithJSquashAndPhoton(processedImage, outputFormat, quality, params);

        // Free memory
        photonImage.free();
        if (processedImage !== photonImage) {
          processedImage.free();
        }

        return result;
      } else {
        const result = await processImageWithJSquashAndPhoton(photonImage, outputFormat, quality, params);
        photonImage.free();
        return result;
      }
    } catch (fallbackError: any) {
      throw new Error(`Failed to process image: ${error.message}. Fallback also failed: ${fallbackError.message}`);
    }
  }
};
