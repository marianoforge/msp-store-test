import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { INVOICE_MODULE } from "../modules/invoice";
import type InvoiceModuleService from "../modules/invoice/service";
import {
  invoiceLogger,
  shouldSimulateFailure,
  retryWithBackoff,
  calculateBackoffDelay,
} from "../modules/invoice/utils";
import { DEFAULT_INVOICE_CONFIG } from "../modules/invoice/types";

type OrderPlacedData = {
  id: string;
};

export default async function orderPlacedInvoiceHandler({
  event: { data },
  container,
}: SubscriberArgs<OrderPlacedData>) {
  const orderId = data.id;

  const invoiceService: InvoiceModuleService =
    container.resolve(INVOICE_MODULE);

  invoiceLogger.info("Order placed, attempting to create invoice", { orderId });

  try {
    const pendingInvoice = await invoiceService.createPendingInvoice(orderId);

    const invoice = await retryWithBackoff(
      async () => {
        if (shouldSimulateFailure()) {
          throw new Error("Simulated invoice creation failure");
        }
        return invoiceService.assignInvoiceNumber(pendingInvoice.id);
      },
      {
        onAttemptFail: (attempt, error) => {
          const delay = calculateBackoffDelay(attempt);
          invoiceLogger.info(
            `Attempt ${attempt} failed for order ${orderId}: ${error.message}. Retrying in ${delay}ms...`
          );
        },
        config: DEFAULT_INVOICE_CONFIG,
      }
    );

    invoiceLogger.success(
      `Invoice #${invoice.invoice_number} created for order ${orderId}`
    );
  } catch (error: any) {
    invoiceLogger.error("Unexpected error in order placed handler", error);
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
