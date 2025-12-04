import { DEFAULT_INVOICE_CONFIG } from "../types";

describe("Invoice Types", () => {
  describe("DEFAULT_INVOICE_CONFIG", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_INVOICE_CONFIG.failureRate).toBe(0.5);
      expect(DEFAULT_INVOICE_CONFIG.simulateFailures).toBe(true);
      expect(DEFAULT_INVOICE_CONFIG.maxBackoffDelay).toBe(30000);
      expect(DEFAULT_INVOICE_CONFIG.baseBackoffDelay).toBe(1000);
    });

    it("should have failureRate between 0 and 1", () => {
      expect(DEFAULT_INVOICE_CONFIG.failureRate).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_INVOICE_CONFIG.failureRate).toBeLessThanOrEqual(1);
    });

    it("should have positive delay values", () => {
      expect(DEFAULT_INVOICE_CONFIG.maxBackoffDelay).toBeGreaterThan(0);
      expect(DEFAULT_INVOICE_CONFIG.baseBackoffDelay).toBeGreaterThan(0);
    });

    it("should have maxBackoffDelay greater than baseBackoffDelay", () => {
      expect(DEFAULT_INVOICE_CONFIG.maxBackoffDelay).toBeGreaterThan(
        DEFAULT_INVOICE_CONFIG.baseBackoffDelay
      );
    });
  });
});
