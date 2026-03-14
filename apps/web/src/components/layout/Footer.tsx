import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Share2, Coffee, Phone, Copy } from "lucide-react";

// UPI link: commented out – show phone on hover/click instead 
// const SUPPORT_UPI_LINK = import.meta.env.VITE_SUPPORT_UPI_LINK ?? "";
const UPI_PHONE_NUMBER = import.meta.env.VITE_UPI_PHONE_NUMBER ?? "";

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [copied, setCopied] = useState(false);
  const [showPhonePopover, setShowPhonePopover] = useState(false);
  const [clickHighlight, setClickHighlight] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Keep popover visible briefly on click (so user sees number + copied state)
  useEffect(() => {
    if (!showPhonePopover) return;
    const t = setTimeout(() => setShowPhonePopover(false), 2500);
    return () => clearTimeout(t);
  }, [showPhonePopover]);

  const handleShare = async () => {
    const url = window.location.origin;
    const title = t("footer.shareTitle", {
      appName: t("common.appName"),
      tagline: t("footer.tagline"),
    });
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
          text: title,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Optional: could add a small toast here
    });
  };

  /** Copy text to clipboard; works in production (HTTPS) and fallback for HTTP/mobile. Returns true if copy succeeded. */
  const copyToClipboardSafe = (text: string): Promise<boolean> => {
    if (!text) return Promise.resolve(false);
    // Prefer Clipboard API when available (secure context only)
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  };

  const fallbackCopy = (text: string): boolean => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCopyPhone = () => {
    setClickHighlight(true);
    setTimeout(() => setClickHighlight(false), 250);
    // Show popover immediately so it works even when clipboard fails (e.g. HTTP, mobile)
    setShowPhonePopover(true);
    copyToClipboardSafe(UPI_PHONE_NUMBER).then((success) => {
      setCopied(success);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <footer className="mt-auto border-t border-border/40 bg-gradient-to-b from-muted/20 to-muted/50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* One line: brand, tagline, support us, buy me a tea */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-center sm:gap-x-6">
          <Link
            to="/"
            className="text-2xl font-bold tracking-tight text-primary transition-opacity hover:opacity-90 sm:text-3xl"
          >
            {t("common.appName")}
          </Link>
          <span className="hidden text-muted-foreground sm:inline" aria-hidden>
            ·
          </span>
          <p className="text-sm text-muted-foreground">
            {t("footer.tagline")}
          </p>
          <span className="hidden text-muted-foreground sm:inline" aria-hidden>
            ·
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("footer.supportUs")}
          </span>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Share2 className="h-3.5 w-3.5" />
            {t("footer.shareWithOthers")}
          </button>
          {/* UPI link: commented out – use phone number on hover/click instead
          {SUPPORT_UPI_LINK && (
            <>
              <span className="text-muted-foreground" aria-hidden>·</span>
              <a
                href={SUPPORT_UPI_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 shadow-sm transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/50"
              >
                <Coffee className="h-3.5 w-3.5" />
                {t("footer.buyMeACoffee")}
              </a>
            </>
          )}
          */}
          {UPI_PHONE_NUMBER && (
            <>
              <span className="text-muted-foreground" aria-hidden>·</span>
              <div className="relative inline-block">
                <AnimatePresence>
                  {showPhonePopover && (
                    <motion.div
                      ref={popoverRef}
                      className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2"
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <div className="rounded-xl border border-amber-200/80 bg-amber-50/95 px-4 py-3 shadow-lg backdrop-blur-sm dark:border-amber-700/60 dark:bg-amber-950/95">
                        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.05 }}
                          >
                            <Phone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </motion.span>
                          <span className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            {t("footer.supportPhone")}
                          </span>
                        </div>
                        <motion.p
                          role="button"
                          tabIndex={0}
                          className="mt-1.5 cursor-pointer select-all font-mono text-lg font-semibold tracking-wide text-amber-900 dark:text-amber-100 active:opacity-80"
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.08 }}
                          onClick={() => copyToClipboardSafe(UPI_PHONE_NUMBER).then((ok) => { if (ok) setCopied(true); setTimeout(() => setCopied(false), 2000); })}
                          onKeyDown={(e) => e.key === "Enter" && copyToClipboardSafe(UPI_PHONE_NUMBER).then((ok) => { if (ok) setCopied(true); setTimeout(() => setCopied(false), 2000); })}
                        >
                          {UPI_PHONE_NUMBER}
                        </motion.p>
                        <motion.p
                          className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.12 }}
                        >
                          <Copy className="h-3 w-3" />
                          {copied ? t("footer.copied") : t("footer.clickToCopy")}
                        </motion.p>
                        {/* arrow pointing down to button */}
                        <div
                          className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-amber-50 dark:border-t-amber-950/95"
                          aria-hidden
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.button
                  ref={buttonRef}
                  type="button"
                  onClick={handleCopyPhone}
                  className="relative inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 shadow-sm dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/50"
                  animate={
                    clickHighlight
                      ? {
                          scale: 1.06,
                          boxShadow: "0 4px 20px rgba(217, 119, 6, 0.35)",
                        }
                      : { scale: 1, boxShadow: "0 0 0 transparent" }
                  }
                  whileTap={{
                    scale: 0.96,
                    transition: { type: "spring", stiffness: 400, damping: 17 },
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <motion.span
                    className="inline-flex origin-center"
                    animate={
                      copied
                        ? { rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }
                        : showPhonePopover
                            ? { scale: 1.15 }
                            : { scale: 1 }
                    }
                    transition={{ duration: 0.3 }}
                  >
                    <Coffee className="h-3.5 w-3.5" />
                  </motion.span>
                  {t("footer.buyMeACoffee")}
                </motion.button>
              </div>
            </>
          )}
        </div>

        {/* Made with love + copyright */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border/40 pt-6 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {t("footer.madeWithLove")}
            <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" aria-hidden />
          </span>
          <span>
            © {currentYear} {t("common.appName")}. {t("footer.rights")}
          </span>
        </div>
      </div>
    </footer>
  );
}
