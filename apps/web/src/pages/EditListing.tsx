import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ImagePlus, X, MapPin, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LISTING_CATEGORIES } from "@/lib/listing-categories";
import { ensureNonNegative, isNonNegative } from "@/lib/validation";
import type { ListingCategory, ListingType, ListingCondition } from "@recycle/shared";
import {
  useListing,
  useUploadListingImagesMutation,
  useUpdateListingMutation,
} from "@/hooks/use-listings";
import { useAuthStore } from "@/store/auth-store";
import { getApiErrorDisplayMessage } from "@/lib/api/errors";

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_FILE_SIZE = 100;
const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function EditListingPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: listing, isLoading: listingLoading, isError: listingError } = useListing(id);
  const uploadImages = useUploadListingImagesMutation();
  const updateListing = useUpdateListingMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ListingCategory | "">("");
  const [type, setType] = useState<ListingType>("sell");
  const [condition, setCondition] = useState<ListingCondition>("good");
  const [priceInput, setPriceInput] = useState("");
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([]);
  const [listingLocation, setListingLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ownerId = (listing as { user_id?: string })?.user_id ?? (listing as { user?: { id?: string } })?.user?.id;
  const isOwner = !!id && !!authUser?.id && authUser.id === ownerId;

  useEffect(() => {
    if (!listing) return;
    const cat =
      (listing as { category_code?: string }).category_code ??
      (listing as { category?: string }).category ??
      "";
    setTitle(listing.title ?? "");
    setDescription(listing.description ?? "");
    setCategory((cat as ListingCategory) || "");
    setType((listing.type as ListingType) ?? "sell");
    setCondition((listing.condition as ListingCondition) ?? "good");
    setPriceInput(
      listing.price != null && listing.price > 0 ? String(listing.price) : ""
    );
    setExistingImageUrls(listing.images ?? []);
    const loc = listing.location as { latitude?: number; longitude?: number } | null;
    if (loc && typeof loc.latitude === "number" && typeof loc.longitude === "number") {
      setListingLocation({ latitude: loc.latitude, longitude: loc.longitude });
    }
  }, [listing]);

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
            : typeof window !== "undefined" && !window.isSecureContext
              ? t("listing.locationErrorSecureContext")
              : t("listing.locationError");
        setLocationError(message);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [t]);

  const loading = uploadImages.isPending || updateListing.isPending;
  const priceNum = priceInput === "" ? undefined : parseFloat(priceInput);
  const priceValid = priceInput === "" || (Number.isNaN(priceNum!) ? false : isNonNegative(priceNum!));
  const priceForSubmit = priceInput === "" ? undefined : ensureNonNegative(priceInput);
  const showPrice = type === "sell" || type === "rent";
  const totalImageCount = existingImageUrls.length + newFiles.length;

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
    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.type) || f.size < MIN_FILE_SIZE) continue;
      if (f.size > MAX_FILE_SIZE) {
        setError(t("errors.uploadFileTooLarge"));
        break;
      }
      valid.push(f);
    }
    const combined = [...newFiles, ...valid].slice(0, MAX_IMAGES - existingImageUrls.length);
    setNewFiles(combined);
    newFilePreviews.forEach((url) => URL.revokeObjectURL(url));
    setNewFilePreviews(combined.map((f) => URL.createObjectURL(f)));
    e.target.value = "";
  };

  const removeExistingImage = (index: number) => {
    setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(newFilePreviews[index]);
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewFilePreviews((prev) => prev.filter((_, i) => i !== index));
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
    if (existingImageUrls.length + newFiles.length === 0) {
      setError(t("listing.atLeastOneImage"));
      return;
    }
    if (existingImageUrls.length + newFiles.length > MAX_IMAGES) {
      setError(t("listing.atLeastOneImage"));
      return;
    }
    if (showPrice) {
      if (priceInput !== "" && !priceValid) {
        setError(t("errors.priceMin"));
        return;
      }
      if (priceInput !== "") {
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
    }

    if (!id) return;

    try {
      let finalImageUrls = [...existingImageUrls];
      if (newFiles.length > 0) {
        const uploadResult = await uploadImages.mutateAsync(newFiles);
        finalImageUrls = [...existingImageUrls, ...uploadResult.urls.map((u) => u.url)];
      }

      const numPrice =
        showPrice && priceInput !== ""
          ? ensureNonNegative(priceForSubmit!)
          : undefined;

      const updatePayload: Parameters<typeof updateListing.mutateAsync>[0]["data"] = {
        title: title.trim(),
        description: description.trim() || "",
        categoryCode: category as ListingCategory,
        type,
        condition,
        price: numPrice,
        images: finalImageUrls,
      };
      if (listingLocation) {
        updatePayload.latitude = listingLocation.latitude;
        updatePayload.longitude = listingLocation.longitude;
      }
      // Omit location fields to leave existing location unchanged; send latitude/longitude only when set.

      await updateListing.mutateAsync({ id, data: updatePayload });
      navigate(`/listing/${id}`, { replace: true });
    } catch (err) {
      setError(getApiErrorDisplayMessage(err, t));
    }
  };

  if (listingLoading || !listing) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (listingError || !isOwner) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {!isOwner ? t("errors.forbidden") : t("errors.somethingWentWrong")}
          </p>
          <Button variant="outline" className="mt-4 gap-2" asChild>
            <Link to={id ? `/listing/${id}` : "/browse"}>
              <ArrowLeft className="h-4 w-4" />
              {t("common.back")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <motion.div
        className="mx-auto max-w-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button variant="ghost" size="sm" className="mb-4 gap-2" asChild>
          <Link to={`/listing/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold sm:text-3xl">{t("listing.edit")}</h1>
        <Card className="mt-6 border-2">
          <CardHeader>
            <CardTitle>{t("listing.edit")}</CardTitle>
            <CardDescription>Update your listing details. All fields are editable.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-listing-title">{t("listing.title")}</Label>
                <Input
                  id="edit-listing-title"
                  placeholder={t("listing.titlePlaceholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-listing-description">{t("listing.description")}</Label>
                <textarea
                  id="edit-listing-description"
                  className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={t("listing.description")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-listing-category">{t("listing.category")}</Label>
                <select
                  id="edit-listing-category"
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
                  {existingImageUrls.map((url, i) => (
                    <div
                      key={`${url}-${i}`}
                      className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-input bg-muted"
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6"
                        onClick={() => removeExistingImage(i)}
                        aria-label={t("listing.removeImage")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {newFilePreviews.map((url, i) => (
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
                        onClick={() => removeNewImage(i)}
                        aria-label={t("listing.removeImage")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {totalImageCount < MAX_IMAGES && (
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
                  <Label htmlFor="edit-listing-price">{t("listing.price")} (≥ 0)</Label>
                  <Input
                    id="edit-listing-price"
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
                {loading ? t("common.loading") : t("listing.saveChanges")}
              </Button>
            </CardContent>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
