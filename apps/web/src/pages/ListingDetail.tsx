import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ListingDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();

  return (
    <div className="px-4 py-6 sm:px-6">
      <motion.div
        className="mx-auto max-w-3xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden border-2">
          <div className="aspect-video w-full bg-muted" />
          <CardHeader>
            <CardTitle>Listing detail</CardTitle>
            <p className="text-sm text-muted-foreground">{t("listing.posted")} · ID: {id}</p>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Description and details – Coming soon.</p>
          </CardContent>
          <CardFooter>
            <Button>{t("listing.contactOwner")}</Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
