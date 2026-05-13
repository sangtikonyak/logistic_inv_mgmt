Warehouse Module Implementation Plan and Status

This document translates the warehouse scope into the current repository's actual architecture and implementation reality.

It replaces the earlier generic implementation prompt with a project-aligned plan.

1. Stack and Architecture Constraints

The warehouse module must follow the same approach already used in this repository:

- backend flow:
  - `route -> controller -> service -> repository -> database`
- TypeScript
- Express
- MySQL with `mysql2`
- SQL schema files under `src/database/schema`
- Zod validation
- auth middleware
- tenant middleware
- RBAC middleware
- centralized error handling
- standardized API response wrapper
- Unit of Work and Transaction Manager for multi-step writes

The warehouse module must not assume:

- Prisma
- PostgreSQL-only features
- a different folder structure than the existing `auth` and `product` modules

2. Current Scope Match Assessment

2.1 What Already Matches the Warehouse Prerequisites

The project already has the foundational platform pieces needed for warehouse implementation:

- tenant-aware authentication
- RBAC
- shared middleware for auth and tenant resolution
- centralized error handling
- consistent API responses
- transactional support through Unit of Work
- tenant-scoped product master data

These are strong prerequisites for warehouse work because warehouse records and stock records will depend on:

- authenticated user identity
- tenant isolation
- product and variant references
- transactional consistency

2.2 What Does Not Yet Match the Warehouse Scope

The warehouse features described in the scope are not implemented yet.

Missing implementation areas:

- warehouse tables
- zone tables
- bin tables
- stock balance tables
- stock movement ledger
- warehouse transfer tables
- warehouse controllers, services, repositories, DTOs, and routes
- warehouse API reference

3. Functional Scope Check

Requested warehouse scope:

- create warehouse
- update warehouse
- soft delete warehouse
- list warehouses with pagination and filtering
- set default warehouse
- warehouse hierarchy with zone and bin support
- warehouse-to-warehouse stock transfer
- view stock per warehouse

Current repository support against that scope:

- create warehouse: not implemented
- update warehouse: not implemented
- soft delete warehouse: not implemented
- list warehouses: not implemented
- set default warehouse: not implemented
- zone support: not implemented
- bin support: not implemented
- warehouse transfer: not implemented
- stock per warehouse: not implemented

Conclusion:

- the current codebase does not yet satisfy the warehouse scope of work
- the existing product module provides the necessary item master data for future warehouse stock references
- additional APIs and database structures are required

4. Recommended Module Structure

The warehouse implementation should follow the same module shape as the product module.

Recommended structure:

- `src/modules/warehouse/warehouse.module.ts`
- `src/modules/warehouse/controllers`
- `src/modules/warehouse/services`
- `src/modules/warehouse/repositories`
- `src/modules/warehouse/dtos`
- `src/modules/warehouse/routes`
- `src/modules/warehouse/types`

Recommended schema files:

- `src/database/schema/warehouses.sql`
- `src/database/schema/warehouse_zones.sql`
- `src/database/schema/warehouse_bins.sql`
- `src/database/schema/inventory_stocks.sql`
- `src/database/schema/inventory_movements.sql`
- `src/database/schema/warehouse_transfers.sql`
- `src/database/schema/warehouse_transfer_items.sql`

5. Additional APIs Required

Based on the current project and the intended warehouse scope, these APIs still need to be implemented.

5.1 Warehouse APIs

- `GET /api/v1/warehouses`
- `POST /api/v1/warehouses`
- `GET /api/v1/warehouses/:warehouseId`
- `PUT /api/v1/warehouses/:warehouseId`
- `DELETE /api/v1/warehouses/:warehouseId`
- `PATCH /api/v1/warehouses/:warehouseId/default`

5.2 Zone APIs

- `GET /api/v1/warehouses/:warehouseId/zones`
- `POST /api/v1/warehouses/:warehouseId/zones`
- `PUT /api/v1/zones/:zoneId`
- `DELETE /api/v1/zones/:zoneId`

5.3 Bin APIs

- `GET /api/v1/zones/:zoneId/bins`
- `POST /api/v1/zones/:zoneId/bins`
- `PUT /api/v1/bins/:binId`
- `DELETE /api/v1/bins/:binId`

5.4 Stock APIs

- `GET /api/v1/warehouses/:warehouseId/stock`
- `GET /api/v1/warehouses/:warehouseId/stock/:itemId`
- optional future additions:
  - `POST /api/v1/warehouses/:warehouseId/stock/adjustments`
  - `GET /api/v1/warehouses/:warehouseId/movements`

5.5 Transfer APIs

- `GET /api/v1/warehouse-transfers`
- `POST /api/v1/warehouse-transfers`
- `GET /api/v1/warehouse-transfers/:transferId`
- `POST /api/v1/warehouse-transfers/:transferId/complete`
- `POST /api/v1/warehouse-transfers/:transferId/cancel`

6. Implementation Rules

6.1 Tenant Isolation

- every repository method must require `tenantId`
- all warehouse, zone, bin, stock, and transfer queries must be tenant-scoped
- cross-tenant access must return not found or forbidden behavior consistent with existing modules

6.2 Transaction Rules

The following flows should be transactional:

- create warehouse with initial zones or bins if supported in one request
- change default warehouse
- transfer completion
- any stock adjustment flow that updates both balances and movement history

6.3 Soft Delete Rules

- warehouses should support soft delete
- zones and bins may also use soft delete for consistency
- soft-deleted records must be excluded from normal reads
- delete actions should be blocked when active stock or dependent records still exist

6.4 Query and Index Rules

- parameterized SQL only
- stable pagination and deterministic sorting
- indexes for:
  - `tenant_id`
  - warehouse code
  - warehouse default lookup
  - zone and bin lookup by parent
  - stock lookup by warehouse and item
  - transfer lookup by tenant and status

7. Scope-of-Work Alignment Notes

The current project scope is best interpreted as:

- product module = implemented foundation
- warehouse module = next required domain

This means the warehouse documentation should not imply that warehouse functionality already exists.

Correct project-aligned wording is:

- warehouse is planned and designed
- warehouse depends on existing product and auth foundations
- warehouse APIs and schema are still to be implemented

8. Recommended Delivery Sequence

To reduce implementation risk, warehouse work should be delivered in phases.

Phase 1:

- warehouses table
- warehouse CRUD
- default warehouse behavior
- warehouse list and get by id

Phase 2:

- zones
- bins
- hierarchy validation

Phase 3:

- stock balance table
- stock view APIs
- movement ledger

Phase 4:

- warehouse transfer tables
- transfer create/list/detail
- transfer completion transaction logic

9. Current Repository Status

Verified from the repository:

- app routes currently mount:
  - `/api/v1/auth`
  - `/api/v1/products`
- no warehouse routes are currently mounted
- no warehouse schema files exist in `src/database/schema`
- no warehouse module exists under `src/modules`
- no stock transfer implementation exists

10. Final Assessment

Architecture fit:

- the warehouse requirements fit the project architecture well
- the scope is consistent with the product module being inventory-ready but not inventory-operational

Functionality fit:

- the requested warehouse functionality does not yet exist in the codebase
- additional APIs and persistence layers are required to satisfy the scope

Documentation correction made by this file:

- this file now reflects the real implementation state
- this file now identifies the additional APIs required
- this file now aligns warehouse work with the actual MySQL and repository-based architecture already used in the project
