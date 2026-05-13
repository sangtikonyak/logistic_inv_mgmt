# Inventory Core Design and Implementation

This document explains the inventory core for the current project based on the implemented codebase, existing schema, and active workflow.

It is intentionally grounded in the repository as it exists today, not a future-state generic inventory platform.

## 1. Current Project Context

The current backend follows this architectural path:

`route -> controller -> service -> repository -> database`

The inventory core sits on top of the same shared platform primitives already used by auth, product, and warehouse modules:

- multi-tenant isolation through `tenant_id`
- JWT auth via middleware
- tenant resolution middleware
- RBAC middleware
- centralized error handling
- standardized API response shape
- `UnitOfWork` and transaction manager for multi-step writes
- MySQL schema-driven persistence with parameterized SQL

Inventory is not implemented as a standalone module right now. It is implemented mainly inside the warehouse domain, because stock is location-aware and depends on warehouses, zones, bins, and warehouse transfers.

## 2. Inventory Core Goal

The inventory core is responsible for operational stock, not product master data.

In the current project:

- product module owns item master data
- warehouse module owns physical storage structures
- inventory core owns stock balances, stock movements, and transfer-driven stock changes

This separation is already visible in the code:

- product APIs define products and variants
- warehouse APIs define warehouse, zone, and bin structures
- inventory APIs expose stock listing, stock adjustment, movement history, and warehouse transfer flows

## 3. Current Inventory Scope in This Repository

The implemented inventory core currently supports:

- stock balances by warehouse and optional bin
- stock ownership by product or product variant
- manual stock adjustments
- movement ledger entries for audit history
- warehouse-to-warehouse transfers
- stock visibility per warehouse
- movement visibility per warehouse
- transaction-safe completion of transfers
- tenant-scoped reads and writes across all inventory operations

The current inventory core does not yet implement:

- reservation workflows that modify `reserved_quantity`
- purchase receipt workflows
- sales issue / fulfillment workflows
- cycle counting workflows
- replenishment workflows
- supplier-linked inbound inventory flows
- inventory valuation logic

## 4. Core Domain Model

### 4.1 Inventory Ownership Model

Stock belongs to the sellable inventory entity:

- `product_id` for simple products
- `product_variant_id` for variants

The schema enforces exclusive ownership so a stock or movement row cannot point to both at the same time.

This rule is implemented in:

- [inventory_stocks.sql](/d:/AIPrompts/InvenoryManagement/src/database/schema/inventory_stocks.sql)
- [inventory_movements.sql](/d:/AIPrompts/InvenoryManagement/src/database/schema/inventory_movements.sql)

### 4.2 Location Model

Inventory is location-aware and is organized through:

- warehouse
- zone
- bin

In practice:

- warehouse is mandatory for stock
- zone is optional on stock rows
- bin is optional on stock rows

The service layer validates that any referenced zone or bin belongs to the same target warehouse before stock is adjusted or moved.

### 4.3 Balance Table

`inventory_stocks` is the current balance table.

Its purpose is fast operational reads.

Key fields:

- `tenant_id`
- `warehouse_id`
- `zone_id`
- `bin_id`
- `product_id`
- `product_variant_id`
- `on_hand_quantity`
- `reserved_quantity`
- `available_quantity`

Current balance rule:

- `available_quantity = on_hand_quantity - reserved_quantity`

The current code updates all three values explicitly to keep them synchronized.

### 4.4 Movement Ledger

`inventory_movements` is the audit trail for stock changes.

Its purpose is historical traceability and reconciliation.

Current movement types in schema:

- `OPENING`
- `ADJUSTMENT_IN`
- `ADJUSTMENT_OUT`
- `TRANSFER_OUT`
- `TRANSFER_IN`
- `RECEIPT`
- `ISSUE`
- `RESERVATION`
- `RESERVATION_RELEASE`

Current implemented movement producers in code:

- manual stock adjustments
- transfer completion

### 4.5 Transfer Model

Transfers are implemented with:

- `warehouse_transfers`
- `warehouse_transfer_items`

A transfer header stores:

- source warehouse
- destination warehouse
- transfer number
- status
- notes
- timestamps

Transfer items store:

- product or variant reference
- quantity
- optional source bin
- optional destination bin

## 5. Implemented Architecture

The inventory core is spread across these active files:

- [warehouse.routes.ts](/d:/AIPrompts/InvenoryManagement/src/modules/warehouse/routes/warehouse.routes.ts)
- [warehouse-transfer.routes.ts](/d:/AIPrompts/InvenoryManagement/src/modules/warehouse/routes/warehouse-transfer.routes.ts)
- [warehouse.service.ts](/d:/AIPrompts/InvenoryManagement/src/modules/warehouse/services/warehouse.service.ts)
- [warehouse-transfer.service.ts](/d:/AIPrompts/InvenoryManagement/src/modules/warehouse/services/warehouse-transfer.service.ts)
- [inventory.repository.ts](/d:/AIPrompts/InvenoryManagement/src/modules/warehouse/repositories/inventory.repository.ts)
- [index.ts](/d:/AIPrompts/InvenoryManagement/src/index.ts)

