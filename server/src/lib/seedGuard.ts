// ============================================================
// ¿SE PUEDEN CREAR DATOS SINTÉTICOS EN ESTE AMBIENTE?
//
// La guarda original miraba solo `NODE_ENV === "production"`. Eso deja
// de alcanzar en cuanto existe staging: staging corre CON
// `NODE_ENV=production`, porque es un despliegue real. Con la regla
// vieja, los seeds quedaban bloqueados justamente en el único ambiente
// desplegado donde queremos datos de prueba.
//
// La señal correcta es `GERAS_ENV`, que describe el AMBIENTE, no el modo
// de ejecución de Node:
//
//   development -> permitido
//   staging     -> permitido (es lo que hace útil a staging)
//   production  -> BLOQUEADO, siempre
//
// Se mantiene además el bloqueo por `NODE_ENV=production` cuando
// `GERAS_ENV` no fue declarado: si alguien despliega sin configurar
// `GERAS_ENV`, el default es "development", y no queremos que ese
// descuido habilite escrituras sintéticas contra una base productiva.
// Por eso la regla exige que staging se declare EXPLÍCITAMENTE.
// ============================================================

export interface SeedEnvironment {
  nodeEnv: string;
  gerasEnv: "development" | "staging" | "production";
}

export type SeedDecision = { allowed: true } | { allowed: false; reason: string };

export function canRunSyntheticSeeds(env: SeedEnvironment): SeedDecision {
  if (env.gerasEnv === "production") {
    return {
      allowed: false,
      reason: "GERAS_ENV=production: los datos sintéticos nunca se crean en el ambiente productivo.",
    };
  }

  if (env.gerasEnv === "staging") {
    return { allowed: true };
  }

  // gerasEnv === "development" (incluye el caso "no se declaró").
  if (env.nodeEnv === "production") {
    return {
      allowed: false,
      reason:
        "NODE_ENV=production sin GERAS_ENV declarado. Si esto es staging, declara GERAS_ENV=staging de forma explícita.",
    };
  }

  return { allowed: true };
}
