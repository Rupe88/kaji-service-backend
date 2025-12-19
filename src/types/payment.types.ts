import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

export const createPaymentMethodSchema = z.object({
  type: z.enum(['CASH', 'ONLINE_BANKING', 'WIRE_TRANSFER', 'DIGITAL_WALLET', 'CARD']),
  details: z.record(z.any()).optional(),
  isDefault: z.boolean().default(false).optional(),
});

export const updatePaymentMethodSchema = createPaymentMethodSchema.partial();

export const createPaymentTransactionSchema = z.object({
  bookingId: z.string().uuid().optional(),
  paymentMethodId: z.string().uuid().optional(),
  amount: z.number().min(0),
  currency: z.string().default('NPR').optional(),
  paymentType: z.enum(['CONTRACTUAL', 'MONTHLY', 'HOURLY', 'PROJECT_BASED', 'EVENT_BASED']),
  notes: z.string().optional(),
});

export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
export type CreatePaymentTransactionInput = z.infer<typeof createPaymentTransactionSchema>;

export interface PaymentMethodData {
  id: string;
  userId: string;
  type: string;
  details?: Record<string, any>;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentTransactionData {
  id: string;
  bookingId?: string;
  userId: string;
  paymentMethodId?: string;
  amount: Decimal;
  currency: string;
  paymentType: string;
  status: string;
  transactionId?: string;
  paidAt?: Date;
  createdAt: Date;
}

