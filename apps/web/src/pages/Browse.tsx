import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function BrowsePage() {
  const { t } = useTranslation();

  return (
    <div className="px-4 py-6 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-5xl"
      >
        <h1 className="text-2xl font-bold sm:text-3xl">{t("navigation.browse")}</h1>
        <p className="mt-1 text-muted-foreground">{t("search.searchPlaceholder")}</p>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-10" placeholder={t("search.searchPlaceholder")} />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            {t("search.filters")}
          </Button>
        </div>
        <motion.div
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } },
            hidden: {},
          }}
        >
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              variants={cardVariants}
            >
              <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                <div className="aspect-video bg-muted" />
                <CardContent className="p-4">
                  <h3 className="font-semibold">Sample listing {i}</h3>
                  <p className="text-sm text-muted-foreground">Category · Location</p>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <span className="font-medium text-primary">Price -</span>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("search.noResults")} (placeholder grid)
        </p>
      </motion.div>
    </div>
  );
}
