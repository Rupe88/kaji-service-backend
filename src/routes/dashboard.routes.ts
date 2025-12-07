
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import prisma from '../config/database';
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
  async (req, res, next) => {
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
  async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      const services = await prisma.service.findMany({
        where: { providerId: userId },
        select: {
          id: true,
          title: true,
          status: true,
          viewCount: true,
          bookingCount: true,
          averageRating: true
        }
      });
      
      const bookings = await prisma.serviceBooking.findMany({
        where: {
          service: { providerId: userId }
        },
        take: 10,
        orderBy: { bookingDate: 'desc' }
      });
      
      res.json({ success: true, data: { services, bookings } });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/dashboard/customer
 * @desc    Get customer dashboard
 * @access  Private (Individual)
 */
dashboardRouter.get(
  '/customer',
  authenticate,
  requireRole(UserRole.INDIVIDUAL),
  async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      const bookings = await prisma.serviceBooking.findMany({
        where: { customerId: userId },
        include: {
          service: {
            select: {
              title: true,
              provider: {
                select: { companyName: true }
              }
            }
          }
        },
        orderBy: { bookingDate: 'desc' },
        take: 10
      });
      
      const demands = await prisma.serviceDemand.findMany({
        where: { seekerId: userId },
        include: {
          _count: { select: { responses: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      
      res.json({ success: true, data: { bookings, demands } });
    } catch (error) {
      next(error);
    }
  }
);

export { dashboardRouter };