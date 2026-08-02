#!/usr/bin/env tsx
// ============================================================
// npm run seed:showcase
//
// Crea 10 profesionales y 10 residencias sintéticos para probar la UI
// con datos reales de la base (no mocks). Usa el mismo camino que
// tomaría un profesional real completando su onboarding y que toma
// Admin al aprobar/publicar:
//   professional_profiles -> professional_services ->
//   professional_coverage -> professional_availability ->
//   professional_documents -> RPC admin_set_verification_status('approved')
//   -> RPC admin_set_professional_active(true) ->
//   RPC admin_set_professional_accepting_requests(true)
// Nunca escribe verification_status/active directamente por SQL: pasa
// por los mismos RPC que expone POST /api/v1/admin/professionals/:id/*.
//
// Simplificaciones documentadas (ver docs/AGENT_START_HERE.md):
//  - No hay cuenta Clerk real detrás de cada `users` sintético: no se
//    puede iniciar sesión como estos profesionales, solo aparecen para
//    que la familia los explore/reserve.
//  - Los documentos no son archivos reales: `file_url` es un
//    placeholder y el estado se deja "approved" directamente (no hay
//    binario que revisar).
//  - `average_rating`/`total_reviews` son valores fijados directamente
//    (evaluación sintética), no calculados a partir de reseñas reales.
// ============================================================
import "dotenv/config";
import { supabaseAdmin } from "../src/lib/supabase.js";
import { env } from "../src/env.js";
import { AVAILABILITY_BLOCKS, PROFESSIONAL_SEEDS, QA_EMAIL_DOMAIN, RESIDENCE_SEEDS } from "./showcaseData.js";

function assertDevelopmentEnvironment(): void {
  if (env.NODE_ENV === "production") {
    console.error("seed:showcase no puede ejecutarse con NODE_ENV=production. Abortando.");
    process.exit(1);
  }
  if (!env.SUPABASE_URL.includes("aupynxrokrpozthbzxle") && !env.SUPABASE_URL.includes("localhost")) {
    console.warn(`Advertencia: SUPABASE_URL (${env.SUPABASE_URL}) no es la que se esperaba para desarrollo.`);
  }
}

