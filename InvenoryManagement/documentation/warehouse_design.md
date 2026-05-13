UPDATED V1: Warehouse Domain Design

This document defines the target warehouse domain for this multi-tenant Inventory Management backend.

It is written to match the current repository architecture and actual implementation style, not an idealized stack.

1. Current Project Context

- Multi-tenant SaaS with strict `tenant_id` isolation
- Backend architecture follows:
  - `route -> controller -> service -> repository -> database`
- Persistence uses MySQL with `mysql2`, SQL schema files, repository classes, and parameterized SQL
- Multi-step writes should use the existing Unit of Work and Transaction Manager patterns
- Shared infrastructure already exists for:
  - auth middleware
  - tenant middleware
  - RBAC middleware
  - centralized error handling
  - standardized API responses
- The current repository implements:
  - auth module
  - product module
- The current repository does not yet implement:
  - warehouse module
  - warehouse stock tables
  - warehouse transfer flows
  - zone/bin APIs

2. Warehouse Design Goal

Design a warehouse domain that:

- stays fully tenant-scoped
- fits the current MySQL and repository-based architecture
- supports multiple warehouses per tenant
- supports warehouse hierarchy for physical storage
- supports stock by location without polluting product master tables
- supports auditable stock movements and transfers
- remains extensible for future purchasing, receiving, fulfillment, and reporting modules

Important boundary:

- Product data is master data
- Warehouse and stock data are operational inventory data
- Live stock balances must not be stored in `products` or `product_variants`
- Product inventory fields such as `track_inventory`, `min_stock_level`, and `max_stock_level` remain policy fields only

3. Scope of the Warehouse Domain

The warehouse domain should support:

- multiple warehouses per tenant
- exactly one default warehouse per tenant
- warehouse address and optional geo coordinates
- physical hierarchy:
  - warehouse
  - zone
  - bin
- stock availability by warehouse and optionally by bin
- stock movement history
- warehouse-to-warehouse transfer workflow
- soft delete for warehouse structures where business-safe
- audit fields for all mutable records

4. Recommended Data Model

4.1 Core Tables

- `warehouses`
- `warehouse_zones`
- `warehouse_bins`
- `inventory_stocks`
- `inventory_movements`
- `warehouse_transfers`
- `warehouse_transfer_items`

4.2 Warehouses

Recommended columns:

- `id`
- `tenant_id`
- `name`
- `code`
- `is_default`
- `status`
- `address_line_1`
- `address_line_2`
- `city`
- `state`
- `postal_code`
- `country`
- `latitude`
- `longitude`
- `created_at`
- `updated_at`
- `deleted_at`
- `created_by`
- `updated_by`
- `deleted_by`

Rules:

- tenant-scoped uniqueness for `code`
- at most one active default warehouse per tenant
- soft-deleted warehouses must be excluded from normal lookups

4.3 Warehouse Zones

Recommended columns:

- `id`
- `tenant_id`
- `warehouse_id`
- `name`
- `code`
- `sort_order`
- `created_at`
- `updated_at`
- `deleted_at`
- `created_by`
- `updated_by`
- `deleted_by`

Rules:

- zone belongs to one warehouse
- zone uniqueness should be at least tenant + warehouse + code
- soft delete is acceptable if no active downstream dependencies block it

4.4 Warehouse Bins

Recommended columns:

- `id`
- `tenant_id`
- `warehouse_id`
- `zone_id`
- `name`
- `code`
- `sort_order`
- `is_pickable`
- `is_receiving`
- `is_dispatch`
- `created_at`
- `updated_at`
- `deleted_at`
- `created_by`
- `updated_by`
- `deleted_by`

Rules:

- bin belongs to one zone and one warehouse
- `warehouse_id` should match the warehouse of the parent zone
- code uniqueness should be enforced within the warehouse

5. Stock Tracking Strategy

5.1 Stock Ownership

Stock should be linked to the sellable inventory entity:

- `product_id` for `SIMPLE` products when no variant exists
- `product_variant_id` for `VARIABLE` products

Avoid ambiguous mixed ownership in operational records. Prefer a clear rule:

- every stock record references either a product or a variant
- service products should not have stock
- bundle products should not carry balance as if they were normal stocked items unless the business explicitly chooses bundle stocking later

5.2 Inventory Balance Table

`inventory_stocks` should store the current balance by location.

Recommended columns:

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

Recommended rules:

- one active balance row per unique location + item combination
- `available_quantity` should be derived consistently from business rules
- if bin-level tracking is enabled, warehouse totals should be aggregated from bins rather than duplicated inconsistently

