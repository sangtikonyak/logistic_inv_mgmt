Inventory Module Implementation Plan and Status

This document translates the inventory scope into the repository's actual architecture and implementation reality after introducing a dedicated inventory module.

1. Stack and Architecture Constraints

The inventory module follows the same project conventions already used elsewhere:

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

2. Module Boundary

The repository now separates responsibilities as:

- `warehouse` module:
  - warehouse CRUD
  - zone CRUD
  - bin CRUD
  - location master data validation
- `inventory` module:
  - stock list/detail
  - movement history
  - stock adjustment
  - transfer create/list/detail
  - transfer complete/cancel

3. Current Implementation Structure

Recommended and implemented inventory structure:

- `src/modules/inventory/inventory.module.ts`
- `src/modules/inventory/controllers`
- `src/modules/inventory/services`
- `src/modules/inventory/repositories`
- `src/modules/inventory/dtos`
- `src/modules/inventory/routes`
- `src/modules/inventory/types`

4. Current API Surface

4.1 Inventory APIs

- `GET /api/v1/inventory/warehouses/:warehouseId/stock`
- `GET /api/v1/inventory/warehouses/:warehouseId/stock/:itemId`
- `POST /api/v1/inventory/warehouses/:warehouseId/adjustments`
- `GET /api/v1/inventory/warehouses/:warehouseId/movements`

4.2 Inventory Transfer APIs

- `GET /api/v1/inventory/transfers`
- `POST /api/v1/inventory/transfers`
- `GET /api/v1/inventory/transfers/:transferId`
- `POST /api/v1/inventory/transfers/:transferId/complete`
- `POST /api/v1/inventory/transfers/:transferId/cancel`

5. Implementation Rules

5.1 Tenant Isolation

- every repository method requires `tenantId`
- all inventory reads and writes are tenant-scoped
- warehouse and bin validation is still enforced before stock writes

5.2 Transaction Rules

The following inventory flows must stay transactional:

- manual stock adjustment
- transfer creation
- transfer completion
- transfer cancellation

5.3 Balance and Ledger Rules

- stock adjustments update `inventory_stocks`
- stock adjustments also write `inventory_movements`
- transfer completion updates both source and destination balances
- transfer completion writes both `TRANSFER_OUT` and `TRANSFER_IN`

6. Current Status

Implemented in the dedicated inventory module:

- stock list API
- stock item detail API
- movement history API
- stock adjustment API
- transfer create/list/detail APIs
- transfer complete API
- transfer cancel API

Still pending for future iterations:

- reservation workflows
- receipt workflows
- issue workflows
- cycle counts
- reconciliation APIs
- inventory valuation
- deeper automated test coverage for concurrent writes

7. Recommended Delivery Sequence From Here

Phase 1:

- stabilize the module split
- verify route consumers and docs
- add typecheck and API smoke verification

Phase 2:

- implement reservation and release flows
- begin using `reserved_quantity` in more than computed balance math

Phase 3:

- implement receipts and issues
- support inbound and outbound operational inventory transactions

Phase 4:

- add cycle counting and reconciliation
- add reporting-oriented inventory query surfaces

8. Final Assessment

The dedicated inventory module is the correct project-aligned structure because it:

- removes operational stock logic from warehouse master data routes
- keeps warehouse focused on location hierarchy
- gives inventory a clearer ownership boundary
- preserves existing schema and business behavior
- creates a cleaner foundation for future inventory features
