import type { BusinessUser } from "../services/businessUser.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      businessUser?: BusinessUser;
    }
  }
}

export {};
