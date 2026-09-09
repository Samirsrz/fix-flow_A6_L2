import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums";
// import { InvoiceController } from "./invoice.controller";
import { InvoiceValidation } from "./invoice.validation";
import { InvoiceController } from "./invoices.controller";

const router = Router();

router.post(
  "/",
  auth(Role.MANAGER),
  validateRequest(InvoiceValidation.createInvoiceZodSchema),
  InvoiceController.createInvoice,
);

router.get("/", auth(Role.RESIDENT, Role.MANAGER, Role.ADMIN), InvoiceController.getInvoices);

router.get("/:id", auth(Role.RESIDENT, Role.MANAGER, Role.ADMIN), InvoiceController.getInvoiceById);

export const InvoiceRoutes = router;