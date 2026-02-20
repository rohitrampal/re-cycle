import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Home, LayoutGrid, PlusCircle, User, Sun, Moon, Monitor, X } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navLinks = [
  { to: "/", labelKey: "navigation.home", icon: Home },
  { to: "/browse", labelKey: "navigation.browse", icon: LayoutGrid },
  { to: "/create", labelKey: "navigation.create", icon: PlusCircle },
  { to: "/profile", labelKey: "navigation.profile", icon: User },
] as const;

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const setLanguage = useUIStore((s) => s.setLanguage);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const filteredLinks = navLinks.filter(
    (l) => l.to === "/profile" || l.to === "/create" ? isAuthenticated : true
  );

  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent side="left" className="flex flex-col gap-6 p-0">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="font-bold text-primary">{t("common.appName")}</span>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} aria-label={t("common.close")}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {filteredLinks.map((link, i) => {
            const isActive =
              location.pathname === link.to ||
              (link.to !== "/" && location.pathname.startsWith(link.to));
            const Icon = link.icon;
            return (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={link.to}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {t(link.labelKey)}
                </Link>
              </motion.div>
            );
          })}
        </nav>
        <div className="border-t border-border p-4 space-y-2">
          <p className="px-2 text-xs font-medium text-muted-foreground">{t("common.theme")}</p>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((themeKey) => (
              <Button
                key={themeKey}
                variant={theme === themeKey ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme(themeKey)}
                className="flex-1"
              >
                {themeKey === "light" && <Sun className="h-4 w-4" />}
                {themeKey === "dark" && <Moon className="h-4 w-4" />}
                {themeKey === "system" && <Monitor className="h-4 w-4" />}
              </Button>
            ))}
          </div>
          <p className="mt-3 px-2 text-xs font-medium text-muted-foreground">{t("common.language")}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLanguage("en")} className="flex-1">
              EN
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLanguage("hi")} className="flex-1">
              हि
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
