import { z } from 'zod';

export const createRatingSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid listing ID'),
  }),
  body: z.object({
    score: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
  }),
});

export const getListingRatingSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid listing ID'),
  }),
});
