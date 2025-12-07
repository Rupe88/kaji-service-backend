// Augment Express Request to include `user` populated by auth middleware
import { IndividualKYC, User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      // Keep this broad; controllers access `req.user.id` and sometimes other props.
      user?: any;
    }
  }
}

export {};
