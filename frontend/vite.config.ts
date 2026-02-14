import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // AI-SUGGESTION: Allow deploying the frontend under a subpath (common on school servers),
  // e.g. set VITE_BASE="/static/" before building so asset URLs become /static/assets/...
  // If omitted, default to root deployment (/).
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const base = env.VITE_BASE || '/';

  return {
    base,
    plugins: [react()],
    server: {
      port: 3000,
      host: true
    }
  };
});
