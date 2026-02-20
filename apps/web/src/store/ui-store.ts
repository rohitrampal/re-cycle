import { create } from 'zustand';

export type SupportedLanguage =
  | 'en' | 'hi' | 'mr' | 'gu' | 'pa' | 'ur' | 'bn' | 'te' | 'ta' | 'kn' | 'or' | 'ml';

interface UIState {
  language: SupportedLanguage;
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  setLanguage: (lang: SupportedLanguage) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  (set) => ({
    language: 'en',
    theme: 'system',
    sidebarOpen: false,
    setLanguage: (lang) => set({ language: lang }),
    setTheme: (theme) => set({ theme }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
  })
);
