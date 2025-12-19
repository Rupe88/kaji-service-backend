import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Validation schemas
const createPaymentMethodSchema = z.object({
  type: z.enum(['CASH', 'ONLINE_BANKING', 'WIRE_TRANSFER', 'DIGITAL_WALLET', 'CARD']),
  details: z.record(z.any()).optional(),
  isDefault: z.boolean().default(false).optional(),
});

const createPaymentTransactionSchema = z.object({
  bookingId: z.string().uuid().optional(),
  paymentMethodId: z.string().uuid().optional(),
  amount: z.number().min(0),
  currency: z.string().default('NPR').optional(),
  paymentType: z.enum(['CONTRACTUAL', 'MONTHLY', 'HOURLY', 'PROJECT_BASED', 'EVENT_BASED']),
  notes: z.string().optional(),
});

export class PaymentController {
  /**
   * Create payment method
   */
  async createPaymentMethod(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const body = createPaymentMethodSchema.parse(req.body);

      // If setting as default, unset other defaults
      if (body.isDefault) {
        await prisma.paymentMethod.updateMany({
          where: {
            userId: userId!,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          userId: userId!,
          ...body,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Payment method added successfully',
        data: paymentMethod,
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
   * Get user payment methods
   */
  async getPaymentMethods(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      const paymentMethods = await prisma.paymentMethod.findMany({
        where: {
          userId: userId!,
          isActive: true,
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      res.json({
        success: true,
        data: paymentMethods,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create payment transaction
   */
  async createPaymentTransaction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const body = createPaymentTransactionSchema.parse(req.body);

      // Verify booking if provided
      if (body.bookingId) {
        const booking = await prisma.serviceBooking.findUnique({
          where: { id: body.bookingId },
          select: {
            customerId: true,
            agreedPrice: true,
            paymentStatus: true,
            paidAmount: true,
          },
        });

        if (!booking) {
          return res.status(404).json({
            success: false,
            message: 'Booking not found',
          });
        }

        if (booking.customerId !== userId) {
          return res.status(403).json({
            success: false,
            message: 'You can only pay for your own bookings',
          });
        }
      }

      const transaction = await prisma.paymentTransaction.create({
        data: {
          userId: userId!,
          bookingId: body.bookingId,
          paymentMethodId: body.paymentMethodId,
          amount: body.amount,
          currency: body.currency || 'NPR',
          paymentType: body.paymentType,
          status: 'PENDING',
          notes: body.notes,
        },
        include: {
          booking: {
            select: {
              service: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      });

      // Update booking payment status if transaction is for a booking
      if (body.bookingId) {
        const booking = await prisma.serviceBooking.findUnique({
          where: { id: body.bookingId },
        });

        if (booking) {
          const currentPaidAmount = booking.paidAmount ? Number(booking.paidAmount) : 0;
          const newPaidAmount = currentPaidAmount + body.amount;
          const paymentStatus =
            newPaidAmount >= Number(booking.agreedPrice)
              ? 'PAID'
              : newPaidAmount > 0
              ? 'PARTIAL'
              : 'PENDING';

          await prisma.serviceBooking.update({
            where: { id: body.bookingId },
            data: {
              paidAmount: newPaidAmount,
              paymentStatus,
              paidAt: paymentStatus === 'PAID' ? new Date() : undefined,
            },
          });

          // Update transaction status
          await prisma.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
              status: paymentStatus === 'PAID' ? 'COMPLETED' : 'COMPLETED',
              paidAt: new Date(),
            },
          });
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Payment transaction created successfully',
        data: transaction,
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
   * Get payment history
   */
  async getPaymentHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { page = '1', limit = '20' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const [transactions, total] = await Promise.all([
        prisma.paymentTransaction.findMany({
          where: { userId: userId! },
          include: {
            booking: {
              select: {
                service: {
                  select: {
                    title: true,
                  },
                },
              },
            },
            paymentMethod: {
              select: {
                type: true,
              },
            },
          },
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.paymentTransaction.count({
          where: { userId: userId! },
        }),
      ]);

      res.json({
        success: true,
        data: transactions,
        pagination: {
          page: Number(page),
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();

