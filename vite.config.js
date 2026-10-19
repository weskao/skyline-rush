import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// whitespace 'preserve' keeps the inter-element spaces the pre-Vue innerHTML markup rendered.
export default defineConfig({ plugins: [vue({ template: { compilerOptions: { whitespace: 'preserve' } } })] });
