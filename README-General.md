# MultiSafepay Coding Challenge - Invoice System

## 📋 Overview

This project implements an **Invoice numbering system** with **retry logic** for Medusa e-commerce orders. Each order gets a strictly sequential, gapless invoice number, and the system handles failures gracefully with automatic retries.

## 🎯 Challenge Requirements

### Backend (Medusa)

- ✅ **Invoice entity**: Each order may have a related Invoice
- ✅ **Sequential gapless numbering**: Invoices have strictly sequential numbers (1, 2, 3, …)
- ✅ **No gaps on failure**: If creation fails, the number is not consumed
- ✅ **Random failure simulation**: ~50% simulated failure rate
- ✅ **Retry mechanism**: Keeps retrying **UNTIL SUCCESS** (infinite retries)
- ✅ **Concurrency safety**: No duplicate numbers, no gaps under concurrent creation
- ✅ **Optimistic locking**: Uses unique constraints with retry for race condition prevention

### Frontend (Storefront)

- ✅ **Invoice display**: Shows invoice number on order confirmation
- ✅ **Pending state**: Shows "pending" status if invoice not yet created
- ✅ **Manual refresh**: User can refresh to check for updated status

---

## 🏗️ Architecture

### Backend Components

```
backend/src/
├── modules/invoice/
│   ├── models/invoice.ts      # Invoice data model
│   ├── service.ts             # Business logic with sequential numbering
│   ├── types.ts               # TypeScript types and configuration
│   ├── utils.ts               # Shared utilities (logger, retry, etc.)
│   └── index.ts               # Module definition
├── subscribers/
│   └── order-placed-invoice.ts # Event listener for order.placed (infinite retry)
├── jobs/
│   └── retry-pending-invoices.ts # Background retry job (safety net)
└── api/store/orders/[id]/invoice/
    └── route.ts               # API endpoint for invoice lookup
```

### How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Order Placed  │────▶│    Subscriber    │────▶│  Create Pending │
│     Event       │     │  (order.placed)  │     │    Invoice      │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                               ┌──────────────────┐
                                               │  Attempt to      │
                                               │  Assign Number   │
                                               │  (50% failure)   │
                                               └────────┬─────────┘
                                                        │
                              ┌─────────────────────────┴─────────────────────────┐
                              │                                                   │
                              ▼                                                   ▼
                    ┌─────────────────┐                                ┌─────────────────┐
                    │    SUCCESS!     │                                │     FAILURE     │
                    │ Invoice #N      │                                │                 │
                    │   assigned      │                                └────────┬────────┘
                    └─────────────────┘                                         │
                                                                                ▼
                                                                     ┌─────────────────┐
                                                                     │ Exponential     │
                                                                     │ Backoff Wait    │
                                                                     │ (1s, 2s, 4s...) │
                                                                     └────────┬────────┘
                                                                              │
                                                                              ▼
                                                                     ┌─────────────────┐
                                                                     │ RETRY (infinite)│
                                                                     │ until success   │──────┐
                                                                     └─────────────────┘      │
                                                                              ▲               │
                                                                              └───────────────┘
```

### ⚠️ Important: Invoice Number Assignment

**The invoice number is assigned on SUCCESS, not on order creation.**

This means if multiple orders are created and some fail initially:

| Time  | Event             | Result            |
| ----- | ----------------- | ----------------- |
| 10:00 | Order A created   | Invoice: pending  |
| 10:01 | Order A attempt 1 | ❌ Fail           |
| 10:02 | Order B created   | Invoice: pending  |
| 10:02 | Order B attempt 1 | ✅ **Invoice #1** |
| 10:03 | Order A attempt 2 | ❌ Fail           |
| 10:05 | Order A attempt 3 | ✅ **Invoice #2** |

**Result:**

- Order B → Invoice **#1** (even though created after A)
- Order A → Invoice **#2** (even though created before B)

**This is correct because:**

- ✅ Numbers are strictly sequential (1, 2, 3...)
- ✅ No gaps in numbering
- ✅ Numbers are NOT consumed on failure

---

## 🚀 Setup & Running

### Prerequisites

- Docker Desktop
- Node.js 18+
- npm

### 1. Start Backend (Medusa)

```bash
cd backend

# Install dependencies
npm install --legacy-peer-deps

# Copy environment file
cp .env.template .env

# Start Docker containers (PostgreSQL, Redis, Medusa)
npm run docker:up

