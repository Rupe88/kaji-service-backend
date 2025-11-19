import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

// Validation schemas
export const earnCoinsSchema = z.object({
  amount: z.number().positive(),
  source: z.string(),
  sourceId: z.string().optional(),
  description: z.string(),
});

export const spendCoinsSchema = z.object({
  amount: z.number().positive(),
  recipientId: z.string().optional(),
  description: z.string(),
});

export const withdrawCoinsSchema = z.object({
  amount: z.number().positive(),
  description: z.string().optional(),
});

// Get wallet balance
export const getWalletBalance = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  try {
    // Get or create wallet for user
    let wallet = await prisma.platformCoin.findUnique({
      where: { userId: req.user.id },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await prisma.platformCoin.create({
        data: {
          userId: req.user.id,
          balance: new Decimal(0),
          totalEarned: new Decimal(0),
          totalSpent: new Decimal(0),
          totalWithdrawn: new Decimal(0),
        },
      });
    }

    res.json({
      success: true,
      data: {
        balance: wallet.balance.toString(),
        totalEarned: wallet.totalEarned.toString(),
        totalSpent: wallet.totalSpent.toString(),
        totalWithdrawn: wallet.totalWithdrawn.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch wallet balance',
    });
  }
};

// Get transaction history
export const getTransactions = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  try {
    const { page = '1', limit = '20', type } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {
      userId: req.user.id,
    };

    if (type) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      prisma.coinTransaction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.coinTransaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount.toString(),
        source: t.source,
        sourceId: t.sourceId,
        recipientId: t.recipientId,
        description: t.description,
        balanceBefore: t.balanceBefore.toString(),
        balanceAfter: t.balanceAfter.toString(),
        createdAt: t.createdAt,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transactions',
    });
  }
};

// Earn coins
export const earnCoins = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  try {
    const body = earnCoinsSchema.parse(req.body);
    const amount = new Decimal(body.amount);

    // Get or create wallet
    let wallet = await prisma.platformCoin.findUnique({
      where: { userId: req.user.id },
    });

    if (!wallet) {
      wallet = await prisma.platformCoin.create({
        data: {
          userId: req.user.id,
          balance: new Decimal(0),
          totalEarned: new Decimal(0),
          totalSpent: new Decimal(0),
          totalWithdrawn: new Decimal(0),
        },
      });
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore.add(amount);
    const totalEarned = wallet.totalEarned.add(amount);

    // Update wallet
    await prisma.platformCoin.update({
      where: { userId: req.user.id },
      data: {
        balance: balanceAfter,
        totalEarned,
      },
    });

    // Create transaction record
    const transaction = await prisma.coinTransaction.create({
      data: {
        userId: req.user.id,
        type: 'EARN',
        amount,
        source: body.source,
        sourceId: body.sourceId,
        description: body.description,
        balanceBefore,
        balanceAfter,
      },
    });

    res.json({
      success: true,
      message: 'Coins earned successfully',
      data: {
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount.toString(),
          balanceAfter: transaction.balanceAfter.toString(),
          createdAt: transaction.createdAt,
        },
        newBalance: balanceAfter.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error earning coins:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to earn coins',
    });
  }
};

// Spend coins
export const spendCoins = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  try {
    const body = spendCoinsSchema.parse(req.body);
    const amount = new Decimal(body.amount);

    // Get wallet
    const wallet = await prisma.platformCoin.findUnique({
      where: { userId: req.user.id },
    });

    if (!wallet) {
      res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
      return;
    }

    // Check if user has enough balance
    if (wallet.balance.lessThan(amount)) {
      res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        data: {
          currentBalance: wallet.balance.toString(),
          requiredAmount: amount.toString(),
        },
      });
      return;
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore.sub(amount);
    const totalSpent = wallet.totalSpent.add(amount);

    // Update wallet
    await prisma.platformCoin.update({
      where: { userId: req.user.id },
      data: {
        balance: balanceAfter,
        totalSpent,
      },
    });

    // Create transaction record
    const transaction = await prisma.coinTransaction.create({
      data: {
        userId: req.user.id,
        type: 'SPEND',
        amount,
        recipientId: body.recipientId,
        description: body.description,
        balanceBefore,
        balanceAfter,
      },
    });

    res.json({
      success: true,
      message: 'Coins spent successfully',
      data: {
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount.toString(),
          balanceAfter: transaction.balanceAfter.toString(),
          createdAt: transaction.createdAt,
        },
        newBalance: balanceAfter.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error spending coins:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to spend coins',
    });
  }
};

// Withdraw coins
export const withdrawCoins = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  try {
    const body = withdrawCoinsSchema.parse(req.body);
    const amount = new Decimal(body.amount);

    // Get wallet
    const wallet = await prisma.platformCoin.findUnique({
      where: { userId: req.user.id },
    });

    if (!wallet) {
      res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
      return;
    }

    // Check if user has enough balance
    if (wallet.balance.lessThan(amount)) {
      res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        data: {
          currentBalance: wallet.balance.toString(),
          requiredAmount: amount.toString(),
        },
      });
      return;
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore.sub(amount);
    const totalWithdrawn = wallet.totalWithdrawn.add(amount);

    // Update wallet
    await prisma.platformCoin.update({
      where: { userId: req.user.id },
      data: {
        balance: balanceAfter,
        totalWithdrawn,
      },
    });

    // Create transaction record
    const transaction = await prisma.coinTransaction.create({
      data: {
        userId: req.user.id,
        type: 'WITHDRAW',
        amount,
        description: body.description || 'Withdrawal',
        balanceBefore,
        balanceAfter,
      },
    });

    res.json({
      success: true,
      message: 'Coins withdrawn successfully',
      data: {
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount.toString(),
          balanceAfter: transaction.balanceAfter.toString(),
          createdAt: transaction.createdAt,
        },
        newBalance: balanceAfter.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error withdrawing coins:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to withdraw coins',
    });
  }
};