function avatarUrl(seed: string): string {
  // Avatares generativos públicos (no fotos de personas reales).
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

function placeholderImage(seed: string, index: number): string {
  // picsum.photos: imágenes placeholder de libre uso, no protegidas.
  return `https://picsum.photos/seed/geras-${seed}-${index}/800/600`;
}

async function seedProfessionals(): Promise<void> {
  for (const spec of PROFESSIONAL_SEEDS) {
    const email = `qa.prof.${spec.slug}@${QA_EMAIL_DOMAIN}`;

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .upsert(
        { clerk_id: `qa_seed_${spec.slug}`, email, role: "professional", active: true },
        { onConflict: "clerk_id" }
      )
      .select("id")
      .single();
    if (userError) throw new Error(`[${spec.slug}] users: ${userError.message}`);

    const { data: existingProfile } = await supabaseAdmin
      .from("professional_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const profileId =
      existingProfile?.id ??
      (
        await supabaseAdmin
          .from("professional_profiles")
          .insert({
            user_id: user.id,
            full_name: spec.fullName,
            profession_id: spec.professionId,
            base_comuna_id: spec.baseComunaId,
            bio: spec.bio,
            years_experience: spec.yearsExperience,
            profile_photo_url: avatarUrl(spec.slug),
          })
          .select("id")
          .single()
          .then(({ data, error }) => {
            if (error) throw new Error(`[${spec.slug}] professional_profiles: ${error.message}`);
            return data;
          })
      ).id;

    // Servicio ofrecido — mismo camino que syncOfferedServices (borra e
    // inserta desde cero para que el seed sea idempotente).
    await supabaseAdmin.from("professional_services").delete().eq("professional_id", profileId);
    const { error: serviceError } = await supabaseAdmin.from("professional_services").insert({
      professional_id: profileId,
      service_id: spec.serviceId,
      price: spec.priceOverride ?? 30000,
      modality: "home_visit",
      active: true,
    });
    if (serviceError) throw new Error(`[${spec.slug}] professional_services: ${serviceError.message}`);

    // Cobertura
    await supabaseAdmin.from("professional_coverage").delete().eq("professional_id", profileId);
    const { error: coverageError } = await supabaseAdmin
      .from("professional_coverage")
      .insert(spec.coverageComunaIds.map((comuna_id) => ({ professional_id: profileId, comuna_id })));
    if (coverageError) throw new Error(`[${spec.slug}] professional_coverage: ${coverageError.message}`);

    // Disponibilidad: bloques semanales recurrentes — proyectan
    // disponibilidad real durante los próximos 30 días y más allá,
    // igual que cualquier profesional real.
    await supabaseAdmin.from("professional_availability").delete().eq("professional_id", profileId);
    const { error: availabilityError } = await supabaseAdmin.from("professional_availability").insert(
      AVAILABILITY_BLOCKS.map((block) => ({
        professional_id: profileId,
        day_of_week: block.day,
        start_time: block.start,
        end_time: block.end,
      }))
    );
    if (availabilityError) throw new Error(`[${spec.slug}] professional_availability: ${availabilityError.message}`);

    // Documentos (sin archivo real — ver cabecera del script)
    await supabaseAdmin.from("professional_documents").delete().eq("professional_id", profileId);
    const { error: documentsError } = await supabaseAdmin.from("professional_documents").insert([
      {
        professional_id: profileId,
        document_type: "national_id",
        file_url: `https://placeholder.geras.cl/qa/${spec.slug}/cedula.pdf`,
        status: "approved",
      },
      {
        professional_id: profileId,
        document_type: "background_check",
        file_url: `https://placeholder.geras.cl/qa/${spec.slug}/antecedentes.pdf`,
        status: "approved",
      },
    ]);
    if (documentsError) throw new Error(`[${spec.slug}] professional_documents: ${documentsError.message}`);

    // Verificación, activo y publicado — SIEMPRE vía los mismos RPC que
    // usa el Panel Admin (admin.ts), nunca UPDATE directo del estado.
    const approve = await supabaseAdmin.rpc("admin_set_verification_status", {
      p_professional_id: profileId,
      p_new_status: "approved",
      p_note: "QA GERAS seed",
    });
    if (approve.error) throw new Error(`[${spec.slug}] admin_set_verification_status: ${approve.error.message}`);

    const active = await supabaseAdmin.rpc("admin_set_professional_active", {
      p_professional_id: profileId,
      p_active: true,
      p_note: "QA GERAS seed",
    });
    if (active.error) throw new Error(`[${spec.slug}] admin_set_professional_active: ${active.error.message}`);

    const publish = await supabaseAdmin.rpc("admin_set_professional_accepting_requests", {
      p_professional_id: profileId,
      p_accepting_requests: true,
      p_note: "QA GERAS seed",
    });
    if (publish.error) throw new Error(`[${spec.slug}] admin_set_professional_accepting_requests: ${publish.error.message}`);

    // Evaluación sintética (ver cabecera del script)
    const { error: ratingError } = await supabaseAdmin
      .from("professional_profiles")
      .update({ average_rating: spec.averageRating, total_reviews: spec.totalReviews })
      .eq("id", profileId);
    if (ratingError) throw new Error(`[${spec.slug}] average_rating: ${ratingError.message}`);

    console.log(`✓ Profesional listo: ${spec.fullName} (${spec.slug})`);
  }
}

async function seedResidences(): Promise<void> {
  for (const spec of RESIDENCE_SEEDS) {
    const { data: existing } = await supabaseAdmin.from("residences").select("id").eq("name", spec.name).maybeSingle();

    const residenceId =
      existing?.id ??
      (
        await supabaseAdmin
          .from("residences")
          .insert({
            name: spec.name,
            comuna_id: spec.comunaId,
            address: `Dirección de demostración ${spec.slug}, ${spec.name}`,
            description: spec.description,
            price_from: spec.priceFrom,
            price_to: spec.priceTo,
            capacity: spec.capacity,
            available_slots: spec.availableSlots,
            admission_mobility_levels: spec.mobilityLevels,
            residence_type: "long_term",
            published: false,
            verified: false,
            active: true,
          })
          .select("id")
          .single()
          .then(({ data, error }) => {
            if (error) throw new Error(`[${spec.slug}] residences: ${error.message}`);
            return data;
          })
      ).id;

    await supabaseAdmin.from("residence_room_types").delete().eq("residence_id", residenceId);
    const { error: roomsError } = await supabaseAdmin
      .from("residence_room_types")
      .insert(spec.roomTypes.map((room) => ({ residence_id: residenceId, ...room })));
    if (roomsError) throw new Error(`[${spec.slug}] residence_room_types: ${roomsError.message}`);

    await supabaseAdmin.from("residence_services").delete().eq("residence_id", residenceId);
    const characteristicRows = spec.characteristics.map((name) => ({ residence_id: residenceId, name, kind: "characteristic" }));
    const includedRows = spec.includedServices.map((name) => ({ residence_id: residenceId, name, kind: "included" }));
    const { error: servicesError } = await supabaseAdmin
      .from("residence_services")
      .insert([...characteristicRows, ...includedRows]);
    if (servicesError) throw new Error(`[${spec.slug}] residence_services: ${servicesError.message}`);

    await supabaseAdmin.from("residence_images").delete().eq("residence_id", residenceId);
    const { error: imagesError } = await supabaseAdmin.from("residence_images").insert(
      [0, 1, 2].map((i) => ({
        residence_id: residenceId,
        url: placeholderImage(spec.slug, i),
        sort_order: i,
        alt_text: `${spec.name} — imagen de demostración ${i + 1}`,
      }))
    );
    if (imagesError) throw new Error(`[${spec.slug}] residence_images: ${imagesError.message}`);

    // Verificar y publicar. No existe un RPC admin dedicado a
    // residencias (a diferencia de professional_profiles) — el Panel
    // Admin las gestiona con UPDATE directo bajo su propia sesión de
    // admin; acá se replica exactamente esa misma escritura, solo que
    // con el cliente service_role en vez de una sesión de admin real.
    const { error: publishError } = await supabaseAdmin
      .from("residences")
      .update({ verified: true, published: true })
      .eq("id", residenceId);
    if (publishError) throw new Error(`[${spec.slug}] publish residence: ${publishError.message}`);

    console.log(`✓ Residencia lista: ${spec.name}`);
  }
}

async function main(): Promise<void> {
  assertDevelopmentEnvironment();
  console.log("Sembrando profesionales QA GERAS...");
  await seedProfessionals();
  console.log("Sembrando residencias QA GERAS...");
  await seedResidences();
  console.log("Listo. 10 profesionales y 10 residencias QA GERAS publicados.");
}

main().catch((err) => {
  console.error("seed:showcase falló:", err instanceof Error ? err.message : err);
  process.exit(1);
});
