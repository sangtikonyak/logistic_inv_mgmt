# Enterprise Logistics & WMS Workflow

This document outlines the standard operational procedures and system lifecycles for the Inventory Management System.

## 1. Outbound Fulfillment (Sales to Dispatch)

The outbound process ensures that digital orders are physically verified and carrier-ready before inventory is financially deducted.

### Step 1: Order Placement & Confirmation
*   **Action**: Sales Order created in `DRAFT`.
*   **System State**: `SalesOrder.status = 'DRAFT'`.
*   **Verification**: Inventory availability checked (Optionally create `SalesReservation` to lock stock).

### Step 2: Shipment Allocation
*   **Endpoint**: `POST /api/v1/sales/shipments/:id/allocate`
*   **Action**: Digital instruction to fulfill the shipment.
*   **Event**: `SHIPMENT_ALLOCATED` dispatched via Internal Event Bus.
*   **WMS Action**: `WmsSubscriber` automatically generates a **Picklist** (`warehouse_picklists`).

### Step 3: Physical Picking
*   **Endpoint**: `POST /api/v1/warehouses/picklists/:id/items/:itemId/confirm`
*   **Action**: Warehouse worker physically retrieves goods from the suggested Bin.
*   **System State**: `SalesShipment.status = 'PICKING'` -> `'PICKED'`.

### Step 4: Packing & TMS Integration
*   **Endpoint**: `POST /api/v1/sales/shipments/:id/pack`
*   **Action**: Items verified and packed into shipping containers.
*   **Endpoint**: `POST /api/v1/sales/shipments/:id/dispatch`
*   **Action**: Carrier assigned, tracking number generated.
*   **System State**: `SalesShipment.status = 'DISPATCHED'`.

### Step 5: Financial Posting
*   **Endpoint**: `POST /api/v1/sales/shipments/:id/post`
*   **Action**: Final financial deduction.
*   **Logic**: FIFO Cost Layers consumed; Inventory Ledger (`inventory_movements`) updated with `ISSUE` type.

---

## 2. Inbound Fulfillment (Purchase to Putaway)

The inbound process manages the flow from supplier receipt to final storage.

### Step 1: Goods Receipt
*   **Action**: `PurchaseReceipt` posted.
*   **Event**: `GOODS_RECEIVED` dispatched.
*   **WMS Action**: `WmsSubscriber` automatically generates a **Putaway Task** (`warehouse_putaway_tasks`).

### Step 2: Physical Putaway
*   **Action**: Workers move items from the "Receiving Area" (Generic Bin) to the "Storage Bin".
*   **System State**: Putaway Task marked as `COMPLETED`.
*   **Verification**: Stock location updated in `inventory_stocks`.

---

## 3. Inventory Integrity (Cycle Counting)

Periodic audits to ensure digital accuracy matches physical reality.

1.  **Count Plan**: Manager creates a plan (Full/Cycle/Spot).
2.  **Count Task**: Automated tasks generated for specific Bins.
3.  **Physical Count**: Workers count physical stock in the Bin.
4.  **Reconciliation**: System identifies discrepancies and generates `ADJUSTMENT_IN` or `ADJUSTMENT_OUT` ledger entries automatically.
