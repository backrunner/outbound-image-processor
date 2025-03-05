import { PhotonImage } from '@cf-wasm/photon';

import encodeWebP, { init as initWebpWasm } from '@jsquash/webp/encode';
import encodeAvif, { init as initAvifWasm } from '@jsquash/avif/encode';
import encodeJxl, { init as initJxlWasm } from '@jsquash/jxl/encode';
import encodeJpeg, { init as initJpegWasm } from '@jsquash/jpeg/encode';
import encodePng, { init as initPngWasm } from '@jsquash/png/encode';
import optimisePng, { init as initOxiPngWasm } from '@jsquash/oxipng/optimise';
import decodeWebP, { init as initWebpDecodeWasm } from '@jsquash/webp/decode';
import decodeAvif, { init as initAvifDecodeWasm } from '@jsquash/avif/decode';
import decodeJxl, { init as initJxlDecodeWasm } from '@jsquash/jxl/decode';
import decodePng, { init as initPngDecodeWasm } from '@jsquash/png/decode';
import decodeJpeg, { init as initJpegDecodeWasm } from '@jsquash/jpeg/decode';

import { ImageProcessingParams } from '../types/image';

// Import WASM modules
// @ts-ignore
import WEBP_ENC_WASM from '../../node_modules/@jsquash/webp/codec/enc/webp_enc.wasm';
// @ts-ignore
import WEBP_DEC_WASM from '../../node_modules/@jsquash/webp/codec/dec/webp_dec.wasm';
// @ts-ignore
import AVIF_ENC_WASM from '../../node_modules/@jsquash/avif/codec/enc/avif_enc.wasm';
// @ts-ignore
import AVIF_DEC_WASM from '../../node_modules/@jsquash/avif/codec/dec/avif_dec.wasm';
// @ts-ignore
import JXL_ENC_WASM from '../../node_modules/@jsquash/jxl/codec/enc/jxl_enc.wasm';
// @ts-ignore
import JXL_DEC_WASM from '../../node_modules/@jsquash/jxl/codec/dec/jxl_dec.wasm';
// @ts-ignore
import PNG_WASM from '../../node_modules/@jsquash/png/codec/pkg/squoosh_png_bg.wasm';
// @ts-ignore
import OXI_PNG_ENC_WASM from '../../node_modules/@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm';
// @ts-ignore
import JPEG_ENC_WASM from '../../node_modules/@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm';
// @ts-ignore
import JPEG_DEC_WASM from '../../node_modules/@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm';

// Define ImageData interface for Cloudflare Workers environment
export interface ImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace?: string;
}


// Track initialization status of individual modules
const moduleStatus = {
  webpEnc: false,
  avifEnc: false,
  jxlEnc: false,
  pngEnc: false,
  jpegEnc: false,
  webpDec: false,
  avifDec: false,
  jxlDec: false,
  pngDec: false,
  jpegDec: false,
  oxiPng: false
};

/**
 * Initialize a specific jSquash module
 */
export const initModule = async (module: keyof typeof moduleStatus): Promise<void> => {
  if (moduleStatus[module]) return;

  switch (module) {
    case 'webpEnc':
      await initWebpWasm(WEBP_ENC_WASM);
      break;
    case 'avifEnc':
      await initAvifWasm(AVIF_ENC_WASM);
      break;
    case 'jxlEnc':
      await initJxlWasm(JXL_ENC_WASM);
      break;
    case 'pngEnc':
      await initPngWasm(PNG_WASM);
      break;
    case 'jpegEnc':
      await initJpegWasm(JPEG_ENC_WASM);
      break;
    case 'webpDec':
      await initWebpDecodeWasm(WEBP_DEC_WASM);
      break;
    case 'avifDec':
      await initAvifDecodeWasm(AVIF_DEC_WASM);
      break;
    case 'jxlDec':
      await initJxlDecodeWasm(JXL_DEC_WASM);
      break;
    case 'pngDec':
      await initPngDecodeWasm(PNG_WASM);
      break;
    case 'jpegDec':
      await initJpegDecodeWasm(JPEG_DEC_WASM);
      break;
    case 'oxiPng':
      await initOxiPngWasm(OXI_PNG_ENC_WASM);
      break;
  }

  moduleStatus[module] = true;
};

/**
 * Extended image format type
 */
export type ExtendedImageFormat = 'webp' | 'jpeg' | 'png' | 'avif' | 'jxl';

/**
 * Get the best image format based on Accept header with extended formats
 */
