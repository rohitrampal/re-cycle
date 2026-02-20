import { z } from 'zod';

// Search institutions schema
export const searchInstitutionsSchema = z.object({
  query: z.object({
    q: z.string().min(2, 'Search query must be at least 2 characters').max(255, 'Search query too long'),
  }),
});

// Create institution schema
export const createInstitutionSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name too long'),
    type: z.enum(['school', 'college', 'university'], {
      errorMap: () => ({ message: 'Type must be school, college, or university' }),
    }),
    address: z.string().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    placeId: z.string().optional(), // Google Place ID
  }),
});
