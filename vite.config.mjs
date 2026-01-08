// vite.config.mjs
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/signal.js',
            name: 'signal',
            fileName: (format) => `signal.${format}.js`,
            formats: ['es', 'umd']
        }
    }
});