# Wait for containers to start, then create admin user
docker compose run --rm medusa npx medusa user -e admin@example.com -p supersecret
```

### 2. Start Frontend (Storefront)

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file and update API key
cp .env.template .env.local

# Get the publishable API key from Medusa admin
# Go to: http://localhost:9000/app/settings/publishable-api-keys
# Update NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY in .env.local

# Start development server
npm run dev
```

### 3. Access the Applications

| Service     | URL                       |
| ----------- | ------------------------- |
| Storefront  | http://localhost:8000     |
| Admin Panel | http://localhost:9000/app |

**Admin Credentials:**

- Email: `admin@example.com`
- Password: `supersecret`

---

## 🧪 Testing the Invoice System

### Method 1: Complete a Purchase

1. Go to http://localhost:8000
2. Add a product to cart
3. Proceed to checkout
4. Fill in shipping details
5. Complete payment (use test payment method)
6. On the order confirmation page, you'll see the **Invoice section**

### Method 2: Watch the Logs

Open a terminal and watch the backend logs:

```bash
docker logs medusa_backend_mytest -f
```

When an order is placed, you'll see:

```
[Invoice] Order placed: order_01ABC... Attempting to create invoice...
[Invoice] Pending invoice created: inv_123...
[Invoice] Attempt 1 failed for order order_01ABC...: Simulated invoice creation failure
[Invoice] Retrying in 1000ms...
[Invoice] Attempt 2 failed for order order_01ABC...: Simulated invoice creation failure
[Invoice] Retrying in 2000ms...
[Invoice] SUCCESS! Invoice #1 created for order order_01ABC... on attempt 3
```

### Real Test Example

Here's an actual test run from the system:

```
[Invoice] Order placed: order_01KBMM4G429R9TN1HD8WSYPM5D. Attempting to create invoice...
[Invoice] Pending invoice created: 01KBMM4G7FD1WS0ZNNW0TAGMGE
[Invoice] Attempt 1 failed for order order_01KBMM4G429R9TN1HD8WSYPM5D: Simulated invoice creation failure
[Invoice] Retrying in 1000ms...
[Invoice] Attempt 2 failed for order order_01KBMM4G429R9TN1HD8WSYPM5D: Simulated invoice creation failure
[Invoice] Retrying in 2000ms...
[Invoice] SUCCESS! Invoice #2 created for order order_01KBMM4G429R9TN1HD8WSYPM5D on attempt 3
```

### Method 3: Test the API Directly

```bash
# Get invoice for an order
curl http://localhost:9000/store/orders/{ORDER_ID}/invoice \
  -H "x-publishable-api-key: YOUR_PUBLISHABLE_KEY"
```

Response when invoice is created:

```json
{
  "invoice": {
    "id": "inv_123...",
    "invoice_number": 1,
    "order_id": "order_01ABC...",
    "status": "created"
  }
}
```

Response when invoice is pending:

```json
{
  "invoice": {
    "id": "inv_123...",
    "invoice_number": null,
    "order_id": "order_01ABC...",
    "status": "pending"
  }
}
```

### Method 4: Test Concurrent Orders

To verify no duplicate numbers under concurrency, you can create multiple orders simultaneously:

```bash
# In multiple terminal windows, complete checkouts at the same time
# Check that invoice numbers are sequential with no gaps
```

---

## 📁 Key Files

### Backend

| File                                         | Purpose                                                    |
| -------------------------------------------- | ---------------------------------------------------------- |
| `src/modules/invoice/models/invoice.ts`      | Invoice data model (id, invoice_number, order_id, status)  |
| `src/modules/invoice/service.ts`             | Business logic with optimistic locking for numbering       |
| `src/modules/invoice/types.ts`               | TypeScript interfaces and configurable constants           |
| `src/modules/invoice/utils.ts`               | Shared utilities (logger, retry with backoff, sleep, etc.) |
| `src/modules/invoice/index.ts`               | Module registration                                        |
| `src/subscribers/order-placed-invoice.ts`    | Listens to `order.placed` event, retries until success     |
| `src/jobs/retry-pending-invoices.ts`         | Background job that retries pending invoices (parallel)    |
| `src/api/store/orders/[id]/invoice/route.ts` | REST endpoint to get invoice by order ID (with validation) |
| `medusa-config.ts`                           | Module registration in Medusa config                       |

### Frontend

