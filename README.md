# Outbound Image Processor

A high-performance image processing service built with Cloudflare Workers, leveraging the power of `@cf-wasm/photon` and `jsquash` libraries.

## Features

- **High Performance**: Uses WebAssembly-powered image processing libraries
- **Multiple Format Support**: Process and convert between WebP, JPEG, PNG, AVIF, and JXL formats
- **Advanced Processing**: Resize, crop, rotate, adjust brightness/contrast, and more
- **Format Optimization**: Automatically selects the best format based on browser support
- **Hybrid Processing**: Uses Photon for fast image manipulation and jSquash for advanced format encoding

## Usage

### API Endpoint

```
https://outbound-image-processor.your-subdomain.workers.dev/?url=IMAGE_URL&[options]
```

### Query Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `url` | URL of the source image (required) | - |
| `format` | Output format: `webp`, `jpeg`, `png`, `avif`, `jxl` | `webp` |
| `width` | Target width in pixels | Original width |
| `height` | Target height in pixels | Original height |
| `quality` | Image quality (1-100) | 90 |
| `optimize` | Enable PNG optimization (true/false) | false |
| `grayscale` | Convert to grayscale (true/false) | false |
| `rotate` | Rotation angle in degrees | 0 |
| `brightness` | Brightness adjustment (-100 to 100) | 0 |
| `contrast` | Contrast adjustment (-100 to 100) | 0 |

### Examples

Basic usage:
```
https://outbound-image-processor.your-subdomain.workers.dev/?url=https://example.com/image.jpg
```

Resize and convert to WebP:
```
https://outbound-image-processor.your-subdomain.workers.dev/?url=https://example.com/image.jpg&width=800&height=600&format=webp
```

Convert to AVIF with quality adjustment:
```
https://outbound-image-processor.your-subdomain.workers.dev/?url=https://example.com/image.jpg&format=avif&quality=80
```

Apply multiple transformations:
```
https://outbound-image-processor.your-subdomain.workers.dev/?url=https://example.com/image.jpg&width=500&grayscale=true&brightness=10&contrast=20
```

## Development

### Prerequisites

- Node.js 16+
- Wrangler CLI (`npm install -g wrangler`)

### Setup

1. Clone the repository
   ```
   git clone https://github.com/yourusername/outbound-image-processor.git
   cd outbound-image-processor
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Run locally
   ```
   wrangler dev
   ```

4. Deploy to Cloudflare
   ```
   wrangler publish
   ```

## Configuration

Edit `wrangler.toml` to configure:

- Default image quality
- Image source whitelist (optional)
- KV storage for caching (optional)
- R2 storage for large files (optional)

## License

MIT
