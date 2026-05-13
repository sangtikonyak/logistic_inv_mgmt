# Enterprise Logistics & WMS Technical Documentation

## Architecture Overview

The system uses an **Event-Driven Service Layer** architecture built on Node.js and MySQL. It prioritizes **Inventory Immutability** and **Transactional Integrity**.

### Core Principles
1.  **Ledger-First Inventory**: The `inventory_movements` table is the source of truth. The `inventory_stocks` table is a projected read-model for fast querying.
2.  **State Machines**: Domain entities (Orders, Shipments, Picklists) follow strict ENUM-based lifecycles.
3.  **Event Choreography**: Heavy execution tasks (like picklist generation) are decoupled from the main request/response cycle using an internal `EventBus`.

---

## Key Modules

### 1. WMS Execution Module (`src/modules/warehouse`)
Responsible for physical task management in the warehouse.
*   **`WmsExecutionService`**: Manages Picklists and Putaway Tasks.
*   **`WmsSubscriber`**: Listens for domain events to trigger warehouse task generation.
*   **Picklists**: Digital task lists for outbound fulfillment.
*   **Putaway Tasks**: Movement tasks for inbound receipts.

### 2. Logistics & TMS (`src/database/schema/logistics.sql`)
Handles carrier integration and transportation tracking.
*   **States**: `READY`, `DISPATCHED`.
*   **Models**: `logistics_carriers`, `logistics_shipments`.

### 3. Cycle Counting (`src/modules/inventory/services/inventory-count.service.ts`)
The self-healing mechanism for inventory data.
*   **Reconciliation Engine**: Automatically balances stock and records audit trails when physical counts differ from system records.

---

## Event Bus System

Located in `src/common/utils/event-bus.ts`.

| Event | Source | Result |
| :--- | :--- | :--- |
| `SHIPMENT_ALLOCATED` | `SalesService` | Generates a new `WarehousePicklist`. |
| `GOODS_RECEIVED` | `PurchaseService` | Generates a new `WarehousePutawayTask`. |
| `PICKLIST_COMPLETED` | `WmsService` | Transitions Shipment to `PICKED`. |

---

## Database Design Highlights

### Performance Indexes
Optimized via `src/database/schema/optimization_indexes.sql`:
*   **Composite Tenant Keys**: Every index starts with `tenant_id` to ensure isolated performance.
*   **Audit Indexes**: `user_activities` and `inventory_movements` indexed for time-series retrieval.

### Concurrency Handling
*   **Row-Level Locking**: Uses `SELECT ... FOR UPDATE` within `UnitOfWork` blocks.
*   **Optimistic Assumptions**: Tasks are created asynchronously to prevent locking the primary Sales/Purchase tables during UI interactions.