Mounted API base paths:

- `/api/v1/warehouses`
- `/api/v1/warehouse-transfers`

This means inventory is already part of the live application surface, not just a design target.

## 6. Current API Surface

### 6.1 Stock and Movement APIs

Under `/api/v1/warehouses`:

- `GET /:warehouseId/stock`
- `GET /:warehouseId/stock/:itemId`
- `POST /:warehouseId/stock/adjustments`
- `GET /:warehouseId/movements`

### 6.2 Transfer APIs

Under `/api/v1/warehouse-transfers`:

- `GET /`
- `POST /`
- `GET /:transferId`
- `POST /:transferId/complete`
- `POST /:transferId/cancel`

### 6.3 Supporting Warehouse Structure APIs

Inventory depends on warehouse structure APIs:

- warehouse CRUD
- set default warehouse
- zone CRUD
- bin CRUD

Without these structures, inventory cannot be properly located.

## 7. End-to-End Workflow

## 7.1 Request Pipeline

For inventory requests, the high-level flow is:

1. Route receives the request.
2. `authMiddleware` validates the token.
3. `tenantMiddleware` resolves tenant context.
4. `requireRole(...)` protects write operations.
5. Controller validates request input.
6. Service applies domain rules.
7. Repository executes tenant-scoped SQL.
8. API returns the standardized response payload.

This matches the same pattern already used by the product workflows.

## 7.2 Stock Listing Workflow

Stock listing is read-only and warehouse-scoped.

Flow:

1. Client calls `GET /api/v1/warehouses/:warehouseId/stock`.
2. Service confirms the warehouse exists in the caller's tenant.
3. Filters may include:
   - `zoneId`
   - `binId`
   - `productId`
   - `productVariantId`
   - `search`
   - pagination fields
4. Repository joins stock rows to warehouse, zone, bin, product, and variant data.
5. Results are returned with pagination metadata.

Current search behavior supports product name, variant name, and SKU lookup.

## 7.3 Stock Item Detail Workflow

Flow:

1. Client calls `GET /api/v1/warehouses/:warehouseId/stock/:itemId`.
2. Service validates the warehouse in-tenant.
3. Repository returns all stock rows for that product or variant within the warehouse.
4. If no rows exist, the service returns `404`.

This is useful when the same item may exist across multiple bins within a warehouse.

## 7.4 Manual Stock Adjustment Workflow

This is currently the main direct inventory-write operation outside transfers.

Flow:

1. Client calls `POST /api/v1/warehouses/:warehouseId/stock/adjustments`.
2. Service validates:
   - warehouse exists
   - optional zone belongs to warehouse
   - optional bin belongs to warehouse
   - bin matches the given zone if both are provided
3. Service resolves the inventory item:
   - product or variant must exist in tenant
   - item must track inventory
   - service products are rejected
4. Unit of Work starts a transaction.
5. Repository locks the stock row for the exact location and item combination using `FOR UPDATE`.
6. If no stock row exists:
   - `ADJUSTMENT_OUT` is rejected
   - `ADJUSTMENT_IN` creates a new balance row
7. Service computes next quantities.
8. Service blocks negative `on_hand_quantity`.
9. Service blocks negative `available_quantity`.
10. Repository updates the balance row.
11. Repository writes an `inventory_movements` ledger entry.
12. Transaction commits.
13. Service reloads and returns the adjusted stock row.

Implemented adjustment movement reference:

- `reference_type = 'MANUAL_STOCK_ADJUSTMENT'`

## 7.5 Movement History Workflow

Flow:

1. Client calls `GET /api/v1/warehouses/:warehouseId/movements`.
2. Service validates the warehouse in-tenant.
3. Repository filters by:
   - `movementType`
   - `productId`
   - `productVariantId`
   - pagination fields
4. Repository joins movement rows with warehouse, zone, bin, product, and variant display data.
5. Results are returned ordered by newest first.

This makes the movement ledger the current audit view for stock activity.

## 7.6 Transfer Creation Workflow

Transfer creation records intent. It does not move stock yet.

Flow:

1. Client calls `POST /api/v1/warehouse-transfers`.
2. Service validates:
   - source and destination warehouses are different
   - both warehouses exist in the same tenant
   - each transfer item references a valid product or variant
   - each item is inventory-tracked
   - service products are rejected
   - source bins belong to source warehouse
   - destination bins belong to destination warehouse
3. Unit of Work starts a transaction.
4. Repository inserts transfer header with status `DRAFT`.
5. Repository inserts transfer item rows.
6. Transaction commits.
7. Service returns the transfer detail.

Important current behavior:

- stock is not reserved at transfer creation time
- actual inventory movement happens only during transfer completion

## 7.7 Transfer Completion Workflow

This is the highest-risk inventory workflow currently implemented, and it is transaction-protected.

Flow:

