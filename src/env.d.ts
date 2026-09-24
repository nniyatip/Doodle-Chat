// Optional on purpose: values come from .env and may be missing; src/config/env.ts validates them.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_API_TOKEN?: string
}
