import type { MedusaContainer } from "@medusajs/framework/types";
import { INVOICE_MODULE } from "../modules/invoice";
import type InvoiceModuleService from "../modules/invoice/service";
import {
  invoiceLogger,
  shouldSimulateFailure,
  chunkArray,
} from "../modules/invoice/utils";

const MAX_CONCURRENT_PROCESSING = 5;

export default async function retryPendingInvoicesJob(
  container: MedusaContainer
) {
  const invoiceService: InvoiceModuleService =
    container.resolve(INVOICE_MODULE);

  invoiceLogger.info("Checking for pending invoices...");

  try {
    const pendingInvoices = await invoiceService.listInvoices({
      status: "pending",
    });

    if (pendingInvoices.length === 0) {
      invoiceLogger.info("No pending invoices found.");
      return;
    }

    invoiceLogger.info(`Found ${pendingInvoices.length} pending invoices.`);

    const batches = chunkArray(pendingInvoices, MAX_CONCURRENT_PROCESSING);

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map((invoice) => processInvoice(invoiceService, invoice))
      );

      results.forEach((result, index) => {
        const invoice = batch[index];
        if (result.status === "rejected") {
          invoiceLogger.info(
            `Failed to create invoice for order ${invoice.order_id}. Will retry in next run.`
          );
        }
      });
    }
  } catch (error: any) {
    invoiceLogger.error("Error in retry job", error as Error);
  }
}

async function processInvoice(
  invoiceService: InvoiceModuleService,
  invoice: { id: string; order_id: string }
): Promise<void> {
  if (shouldSimulateFailure()) {
    throw new Error("Simulated failure");
  }

  const updated = await invoiceService.assignInvoiceNumber(invoice.id);
  invoiceLogger.success(
    `Invoice #${updated.invoice_number} created for order ${invoice.order_id}`
  );
}

export const config = {
  name: "retry-pending-invoices",
  schedule: process.env.INVOICE_RETRY_SCHEDULE || "*/10 * * * * *",
};
