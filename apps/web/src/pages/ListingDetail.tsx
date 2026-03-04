import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, MapPin, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useListing, useUpdateListingMutation } from "@/hooks/use-listings";
import { useAuthStore } from "@/store/auth-store";
import { LISTING_CATEGORIES } from "@/lib/listing-categories";

export default function ListingDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const authUser = useAuthStore((s) => s.user);
  const { data: listing, isLoading, isError, error } = useListing(id);
  const updateListing = useUpdateListingMutation();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error instanceof Error ? error.message : t("errors.somethingWentWrong")}
          </p>
          <Button variant="outline" className="mt-4 gap-2" asChild>
            <Link to="/browse">
              <ArrowLeft className="h-4 w-4" />
              {t("navigation.browse")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const categoryLabel = (() => {
    const code = "category_code" in listing ? (listing as { category_code?: string }).category_code : (listing as { category?: string }).category;
    const found = LISTING_CATEGORIES.find((c) => c.value === code);
    return found ? t(found.labelKey) : code ?? "";
  })();

  const images = listing.images ?? [];
  const price =
    listing.type === "free" || listing.price == null || listing.price === 0
      ? t("listing.free")
      : `₹${Number(listing.price).toLocaleString()}`;
  const user = "user" in listing ? (listing as { user?: { id?: string; name?: string; email?: string } }).user : null;
  const ownerId = (listing as { user_id?: string }).user_id ?? user?.id;
  const isOwner = !!id && !!authUser?.id && authUser.id === ownerId;
  const hasLocation =
    listing.location &&
    typeof (listing.location as { latitude?: number; longitude?: number }).latitude === "number" &&
    typeof (listing.location as { latitude?: number; longitude?: number }).longitude === "number";

  return (
    <div className="px-4 py-6 sm:px-6">
      <motion.div
        className="mx-auto max-w-3xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button variant="ghost" size="sm" className="mb-4 gap-2" asChild>
          <Link to="/browse">
            <ArrowLeft className="h-4 w-4" />
            {t("navigation.browse")}
          </Link>
        </Button>
        <Card className="overflow-hidden border-2">
          <div className="aspect-video w-full bg-muted">
            {images[0] ? (
              <img
                src={images[0]}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
                {t("listing.images")}
              </div>
            )}
          </div>
          <CardHeader>
            <CardTitle className="text-xl">{listing.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {categoryLabel} · {t(`listing.${listing.type}`)}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {listing.description && (
              <p className="text-muted-foreground">{listing.description}</p>
            )}
            <p className="text-lg font-semibold text-primary">{price}</p>
            {user && (
              <p className="text-sm text-muted-foreground">
                {t("listing.posted")} {user.name ?? user.email ?? ""}
              </p>
            )}
            {isOwner && hasLocation && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={updateListing.isPending}
                onClick={() => updateListing.mutateAsync({ id: id!, data: { clearLocation: true } })}
              >
                <MapPin className="h-4 w-4" />
                {updateListing.isPending ? t("common.loading") : t("listing.removeLocation")}
              </Button>
            )}
          </CardContent>
          <CardFooter>
            {isOwner ? (
              <p className="text-sm text-muted-foreground">{t("listing.yourListing")}</p>
            ) : user?.email || user?.phone ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>{t("listing.contactOwner")}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {user.email && (
                    <DropdownMenuItem asChild>
                      <a
                        href={`mailto:${user.email}?subject=${encodeURIComponent(`Re: ${listing.title}`)}`}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        {t("listing.contactByEmail")}
                      </a>
                    </DropdownMenuItem>
                  )}
                  {user.phone && (
                    <DropdownMenuItem asChild>
                      <a href={`tel:${user.phone}`} className="flex cursor-pointer items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {t("listing.contactByPhone")}
                      </a>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button disabled className="text-muted-foreground">
                {t("listing.contactOwner")}
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
