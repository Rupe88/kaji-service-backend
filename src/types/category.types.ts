import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createSubcategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateSubcategorySchema = createSubcategorySchema.partial();

export interface CategoryPurposeData {
  purposes: string[];
  examples: string[];
  audience: {
    primary: string[];
    secondary: string[];
  };
  pricing: string[];
  generatedAt: Date;
}

export interface CategorySuggestionData {
  recommendedSubcategories: string[];
  seoKeywords: string[];
  marketInsights: {
    demandLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    serviceAvailability: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  improvements: string[];
}

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateSubcategoryInput = z.infer<typeof createSubcategorySchema>;
export type UpdateSubcategoryInput = z.infer<typeof updateSubcategorySchema>;

