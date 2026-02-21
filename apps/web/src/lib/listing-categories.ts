import type { ListingCategory } from "@recycle/shared";

/**
 * All listing categories supported by the app.
 * Used for create/edit listing dropdown and browse filters.
 */
export const LISTING_CATEGORIES: { value: ListingCategory; labelKey: string }[] = [
  { value: "school_1_5", labelKey: "listing.categories.school_1_5" },
  { value: "school_6_8", labelKey: "listing.categories.school_6_8" },
  { value: "school_9_10", labelKey: "listing.categories.school_9_10" },
  { value: "school_11_12_science", labelKey: "listing.categories.school_11_12_science" },
  { value: "school_11_12_commerce", labelKey: "listing.categories.school_11_12_commerce" },
  { value: "school_11_12_arts", labelKey: "listing.categories.school_11_12_arts" },
  { value: "college_ba", labelKey: "listing.categories.college_ba" },
  { value: "college_bsc", labelKey: "listing.categories.college_bsc" },
  { value: "college_bcom", labelKey: "listing.categories.college_bcom" },
  { value: "college_bba", labelKey: "listing.categories.college_bba" },
  { value: "college_bca", labelKey: "listing.categories.college_bca" },
  { value: "college_btech", labelKey: "listing.categories.college_btech" },
  { value: "college_mba", labelKey: "listing.categories.college_mba" },
  { value: "college_law", labelKey: "listing.categories.college_law" },
  { value: "college_medical", labelKey: "listing.categories.college_medical" },
  { value: "college_pharmacy", labelKey: "listing.categories.college_pharmacy" },
  { value: "competitive_upsc", labelKey: "listing.categories.competitive_upsc" },
  { value: "competitive_ssc", labelKey: "listing.categories.competitive_ssc" },
  { value: "competitive_banking", labelKey: "listing.categories.competitive_banking" },
  { value: "competitive_railways", labelKey: "listing.categories.competitive_railways" },
  { value: "competitive_defence", labelKey: "listing.categories.competitive_defence" },
  { value: "competitive_state", labelKey: "listing.categories.competitive_state" },
];
