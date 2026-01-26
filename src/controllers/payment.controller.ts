import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { paymentService } from '../services/payment.service';

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
      return next(error);
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
      return next(error);
    }
  }

  /**
   * Initiate Digital Payment (eSewa / Khalti)
   */
  async initiatePayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { amount, bookingId, paymentMethod, paymentType, notes } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid amount' });
      }

      if (!['ESEWA', 'KHALTI'].includes(paymentMethod)) {
        return res.status(400).json({ success: false, message: 'Invalid payment method' });
      }

      // 1. Create a Pending Transaction Record
      const transaction = await prisma.paymentTransaction.create({
        data: {
          userId: userId!,
          bookingId: bookingId,
          amount: Number(amount),
          currency: 'NPR',
          paymentType: paymentType || 'PROJECT_BASED',
          status: 'PENDING',
          notes: notes || `Initiated ${paymentMethod} payment`,
          // mapped paymentMethodId would be needed in real app, assuming generic for now
        },
      });

      // 2. Generate Gateway Configuration
      let gatewayConfig: any;

      if (paymentMethod === 'ESEWA') {
        gatewayConfig = paymentService.getEsewaPaymentConfig(Number(amount), transaction.id);
      } else if (paymentMethod === 'KHALTI') {
        // Needs customer info
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const khaltiResponse = await paymentService.initiateKhaltiPayment(
          Number(amount) * 100, // Convert to Paisa
          transaction.id,
          `Payment for Booking ${bookingId || 'Generic'}`,
          {
            name: user.email.split('@')[0], // Fallback name
            email: user.email,
            phone: '9800000000', // Placeholder, needs real user phone
          }
        );
        gatewayConfig = khaltiResponse;
      }

      return res.status(201).json({
        success: true,
        message: 'Payment initiated successfully',
        data: {
          transactionId: transaction.id,
          paymentMethod,
          gatewayConfig,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Verify Payment (eSewa / Khalti Callback)
   */
  async verifyPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { paymentMethod, ...params } = req.body;

      let isVerified = false;
      let transactionId = '';

      if (paymentMethod === 'ESEWA') {
        // expect transaction_uuid, total_amount
        const { transaction_uuid, total_amount } = params;
        transactionId = transaction_uuid;
        isVerified = await paymentService.verifyEsewaPayment(total_amount, transaction_uuid);
      } else if (paymentMethod === 'KHALTI') {
        // expect pidx
        const { pidx, transaction_id } = params;
        // We might need to look up transaction by pidx if we stored it, 
        // but here we rely on frontend passing the internal transaction_id optionally
        // or we use a different flow. For simplicity:
        isVerified = await paymentService.verifyKhaltiPayment(pidx);
        transactionId = transaction_id; // Frontend should pass this
      }

      if (!isVerified) {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed',
        });
      }

      if (transactionId) {
        // Update Transaction Status
        const transaction = await prisma.paymentTransaction.update({
          where: { id: transactionId },
          data: {
            status: 'COMPLETED',
            paidAt: new Date(),
          },
        });

        // Update Booking Status if applicable
        if (transaction.bookingId) {
          const booking = await prisma.serviceBooking.findUnique({
            where: { id: transaction.bookingId },
          });

          if (booking) {
            const currentPaid = Number(booking.paidAmount || 0);
            const newPaid = currentPaid + Number(transaction.amount);
            const isFull = newPaid >= Number(booking.agreedPrice);

            await prisma.serviceBooking.update({
              where: { id: booking.id },
              data: {
                paidAmount: newPaid,
                paymentStatus: isFull ? 'PAID' : 'PARTIAL',
                paidAt: isFull ? new Date() : undefined,
              },
            });
          }
        }
      }

      return res.json({
        success: true,
        message: 'Payment verified and completed',
      });

    } catch (error) {
      return next(error);
    }
  }
}

export const paymentController = new PaymentController();

