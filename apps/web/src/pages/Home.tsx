import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, MessageCircle, Search, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden">
      <section className="relative px-4 py-16 sm:px-6 sm:py-24 lg:py-32 gradient-mesh">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.span
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="h-4 w-4" />
            {t("home.academicResourceExchange")}
          </motion.span>
          <motion.h1
            className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {t("common.appName")}
          </motion.h1>
          <motion.p
            className="mt-4 text-lg text-muted-foreground sm:text-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {t("home.heroDescription")}
          </motion.p>
          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button size="lg" asChild className="gap-2 shadow-lg">
              <Link to="/browse">
                <Search className="h-5 w-5" />
                {t("navigation.browse")}
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="gap-2">
              <Link to="/create">
                <BookOpen className="h-5 w-5" />
                {t("listing.create")}
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      <section className="border-t border-border bg-muted/30 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            className="text-2xl font-bold sm:text-3xl"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {t("home.howItWorks")}
          </motion.h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { icon: Upload, titleKey: "home.step1Title", descKey: "home.step1Description" },
              { icon: Search, titleKey: "home.step2Title", descKey: "home.step2Description" },
              { icon: MessageCircle, titleKey: "home.step3Title", descKey: "home.step3Description" },
            ].map(({ icon: Icon, titleKey, descKey }, i) => (
              <motion.div
                key={titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full border-2 transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <span className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </span>
                    <CardTitle>{t(titleKey)}</CardTitle>
                    <CardDescription>{t(descKey)}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
          <motion.div
            className="mt-12 flex justify-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Button variant="outline" size="lg" asChild className="gap-2">
              <Link to="/browse">
                {t("home.getStarted")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
