import { Router } from "express";
import { verifyWebhook } from "@clerk/express/webhooks";
import { AppErrors } from "../../errors/AppError.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../env.js";
import { syncClerkUserEvent } from "../../services/userSync.js";

export const clerkWebhookRouter = Router();

// Montado en app.ts con `express.raw({ type: "application/json" })` ANTES
// del `express.json()` global: la verificación de firma Svix necesita los
// bytes crudos del body exactamente como los mandó Clerk, no una
// reserialización de un objeto ya parseado (el orden de claves o el
// formato numérico podrían no coincidir byte a byte y romper el HMAC).
clerkWebhookRouter.post(
  "/clerk",
  asyncHandler(async (req, res) => {
    let evt;
    try {
      evt = await verifyWebhook(req, { signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET });
    } catch (err) {
      logger.warn("clerk_webhook_invalid_signature", {
        requestId: req.requestId,
        message: err instanceof Error ? err.message : "unknown",
      });
      throw AppErrors.invalidWebhookSignature();
    }

    await syncClerkUserEvent(evt);

    res.status(200).json({ received: true });
  })
);
