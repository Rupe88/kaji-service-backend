import { Router } from 'express';
import {
  getWalletBalance,
  getTransactions,
  earnCoins,
  spendCoins,
  withdrawCoins,
} from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../utils/validation';
import {
  earnCoinsSchema,
  spendCoinsSchema,
  withdrawCoinsSchema,
} from '../controllers/wallet.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/balance', getWalletBalance);
router.get('/transactions', getTransactions);
router.post('/earn', validate(earnCoinsSchema), earnCoins);
router.post('/spend', validate(spendCoinsSchema), spendCoins);
router.post('/withdraw', validate(withdrawCoinsSchema), withdrawCoins);

export default router;
