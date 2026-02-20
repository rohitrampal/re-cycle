import { z } from 'zod';

// Listing type enum
const listingTypeSchema = z.enum(['sell', 'rent', 'free']);
const listingConditionSchema = z.enum(['new', 'like_new', 'good', 'fair', 'poor']);

// Category codes enum
const categoryCodeSchema = z.enum([
  'school_1_5',
  'school_6_8',
  'school_9_10',
  'school_11_12_science',
  'school_11_12_commerce',
  'school_11_12_arts',
  'college_ba',
  'college_bsc',
  'college_bcom',
  'college_bba',
  'college_bca',
  'college_btech',
  'college_mba',
  'college_law',
  'college_medical',
  'college_pharmacy',
  'competitive_upsc',
  'competitive_ssc',
  'competitive_banking',
  'competitive_railways',
  'competitive_defence',
  'competitive_state',
]);

// Create listing schema (for validation plugin)
export const createListingSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(255, 'Title too long'),
    description: z.string().max(5000, 'Description too long').optional(),
    categoryCode: categoryCodeSchema,
    type: listingTypeSchema,
    condition: listingConditionSchema.optional(),
    price: z
      .number()
      .positive('Price must be positive')
      .max(1000000, 'Price too high')
      .optional()
      .refine((val) => {
        // Price is required if type is 'sell' or 'rent'
        return val !== undefined;
      }, 'Price is required for sell or rent listings'),
    images: z
      .array(z.string().url('Invalid image URL'))
      .min(1, 'At least one image is required')
      .max(5, 'Maximum 5 images allowed'),
    latitude: z
      .number()
      .min(-90, 'Invalid latitude')
      .max(90, 'Invalid latitude'),
    longitude: z
      .number()
      .min(-180, 'Invalid longitude')
      .max(180, 'Invalid longitude'),
    institutionId: z.string().uuid('Invalid institution ID').optional(),
  }).refine((data) => {
    // Price validation based on type
    if (data.type === 'sell' || data.type === 'rent') {
      return data.price !== undefined && data.price > 0;
    }
    return true;
  }, {
    message: 'Price is required for sell or rent listings',
    path: ['price'],
  }),
});

// Update listing schema
export const updateListingSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid listing ID'),
  }),
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(255, 'Title too long').optional(),
    description: z.string().max(5000, 'Description too long').optional(),
    categoryCode: categoryCodeSchema.optional(),
    type: listingTypeSchema.optional(),
    condition: listingConditionSchema.optional(),
    price: z
      .number()
      .positive('Price must be positive')
      .max(1000000, 'Price too high')
      .optional(),
    images: z
      .array(z.string().url('Invalid image URL'))
      .max(5, 'Maximum 5 images allowed')
      .optional(),
    latitude: z
      .number()
      .min(-90, 'Invalid latitude')
      .max(90, 'Invalid latitude')
      .optional(),
    longitude: z
      .number()
      .min(-180, 'Invalid longitude')
      .max(180, 'Invalid longitude')
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

// Get listing by ID schema
export const getListingSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid listing ID'),
  }),
  query: z.object({
    include: z.enum(['user']).optional(),
  }).optional(),
});

// Search listings schema (cursor-based pagination)
export const searchListingsSchema = z.object({
  query: z.object({
    categoryCode: categoryCodeSchema.optional(),
    type: listingTypeSchema.optional(),
    condition: listingConditionSchema.optional(),
    minPrice: z.coerce.number().positive().optional(),
    maxPrice: z.coerce.number().positive().optional(),
    freeOnly: z.coerce.boolean().optional(),
    radius: z.coerce.number().positive().max(100, 'Radius cannot exceed 100km').optional(),
    institutionId: z.string().uuid('Invalid institution ID').optional(),
    query: z.string().max(255, 'Search query too long').optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
    cursorId: z.string().uuid().optional(),
    cursorCreatedAt: z.string().optional(), // ISO timestamp of last item for next page
    includeTotal: z.coerce.boolean().optional(), // if true, include total count (extra query)
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  }).refine((data) => {
    if (data.radius !== undefined) {
      return data.latitude !== undefined && data.longitude !== undefined;
    }
    return true;
  }, {
    message: 'Latitude and longitude are required when using radius filter',
    path: ['latitude'],
  }),
});

// Get my listings schema
export const getMyListingsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    isActive: z.coerce.boolean().optional(),
  }),
});

// Delete listing schema
export const deleteListingSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid listing ID'),
  }),
});
