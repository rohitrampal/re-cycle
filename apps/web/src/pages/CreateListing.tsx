import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ImagePlus, X, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LISTING_CATEGORIES } from "@/lib/listing-categories";
import { ensureNonNegative, isNonNegative } from "@/lib/validation";
import type { ListingCategory, ListingType, ListingCondition } from "@recycle/shared";
import { useUploadListingImagesMutation, useCreateListingMutation } from "@/hooks/use-listings";
import { getApiErrorDisplayMessage } from "@/lib/api/errors";

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB, match backend
const MIN_FILE_SIZE = 100; // Match backend: reject empty/truncated files
const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function CreateListingPage() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ListingCategory | "">("");
  const [type, setType] = useState<ListingType>("sell");
  const [condition, setCondition] = useState<ListingCondition>("good");
  const [priceInput, setPriceInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [listingLocation, setListingLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError(t("listing.locationUnsupported"));
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setLocationError(t("listing.locationErrorSecureContext"));
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setListingLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocationLoading(false);
      },
      (err: GeolocationPositionError) => {
        const message =
          err.code === 1
            ? t("listing.locationErrorDenied")
            : !window.isSecureContext
              ? t("listing.locationErrorSecureContext")
              : t("listing.locationError");
        setLocationError(message);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [t]);

  const uploadImages = useUploadListingImagesMutation();
  const createListing = useCreateListingMutation();
  const loading = uploadImages.isPending || createListing.isPending;

  const priceNum = priceInput === "" ? undefined : parseFloat(priceInput);
  const priceValid = priceInput === "" || (Number.isNaN(priceNum!) ? false : isNonNegative(priceNum!));
  const priceForSubmit = priceInput === "" ? undefined : ensureNonNegative(priceInput);
  const showPrice = type === "sell" || type === "rent";

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === "" || v === "-" || /^-?\d*\.?\d*$/.test(v)) {
      setPriceInput(v);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const valid: File[] = [];
    const invalidType: string[] = [];
    const invalidSize: string[] = [];
    const emptyFiles: string[] = [];
    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        invalidType.push(f.name);
        continue;
      }
      if (f.size < MIN_FILE_SIZE) {
        emptyFiles.push(f.name);
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        invalidSize.push(f.name);
        continue;
      }
      valid.push(f);
    }
    if (invalidType.length > 0) {
      setError(t("errors.uploadInvalidFileType"));
      // Still add valid files from this batch
    }
    if (emptyFiles.length > 0) {
      setError(t("errors.uploadFileEmpty"));
      // Don't add empty files
    }
    if (invalidSize.length > 0) {
      setError(t("errors.uploadFileTooLarge"));
    }
    const combined = [...selectedFiles, ...valid].slice(0, MAX_IMAGES);
    setSelectedFiles(combined);
    const newPreviews = combined.map((f) => URL.createObjectURL(f));
    filePreviews.forEach((url) => URL.revokeObjectURL(url));
    setFilePreviews(newPreviews);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    const next = selectedFiles.filter((_, i) => i !== index);
    const nextPreviews = filePreviews.filter((_, i) => i !== index);
    URL.revokeObjectURL(filePreviews[index]);
    setSelectedFiles(next);
    setFilePreviews(nextPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError(t("errors.required"));
      return;
    }
    if (!category) {
      setError(t("errors.required"));
      return;
    }
    if (selectedFiles.length === 0) {
      setError(t("listing.atLeastOneImage"));
      return;
    }
    if (showPrice) {
      if (priceInput !== "" && !priceValid) {
        setError(t("errors.priceMin"));
        return;
      }
      const numPrice = priceForSubmit != null ? ensureNonNegative(priceForSubmit) : undefined;
      if (numPrice != null && numPrice < 0) {
        setError(t("errors.priceMin"));
        return;
      }
      if (numPrice == null || numPrice <= 0) {
        setError(t("errors.priceRequiredSellRent"));
        return;
      }
    }

    const filesToUpload = selectedFiles.filter((f) => f.size >= MIN_FILE_SIZE);
    if (filesToUpload.length === 0) {
      setError(t("errors.uploadFileEmpty"));
      return;
    }

    try {
      const uploadResult = await uploadImages.mutateAsync(filesToUpload);
      const imageUrls = uploadResult.urls.map((u) => u.url);

      const numPrice =
        showPrice && priceInput !== ""
          ? ensureNonNegative(priceForSubmit!)
          : undefined;

      const createPayload: Parameters<typeof createListing.mutateAsync>[0] = {
        title: title.trim(),
        description: description.trim() || "",
        categoryCode: category as ListingCategory,
        type,
        condition,
        price: numPrice,
        images: imageUrls,
      };
      if (listingLocation) {
        createPayload.latitude = listingLocation.latitude;
        createPayload.longitude = listingLocation.longitude;
      }

      await createListing.mutateAsync(createPayload);

      setTitle("");
      setDescription("");
      setCategory("");
      setPriceInput("");
      setSelectedFiles([]);
      setListingLocation(null);
      setLocationError(null);
      filePreviews.forEach((url) => URL.revokeObjectURL(url));
      setFilePreviews([]);
    } catch (err) {
      setError(getApiErrorDisplayMessage(err, t));
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6">
      <motion.div
        className="mx-auto max-w-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold sm:text-3xl">{t("listing.create")}</h1>
        <Card className="mt-6 border-2">
          <CardHeader>
            <CardTitle>{t("listing.title")}</CardTitle>
            <CardDescription>Add a new item to share or sell.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="listing-title">{t("listing.title")}</Label>
                <Input
                  id="listing-title"
                  placeholder={t("listing.titlePlaceholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="listing-description">{t("listing.description")}</Label>
                <textarea
                  id="listing-description"
                  className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={t("listing.description")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="listing-category">{t("listing.category")}</Label>
                <select
                  id="listing-category"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ListingCategory | "")}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t("listing.category")}</option>
                  {LISTING_CATEGORIES.map(({ value, labelKey }) => (
                    <option key={value} value={value}>
                      {t(labelKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("listing.type")}</Label>
                <select
                  value={type}
                  onChange={(e) => {
                    const v = e.target.value as ListingType;
                    setType(v);
                    if (v === "free") setPriceInput("");
                  }}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="sell">{t("listing.sell")}</option>
                  <option value="rent">{t("listing.rent")}</option>
                  <option value="free">{t("listing.free")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("listing.condition")}</Label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as ListingCondition)}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="new">{t("listing.new")}</option>
                  <option value="like_new">{t("listing.likeNew")}</option>
                  <option value="good">{t("listing.good")}</option>
                  <option value="fair">{t("listing.fair")}</option>
                  <option value="poor">{t("listing.poor")}</option>
                </select>
              </div>

              {/* Images: required, 1–5 */}
              <div className="space-y-2">
                <Label>{t("listing.images")}</Label>
                <p className="text-xs text-muted-foreground">{t("listing.atLeastOneImage")}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_IMAGES}
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="flex flex-wrap gap-3">
                  {filePreviews.map((url, i) => (
                    <div
                      key={url}
                      className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-input bg-muted"
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6"
                        onClick={() => removeImage(i)}
                        aria-label={t("listing.removeImage")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {selectedFiles.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-input bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-xs">{t("listing.selectImages")}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Optional location – consent-based, reduced precision on server */}
              <div className="space-y-2">
                <Label>{t("listing.location")}</Label>
                <p className="text-xs text-muted-foreground">{t("listing.locationConsent")}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={requestLocation}
                  disabled={locationLoading}
                >
                  <MapPin className="h-4 w-4 shrink-0" />
                  {locationLoading
                    ? t("common.loading")
                    : listingLocation
                      ? t("listing.locationSet")
                      : t("listing.useMyLocation")}
                </Button>
                {locationError && (
                  <p className="text-sm text-destructive" role="alert">{locationError}</p>
                )}
              </div>

              {showPrice && (
                <div className="space-y-2">
                  <Label htmlFor="listing-price">{t("listing.price")} (≥ 0)</Label>
                  <Input
                    id="listing-price"
                    type="text"
                    inputMode="decimal"
                    placeholder={t("listing.pricePlaceholder")}
                    value={priceInput}
                    onChange={handlePriceChange}
                    onBlur={() => {
                      if (priceInput !== "" && !Number.isNaN(parseFloat(priceInput))) {
                        setPriceInput(String(ensureNonNegative(priceInput)));
                      }
                    }}
                    min={0}
                    aria-invalid={!priceValid}
                  />
                  {!priceValid && priceInput !== "" && (
                    <p className="text-sm text-destructive" role="alert">
                      {t("errors.priceMin")}
                    </p>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? t("common.loading") : t("common.submit")}
              </Button>
            </CardContent>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
