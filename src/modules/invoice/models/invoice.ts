import { model } from "@medusajs/framework/utils";

const Invoice = model.define("invoice", {
  id: model.id().primaryKey(),
  invoice_number: model.number().nullable(),
  order_id: model.text().unique(),
  status: model.enum(["pending", "created"]).default("pending"),
});

export default Invoice;
