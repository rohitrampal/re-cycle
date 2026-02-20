import { z } from 'zod';

// Get user by ID schema
export const getUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
});

// Update user profile schema
export const updateUserProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name too long').optional(),
    phone: z
      .string()
      .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'Invalid phone number')
      .optional(),
    bio: z.string().max(1000, 'Bio too long').optional(),
    institutionId: z.string().uuid('Invalid institution ID').optional(),
  }),
});
