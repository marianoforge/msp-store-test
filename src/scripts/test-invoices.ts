import { ExecArgs } from "@medusajs/framework/types";
import { INVOICE_MODULE } from "../modules/invoice";
import type InvoiceModuleService from "../modules/invoice/service";
import {
  shouldSimulateFailure,
  retryWithBackoff,
  calculateBackoffDelay,
} from "../modules/invoice/utils";
import { DEFAULT_INVOICE_CONFIG } from "../modules/invoice/types";

const NUM_ORDERS = 10;

export default async function testInvoices({ container }: ExecArgs) {
  const invoiceService: InvoiceModuleService =
    container.resolve(INVOICE_MODULE);

  console.log("\n" + "=".repeat(70));
  console.log("🧪 INVOICE CREATION TEST - Simulating", NUM_ORDERS, "orders");
  console.log("=".repeat(70));
  console.log("Failure rate:", DEFAULT_INVOICE_CONFIG.failureRate * 100 + "%");
  console.log("=".repeat(70) + "\n");

  const results: {
    orderId: string;
    invoiceNumber: number | null;
    attempts: number;
  }[] = [];

  const promises = Array.from({ length: NUM_ORDERS }, async (_, i) => {
    const fakeOrderId = `test_order_${Date.now()}_${i}`;
    let attempts = 0;

    console.log(`[Order ${i + 1}] Starting... (${fakeOrderId})`);

    try {
      const pendingInvoice = await invoiceService.createPendingInvoice(
        fakeOrderId
      );

      const invoice = await retryWithBackoff(
        async () => {
          attempts++;
          if (shouldSimulateFailure()) {
            throw new Error("Simulated failure");
          }
          return invoiceService.assignInvoiceNumber(pendingInvoice.id);
        },
        {
          maxAttempts: 10, // Limit for test script
          onAttemptFail: (attempt, error) => {
            const delay = calculateBackoffDelay(attempt);
            console.log(
              `[Order ${
                i + 1
              }] ❌ Attempt ${attempt} failed. Retrying in ${delay}ms...`
            );
          },
          config: DEFAULT_INVOICE_CONFIG,
        }
      );

      console.log(
        `[Order ${i + 1}] ✅ Invoice #${
          invoice.invoice_number
        } created after ${attempts} attempt(s)`
      );

      results.push({
        orderId: fakeOrderId,
        invoiceNumber: invoice.invoice_number,
        attempts,
      });
    } catch (error: any) {
      console.log(
        `[Order ${i + 1}] 💥 Failed after ${attempts} attempts: ${
          error.message
        }`
      );
      results.push({
        orderId: fakeOrderId,
        invoiceNumber: null,
        attempts,
      });
    }
  });

  await Promise.all(promises);

  console.log("\n" + "=".repeat(70));
  console.log("📊 SUMMARY");
  console.log("=".repeat(70));

  const successful = results.filter((r) => r.invoiceNumber !== null);
  const failed = results.filter((r) => r.invoiceNumber === null);
  const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0);

  console.log(`Total orders: ${NUM_ORDERS}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Total attempts: ${totalAttempts}`);
  console.log(
    `Average attempts per order: ${(totalAttempts / NUM_ORDERS).toFixed(2)}`
  );

  console.log("\nInvoice numbers assigned:");
  successful
    .sort((a, b) => (a.invoiceNumber || 0) - (b.invoiceNumber || 0))
    .forEach((r) => {
      console.log(
        `  #${r.invoiceNumber} (${r.attempts} attempt${
          r.attempts > 1 ? "s" : ""
        })`
      );
    });

  const numbers = successful.map((r) => r.invoiceNumber!).sort((a, b) => a - b);
  const minNum = numbers[0];
  const maxNum = numbers[numbers.length - 1];
  const expectedCount = maxNum - minNum + 1;
  const hasGaps = numbers.length < expectedCount;

  console.log("\n" + "=".repeat(70));
  console.log("✓ Gapless numbering:", hasGaps ? "❌ GAPS FOUND" : "✅ NO GAPS");
  console.log("✓ Sequential range:", `#${minNum} to #${maxNum}`);
  console.log("=".repeat(70) + "\n");

  console.log("🧹 Cleaning up test invoices...");
  for (const result of results) {
    try {
      const invoice = await invoiceService.getInvoiceByOrderId(result.orderId);
      if (invoice) {
        await invoiceService.deleteInvoices([invoice.id]);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  console.log("✅ Cleanup complete\n");
}
