import { useEffect } from "react";
import { useUIStore } from "../store/ui-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = theme === "system" ? (dark ? "dark" : "light") : theme;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", resolved === "dark" ? "hsl(222.2 84% 4.9%)" : "#ffffff");
    }
  }, [theme]);

  useEffect(() => {
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (useUIStore.getState().theme === "system") {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(m.matches ? "dark" : "light");
      }
    };
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, []);

  return <>{children}</>;
}
