import { z } from 'zod';

export const createEntertainmentServiceSchema = z.object({
  serviceId: z.string().uuid().optional(),
  title: z.string().min(5).max(200),
  description: z.string().min(20),
  entertainmentType: z.string().min(2),
  eventTypes: z.array(z.string()).optional(),
  pricing: z.record(z.any()).optional(),
  availability: z.record(z.any()).optional(),
  portfolioUrls: z.array(z.string().url()).optional(),
  videos: z.array(z.string().url()).optional(),
  images: z.array(z.string().url()).optional(),
  socialLinks: z.record(z.string().url()).optional(),
});

export const updateEntertainmentServiceSchema = createEntertainmentServiceSchema.partial();

export type CreateEntertainmentServiceInput = z.infer<typeof createEntertainmentServiceSchema>;
export type UpdateEntertainmentServiceInput = z.infer<typeof updateEntertainmentServiceSchema>;

