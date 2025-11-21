import prisma from '../config/database';
import { Decimal } from '@prisma/client/runtime/library';
import { getSocketIOInstance, emitCoinUpdate } from '../config/socket';

export interface CoinRewardOptions {
  userId: string;
  amount: number;
  source: string;
  sourceId?: string;
  description: string;
}

/**
 * Award coins to a user
 * Creates wallet if it doesn't exist
 * Records transaction
 */
export const awardCoins = async (options: CoinRewardOptions): Promise<{
  success: boolean;
  newBalance: Decimal;
  transactionId?: string;
  error?: string;
}> => {
  try {
    const { userId, amount, source, sourceId, description } = options;
    const coinAmount = new Decimal(amount);

    // Get or create wallet
    let wallet = await prisma.platformCoin.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.platformCoin.create({
        data: {
          userId,
          balance: new Decimal(0),
          totalEarned: new Decimal(0),
          totalSpent: new Decimal(0),
          totalWithdrawn: new Decimal(0),
        },
      });
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore.add(coinAmount);
    const totalEarned = wallet.totalEarned.add(coinAmount);

    // Update wallet
    await prisma.platformCoin.update({
      where: { userId },
      data: {
        balance: balanceAfter,
        totalEarned,
      },
    });

    // Create transaction record
    const transaction = await prisma.coinTransaction.create({
      data: {
        userId,
        type: 'EARN',
        amount: coinAmount,
        source,
        sourceId,
        description,
        balanceBefore,
        balanceAfter,
      },
    });

    // Emit real-time coin update via Socket.io
    const io = getSocketIOInstance();
    if (io) {
      emitCoinUpdate(io, userId, {
        balance: balanceAfter.toString(),
        coinsAwarded: amount,
        source,
        description,
        transactionId: transaction.id,
      });
    }

    return {
      success: true,
      newBalance: balanceAfter,
      transactionId: transaction.id,
    };
  } catch (error: any) {
    console.error('Error awarding coins:', error);
    return {
      success: false,
      newBalance: new Decimal(0),
      error: error.message || 'Failed to award coins',
    };
  }
};

/**
 * Calculate coins for training course completion
 * Formula: 50 coins per hour, minimum 100 coins
 */
export const calculateTrainingReward = (courseDuration: number): number => {
  return Math.max(100, courseDuration * 50);
};

