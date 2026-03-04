/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** UPI payment link or "Buy me a coffee" URL for footer support. */
  readonly VITE_SUPPORT_UPI_LINK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
