import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import prisma from '../config/database';
import { providerDashboardController } from '../controllers/providerDashboard.controller';
import { seekerDashboardController } from '../controllers/seekerDashboard.controller';
/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private (Admin)
 * 
 * 
 * 
 */

const dashboardRouter = Router();
dashboardRouter.get(
  '/stats',
  authenticate,
  requireRole(UserRole.ADMIN),
  async (_req, res, next) => {
    try {
      const stats = {
        totalServices: await prisma.service.count({ where: { isActive: true } }),
        totalProviders: await prisma.industrialKYC.count({ where: { status: 'APPROVED' } }),
        totalDemands: await prisma.serviceDemand.count({ where: { status: 'OPEN' } }),
        totalBookings: await prisma.serviceBooking.count(),
        completedBookings: await prisma.serviceBooking.count({ where: { status: 'COMPLETED' } }),
        pendingServices: await prisma.service.count({ where: { status: 'PENDING' } })
      };

      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/dashboard/provider
 * @desc    Get provider dashboard
 * @access  Private (Industrial)
 */
dashboardRouter.get(
  '/provider',
  authenticate,
  requireRole(UserRole.INDUSTRIAL),
  providerDashboardController.getDashboard.bind(providerDashboardController)
);

dashboardRouter.get(
  '/provider/services',
  authenticate,
  requireRole(UserRole.INDUSTRIAL),
  providerDashboardController.getServices.bind(providerDashboardController)
);

dashboardRouter.get(
  '/provider/radar',
  authenticate,
  requireRole(UserRole.INDUSTRIAL),
  providerDashboardController.getServiceHuntRadar.bind(providerDashboardController)
);

dashboardRouter.get(
  '/provider/ongoing',
  authenticate,
  requireRole(UserRole.INDUSTRIAL),
  providerDashboardController.getOngoingServices.bind(providerDashboardController)
);

/**
 * @route   GET /api/dashboard/seeker
 * @desc    Get seeker dashboard
 * @access  Private (Individual)
 */
dashboardRouter.get(
  '/seeker',
  authenticate,
  requireRole(UserRole.INDIVIDUAL),
  seekerDashboardController.getDashboard.bind(seekerDashboardController)
);

dashboardRouter.get(
  '/seeker/demands',
  authenticate,
  requireRole(UserRole.INDIVIDUAL),
  seekerDashboardController.getDemands.bind(seekerDashboardController)
);

dashboardRouter.get(
  '/seeker/radar',
  authenticate,
  requireRole(UserRole.INDIVIDUAL),
  seekerDashboardController.getDemandResponseRadar.bind(seekerDashboardController)
);

dashboardRouter.get(
  '/seeker/ongoing',
  authenticate,
  requireRole(UserRole.INDIVIDUAL),
  seekerDashboardController.getOngoingServices.bind(seekerDashboardController)
);

export default dashboardRouter;