import { Router, type Request } from "express";
import {
  createServiceAdminSchema,
  updateServiceAdminSchema,
  reorderServicesSchema,
  type CreateServiceAdminInput,
  type UpdateServiceAdminInput,
  type ReorderServicesInput,
  type TablesUpdate,
} from "@geras/shared";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AppErrors } from "../../errors/AppError.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";

export const adminServicesRouter = Router();

// Catálogo de servicios de Geras (Fase 1): visible en Mobile Familia,
// administrado acá. `services_select_public` (RLS) permite lectura
// pública directa a Supabase, sin filtrar por `active` — es la
// vitrina/consulta la que filtra. Las escrituras SÍ pasan por el
// server, tal como pide la tarea (crear/actualizar/activar/
// desactivar/ordenar), aunque RLS ya las restringiría a admin: así
// queda todo con el mismo logging/auditoría que el resto del panel.
adminServicesRouter.use(requireAuth, requireRole("admin"));

adminServicesRouter.post(
  "/",
  validateBody(createServiceAdminSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as CreateServiceAdminInput;

    const { data: service, error } = await supabaseAdmin
      .from("services")
      .insert({
        profession_id: input.profession_id,
        name: input.name,
        description: input.description || null,
        icon: input.icon || null,
        base_price_min: input.base_price_min ?? null,
        base_price_max: input.base_price_max ?? null,
        duration_minutes: input.duration_minutes,
        display_order: input.display_order,
      })
      .select("*")
      .single();
    if (error) throw new Error(`No se pudo crear el servicio: ${error.message}`);

    logger.info("service_created", { serviceId: service.id, adminId: req.businessUser!.id });
    res.status(201).json({ service });
  })
);

adminServicesRouter.patch(
  "/:id",
  validateBody(updateServiceAdminSchema),
  asyncHandler(async (req, res) => {
    const serviceId = Number(req.params.id);
    const input = req.body as UpdateServiceAdminInput;

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("services")
      .select("id")
      .eq("id", serviceId)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!existing) throw AppErrors.notFound("No existe ese servicio");

    const updates: TablesUpdate<"services"> = { ...input };
    if ("description" in input) updates.description = input.description || null;
    if ("icon" in input) updates.icon = input.icon || null;

    const { data: service, error } = await supabaseAdmin
      .from("services")
      .update(updates)
      .eq("id", serviceId)
      .select("*")
      .single();
    if (error) throw new Error(`No se pudo actualizar el servicio: ${error.message}`);

    logger.info("service_updated", { serviceId, adminId: req.businessUser!.id });
    res.json({ service });
  })
);

async function setServiceActive(req: Request, active: boolean) {
  const serviceId = Number(req.params.id);
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("services")
    .select("id")
    .eq("id", serviceId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw AppErrors.notFound("No existe ese servicio");

  const { error } = await supabaseAdmin.from("services").update({ active }).eq("id", serviceId);
  if (error) throw new Error(`No se pudo actualizar el servicio: ${error.message}`);
  return serviceId;
}

// Desactivar NUNCA borra el registro — servicios ya usados por
// solicitudes/reservas/professional_services históricas deben seguir
// existiendo. "Desactivar" solo lo saca de la vitrina pública.
adminServicesRouter.post(
  "/:id/activate",
  asyncHandler(async (req, res) => {
    const serviceId = await setServiceActive(req, true);
    logger.info("service_activated", { serviceId, adminId: req.businessUser!.id });
    res.json({ active: true });
  })
);

adminServicesRouter.post(
  "/:id/deactivate",
  asyncHandler(async (req, res) => {
    const serviceId = await setServiceActive(req, false);
    logger.info("service_deactivated", { serviceId, adminId: req.businessUser!.id });
    res.json({ active: false });
  })
);

// Reordena en bloque (drag & drop en Admin) — un solo request con la
// lista completa {id, display_order} en vez de N requests sueltos.
adminServicesRouter.post(
  "/reorder",
  validateBody(reorderServicesSchema),
  asyncHandler(async (req, res) => {
    const { order } = req.body as ReorderServicesInput;

    for (const { id, display_order } of order) {
      const { error } = await supabaseAdmin.from("services").update({ display_order }).eq("id", id);
      if (error) throw new Error(`No se pudo reordenar el servicio ${id}: ${error.message}`);
    }

    logger.info("services_reordered", { count: order.length, adminId: req.businessUser!.id });
    res.json({ order });
  })
);
