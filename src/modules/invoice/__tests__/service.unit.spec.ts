describe("InvoiceModuleService", () => {
  const mockListInvoices = jest.fn();
  const mockCreateInvoices = jest.fn();
  const mockUpdateInvoices = jest.fn();
  const mockRetrieveInvoice = jest.fn();

  const createMockService = () => ({
    listInvoices: mockListInvoices,
    createInvoices: mockCreateInvoices,
    updateInvoices: mockUpdateInvoices,
    retrieveInvoice: mockRetrieveInvoice,
    getInvoiceByOrderId: async function (orderId: string) {
      const invoices = await this.listInvoices({ order_id: orderId });
      return invoices[0] || null;
    },
    createPendingInvoice: async function (orderId: string) {
      const existing = await this.getInvoiceByOrderId(orderId);
      if (existing) return existing;
      return this.createInvoices({
        order_id: orderId,
        status: "pending",
        invoice_number: null,
      });
    },
    getNextInvoiceNumber: async function () {
      const invoices = await this.listInvoices(
        { status: "created" },
        { order: { invoice_number: "DESC" }, take: 1 }
      );
      return (invoices[0]?.invoice_number ?? 0) + 1;
    },
    assignInvoiceNumber: async function (invoiceId: string, retryCount = 0) {
      const invoice = await this.retrieveInvoice(invoiceId);
      if (invoice.status === "created" && invoice.invoice_number) {
        return invoice;
      }
      try {
        const nextNumber = await this.getNextInvoiceNumber();
        const [updated] = await this.updateInvoices([
          { id: invoiceId, invoice_number: nextNumber, status: "created" },
        ]);
        return updated;
      } catch (error: any) {
        const isUniqueViolation =
          error.message?.includes("unique") || error.code === "23505";
        if (retryCount < 5 && isUniqueViolation) {
          return this.assignInvoiceNumber(invoiceId, retryCount + 1);
        }
        throw error;
      }
    },
  });

  let service: ReturnType<typeof createMockService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createMockService();
  });

  describe("getInvoiceByOrderId", () => {
    it("should return invoice when found", async () => {
      const mockInvoice = {
        id: "inv_123",
        order_id: "order_abc",
        invoice_number: 1,
        status: "created",
      };
      mockListInvoices.mockResolvedValue([mockInvoice]);

      const result = await service.getInvoiceByOrderId("order_abc");

      expect(mockListInvoices).toHaveBeenCalledWith({ order_id: "order_abc" });
      expect(result).toEqual(mockInvoice);
    });

    it("should return null when not found", async () => {
      mockListInvoices.mockResolvedValue([]);

      const result = await service.getInvoiceByOrderId("order_notfound");

      expect(result).toBeNull();
    });
  });

  describe("createPendingInvoice", () => {
    it("should return existing invoice if already exists", async () => {
      const existingInvoice = {
        id: "inv_existing",
        order_id: "order_abc",
        invoice_number: null,
        status: "pending",
      };
      mockListInvoices.mockResolvedValue([existingInvoice]);

      const result = await service.createPendingInvoice("order_abc");

      expect(mockCreateInvoices).not.toHaveBeenCalled();
      expect(result).toEqual(existingInvoice);
    });

    it("should create new pending invoice if none exists", async () => {
      const newInvoice = {
        id: "inv_new",
        order_id: "order_abc",
        status: "pending",
      };
      mockListInvoices.mockResolvedValue([]);
      mockCreateInvoices.mockResolvedValue(newInvoice);

      const result = await service.createPendingInvoice("order_abc");

      expect(mockCreateInvoices).toHaveBeenCalledWith({
        order_id: "order_abc",
        status: "pending",
        invoice_number: null,
      });
      expect(result).toEqual(newInvoice);
    });
  });

  describe("getNextInvoiceNumber", () => {
    it("should return 1 when no invoices exist", async () => {
      mockListInvoices.mockResolvedValue([]);

      const result = await service.getNextInvoiceNumber();

      expect(result).toBe(1);
    });

    it("should return max + 1", async () => {
      mockListInvoices.mockResolvedValue([{ invoice_number: 10 }]);

      const result = await service.getNextInvoiceNumber();

      expect(result).toBe(11);
    });
  });

  describe("assignInvoiceNumber", () => {
    it("should return existing invoice if already created", async () => {
      const existingInvoice = {
        id: "inv_123",
        order_id: "order_abc",
        invoice_number: 5,
        status: "created",
      };
      mockRetrieveInvoice.mockResolvedValue(existingInvoice);

      const result = await service.assignInvoiceNumber("inv_123");

      expect(mockUpdateInvoices).not.toHaveBeenCalled();
      expect(result.invoice_number).toBe(5);
    });

    it("should assign next number to pending invoice", async () => {
      const pendingInvoice = {
        id: "inv_123",
        order_id: "order_abc",
        invoice_number: null,
        status: "pending",
      };
      const updatedInvoice = {
        id: "inv_123",
        order_id: "order_abc",
        invoice_number: 1,
        status: "created",
      };

      mockRetrieveInvoice.mockResolvedValue(pendingInvoice);
      mockListInvoices.mockResolvedValue([]);
      mockUpdateInvoices.mockResolvedValue([updatedInvoice]);

      const result = await service.assignInvoiceNumber("inv_123");

      expect(mockUpdateInvoices).toHaveBeenCalledWith([
        { id: "inv_123", invoice_number: 1, status: "created" },
      ]);
      expect(result.invoice_number).toBe(1);
    });

    it("should retry on unique constraint violation", async () => {
      const pendingInvoice = {
        id: "inv_123",
        order_id: "order_abc",
        invoice_number: null,
        status: "pending",
      };
      const updatedInvoice = {
        id: "inv_123",
        order_id: "order_abc",
        invoice_number: 2,
        status: "created",
      };

      mockRetrieveInvoice.mockResolvedValue(pendingInvoice);
      mockListInvoices.mockResolvedValue([{ invoice_number: 1 }]);

      const uniqueError = new Error("unique constraint violation");
      mockUpdateInvoices
        .mockRejectedValueOnce(uniqueError)
        .mockResolvedValueOnce([updatedInvoice]);

      const result = await service.assignInvoiceNumber("inv_123");

      expect(mockUpdateInvoices).toHaveBeenCalledTimes(2);
      expect(result.invoice_number).toBe(2);
    });

    it("should throw after max retries on unique violation", async () => {
      const pendingInvoice = {
        id: "inv_123",
        order_id: "order_abc",
        invoice_number: null,
        status: "pending",
      };

      mockRetrieveInvoice.mockResolvedValue(pendingInvoice);
      mockListInvoices.mockResolvedValue([]);

      const uniqueError = new Error("unique constraint violation");
      mockUpdateInvoices.mockRejectedValue(uniqueError);

      await expect(service.assignInvoiceNumber("inv_123")).rejects.toThrow(
        "unique constraint violation"
      );

      expect(mockUpdateInvoices).toHaveBeenCalledTimes(6);
    });

    it("should throw immediately on non-unique errors", async () => {
      const pendingInvoice = {
        id: "inv_123",
        order_id: "order_abc",
        invoice_number: null,
        status: "pending",
      };

      mockRetrieveInvoice.mockResolvedValue(pendingInvoice);
      mockListInvoices.mockResolvedValue([]);

      const otherError = new Error("database connection failed");
      mockUpdateInvoices.mockRejectedValue(otherError);

      await expect(service.assignInvoiceNumber("inv_123")).rejects.toThrow(
        "database connection failed"
      );

      expect(mockUpdateInvoices).toHaveBeenCalledTimes(1);
    });
  });
});
