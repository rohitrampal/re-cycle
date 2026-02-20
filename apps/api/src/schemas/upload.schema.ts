import { z } from 'zod';

// Upload listing images schema
export const uploadListingImagesSchema = z.object({
  body: z.object({
    files: z.array(z.instanceof(File)).min(1).max(5).optional(),
  }),
});

// Upload avatar schema
export const uploadAvatarSchema = z.object({
  body: z.object({
    file: z.instanceof(File).optional(),
  }),
});
