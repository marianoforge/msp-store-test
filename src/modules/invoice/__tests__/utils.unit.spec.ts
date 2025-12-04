import {
  shouldSimulateFailure,
  calculateBackoffDelay,
  sleep,
  retryWithBackoff,
  chunkArray,
} from "../utils"
import type { InvoiceConfig } from "../types"

describe("Invoice Utils", () => {
  describe("shouldSimulateFailure", () => {
    it("should return false when simulateFailures is disabled", () => {
      const config: InvoiceConfig = {
        failureRate: 1,
        simulateFailures: false,
        maxBackoffDelay: 30000,
        baseBackoffDelay: 1000,
      }

      const result = shouldSimulateFailure(config)

      expect(result).toBe(false)
    })

    it("should always fail when failureRate is 1", () => {
      const config: InvoiceConfig = {
        failureRate: 1,
        simulateFailures: true,
        maxBackoffDelay: 30000,
        baseBackoffDelay: 1000,
      }

      const results = Array.from({ length: 10 }, () => shouldSimulateFailure(config))

      expect(results.every((r) => r === true)).toBe(true)
    })

    it("should never fail when failureRate is 0", () => {
      const config: InvoiceConfig = {
        failureRate: 0,
        simulateFailures: true,
        maxBackoffDelay: 30000,
        baseBackoffDelay: 1000,
      }

      const results = Array.from({ length: 10 }, () => shouldSimulateFailure(config))

      expect(results.every((r) => r === false)).toBe(true)
    })
  })

  describe("calculateBackoffDelay", () => {
    const config: InvoiceConfig = {
      failureRate: 0.5,
      simulateFailures: true,
      maxBackoffDelay: 30000,
      baseBackoffDelay: 1000,
    }

    it("should return base delay for first attempt", () => {
      const delay = calculateBackoffDelay(1, config)
      expect(delay).toBe(1000)
    })

    it("should double delay for each attempt", () => {
      expect(calculateBackoffDelay(1, config)).toBe(1000)
      expect(calculateBackoffDelay(2, config)).toBe(2000)
      expect(calculateBackoffDelay(3, config)).toBe(4000)
      expect(calculateBackoffDelay(4, config)).toBe(8000)
    })

    it("should cap at maxBackoffDelay", () => {
      const delay = calculateBackoffDelay(10, config)
      expect(delay).toBe(30000)
    })
  })

  describe("sleep", () => {
    it("should resolve after specified time", async () => {
      const start = Date.now()
      await sleep(50)
      const elapsed = Date.now() - start

      expect(elapsed).toBeGreaterThanOrEqual(45)
      expect(elapsed).toBeLessThan(100)
    })
  })

  describe("chunkArray", () => {
    it("should split array into chunks of specified size", () => {
      const array = [1, 2, 3, 4, 5, 6, 7]
      const chunks = chunkArray(array, 3)

      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]])
    })

    it("should return single chunk if array is smaller than size", () => {
      const array = [1, 2]
      const chunks = chunkArray(array, 5)

      expect(chunks).toEqual([[1, 2]])
    })

    it("should return empty array for empty input", () => {
      const chunks = chunkArray([], 3)
      expect(chunks).toEqual([])
    })
  })

  describe("retryWithBackoff", () => {
    const fastConfig: InvoiceConfig = {
      failureRate: 0,
      simulateFailures: false,
      maxBackoffDelay: 100,
      baseBackoffDelay: 10,
    }

    it("should return result on first success", async () => {
      const operation = jest.fn().mockResolvedValue("success")

      const result = await retryWithBackoff(operation, { config: fastConfig })

      expect(result).toBe("success")
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it("should retry on failure until success", async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("fail 1"))
        .mockRejectedValueOnce(new Error("fail 2"))
        .mockResolvedValue("success")

      const result = await retryWithBackoff(operation, { config: fastConfig })

      expect(result).toBe("success")
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it("should call onAttemptFail callback on each failure", async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValue("success")

      const onAttemptFail = jest.fn()

      await retryWithBackoff(operation, { onAttemptFail, config: fastConfig })

      expect(onAttemptFail).toHaveBeenCalledTimes(1)
      expect(onAttemptFail).toHaveBeenCalledWith(1, expect.any(Error))
    })

    it("should throw after maxAttempts", async () => {
      const operation = jest.fn().mockRejectedValue(new Error("always fails"))

      await expect(
        retryWithBackoff(operation, { maxAttempts: 3, config: fastConfig })
      ).rejects.toThrow("always fails")

      expect(operation).toHaveBeenCalledTimes(3)
    })

    it("should abort immediately when shouldAbort returns true", async () => {
      const operation = jest.fn().mockRejectedValue(new Error("critical"))

      const shouldAbort = (error: Error) => error.message === "critical"

      await expect(
        retryWithBackoff(operation, { shouldAbort, config: fastConfig })
      ).rejects.toThrow("critical")

      expect(operation).toHaveBeenCalledTimes(1)
    })
  })
})

