# Outbound Image Processor

A Cloudflare Worker that processes images on-the-fly using the `@cf-wasm/photon` library.

This can be used as a partial replacement for Cloudflare Images.

## Features

- Image format conversion (WebP, JPEG, PNG)
- Automatic format selection based on browser support
- Image processing operations:
  - Resize
  - Rotate
  - Brightness/Contrast adjustment
  - Grayscale conversion
  - Cropping
- Automatic caching of processed images
- Configurable CORS support
- R2 storage integration
- Configurable cache duration

## Usage

### Basic Usage

```
https://your-worker.workers.dev/image.jpg
```

The `image.jpg` is the key of the certain image in your R2 bucket.

### Image Processing Parameters

You can add query parameters to process the image:

#### Format and Quality

- `format`: Force output format (`webp`, `jpeg`, `png`)
- `quality`: JPEG quality (0-100, default: 90)

#### Resize

- `width`: Target width in pixels
- `height`: Target height in pixels

#### Rotation

- `rotate`: Rotation angle in degrees

#### Color Adjustments

- `brightness`: Brightness adjustment (-100 to 100)
- `contrast`: Contrast adjustment (-100 to 100)
- `grayscale`: Convert to grayscale (`true` or `false`)

#### Crop

- `crop`: Crop parameters as `x,y,width,height`

### Examples

1. Resize to 800x600:

```
https://your-worker.workers.dev/image.jpg?width=800&height=600
```

2. Convert to WebP with 80% quality:

```
https://your-worker.workers.dev/image.jpg?format=webp&quality=80
```

3. Rotate and adjust brightness:

```
https://your-worker.workers.dev/image.jpg?rotate=90&brightness=20
```

4. Crop and convert to grayscale:

```
https://your-worker.workers.dev/image.jpg?crop=100,100,500,500&grayscale=true
```

5. Complex transformation:

```
https://your-worker.workers.dev/image.jpg?width=800&height=600&brightness=10&contrast=20&format=webp&quality=85
```

## Development

### Prerequisites

- Node.js 18+
- Wrangler CLI
- Cloudflare account

### Setup

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure your Cloudflare R2 bucket and settings in `wrangler.toml`:

   ```toml
   [[r2_buckets]]
   binding = "IMAGE_SOURCE"
   bucket_name = "your-bucket-name"

   [vars]
   TRUESTED_HOSTS = ["example.com", "trusted-domain.com"]
   CACHE_MAX_AGE = 31536000  # Cache duration in seconds (1 year)
   ```

4. Deploy:

   ```bash
   npm run deploy
   ```

### CORS Configuration

The worker supports CORS through the `TRUESTED_HOSTS` environment variable. Add your trusted domains to the `wrangler.toml` configuration:

```toml
[vars]
TRUESTED_HOSTS = ["example.com", "trusted-domain.com"]
```

Only requests from these domains will be allowed to access the image processing service.

### Caching

Processed images are automatically cached. The cache duration can be configured through the `CACHE_MAX_AGE` environment variable (in seconds). If not specified, it defaults to 1 year (31536000 seconds).

The cache is keyed by:
- Image path
- Processing parameters
- Output format

This means that identical requests will be served from cache, improving performance and reducing server load.

## License

MIT
