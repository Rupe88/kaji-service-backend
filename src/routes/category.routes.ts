import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { validate } from '../utils/validation';
import { createCategorySchema, updateCategorySchema, createSubcategorySchema, updateSubcategorySchema } from '../types/category.types';
import { validateParams } from '../utils/validation';
import { z } from 'zod';

const router = Router();

// Public routes
router.get('/', categoryController.getAllCategories.bind(categoryController));
router.get('/:id', validateParams(z.object({ id: z.string().uuid() })), categoryController.getCategoryById.bind(categoryController));
router.get('/:id/purposes', validateParams(z.object({ id: z.string().uuid() })), categoryController.getCategoryPurposes.bind(categoryController));

// Admin routes
router.post(
  '/',
  authenticate,
  requireRole(UserRole.ADMIN),
  validate(createCategorySchema),
  categoryController.createCategory.bind(categoryController)
);

router.put(
  '/:id',
  authenticate,
  requireRole(UserRole.ADMIN),
  validateParams(z.object({ id: z.string().uuid() })),
  validate(updateCategorySchema),
  categoryController.updateCategory.bind(categoryController)
);

router.delete(
  '/:id',
  authenticate,
  requireRole(UserRole.ADMIN),
  validateParams(z.object({ id: z.string().uuid() })),
  categoryController.deleteCategory.bind(categoryController)
);

router.post(
  '/:id/generate-purposes',
  authenticate,
  requireRole(UserRole.ADMIN),
  validateParams(z.object({ id: z.string().uuid() })),
  categoryController.generateCategoryPurposes.bind(categoryController)
);

router.post(
  '/batch-generate-purposes',
  authenticate,
  requireRole(UserRole.ADMIN),
  categoryController.batchGeneratePurposes.bind(categoryController)
);

router.get(
  '/:id/suggestions',
  authenticate,
  requireRole(UserRole.ADMIN),
  validateParams(z.object({ id: z.string().uuid() })),
  categoryController.getCategorySuggestions.bind(categoryController)
);

// Subcategory routes (Admin only)
router.post(
  '/:categoryId/subcategories',
  authenticate,
  requireRole(UserRole.ADMIN),
  validateParams(z.object({ categoryId: z.string().uuid() })),
  validate(createSubcategorySchema),
  categoryController.createSubcategory.bind(categoryController)
);

router.put(
  '/:categoryId/subcategories/:subcategoryId',
  authenticate,
  requireRole(UserRole.ADMIN),
  validateParams(z.object({ categoryId: z.string().uuid(), subcategoryId: z.string().uuid() })),
  validate(updateSubcategorySchema),
  categoryController.updateSubcategory.bind(categoryController)
);

router.delete(
  '/:categoryId/subcategories/:subcategoryId',
  authenticate,
  requireRole(UserRole.ADMIN),
  validateParams(z.object({ categoryId: z.string().uuid(), subcategoryId: z.string().uuid() })),
  categoryController.deleteSubcategory.bind(categoryController)
);

export default router;

