import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CreateListingPage() {
  const { t } = useTranslation();

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
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("listing.title")}</Label>
              <Input placeholder="e.g. Engineering Maths textbook" />
            </div>
            <div className="space-y-2">
              <Label>{t("listing.description")}</Label>
              <textarea
                className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={t("listing.description")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("listing.category")}</Label>
              <Input placeholder={t("listing.category")} />
            </div>
            <div className="space-y-2">
              <Label>{t("listing.price")}</Label>
              <Input type="number" placeholder="0" />
            </div>
            <Button className="w-full" size="lg">
              {t("common.submit")}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
