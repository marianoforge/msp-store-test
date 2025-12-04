import InvoiceModuleService from "./service";
import { Module } from "@medusajs/framework/utils";

export const INVOICE_MODULE = "invoice";

export * from "./types";
export * from "./utils";

export default Module(INVOICE_MODULE, {
  service: InvoiceModuleService,
});
