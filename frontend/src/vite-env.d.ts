/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_BETA_MODE?: string
  readonly VITE_ENABLE_AI_RECORDING?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
