import { ExtendedImageFormat } from '../utils/jsquash';

export interface ImageProcessingParams {
  // Format settings
  format?: ExtendedImageFormat;
  quality?: number;

  // PNG specific options
  optimize?: boolean; // Use OxiPNG optimization for PNG
  compressionLevel?: number; // OxiPNG compression level (0-6)

  // Resize settings
  width?: number;
  height?: number;
  fit?: 'contain' | 'cover' | 'fill';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';

  // Rotation
  rotate?: number;

  // Brightness and contrast
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100

  // Color adjustments
  grayscale?: boolean;
  saturation?: number; // -100 to 100

  // Crop settings
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Parse query parameters into ImageProcessingParams
 */
export const parseImageParams = (searchParams: URLSearchParams, env?: Env): ImageProcessingParams => {
  const params: ImageProcessingParams = {};
  const defaultQuality = env?.DEFAULT_IMAGE_QUALITY || 90;

  // Format and quality
  if (searchParams.has('format')) {
    const format = searchParams.get('format') as ExtendedImageFormat;
    if (['webp', 'jpeg', 'png', 'avif', 'jxl'].includes(format)) {
      params.format = format;
    }
  }
  if (searchParams.has('quality')) {
    const quality = parseInt(searchParams.get('quality') || String(defaultQuality), 10);
    if (!isNaN(quality) && quality >= 0 && quality <= 100) {
      params.quality = quality;
    }
  } else {
    params.quality = defaultQuality;
  }

  // PNG optimization
  if (searchParams.has('optimize')) {
    params.optimize = searchParams.get('optimize') === 'true';
  }
  if (searchParams.has('compressionLevel')) {
    const level = parseInt(searchParams.get('compressionLevel') || '2', 10);
    if (!isNaN(level) && level >= 0 && level <= 6) {
      params.compressionLevel = level;
    }
  }

  // Resize
  if (searchParams.has('width')) {
    const width = parseInt(searchParams.get('width') || '0', 10);
    if (!isNaN(width) && width > 0) {
      params.width = width;
    }
  }
  if (searchParams.has('height')) {
    const height = parseInt(searchParams.get('height') || '0', 10);
    if (!isNaN(height) && height > 0) {
      params.height = height;
    }
  }
  if (searchParams.has('fit')) {
    const fit = searchParams.get('fit');
    if (['contain', 'cover', 'fill'].includes(fit || '')) {
      params.fit = fit as 'contain' | 'cover' | 'fill';
    }
  }
  if (searchParams.has('position')) {
    const position = searchParams.get('position');
    if (['center', 'top', 'bottom', 'left', 'right'].includes(position || '')) {
      params.position = position as 'center' | 'top' | 'bottom' | 'left' | 'right';
    }
  }

  // Rotation
  if (searchParams.has('rotate')) {
    const rotate = parseInt(searchParams.get('rotate') || '0', 10);
    if (!isNaN(rotate)) {
      params.rotate = rotate;
    }
  }

  // Brightness and contrast
  if (searchParams.has('brightness')) {
    const brightness = parseInt(searchParams.get('brightness') || '0', 10);
    if (!isNaN(brightness) && brightness >= -100 && brightness <= 100) {
      params.brightness = brightness;
    }
  }
  if (searchParams.has('contrast')) {
    const contrast = parseInt(searchParams.get('contrast') || '0', 10);
    if (!isNaN(contrast) && contrast >= -100 && contrast <= 100) {
      params.contrast = contrast;
    }
  }

  // Color adjustments
  if (searchParams.has('grayscale')) {
    params.grayscale = searchParams.get('grayscale') === 'true';
  }
  if (searchParams.has('saturation')) {
    const saturation = parseInt(searchParams.get('saturation') || '0', 10);
    if (!isNaN(saturation) && saturation >= -100 && saturation <= 100) {
      params.saturation = saturation;
    }
  }

  // Crop
  if (searchParams.has('crop')) {
    const crop = searchParams.get('crop')?.split(',').map(Number);
    if (crop?.length === 4 && crop.every(n => !isNaN(n))) {
      params.crop = {
        x: crop[0],
        y: crop[1],
        width: crop[2],
        height: crop[3],
      };
    }
  }

  return params;
};
