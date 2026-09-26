import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { env, originPolicy } from "./env.js";
import { isOriginAllowed } from "./lib/allowedOrigin.js";
import { apiLimiter, webhookLimiter } from "./middleware/rateLimit.js";
import { requestId } from "./middleware/requestId.js";
import { requestLogging } from "./middleware/requestLogging.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { clerkWebhookRouter } from "./routes/webhooks/clerk.js";
import { v1Router } from "./routes/v1/index.js";
import { healthRouter } from "./routes/health.js";

export const app = express();

// Cuántos proxies hay delante. Render pone uno; en local, ninguno.
// El rate limiting depende de esto para ver la IP real del cliente
// (ver middleware/rateLimit.ts).
if (env.TRUST_PROXY_HOPS > 0) {
  app.set("trust proxy", env.TRUST_PROXY_HOPS);
}

app.use(requestId);
app.use(requestLogging);

app.use(
  cors({
    origin(origin, callback) {
      // La política vive en lib/allowedOrigin.ts: lista exacta, más el
      // patrón acotado de Preview de Vercel cuando está encendido.
      //
      // Un origen de browser no permitido simplemente no recibe el header
      // Access-Control-Allow-Origin (el browser lo bloquea del lado del
      // cliente); no hace falta cortar la request acá.
      callback(null, isOriginAllowed(origin, originPolicy));
    },
    credentials: true,
  })
);

// El webhook de Clerk necesita el body crudo (Buffer), no JSON ya
// parseado, para poder verificar la firma Svix — por eso se monta ANTES
// del express.json() global y con su propio parser `raw`. body-parser
// (lo que usa express.json internamente) detecta que el body ya fue
// leído (`req._body`) y no vuelve a tocarlo, así que el resto de las
// rutas de abajo siguen recibiendo JSON parseado normalmente.
app.use("/api/v1/webhooks", webhookLimiter, express.raw({ type: "application/json" }), clerkWebhookRouter);

app.use(express.json());
app.use(clerkMiddleware());

// /health queda FUERA del rate limiting: lo consulta el health check de
// Render cada pocos segundos, y limitarlo haría que la plataforma
// declarara el servicio caído.
app.use("/health", healthRouter);

app.use("/api/v1", apiLimiter, v1Router);

app.use(notFoundHandler);
app.use(errorHandler);
