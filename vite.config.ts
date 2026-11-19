/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // rules and selectors are plain functions, so tests need no browser
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
