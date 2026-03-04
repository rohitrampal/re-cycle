import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart, Share2, Coffee } from "lucide-react";

const SUPPORT_UPI_LINK = import.meta.env.VITE_SUPPORT_UPI_LINK ?? "";

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

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

  return (
    <footer className="mt-auto border-t border-border/40 bg-gradient-to-b from-muted/20 to-muted/50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* One line: brand, tagline, support us, buy me a coffee */}
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
