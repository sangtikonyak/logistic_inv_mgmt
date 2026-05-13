UPDATED V1: Inventory Domain Design

This document defines the target and current inventory domain for this multi-tenant Inventory Management backend.

It is written to match the current repository architecture and the implementation approach now used in the codebase.

1. Current Project Context

- Multi-tenant SaaS with strict `tenant_id` isolation
- Backend architecture follows:
  - `route -> controller -> service -> repository -> database`
- Persistence uses MySQL with `mysql2`, SQL schema files, repository classes, and parameterized SQL
- Multi-step writes use the existing Unit of Work and Transaction Manager patterns
- Shared infrastructure already exists for:
  - auth middleware
  - tenant middleware
  - RBAC middleware
  - centralized error handling
  - standardized API responses
- The current repository implements:
  - auth module
  - product module
  - warehouse module for location master data
  - inventory module for stock and transfer operations

2. Inventory Design Goal

Design inventory as a dedicated operational domain that:

- stays fully tenant-scoped
- uses warehouse structures as location master data
- tracks stock separately from product master data
- provides auditable movement history
- supports transactional warehouse transfers
- remains extensible for reservations, receipts, issues, cycle counts, and reporting

Important boundary:

- product data is master data
- warehouse data is location master data
- inventory data is operational stock data
- live stock balances must not be stored in `products` or `product_variants`

3. Scope of the Inventory Domain

The inventory domain should support:

- stock balances by warehouse and optional bin
- stock ownership at product or product variant level
- movement ledger history
- manual stock adjustments
- warehouse-to-warehouse transfers
- transfer item line management
- transaction-safe completion logic
- future extension to reservation, receipt, issue, and reconciliation flows

4. Recommended Data Model

4.1 Core Tables

- `inventory_stocks`
- `inventory_movements`
- `warehouse_transfers`
- `warehouse_transfer_items`

4.2 Inventory Stock

Current columns:

- `id`
- `tenant_id`
- `warehouse_id`
- `zone_id`
- `bin_id`
- `product_id`
- `product_variant_id`
- `on_hand_quantity`
- `reserved_quantity`
- `available_quantity`
- `created_at`
- `updated_at`

Rules:

- one item reference only:
  - either `product_id`
  - or `product_variant_id`
- stock belongs to a warehouse
- stock may optionally be narrowed to zone and bin
- quantity balances must never become negative in normal flows

4.3 Inventory Movements

Current columns:

- `id`
- `tenant_id`
- `warehouse_id`
- `zone_id`
- `bin_id`
- `product_id`
- `product_variant_id`
- `movement_type`
- `reference_type`
- `reference_id`
- `quantity`
- `notes`
- `created_by`
- `created_at`

Current movement types:

- `OPENING`
- `ADJUSTMENT_IN`
- `ADJUSTMENT_OUT`
- `TRANSFER_OUT`
- `TRANSFER_IN`
- `RECEIPT`
- `ISSUE`
- `RESERVATION`
- `RESERVATION_RELEASE`

4.4 Transfers

Header table:

- `warehouse_transfers`

Line table:

- `warehouse_transfer_items`

Current transfer design:

- one source warehouse
- one destination warehouse
- one or more transfer items
- optional source and destination bins
- status-driven lifecycle

Suggested statuses:

- `DRAFT`
- `IN_TRANSIT`
- `COMPLETED`
- `CANCELLED`

5. Inventory Ownership Strategy

Stock should be linked to the sellable inventory entity:

- `product_id` for simple products
- `product_variant_id` for variants

Rules:

- service products must not participate in operational stock
- only inventory-tracked items should enter stock workflows
- transfer and adjustment flows should reject invalid item references early

6. API Design

Recommended base paths:

`/api/v1/inventory`

`/api/v1/inventory/transfers`

Recommended inventory endpoints:

- `GET /api/v1/inventory/warehouses/:warehouseId/stock`
- `GET /api/v1/inventory/warehouses/:warehouseId/stock/:itemId`
- `POST /api/v1/inventory/warehouses/:warehouseId/adjustments`
- `GET /api/v1/inventory/warehouses/:warehouseId/movements`

Recommended transfer endpoints:

- `GET /api/v1/inventory/transfers`
- `POST /api/v1/inventory/transfers`
- `GET /api/v1/inventory/transfers/:transferId`
- `POST /api/v1/inventory/transfers/:transferId/complete`
- `POST /api/v1/inventory/transfers/:transferId/cancel`

7. Security and Tenant Isolation

- every stock, movement, and transfer query must filter by `tenant_id`
- warehouse, zone, and bin references must belong to the same tenant
- auth and tenant middleware must guard all inventory routes
- RBAC should follow current project patterns:
  - reads: `ADMIN`, `MANAGER`, `STAFF`
  - writes: `ADMIN`, `MANAGER`
  - destructive warehouse master-data actions remain `ADMIN` only in the warehouse module

8. Scalability Considerations

- keep stock balances for fast reads
- keep movement ledger for auditability
- use transactions for adjustments and transfer completion
- lock balance rows during write flows
- paginate stock, movement, and transfer lists
- index stock and movement tables by tenant, warehouse, item, and reference

9. Edge Cases

- negative stock attempts
- transfer completion called twice
- transfer completion after cancellation
- invalid source or destination bin ownership
- item does not track inventory
- service product used in stock flow
- deleting warehouse structures while stock still exists
- source stock row missing at completion time

10. Final Design Position

The dedicated inventory module should own:

- stock read and write flows
- movement history
- transfer lifecycle
- future reservation and receipt logic

The warehouse module should own:

- warehouses
- zones
- bins
- location hierarchy validation

This separation keeps inventory operational logic independent while still reusing warehouse master data.
