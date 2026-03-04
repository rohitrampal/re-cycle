import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Search, Filter, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useListingSearch, type ListingSearchParams, type SearchResponse } from "@/hooks/use-listings";
import { LISTING_CATEGORIES } from "@/lib/listing-categories";
import type { ListingCategory, ListingType } from "@recycle/shared";

const PAGE_SIZE = 20;
const RADIUS_OPTIONS_KM = [0, 5, 10, 25, 50, 100] as const; // 0 = any distance
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

type ListingRow = SearchResponse["listings"][number];

export default function BrowsePage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [category, setCategory] = useState<ListingCategory | "">("");
  const [type, setType] = useState<ListingType | "">("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const requestLocation = useCallback(() => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => setLocationError("Could not get location"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const searchParams: ListingSearchParams = useMemo(() => {
    const min = minPrice.trim() ? parseFloat(minPrice) : undefined;
    const max = maxPrice.trim() ? parseFloat(maxPrice) : undefined;
    const params: ListingSearchParams = {
      query: appliedQuery || undefined,
      categoryCode: category || undefined,
      type: type || undefined,
      minPrice: min != null && !Number.isNaN(min) && min >= 0 ? min : undefined,
      maxPrice: max != null && !Number.isNaN(max) && max >= 0 ? max : undefined,
      freeOnly: freeOnly || undefined,
      limit: PAGE_SIZE,
    };
    if (radiusKm > 0 && userLocation) {
      params.radius = radiusKm;
      params.latitude = userLocation.latitude;
      params.longitude = userLocation.longitude;
    }
    return params;
  }, [appliedQuery, category, type, minPrice, maxPrice, freeOnly, radiusKm, userLocation]);

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useListingSearch(searchParams);

  const listings: ListingRow[] = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.listings ?? []),
    [data?.pages]
  );
  const total = data?.pages?.[0]?.total ?? null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedQuery(query.trim());
    setFiltersOpen(false);
  };

  const formatPrice = (listing: ListingRow) => {
    if (listing.type === "free") return t("listing.free");
    const p = listing.price;
    if (p == null || p === 0) return t("listing.free");
    return `₹${Number(p).toLocaleString()}`;
  };

  const categoryLabel = (code: string) => {
    const found = LISTING_CATEGORIES.find((c) => c.value === code);
    return found ? t(found.labelKey) : code;
  };

  return (
    <div className="px-4 py-6 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-5xl"
      >
        <h1 className="text-2xl font-bold sm:text-3xl">{t("navigation.browse")}</h1>
        <p className="mt-1 text-muted-foreground">{t("search.searchPlaceholder")}</p>

        <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder={t("search.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("search.searchPlaceholder")}
            />
          </div>
          <div className="flex gap-2">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {t("search.filters")}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-sm">
                <SheetHeader>
                  <SheetTitle>{t("search.filters")}</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t("listing.category")}</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory((e.target.value || "") as ListingCategory | "")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">{t("search.allCategories")}</option>
                      {LISTING_CATEGORIES.map(({ value, labelKey }) => (
                        <option key={value} value={value}>
                          {t(labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t("listing.type")}</label>
                    <select
                      value={type}
                      onChange={(e) => setType((e.target.value || "") as ListingType | "")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">{t("search.allTypes")}</option>
                      <option value="sell">{t("listing.sell")}</option>
                      <option value="rent">{t("listing.rent")}</option>
                      <option value="free">{t("listing.free")}</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">{t("search.priceRange")} ({t("search.priceMin")})</label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">{t("search.priceRange")} ({t("search.priceMax")})</label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="—"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={freeOnly}
                      onChange={(e) => setFreeOnly(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">{t("search.freeOnly")}</span>
                  </label>
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t("search.radius")}</label>
                    <p className="mb-2 text-xs text-muted-foreground">{t("search.locationConsentBrowse")}</p>
                    <select
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(Number(e.target.value))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value={0}>{t("search.anyRadius")}</option>
                      {RADIUS_OPTIONS_KM.filter((r) => r > 0).map((km) => (
                        <option key={km} value={km}>
                          {t("search.withinRadius", { km })}
                        </option>
                      ))}
                    </select>
                    {radiusKm > 0 && (
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={requestLocation}
                        >
                          <MapPin className="h-4 w-4" />
                          {userLocation ? t("search.useMyLocation") + " ✓" : t("search.useMyLocation")}
                        </Button>
                        {!userLocation && (
                          <p className="mt-1 text-xs text-muted-foreground">{t("search.locationRequired")}</p>
                        )}
                        {locationError && (
                          <p className="mt-1 text-xs text-destructive" role="alert">{locationError}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setCategory("");
                      setType("");
                      setMinPrice("");
                      setMaxPrice("");
                      setFreeOnly(false);
                      setRadiusKm(0);
                      setUserLocation(null);
                      setLocationError(null);
                    }}
                  >
                    {t("common.clear")}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => {
                      setFiltersOpen(false);
                      setAppliedQuery(query.trim());
                      if (radiusKm > 0 && !userLocation) setLocationError(t("search.locationRequired"));
                    }}
                  >
                    {t("common.apply")}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <Button type="submit" className="gap-2">
              <Search className="h-4 w-4" />
              {t("common.search")}
            </Button>
          </div>
        </form>

        {isError && (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error instanceof Error ? error.message : t("errors.somethingWentWrong")}
          </p>
        )}

        {isLoading ? (
          <div className="mt-10 flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : (
          <>
            {total != null && (
              <p className="mt-6 text-sm text-muted-foreground">
                {t("search.results")}: {total}
              </p>
            )}
            <motion.div
              className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.05 } },
                hidden: {},
              }}
            >
              {listings.map((listing) => (
                <motion.div key={listing.id} variants={cardVariants}>
                  <Link to={`/listing/${listing.id}`}>
                    <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg">
                      <div className="aspect-video bg-muted">
                        {listing.images?.[0] ? (
                          <img
                            src={listing.images[0]}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
                            {t("listing.images")}
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold line-clamp-2">{listing.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {categoryLabel(listing.category_code)} · {t(`listing.${listing.type}`)}
                        </p>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <span className="font-medium text-primary">
                          {formatPrice(listing)}
                        </span>
                      </CardFooter>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {!isLoading && listings.length === 0 && (
              <p className="mt-10 text-center text-muted-foreground">{t("search.noResults")}</p>
            )}

            {hasNextPage && listings.length > 0 && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="gap-2"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("common.loading")}
                    </>
                  ) : (
                    t("search.loadMore")
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
