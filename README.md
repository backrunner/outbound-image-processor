# Outbound Image Processor

A high-performance image processing service built with Cloudflare Workers, leveraging the power of `@cf-wasm/photon` and `jsquash` libraries.

## Features

- **High Performance**: Uses WebAssembly-powered image processing libraries
- **Multiple Format Support**: Process and convert between WebP, JPEG, PNG, AVIF, and JXL formats
- **Advanced Processing**: Resize, crop, rotate, adjust brightness/contrast, and more
- **Format Optimization**: Automatically selects the best format based on browser support
- **Hybrid Processing**: Uses Photon for fast image manipulation and jSquash for advanced format encoding
- **Cache Management**: Supports cache invalidation through authenticated DELETE requests

## Usage

### API Endpoints

#### GET - Retrieve and Process Images

```
https://outbound-image-processor.your-subdomain.workers.dev/IMAGE_KEY?[options]
```

#### DELETE - Clear Image Cache

```
https://outbound-image-processor.your-subdomain.workers.dev/IMAGE_KEY
```

**Note**: DELETE requests require authorization with an API key in the header:
```
Authorization: Bearer YOUR_API_KEY
```

### Query Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
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

Basic image retrieval:
```
https://outbound-image-processor.your-subdomain.workers.dev/my-image-key
```

Resize and convert to WebP:
```
https://outbound-image-processor.your-subdomain.workers.dev/my-image-key?width=800&height=600&format=webp
```

Convert to AVIF with quality adjustment:
```
https://outbound-image-processor.your-subdomain.workers.dev/my-image-key?format=avif&quality=80
```

Apply multiple transformations:
```
https://outbound-image-processor.your-subdomain.workers.dev/my-image-key?width=500&grayscale=true&brightness=10&contrast=20
```

Clear image cache (requires API key):
```
curl -X DELETE -H "Authorization: Bearer YOUR_API_KEY" https://outbound-image-processor.your-subdomain.workers.dev/my-image-key
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
- API key for authenticated operations (required for DELETE)

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `IMAGE_SOURCE` | R2 bucket for storing images | Yes |
| `TRUSTED_HOSTS` | Trusted hosts for CORS | Yes |
| `CACHE_DOMAIN` | Domain to use for cache keys | No |
| `API_KEY` | API key for authenticated operations | Yes (for DELETE) |
| `CACHE_MAX_AGE` | Maximum age for cached images in seconds | No |

## License

MIT
