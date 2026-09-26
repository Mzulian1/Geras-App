#!/usr/bin/env tsx
// npm run seed:showcase:clean
//
// Borra todo lo creado por seed-showcase.ts, identificado por el
// prefijo "QA GERAS" (residencias) y el dominio "@qa-geras.cl"
// (profesionales). Nunca toca nada fuera de ese universo.
import "dotenv/config";
import { supabaseAdmin } from "../src/lib/supabase.js";
import { env } from "../src/env.js";
import { canRunSyntheticSeeds } from "../src/lib/seedGuard.js";
import { QA_EMAIL_DOMAIN, QA_RESIDENCE_PREFIX } from "./showcaseData.js";

function assertDevelopmentEnvironment(): void {
  // La decisión vive en src/lib/seedGuard.ts (con tests): mira GERAS_ENV,
  // no NODE_ENV, porque staging corre con NODE_ENV=production.
  const decision = canRunSyntheticSeeds({ nodeEnv: env.NODE_ENV, gerasEnv: env.GERAS_ENV });
  if (!decision.allowed) {
    console.error(`seed:showcase:clean no puede ejecutarse acá. ${decision.reason}`);
    process.exit(1);
  }
}

async function cleanProfessionals(): Promise<void> {
  const { data: users, error } = await supabaseAdmin.from("users").select("id").ilike("email", `%@${QA_EMAIL_DOMAIN}`);
  if (error) throw new Error(`users lookup: ${error.message}`);
  if (!users || users.length === 0) {
    console.log("No hay profesionales QA GERAS que borrar.");
    return;
  }

  const userIds = users.map((u) => u.id);
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("professional_profiles")
    .select("id")
    .in("user_id", userIds);
  if (profilesError) throw new Error(`professional_profiles lookup: ${profilesError.message}`);

  const profileIds = (profiles ?? []).map((p) => p.id);
  if (profileIds.length > 0) {
    for (const table of ["professional_services", "professional_coverage", "professional_availability", "professional_documents"] as const) {
      const { error: delError } = await supabaseAdmin.from(table).delete().in("professional_id", profileIds);
      if (delError) throw new Error(`${table} delete: ${delError.message}`);
    }
    const { error: profileDelError } = await supabaseAdmin.from("professional_profiles").delete().in("id", profileIds);
    if (profileDelError) throw new Error(`professional_profiles delete: ${profileDelError.message}`);
  }

  const { error: userDelError } = await supabaseAdmin.from("users").delete().in("id", userIds);
  if (userDelError) throw new Error(`users delete: ${userDelError.message}`);

  console.log(`✓ Borrados ${profileIds.length} profesionales QA GERAS.`);
}

async function cleanResidences(): Promise<void> {
  const { data: residences, error } = await supabaseAdmin
    .from("residences")
    .select("id")
    .ilike("name", `${QA_RESIDENCE_PREFIX}%`);
  if (error) throw new Error(`residences lookup: ${error.message}`);
  if (!residences || residences.length === 0) {
    console.log("No hay residencias QA GERAS que borrar.");
    return;
  }

  const residenceIds = residences.map((r) => r.id);
  for (const table of ["residence_room_types", "residence_services", "residence_images"] as const) {
    const { error: delError } = await supabaseAdmin.from(table).delete().in("residence_id", residenceIds);
    if (delError) throw new Error(`${table} delete: ${delError.message}`);
  }
  const { error: residenceDelError } = await supabaseAdmin.from("residences").delete().in("id", residenceIds);
  if (residenceDelError) throw new Error(`residences delete: ${residenceDelError.message}`);

  console.log(`✓ Borradas ${residenceIds.length} residencias QA GERAS.`);
}

async function main(): Promise<void> {
  assertDevelopmentEnvironment();
  await cleanProfessionals();
  await cleanResidences();
  console.log("Limpieza QA GERAS completa.");
}

main().catch((err) => {
  console.error("seed:showcase:clean falló:", err instanceof Error ? err.message : err);
  process.exit(1);
});
