export type InvoiceStatus = "pending" | "created";

export interface InvoiceDTO {
  id: string;
  invoice_number: number | null;
  order_id: string;
  status: InvoiceStatus;
}

export interface InvoiceConfig {
  failureRate: number;
  simulateFailures: boolean;
  maxBackoffDelay: number;
  baseBackoffDelay: number;
}

export const DEFAULT_INVOICE_CONFIG: InvoiceConfig = {
  failureRate: parseFloat(process.env.INVOICE_FAILURE_RATE || "0.5"),
  simulateFailures: process.env.INVOICE_SIMULATE_FAILURES !== "false",
  maxBackoffDelay: parseInt(process.env.INVOICE_MAX_BACKOFF || "30000"),
  baseBackoffDelay: parseInt(process.env.INVOICE_BASE_BACKOFF || "1000"),
};
