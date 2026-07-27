import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { allowedOrigins } from "./env.js";
import { requestId } from "./middleware/requestId.js";
import { requestLogging } from "./middleware/requestLogging.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { clerkWebhookRouter } from "./routes/webhooks/clerk.js";
import { v1Router } from "./routes/v1/index.js";
import { healthRouter } from "./routes/health.js";

export const app = express();

app.use(requestId);
app.use(requestLogging);

app.use(
  cors({
    origin(origin, callback) {
      // Sin header Origin (curl, apps móviles nativas, servidor a
      // servidor) no hay nada que el navegador vaya a bloquear — se deja
      // pasar. Un origen de browser no listado simplemente no recibe el
      // header Access-Control-Allow-Origin (el browser lo bloquea del
      // lado del cliente); no hace falta cortar la request acá.
      callback(null, !origin || allowedOrigins.includes(origin));
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
app.use("/api/v1/webhooks", express.raw({ type: "application/json" }), clerkWebhookRouter);

app.use(express.json());
app.use(clerkMiddleware());

app.use("/health", healthRouter);
app.use("/api/v1", v1Router);

app.use(notFoundHandler);
app.use(errorHandler);