5.3 Inventory Movement Ledger

`inventory_movements` should be the audit source of truth for stock changes.

Recommended columns:

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
- `created_at`
- `created_by`

Movement examples:

- `OPENING`
- `ADJUSTMENT_IN`
- `ADJUSTMENT_OUT`
- `TRANSFER_OUT`
- `TRANSFER_IN`
- `RECEIPT`
- `ISSUE`
- `RESERVATION`
- `RESERVATION_RELEASE`

Design rule:

- balances support fast reads
- movements support auditability and reconciliation

6. Transfer Design

6.1 Transfer Header

`warehouse_transfers` should represent the workflow record.

Recommended columns:

- `id`
- `tenant_id`
- `transfer_number`
- `source_warehouse_id`
- `destination_warehouse_id`
- `status`
- `notes`
- `requested_at`
- `completed_at`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`

Suggested statuses:

- `DRAFT`
- `IN_TRANSIT`
- `COMPLETED`
- `CANCELLED`

6.2 Transfer Items

`warehouse_transfer_items` should hold line-level quantities.

Recommended columns:

- `id`
- `tenant_id`
- `transfer_id`
- `product_id`
- `product_variant_id`
- `quantity`
- `source_bin_id`
- `destination_bin_id`
- `created_at`
- `updated_at`

6.3 Transfer Rules

- source and destination warehouses must belong to the same tenant
- source and destination warehouses must be different
- all referenced bins must belong to the correct warehouse
- transfer completion must be transactional
- transfer completion should create both outbound and inbound movement records
- stock must not go negative unless explicit negative-stock policy exists

7. API Design

Recommended base path:

`/api/v1/warehouses`

Recommended endpoints:

- `GET /api/v1/warehouses`
- `POST /api/v1/warehouses`
- `GET /api/v1/warehouses/:warehouseId`
- `PUT /api/v1/warehouses/:warehouseId`
- `DELETE /api/v1/warehouses/:warehouseId`
- `PATCH /api/v1/warehouses/:warehouseId/default`
- `GET /api/v1/warehouses/:warehouseId/zones`
- `POST /api/v1/warehouses/:warehouseId/zones`
- `PUT /api/v1/zones/:zoneId`
- `DELETE /api/v1/zones/:zoneId`
- `GET /api/v1/zones/:zoneId/bins`
- `POST /api/v1/zones/:zoneId/bins`
- `PUT /api/v1/bins/:binId`
- `DELETE /api/v1/bins/:binId`
- `GET /api/v1/warehouses/:warehouseId/stock`
- `GET /api/v1/warehouses/:warehouseId/stock/:itemId`
- `POST /api/v1/warehouse-transfers`
- `GET /api/v1/warehouse-transfers`
- `GET /api/v1/warehouse-transfers/:transferId`
- `POST /api/v1/warehouse-transfers/:transferId/complete`
- `POST /api/v1/warehouse-transfers/:transferId/cancel`

8. Security and Tenant Isolation

- every warehouse, zone, bin, stock, movement, and transfer query must filter by `tenant_id`
- repositories should make unscoped access difficult
- write flows should require auth and tenant middleware
- RBAC should follow current project patterns:
  - reads: `ADMIN`, `MANAGER`, `STAFF`
  - writes: `ADMIN`, `MANAGER`
  - destructive or high-risk admin actions may be `ADMIN` only

9. Scalability Considerations

- index all tenant-owned tables by `tenant_id`
- add composite indexes for warehouse and item lookup paths
- keep list endpoints paginated and sortable
- use balance tables for fast reads and movement tables for audit history
- protect transfer completion with transactions
- preserve compatibility with future modules such as purchase receiving and sales fulfillment

10. Edge Cases

- attempting to delete the only active default warehouse
- setting a default warehouse when another default already exists
- deleting warehouses that still contain stock
- deleting zones or bins still referenced by stock balances or movement history
- cross-tenant warehouse or item references
- transferring more stock than is available
- transferring service products
- handling products with variants where stock exists only at variant level

11. Current Repository Status vs Target Design

Current verified repository status:

- auth module exists
- product module exists
- product APIs and product schema are implemented
- product module stores inventory policy fields only

Not yet implemented in this repository:

- warehouse schema files
- warehouse module under `src/modules/warehouse`
- warehouse routes
- zone/bin CRUD
- stock balance tables
- inventory movement ledger
- warehouse transfer APIs

This document is therefore the target warehouse design for the next implementation phase, aligned with the current project architecture and scope of work.
