import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'serve-root-assets',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && (req.url.startsWith('/images/') || req.url.startsWith('/videos/'))) {
              const cleanUrl = req.url.split('?')[0].replace(/^\//, '');
              const filePath = path.join(__dirname, cleanUrl);
              if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                const stat = fs.statSync(filePath);
                const ext = path.extname(filePath).toLowerCase();
                const mimeTypes: Record<string, string> = {
                  '.jpg': 'image/jpeg',
                  '.jpeg': 'image/jpeg',
                  '.png': 'image/png',
                  '.mp4': 'video/mp4',
                  '.webm': 'video/webm',
                };
                const contentType = mimeTypes[ext] || 'application/octet-stream';
                const range = req.headers.range;

                if (range && ext === '.mp4') {
                  const parts = range.replace(/bytes=/, '').split('-');
                  const start = parseInt(parts[0], 10);
                  const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
                  const chunksize = end - start + 1;
                  res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': contentType,
                  });
                  return fs.createReadStream(filePath, { start, end }).pipe(res);
                }

                res.writeHead(200, {
                  'Content-Length': stat.size,
                  'Content-Type': contentType,
                  'Accept-Ranges': 'bytes',
                });
                return fs.createReadStream(filePath).pipe(res);
              }
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
