const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/test-image-processor.ts',
  output: {
    filename: 'worker.js',
    path: path.join(__dirname, 'dist'),
  },
  mode: 'production',
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    fallback: {
      fs: false,
      path: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
        },
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        // Copy WASM files from node_modules to dist
        { from: 'node_modules/@jsquash/webp/codec/enc/webp_enc.wasm', to: 'webp_enc.wasm' },
        { from: 'node_modules/@jsquash/webp/codec/dec/webp_dec.wasm', to: 'webp_dec.wasm' },
        { from: 'node_modules/@jsquash/avif/codec/enc/avif_enc.wasm', to: 'avif_enc.wasm' },
        { from: 'node_modules/@jsquash/avif/codec/dec/avif_dec.wasm', to: 'avif_dec.wasm' },
        { from: 'node_modules/@jsquash/jxl/codec/enc/jxl_enc.wasm', to: 'jxl_enc.wasm' },
        { from: 'node_modules/@jsquash/jxl/codec/dec/jxl_dec.wasm', to: 'jxl_dec.wasm' },
        { from: 'node_modules/@jsquash/png/codec/pkg/squoosh_png_bg.wasm', to: 'squoosh_png_bg.wasm' },
        { from: 'node_modules/@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm', to: 'squoosh_oxipng_bg.wasm' },
        { from: 'node_modules/@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm', to: 'mozjpeg_enc.wasm' },
        { from: 'node_modules/@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm', to: 'mozjpeg_dec.wasm' },
      ],
    }),
  ],
  experiments: {
    asyncWebAssembly: true,
  },
};