export const getBestExtendedFormat = (accept: string): ExtendedImageFormat => {
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
 * Convert image bytes to ImageData
 */
export const bytesToImageData = async (bytes: Uint8Array): Promise<ImageData> => {
  // Try to detect format and decode
  try {
    // Check for JPEG signature
    if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
      await initModule('jpegDec');
      return await decodeJpeg(bytes);
    }

    // Check for PNG signature
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      await initModule('pngDec');
      return await decodePng(bytes);
    }

    // Check for WebP signature
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      await initModule('webpDec');
      return await decodeWebP(bytes);
    }

    // Try AVIF
    try {
      await initModule('avifDec');
      return await decodeAvif(bytes);
    } catch (e) {
      // Not AVIF, continue
    }

    // Try JXL
    try {
      await initModule('jxlDec');
      return await decodeJxl(bytes);
    } catch (e) {
      // Not JXL, continue
    }

    // Fallback to JPEG
    await initModule('jpegDec');
    return await decodeJpeg(bytes);
  } catch (error: any) {
    throw new Error(`Failed to decode image: ${error.message}`);
  }
};

/**
 * Convert PhotonImage to ImageData
 */
export const photonToImageData = (photonImage: PhotonImage): ImageData => {
  const width = photonImage.get_width();
  const height = photonImage.get_height();

  // Get raw RGBA bytes from PhotonImage
  const rawBytes = photonImage.get_raw_pixels();

  // Convert to Uint8ClampedArray for ImageData
  const data = new Uint8ClampedArray(rawBytes);

  return {
    data,
    width,
    height
  };
};

/**
 * Adapter function to convert our ImageData to the format expected by jsquash
 */
const adaptImageData = (imageData: ImageData): any => {
  // Create a new object with the same properties but without type checking
  return {
    data: imageData.data,
    width: imageData.width,
    height: imageData.height,
    colorSpace: imageData.colorSpace || 'srgb'
  };
};

/**
 * Convert ImageData to specified format
 */
export const imageDataToFormat = async (
  imageData: ImageData,
  format: ExtendedImageFormat,
  quality: number = 90,
  params: ImageProcessingParams = {}
): Promise<{ bytes: Uint8Array; contentType: string }> => {
  let bytes: Uint8Array;
  let contentType: string;

  // Adapt our ImageData to the format expected by jsquash
  const adaptedImageData = adaptImageData(imageData);

  switch (format) {
    case 'avif':
      await initModule('avifEnc');
      bytes = new Uint8Array(await encodeAvif(adaptedImageData, {
        quality,
        // AVIF specific options could be added here
      }));
      contentType = 'image/avif';
      break;
    case 'jxl':
      await initModule('jxlEnc');
      bytes = new Uint8Array(await encodeJxl(adaptedImageData, {
        quality,
        // JXL specific options could be added here
      }));
      contentType = 'image/jxl';
      break;
    case 'webp':
      await initModule('webpEnc');
      bytes = new Uint8Array(await encodeWebP(adaptedImageData, {
        quality,
        // WebP specific options could be added here
      }));
      contentType = 'image/webp';
      break;
    case 'png':
      await initModule('pngEnc');
      if (params.optimize) {
        // Use OxiPNG for optimized PNG
        await initModule('oxiPng');
        const compressionLevel = params.compressionLevel !== undefined ? params.compressionLevel : 2;
        const pngBytes = await encodePng(adaptedImageData);
        bytes = new Uint8Array(await optimisePng(pngBytes, { level: compressionLevel }));
      } else {
        bytes = new Uint8Array(await encodePng(adaptedImageData));
      }
      contentType = 'image/png';
      break;
    case 'jpeg':
    default:
      await initModule('jpegEnc');
      bytes = new Uint8Array(await encodeJpeg(adaptedImageData, {
        quality,
        // JPEG specific options could be added here
      }));
      contentType = 'image/jpeg';
      break;
  }

  return { bytes, contentType };
};

/**
 * Process image with jSquash
 */
export const processImageWithJSquash = async (
  inputBytes: Uint8Array,
  targetFormat: ExtendedImageFormat,
  quality: number = 90,
  params: ImageProcessingParams = {}
): Promise<{ bytes: Uint8Array; contentType: string }> => {
  // No need to initialize all modules, they will be initialized on demand

  // Decode image
  const imageData = await bytesToImageData(inputBytes);

  // Encode to target format
  return await imageDataToFormat(imageData, targetFormat, quality, params);
};

/**
 * Process image with jSquash using PhotonImage for pre-processing
 */
export const processImageWithJSquashAndPhoton = async (
  photonImage: PhotonImage,
  targetFormat: ExtendedImageFormat,
  quality: number = 90,
  params: ImageProcessingParams = {}
): Promise<{ bytes: Uint8Array; contentType: string }> => {
  // No need to initialize all modules, they will be initialized on demand

  // Convert PhotonImage to ImageData
  const imageData = photonToImageData(photonImage);

  // Encode to target format
  return await imageDataToFormat(imageData, targetFormat, quality, params);
};
