import { z } from 'zod';

const listingTypeSchema = z.enum(['sell', 'rent', 'free']);
const categoryCodeSchema = z.string().max(50).optional();

export const createSearchAlertSchema = z.object({
  body: z.object({
    categoryCode: categoryCodeSchema,
    type: listingTypeSchema.optional(),
    query: z.string().max(255).optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radiusKm: z.number().int().min(1).max(100).default(10),
  }),
});

export const getSearchAlertSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
