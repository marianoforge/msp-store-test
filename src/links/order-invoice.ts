import InvoiceModule from "../modules/invoice";
import OrderModule from "@medusajs/medusa/order";
import { defineLink } from "@medusajs/framework/utils";

export default defineLink(OrderModule.linkable.order, {
  linkable: InvoiceModule.linkable.invoice,
  isList: false,
});
