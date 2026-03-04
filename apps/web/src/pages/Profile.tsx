import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  User,
  Settings,
  FileText,
  Mail,
  Phone,
  Pencil,
  Loader2,
  Plus,
  LogOut,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuthMe, useUpdateProfileMutation, useLogoutMutation } from "@/hooks/use-auth";
import { useMyListings } from "@/hooks/use-listings";
import { useAuthStore } from "@/store/auth-store";
import { useUIStore } from "@/store/ui-store";
import { SUPPORTED_LANG_CODES, LANGUAGE_NAMES } from "@/i18n/config";
import { LISTING_CATEGORIES } from "@/lib/listing-categories";
import type { SupportedLanguage } from "@/store/ui-store";
import type { UserProfile } from "@recycle/shared";

function categoryLabel(code: string, t: (k: string) => string) {
  const found = LISTING_CATEGORIES.find((c) => c.value === code);
  return found ? t(found.labelKey) : code;
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: me } = useAuthMe();
  const profile = (me ?? user) as UserProfile | undefined;

  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");

  const updateProfile = useUpdateProfileMutation();
  const logoutMutation = useLogoutMutation();
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  const { data: myListingsData, isLoading: listingsLoading } = useMyListings(1, 10);
  const myListings = myListingsData?.data ?? [];
  const pagination = myListingsData?.pagination;

  useEffect(() => {
    if (profile) {
      setEditName(profile.name ?? "");
      setEditPhone(profile.phone ?? "");
      setEditBio((profile as { bio?: string }).bio ?? "");
    }
  }, [profile, editOpen]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        name: editName.trim() || undefined,
        phone: editPhone.trim() || undefined,
        bio: editBio.trim() || undefined,
      });
      setEditOpen(false);
    } catch {
      // Error shown via mutation state
    }
  };

  const displayName = profile?.name ?? profile?.email ?? "";
  const displayEmail = profile?.email ?? "";
  const displayPhone = profile?.phone ?? "";
  const displayBio = (profile as { bio?: string } | undefined)?.bio ?? "";

  return (
    <div className="px-4 py-6 sm:px-6">
      <motion.div
        className="mx-auto max-w-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold sm:text-3xl">{t("profile.myProfile")}</h1>

        {/* Profile card */}
        <Card className="mt-6 border-2">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/20">
              {(profile as { avatar?: string })?.avatar ? (
                <img
                  src={(profile as { avatar: string }).avatar}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <User className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{displayName || t("profile.myProfile")}</CardTitle>
              <CardDescription>{t("profile.manageAccount")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("profile.email")}</span>
                <span className="truncate font-medium">{displayEmail}</span>
              </div>
              {displayPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("auth.phone")}</span>
                  <span className="font-medium">{displayPhone}</span>
                </div>
              )}
              {displayBio && (
                <p className="text-sm text-muted-foreground mt-2 border-t pt-2">{displayBio}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1 justify-start gap-2"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                {t("profile.editProfile")}
              </Button>
              <Button
                variant="outline"
                className="flex-1 justify-start gap-2"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
                {t("profile.settings")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* My Listings */}
        <Card className="mt-6 border-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("profile.myListings")}
              </CardTitle>
              <CardDescription>
                {pagination != null
                  ? pagination.total === 1
                    ? t("profile.listingCount", { count: pagination.total })
                    : t("profile.listingsCount", { count: pagination.total })
                  : ""}
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="default" className="gap-1">
              <Link to="/create">
                <Plus className="h-4 w-4" />
                {t("listing.create")}
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {listingsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
              </div>
            ) : myListings.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                <p className="text-sm">{t("profile.noListings")}</p>
                <Button asChild variant="link" className="mt-2">
                  <Link to="/create">{t("profile.createFirstListing")}</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {myListings.map((listing: { id: string; title: string; images?: string[]; category_code?: string; type?: string }) => (
                  <li key={listing.id}>
                    <Link to={`/listing/${listing.id}`}>
                      <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                          {listing.images?.[0] ? (
                            <img
                              src={listing.images[0]}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                              —
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{listing.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {listing.category_code
                              ? categoryLabel(listing.category_code, t)
                              : ""}
                            {listing.type ? ` · ${t(`listing.${listing.type}`)}` : ""}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {pagination?.hasMore && (
              <div className="mt-4 text-center">
                <Button asChild variant="outline" size="sm">
                  <Link to="/browse">{t("search.results")}</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Profile Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t("profile.editProfile")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="edit-name">{t("auth.name")}</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t("auth.name")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">{t("profile.phoneOptional")}</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+91..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-bio">{t("profile.bio")}</Label>
              <textarea
                id="edit-bio"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder={t("profile.bioPlaceholder")}
                rows={3}
                className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {updateProfile.isError && (
              <p className="text-sm text-destructive" role="alert">
                {updateProfile.error instanceof Error
                  ? updateProfile.error.message
                  : t("errors.somethingWentWrong")}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="flex-1" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("common.save")
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>{t("profile.settings")}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {t("profile.changeLanguage")}
              </Label>
              <select
                value={language}
                onChange={(e) => {
                  const lang = e.target.value as SupportedLanguage;
                  setLanguage(lang);
                  i18n.changeLanguage(lang);
                }}
                className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {SUPPORTED_LANG_CODES.map((code) => (
                  <option key={code} value={code}>
                    {LANGUAGE_NAMES[code]}
                  </option>
                ))}
              </select>
            </div>
            <div className="border-t pt-4">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  logoutMutation.mutate();
                  setSettingsOpen(false);
                }}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {t("auth.logout")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