1. Client calls `POST /api/v1/warehouse-transfers/:transferId/complete`.
2. Unit of Work starts a transaction.
3. Service locks the transfer row using `FOR UPDATE`.
4. Service rejects:
   - missing transfer
   - already completed transfer
   - cancelled transfer
5. Repository loads transfer items.
6. For each item:
   - optional source and destination bins are resolved
   - source stock row is locked with `FOR UPDATE`
   - source stock must exist
   - source `available_quantity` must be sufficient
   - source `on_hand_quantity` must be sufficient
7. Repository decrements source stock.
8. Destination stock row is locked or created if missing.
9. Repository increments destination stock.
10. Repository writes:
    - one `TRANSFER_OUT` movement for source
    - one `TRANSFER_IN` movement for destination
11. Transfer status is updated to `COMPLETED`.
12. Transaction commits.
13. Service returns the hydrated transfer detail.

Current movement reference for transfer completion:

- `reference_type = 'WAREHOUSE_TRANSFER'`

## 7.8 Transfer Cancellation Workflow

Flow:

1. Client calls `POST /api/v1/warehouse-transfers/:transferId/cancel`.
2. Unit of Work starts a transaction.
3. Service locks the transfer row.
4. Service rejects:
   - missing transfer
   - already completed transfer
   - already cancelled transfer
5. Repository updates status to `CANCELLED`.
6. Transaction commits.

Current cancellation behavior does not modify stock because stock is only changed during completion.

## 8. Tenant Isolation and Security Model

Inventory follows the same tenant safety rules as the rest of the platform.

Current safeguards:

- every repository query includes `tenant_id`
- warehouses, bins, stock rows, movements, and transfers are tenant-scoped
- cross-tenant references fail through not-found behavior
- auth and tenant middleware are required before warehouse and transfer routes
- RBAC protects inventory writes

Current role model from routes:

- reads: authenticated tenant users
- write actions such as create warehouse, zone, bin, stock adjustment, and transfer create/complete/cancel: `ADMIN` or `MANAGER`
- destructive actions like deleting warehouse, zone, and bin: `ADMIN`

## 9. Current Business Rules

The current implementation already enforces these important rules:

- a warehouse code must be unique within a tenant
- one active default warehouse per tenant
- default warehouse cannot be deleted directly
- a zone code must be unique within a warehouse
- a bin code must be unique within a warehouse
- warehouse, zone, and bin deletes are blocked while stock still exists
- zones cannot be deleted while active bins still exist
- source and destination warehouses for a transfer must be different
- service products cannot participate in stock adjustments or transfers
- only inventory-tracked items can participate in stock adjustments or transfers
- stock cannot go negative during adjustment or transfer completion
- transfer completion is atomic

## 10. Data Integrity and Transaction Design

Inventory is one of the areas where transaction safety matters most.

Current transaction-protected flows:

- create warehouse when default reassignment is needed
- update warehouse when default reassignment is needed
- set default warehouse
- manual stock adjustment
- create transfer
- complete transfer
- cancel transfer

Important consistency patterns already in the code:

- transfer and stock-modifying flows use `UnitOfWork`
- balance rows are locked during updates
- transfer row is locked during status changes
- movement ledger writes occur in the same transaction as stock balance writes

This is the correct foundation for future receiving, issuing, reservation, and fulfillment modules.

## 11. Current Gaps and Practical Limitations

The inventory core is solidly started, but it is still a first operational slice rather than a full inventory platform.

Current gaps:

- `reserved_quantity` exists in schema and math, but no reservation workflow updates it yet
- stock uniqueness relies on `(tenant_id, warehouse_id, bin_id, product_id, product_variant_id)`, so non-bin warehouse-level stock rows need careful handling where `bin_id` is `NULL`
- zone-level stock without bin-level detail is supported structurally, but most operational flows effectively center on warehouse and optional bin
- transfer creation does not pre-check stock sufficiency; insufficiency is caught during completion
- no explicit idempotency keys exist for stock-adjustment or transfer-completion requests
- no cycle count reconciliation workflow exists yet
- no valuation, costing, or accounting linkage exists yet

## 12. Recommended Next Phase

The next logical inventory improvements should be:

1. Add reservation and release workflows that safely maintain `reserved_quantity`.
2. Add receiving workflows that create `RECEIPT` movements and increment stock.
3. Add issue or fulfillment workflows that create `ISSUE` movements and decrement stock.
4. Harden stock uniqueness and locator rules for `NULL` bin scenarios if warehouse-level stock is expected heavily.
5. Add inventory test coverage for concurrency-sensitive flows like duplicate completion attempts.
6. Add cycle count and reconciliation APIs.
7. Add explicit inventory workflow documentation under `workflow/` similar to the product workflow file.

## 13. Final Assessment

The current project already has a meaningful inventory core in production-shaped backend form.

Its present design is:

- multi-tenant
- location-aware
- transaction-protected for critical write paths
- auditable through movement history
- aligned to the repository's modular architecture

Its current implementation is best described as:

- warehouse-centered operational inventory
- product-integrated but not product-owned stock
- ready for the next layer of receiving, reservation, fulfillment, and reporting features
