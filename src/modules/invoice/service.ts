import { MedusaService } from "@medusajs/framework/utils";
import Invoice from "./models/invoice";
import type { InvoiceDTO } from "./types";
import { invoiceLogger, sleep } from "./utils";

const CONCURRENT_RETRY_MAX = 5;
const CONCURRENT_RETRY_DELAY_MS = 100;

class InvoiceModuleService extends MedusaService({
  Invoice,
}) {
  async getInvoiceByOrderId(orderId: string): Promise<InvoiceDTO | null> {
    const invoices = await this.listInvoices({
      order_id: orderId,
    });

    return (invoices[0] as InvoiceDTO) || null;
  }

  async createPendingInvoice(
    orderId: string
  ): Promise<Omit<InvoiceDTO, "invoice_number">> {
    const existing = await this.getInvoiceByOrderId(orderId);
    if (existing) {
      invoiceLogger.info("Invoice already exists for order", {
        orderId,
        invoiceId: existing.id,
      });
      return existing;
    }

    const invoice = await this.createInvoices({
      order_id: orderId,
      status: "pending",
      invoice_number: null,
    });

    invoiceLogger.info("Pending invoice created", {
      orderId,
      invoiceId: invoice.id,
    });

    return invoice as Omit<InvoiceDTO, "invoice_number">;
  }

  private async getNextInvoiceNumber(): Promise<number> {
    const invoices = await this.listInvoices(
      { status: "created" },
      {
        order: { invoice_number: "DESC" },
        take: 1,
      }
    );

    const maxNumber = invoices[0]?.invoice_number ?? 0;
    return maxNumber + 1;
  }

  async assignInvoiceNumber(
    invoiceId: string,
    retryCount: number = 0
  ): Promise<InvoiceDTO> {
    const invoice = await this.retrieveInvoice(invoiceId);

    if (invoice.status === "created" && invoice.invoice_number) {
      invoiceLogger.info("Invoice already has number assigned", {
        invoiceId,
        number: invoice.invoice_number,
      });
      return {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        order_id: invoice.order_id,
        status: invoice.status as "pending" | "created",
      };
    }

    try {
      const nextNumber = await this.getNextInvoiceNumber();

      const [updated] = await this.updateInvoices([
        {
          id: invoiceId,
          invoice_number: nextNumber,
          status: "created",
        },
      ]);

      return {
        id: updated.id,
        invoice_number: updated.invoice_number!,
        order_id: updated.order_id,
        status: updated.status as "pending" | "created",
      };
    } catch (error: any) {
      const isUniqueViolation =
        error.message?.includes("unique") ||
        error.message?.includes("duplicate") ||
        error.code === "23505";

      if (retryCount < CONCURRENT_RETRY_MAX && isUniqueViolation) {
        invoiceLogger.info("Concurrent conflict, retrying", {
          invoiceId,
          retryCount: retryCount + 1,
        });
        await sleep(CONCURRENT_RETRY_DELAY_MS * (retryCount + 1));
        return this.assignInvoiceNumber(invoiceId, retryCount + 1);
      }

      invoiceLogger.error("Failed to assign invoice number", error);
      throw error;
    }
  }
}

export default InvoiceModuleService;
