import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import aiCategorySuggestionService from '../services/aiCategorySuggestion.service';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

const createSubcategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export class CategoryController {
  /**
   * Get all categories with optional AI purposes
   */
  async getAllCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await prisma.serviceCategory.findMany({
        where: {
          isActive: true,
        },
        include: {
          subcategories: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
          },
          _count: {
            select: {
              services: true,
              demands: true,
            },
          },
        },
        orderBy: { order: 'asc' },
      });

      return res.json({
        success: true,
        data: categories,
        count: categories.length,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get category by ID with AI purposes
   */
  async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const category = await prisma.serviceCategory.findUnique({
        where: { id },
        include: {
          subcategories: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
          },
          _count: {
            select: {
              services: true,
              demands: true,
            },
          },
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      return res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get AI-generated purposes for a category
   */
  async getCategoryPurposes(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const category = await prisma.serviceCategory.findUnique({
        where: { id },
        include: {
          subcategories: true,
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      // Return existing AI purposes if available
      if (category.aiGeneratedPurposes && category.aiGeneratedAt) {
        return res.json({
          success: true,
          data: {
            purposes: category.aiGeneratedPurposes,
            examples: category.exampleServices,
            audience: category.targetAudience,
            pricing: category.commonPricingModels,
            generatedAt: category.aiGeneratedAt,
          },
        });
      }

      // Generate new purposes
      const purposes = await aiCategorySuggestionService.generateCategoryPurposes(
        category.name,
        category.description || undefined,
        category.subcategories.map(s => s.name)
      );

      // Update category with generated purposes
      await prisma.serviceCategory.update({
        where: { id },
        data: {
          aiGeneratedPurposes: purposes.aiGeneratedPurposes,
          exampleServices: purposes.exampleServices,
          targetAudience: purposes.targetAudience,
          commonPricingModels: purposes.commonPricingModels,
          aiGeneratedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        data: {
          purposes: purposes.aiGeneratedPurposes,
          examples: purposes.exampleServices,
          audience: purposes.targetAudience,
          pricing: purposes.commonPricingModels,
          generatedAt: new Date(),
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Generate/regenerate AI purposes for a category (Admin only)
   */
  async generateCategoryPurposes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const category = await prisma.serviceCategory.findUnique({
        where: { id },
        include: {
          subcategories: true,
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      const purposes = await aiCategorySuggestionService.generateCategoryPurposes(
        category.name,
        category.description || undefined,
        category.subcategories.map(s => s.name)
      );

      const updated = await prisma.serviceCategory.update({
        where: { id },
        data: {
          aiGeneratedPurposes: purposes.aiGeneratedPurposes,
          exampleServices: purposes.exampleServices,
          targetAudience: purposes.targetAudience,
          commonPricingModels: purposes.commonPricingModels,
          aiGeneratedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        message: 'AI purposes generated successfully',
        data: {
          purposes: updated.aiGeneratedPurposes,
          examples: updated.exampleServices,
          audience: updated.targetAudience,
          pricing: updated.commonPricingModels,
          generatedAt: updated.aiGeneratedAt,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Batch generate purposes for multiple categories (Admin only)
   */
  async batchGeneratePurposes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { categoryIds } = req.body;

      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'categoryIds must be a non-empty array',
        });
      }

      const categories = await prisma.serviceCategory.findMany({
        where: {
          id: { in: categoryIds },
        },
        include: {
          subcategories: true,
        },
      });

      if (categories.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No categories found',
        });
      }

      const results = await aiCategorySuggestionService.batchGeneratePurposes(
        categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          description: cat.description || undefined,
          subcategories: cat.subcategories.map(s => s.name),
        }))
      );

      // Update all categories
      const updatePromises = Array.from(results.entries()).map(([categoryId, purposes]) =>
        prisma.serviceCategory.update({
          where: { id: categoryId },
          data: {
            aiGeneratedPurposes: purposes.aiGeneratedPurposes,
            exampleServices: purposes.exampleServices,
            targetAudience: purposes.targetAudience,
            commonPricingModels: purposes.commonPricingModels,
            aiGeneratedAt: new Date(),
          },
        })
      );

      await Promise.all(updatePromises);

      return res.json({
        success: true,
        message: `Generated purposes for ${results.size} categories`,
        data: {
          processed: results.size,
          categories: Array.from(results.keys()),
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get AI suggestions for category improvements (Admin only)
   */
  async getCategorySuggestions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const category = await prisma.serviceCategory.findUnique({
        where: { id },
        include: {
          subcategories: true,
          _count: {
            select: {
              services: true,
              demands: true,
            },
          },
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      // Generate suggestions based on category data
      const suggestions = {
        recommendedSubcategories: [] as string[],
        seoKeywords: [] as string[],
        marketInsights: {
          demandLevel: category._count.demands > 10 ? 'HIGH' : category._count.demands > 5 ? 'MEDIUM' : 'LOW',
          serviceAvailability: category._count.services > 20 ? 'HIGH' : category._count.services > 10 ? 'MEDIUM' : 'LOW',
        },
        improvements: [] as string[],
      };

      // Add some basic suggestions
      if (!category.description || category.description.length < 50) {
        suggestions.improvements.push('Add a more detailed description (at least 50 characters)');
      }

      if (!category.aiGeneratedPurposes) {
        suggestions.improvements.push('Generate AI-powered purpose suggestions');
      }

      if (category.subcategories.length < 3) {
        suggestions.improvements.push('Consider adding more subcategories for better categorization');
      }

      return res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Create new category (Admin only)
   */
  async createCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createCategorySchema.parse(req.body);

      // Check if category with same name exists
      const existing = await prisma.serviceCategory.findUnique({
        where: { name: body.name },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists',
        });
      }

      const category = await prisma.serviceCategory.create({
        data: {
          ...body,
          order: body.order ?? 0,
          isActive: body.isActive ?? true,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
      }
      return next(error);
    }
  }

  /**
   * Update category (Admin only)
   */
  async updateCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const body = updateCategorySchema.parse(req.body);

      const category = await prisma.serviceCategory.update({
        where: { id },
        data: body,
      });

      return res.json({
        success: true,
        message: 'Category updated successfully',
        data: category,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
      }
      return next(error);
    }
  }

  /**
   * Delete category (Admin only)
   */
  async deleteCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if category has services or demands
      const category = await prisma.serviceCategory.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              services: true,
              demands: true,
            },
          },
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      if (category._count.services > 0 || category._count.demands > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category with existing services or demands. Deactivate it instead.',
        });
      }

      await prisma.serviceCategory.delete({
        where: { id },
      });

      return res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Create subcategory (Admin only)
   */
  async createSubcategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { categoryId } = req.params;
      const body = createSubcategorySchema.parse(req.body);

      // Check if category exists
      const category = await prisma.serviceCategory.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      const subcategory = await prisma.serviceSubcategory.create({
        data: {
          categoryId,
          name: body.name,
          description: body.description,
          isActive: body.isActive ?? true,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Subcategory created successfully',
        data: subcategory,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
      }
      return next(error);
    }
  }

  /**
   * Update subcategory (Admin only)
   */
  async updateSubcategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { categoryId, subcategoryId } = req.params;
      const body = createSubcategorySchema.partial().parse(req.body);

      const subcategory = await prisma.serviceSubcategory.update({
        where: {
          categoryId_name: {
            categoryId,
            name: subcategoryId,
          },
        },
        data: body,
      });

      res.json({
        success: true,
        message: 'Subcategory updated successfully',
        data: subcategory,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
      }
      return next(error);
    }
  }

  /**
   * Delete subcategory (Admin only)
   */
  async deleteSubcategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { categoryId, subcategoryId } = req.params;

      await prisma.serviceSubcategory.delete({
        where: {
          categoryId_name: {
            categoryId,
            name: subcategoryId,
          },
        },
      });

      res.json({
        success: true,
        message: 'Subcategory deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();

