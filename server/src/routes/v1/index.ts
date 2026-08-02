import { Router } from "express";
import { meRouter } from "./me.js";
import { professionalRouter } from "./professional.js";
import { professionalsRouter } from "./professionals.js";
import { opportunitiesRouter } from "./opportunities.js";
import { adminRouter } from "./admin.js";
import { adminServicesRouter } from "./services.js";
import { adminResidencesRouter } from "./residences.js";
import { residenceInquiriesRouter, adminResidenceInquiriesRouter } from "./residenceInquiries.js";
import { serviceRequestsRouter } from "./serviceRequests.js";
import { bookingsRouter } from "./bookings.js";

export const v1Router = Router();

v1Router.use("/me", meRouter);
v1Router.use("/professional/opportunities", opportunitiesRouter);
v1Router.use("/professional", professionalRouter);
v1Router.use("/professionals", professionalsRouter);
v1Router.use("/admin/services", adminServicesRouter);
v1Router.use("/admin/residences", adminResidencesRouter);
v1Router.use("/admin/residence-inquiries", adminResidenceInquiriesRouter);
v1Router.use("/admin", adminRouter);
v1Router.use("/service-requests", serviceRequestsRouter);
v1Router.use("/residence-inquiries", residenceInquiriesRouter);
v1Router.use("/bookings", bookingsRouter);
