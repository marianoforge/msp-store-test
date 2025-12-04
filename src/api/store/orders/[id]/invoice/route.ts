import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { INVOICE_MODULE } from "../../../../../modules/invoice";
import type InvoiceModuleService from "../../../../../modules/invoice/service";
import type { InvoiceDTO } from "../../../../../modules/invoice/types";

type InvoiceResponse = {
  invoice: InvoiceDTO | null;
};

type ErrorResponse = {
  message: string;
  invoice: null;
};

const ORDER_ID_REGEX = /^order_[a-zA-Z0-9]{26}$/;

function isValidOrderId(orderId: unknown): orderId is string {
  if (typeof orderId !== "string") {
    return false;
  }
  return ORDER_ID_REGEX.test(orderId);
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse<InvoiceResponse | ErrorResponse>
): Promise<void> {
  const orderId = req.params.id;

  if (!isValidOrderId(orderId)) {
    res.status(400).json({
      message: "Invalid order ID format",
      invoice: null,
    });
    return;
  }

  const invoiceService: InvoiceModuleService =
    req.scope.resolve(INVOICE_MODULE);

  try {
    const invoice = await invoiceService.getInvoiceByOrderId(orderId);

    res.json({
      invoice: invoice
        ? {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            order_id: invoice.order_id,
            status: invoice.status,
          }
        : null,
    });
  } catch (error: any) {
    console.error("[Invoice API] Error:", error.message);
    res.status(500).json({
      message: "Failed to retrieve invoice",
      invoice: null,
    });
  }
}
