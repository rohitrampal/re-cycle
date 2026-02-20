import { z } from 'zod';

// Update location schema
export const updateLocationSchema = z.object({
  body: z.object({
    latitude: z
      .number()
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90'),
    longitude: z
      .number()
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180'),
  }),
});

// Get nearby listings schema
export const getNearbyListingsSchema = z.object({
  query: z.object({
    radius: z.coerce.number().positive().max(100, 'Radius cannot exceed 100km').default(10),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});
