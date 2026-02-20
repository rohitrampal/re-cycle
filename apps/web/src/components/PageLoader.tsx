import { motion } from "framer-motion";

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </motion.div>
    </div>
  );
}
