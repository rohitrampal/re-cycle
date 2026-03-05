/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** UPI payment link or "Buy me a coffee" URL for footer support. (Currently commented out in Footer.) */
  readonly VITE_SUPPORT_UPI_LINK?: string;
  /** Phone number shown on hover/click for "Buy me a coffee" (e.g. for UPI / support). */
  readonly VITE_UPI_PHONE_NUMBER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
