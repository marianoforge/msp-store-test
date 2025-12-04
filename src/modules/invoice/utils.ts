import { DEFAULT_INVOICE_CONFIG, type InvoiceConfig } from "./types";

export const invoiceLogger = {
  info: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Invoice] ${message}`, data ? JSON.stringify(data) : "");
    }
  },
  error: (message: string, error?: Error) => {
    const errorMessage =
      process.env.NODE_ENV === "production"
        ? "An error occurred"
        : error?.message;
    console.error(`[Invoice] ${message}`, errorMessage);
  },
  success: (message: string, data?: Record<string, unknown>) => {
    console.log(`[Invoice] ✓ ${message}`, data ? JSON.stringify(data) : "");
  },
};

export function shouldSimulateFailure(
  config: InvoiceConfig = DEFAULT_INVOICE_CONFIG
): boolean {
  if (!config.simulateFailures) {
    return false;
  }
  return Math.random() < config.failureRate;
}

export function calculateBackoffDelay(
  attempt: number,
  config: InvoiceConfig = DEFAULT_INVOICE_CONFIG
): number {
  const delay = config.baseBackoffDelay * Math.pow(2, attempt - 1);
  return Math.min(delay, config.maxBackoffDelay);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    onAttemptFail?: (attempt: number, error: Error) => void;
    shouldAbort?: (error: Error) => boolean;
    config?: InvoiceConfig;
  } = {}
): Promise<T> {
  const {
    maxAttempts,
    onAttemptFail,
    shouldAbort,
    config = DEFAULT_INVOICE_CONFIG,
  } = options;
  let attempt = 1;

  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      if (shouldAbort?.(error)) {
        throw error;
      }

      onAttemptFail?.(attempt, error);

      if (maxAttempts !== undefined && attempt >= maxAttempts) {
        throw error;
      }

      const delay = calculateBackoffDelay(attempt, config);
      await sleep(delay);
      attempt++;
    }
  }
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
