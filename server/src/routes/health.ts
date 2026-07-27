import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { supabaseAdmin } from "../lib/supabase.js";

export const healthRouter = Router();

// Sin auth a propósito (lo consumen load balancers / uptime checks).
// Solo expone booleans de "¿esto está bien?", nunca URLs/keys/valores de
// env — "comprobación básica de configuración, sin exponer secretos".
healthRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    let supabaseReachable = true;
    try {
      const { error } = await supabaseAdmin.from("platform_config").select("key").limit(1);
      supabaseReachable = !error;
    } catch {
      supabaseReachable = false;
    }

    res.json({
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      checks: {
        // Si el proceso llegó a levantar, env.ts ya validó todas las
        // variables requeridas al boot (o el proceso habría salido).
        env: true,
        supabase: supabaseReachable,
      },
    });
  })
);
