import { Router } from 'express';
import { serviceController } from '../controllers/service.controller';
import { serviceDemandController } from '../controllers/serviceDemand.controller';
import { serviceBookingController } from '../controllers/serviceDemand.controller';

import {
  createServiceSchema,
  updateServiceSchema,
  createServiceDemandSchema,
  createBookingSchema
} from '../types/service.types';

import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../utils/validation';
import { UserRole } from '@prisma/client';

const router = Router();


router.post(
  '/',
  authenticate,
  requireRole(UserRole.INDUSTRIAL),
  validate(createServiceSchema),
  serviceController.createService
);

router.get(
  '/',
  serviceController.searchServices
);

router.get(
  '/my-services',
  authenticate,
  requireRole(UserRole.INDUSTRIAL),
  serviceController.getProviderServices
);

router.get(
  '/trending',
  serviceController.getTrendingServices
);

router.get(
  '/categories/stats',
  serviceController.getCategoryStats
);

router.get(
  '/:id',
  serviceController.getServiceById
);

router.put(
  '/:id',
  authenticate,
  requireRole(UserRole.INDUSTRIAL),
  validate(updateServiceSchema),
  serviceController.updateService
);

router.delete(
  '/:id',
  authenticate,
  requireRole(UserRole.INDUSTRIAL),
  serviceController.deleteService
);

router.post(
  '/:id/approve',
  authenticate,
  requireRole(UserRole.ADMIN),
  serviceController.approveService
);

router.post(
  '/:id/reject',
  authenticate,
  requireRole(UserRole.ADMIN),
  serviceController.rejectService
);

// ============ Service Demand Routes ============

router.post(
  '/demands',
  authenticate,
  requireRole(UserRole.INDIVIDUAL),
  validate(createServiceDemandSchema),
  serviceDemandController.createDemand
);

router.get(
  '/demands',
  authenticate,
  serviceDemandController.searchDemands
);

router.get(
  '/demands/my-demands',
  authenticate,
  requireRole(UserRole.INDIVIDUAL),
  serviceDemandController.getUserDemands
);

router.get(
  '/demands/:id',
  authenticate,
  serviceDemandController.getDemandById
);

router.post(
  '/demands/respond',
  authenticate,
  requireRole(UserRole.INDUSTRIAL),
  serviceDemandController.respondToDemand
);

router.patch(
  '/demands/:id/status',
  authenticate,
  requireRole(UserRole.INDIVIDUAL),
  serviceDemandController.updateDemandStatus
);

// ============ Service Booking Routes ============

router.post(
  '/bookings',
  authenticate,
  requireRole(UserRole.INDIVIDUAL),
  validate(createBookingSchema),
  serviceBookingController.createBooking
);

router.get(
  '/bookings/customer',
  authenticate,
  requireRole(UserRole.INDIVIDUAL),
  serviceBookingController.getCustomerBookings
);

router.get(
  '/bookings/provider',
  authenticate,
  requireRole(UserRole.INDUSTRIAL),
  serviceBookingController.getProviderBookings
);

router.get(
  '/bookings/:id',
  authenticate,
  serviceBookingController.getBookingById
);

router.patch(
  '/bookings/:id/status',
  authenticate,
  requireRole(UserRole.INDUSTRIAL),
  serviceBookingController.updateBookingStatus
);

router.post(
  '/bookings/:id/cancel',
  authenticate,
  requireRole(UserRole.INDIVIDUAL),
  serviceBookingController.cancelBooking
);

export default router;