| File                                                       | Purpose                                           |
| ---------------------------------------------------------- | ------------------------------------------------- |
| `src/modules/order/components/invoice-details/index.tsx`   | React component to display invoice status         |
| `src/modules/order/templates/order-completed-template.tsx` | Order confirmation page (includes InvoiceDetails) |
| `src/modules/order/templates/order-details-template.tsx`   | Order details page (includes InvoiceDetails)      |

---

## 🔧 Configuration

### Retry Settings

In `src/subscribers/order-placed-invoice.ts`:

- **Max attempts**: ∞ (infinite - keeps retrying until success)
- **Backoff**: Exponential (1s, 2s, 4s, 8s, 16s, 30s max)
- **Failure rate**: 50% (simulated)

In `src/jobs/retry-pending-invoices.ts`:

- **Schedule**: Every 10 seconds (`*/10 * * * * *`)
- **Failure rate**: 50% (simulated)
- **Purpose**: Safety net for any orphaned pending invoices

### Database

The invoice table schema:

```sql
CREATE TABLE invoice (
  id VARCHAR PRIMARY KEY,
  invoice_number INTEGER UNIQUE,  -- NULL until assigned
  order_id VARCHAR UNIQUE NOT NULL,
  status VARCHAR DEFAULT 'pending',  -- 'pending' or 'created'
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🎨 Frontend UI States

### Invoice Created

```
┌─────────────────────────────────────────┐
│ Invoice                                 │
│ Invoice #: 42                  Created  │
└─────────────────────────────────────────┘
```

### Invoice Pending

```
┌─────────────────────────────────────────┐
│ Invoice                                 │
│ Invoice is being generated... Pending   │
│                              [Refresh]  │
└─────────────────────────────────────────┘
```

---

## 🛡️ Concurrency & Safety

### Race Condition Prevention

1. **Optimistic Locking**: Uses unique constraint with retry on conflict
2. **Atomic Operations**: Number selection and assignment happen atomically
3. **Unique Constraint**: Database enforces unique invoice numbers
4. **Idempotent Creation**: `createPendingInvoice` checks for existing invoice first

### Failure Scenarios Handled

| Scenario                       | Handling                                 |
| ------------------------------ | ---------------------------------------- |
| Creation fails (50% simulated) | Retry with exponential backoff           |
| Number already taken           | Get next number and retry                |
| Server crash during retry      | Background job picks up pending invoices |
| Concurrent order placement     | Optimistic locking serializes assignment |
| Max backoff reached            | Continues retrying every 30s             |

---

## 🧪 Unit Tests

### Backend Tests (Jest)

```bash
cd backend && npm run test:unit
```

| Test Suite | Tests | Coverage |
| ---------- | ----- | -------- |
| `utils.unit.spec.ts` | 19 | shouldSimulateFailure, calculateBackoffDelay, sleep, chunkArray, retryWithBackoff |
| `types.unit.spec.ts` | 4 | DEFAULT_INVOICE_CONFIG validation |
| `service.unit.spec.ts` | 7 | getInvoiceByOrderId, createPendingInvoice, getNextInvoiceNumber, assignInvoiceNumber |

### Frontend Tests (Jest + React Testing Library)

```bash
cd frontend && npm test
```

| Test Suite | Tests | Coverage |
| ---------- | ----- | -------- |
| `constants.test.ts` | 8 | INVOICE_STATUS, INVOICE_LABELS, ERROR_MESSAGES, DEBOUNCE_MS |
| `InvoiceDetails.test.tsx` | 11 | Loading, Created, Pending, Error states, Fetch behavior, Debounce |

### Test Files Structure

```
backend/src/modules/invoice/__tests__/
├── utils.unit.spec.ts      # Utility functions tests
├── types.unit.spec.ts      # Types and config tests
└── service.unit.spec.ts    # Service logic tests

frontend/src/modules/order/components/invoice-details/__tests__/
├── constants.test.ts       # Constants validation
└── InvoiceDetails.test.tsx # Component behavior tests
```

---

## 📝 Notes

- The 50% failure rate is intentional for demonstration purposes
- In production, remove the simulated failure and adjust retry settings
- Invoice numbers reflect order of **success**, not order of **creation**
- The background job is a safety net and also simulates 50% failure
- Consider adding invoice PDF generation as a future enhancement

---

## 👤 Author: Mariano De Simone

Developed as part of the MultiSafepay coding challenge.
