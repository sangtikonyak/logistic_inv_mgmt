Purchase Module Implementation Plan and Status

This document translates the purchase scope into the current repository's actual architecture and implementation reality.

It is written to align with the project's implemented modules and current inventory flow.

1. Stack and Architecture Constraints

The purchase module must follow the same approach already used in this repository:

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

The purchase module must not assume:

- Prisma
- PostgreSQL-only features
- a different folder structure than the existing `auth`, `product`, `warehouse`, and `inventory` modules

2. Current Scope Match Assessment

2.1 What Already Matches the Purchase Prerequisites

The project already has the foundational platform pieces needed for purchase implementation:

- tenant-aware authentication
- RBAC
- shared middleware for auth and tenant resolution
- centralized error handling
- consistent API responses
- transactional support through Unit of Work
- product and variant master data
- warehouse master data for receipt destinations
- inventory stock and movement infrastructure

These are strong prerequisites for purchase work because purchase records and receipt posting will depend on:

- authenticated user identity
- tenant isolation
- product and variant references
- warehouse references
- transactional consistency
- inventory movement integration

2.2 What Does Not Yet Match the Purchase Scope

The purchase features described in the scope are not implemented yet.

Missing implementation areas:

- supplier tables
- purchase order tables
- purchase receipt tables
- supplier controllers, services, repositories, DTOs, and routes
- purchase controllers, services, repositories, DTOs, and routes
- purchase API reference
- purchase-driven inventory receipt flow

3. Functional Scope Check

Requested purchase-aligned scope for this project:

- create supplier
- update supplier
- soft delete supplier
- list suppliers with pagination and filtering
- create purchase order
- update purchase order while draft
- issue purchase order
- cancel purchase order
- record full or partial goods receipt
- post received stock into inventory
- view purchase orders and receipts with status history

Current repository support against that scope:

- supplier CRUD: not implemented
- purchase order lifecycle: not implemented
- purchase receipt workflow: not implemented
- supplier-based procurement history: not implemented
- receipt posting into inventory as purchase flow: not implemented
- inbound stock currently possible only through manual stock adjustment: implemented outside purchase domain

Conclusion:

- the current codebase does not yet satisfy the purchase scope of work
- the existing inventory module provides the necessary stock infrastructure for future purchase receipts
- additional APIs and database structures are required

4. Recommended Module Structure

The purchase implementation should follow the same module shape as the other modules.

Recommended structure:

- `src/modules/purchase/purchase.module.ts`
- `src/modules/purchase/controllers`
- `src/modules/purchase/services`
- `src/modules/purchase/repositories`
- `src/modules/purchase/dtos`
- `src/modules/purchase/routes`
- `src/modules/purchase/types`

Recommended schema files:

- `src/database/schema/suppliers.sql`
- `src/database/schema/purchase_orders.sql`
- `src/database/schema/purchase_order_items.sql`
- `src/database/schema/purchase_receipts.sql`
- `src/database/schema/purchase_receipt_items.sql`

5. Additional APIs Required

Based on the current project and the intended purchase scope, these APIs still need to be implemented.

5.1 Supplier APIs

- `GET /api/v1/suppliers`
- `POST /api/v1/suppliers`
- `GET /api/v1/suppliers/:supplierId`
- `PUT /api/v1/suppliers/:supplierId`
- `DELETE /api/v1/suppliers/:supplierId`

5.2 Purchase Order APIs

- `GET /api/v1/purchases/orders`
- `POST /api/v1/purchases/orders`
- `GET /api/v1/purchases/orders/:purchaseOrderId`
- `PUT /api/v1/purchases/orders/:purchaseOrderId`
- `POST /api/v1/purchases/orders/:purchaseOrderId/issue`
- `POST /api/v1/purchases/orders/:purchaseOrderId/cancel`

5.3 Purchase Receipt APIs

- `GET /api/v1/purchases/receipts`
- `POST /api/v1/purchases/orders/:purchaseOrderId/receipts`
- `GET /api/v1/purchases/receipts/:receiptId`
- `POST /api/v1/purchases/receipts/:receiptId/post`
- `POST /api/v1/purchases/receipts/:receiptId/cancel`

6. Implementation Rules

6.1 Tenant Isolation

- every repository method must require `tenantId`
- all supplier, purchase order, purchase item, and receipt queries must be tenant-scoped
- cross-tenant access must return not found or forbidden behavior consistent with existing modules
- inventory posting must still validate tenant ownership for warehouse, product, and variant references

6.2 Transaction Rules

The following flows should be transactional:

- create purchase order with items
- update purchase order items in draft state
- post purchase receipt
- any flow that updates purchase records and inventory balances together

6.3 Status Rules

- draft purchase orders may be edited
- issued purchase orders should become operationally locked except for permitted note updates
- cancelled purchase orders must reject receipts
- posted receipts must be immutable in normal flows
- order status should automatically move to `PARTIALLY_RECEIVED` or `RECEIVED` based on line balances

6.4 Receipt Posting Rules

When posting a receipt:

- validate the purchase order exists and is receivable
- validate receipt items belong to the purchase order
- validate quantities do not exceed remaining receivable quantities
- validate referenced items are inventory-tracked and not service products
- create or update `inventory_stocks`
- create `inventory_movements` rows with `movement_type = RECEIPT`
- use `reference_type = PURCHASE_RECEIPT` or an equivalent stable value
- update `purchase_order_items.received_quantity`
- update purchase order summary status
- commit or roll back the entire flow as one unit

6.5 Query and Index Rules

- parameterized SQL only
- stable pagination and deterministic sorting
- indexes for:
  - `tenant_id`
  - supplier code
  - supplier status
  - purchase order number
  - purchase order status
  - purchase receipt number
  - purchase order and receipt foreign key lookups

7. Scope-of-Work Alignment Notes

The current project scope is best interpreted as:

- product module = item master data
- warehouse module = location master data
- inventory module = stock and movement operations
- purchase module = next business domain for controlled inbound stock

This means the purchase documentation should not imply that procurement functionality already exists.

Correct project-aligned wording is:

- purchase is planned and designed
- purchase depends on existing product, warehouse, and inventory foundations
- purchase APIs and schema are still to be implemented

8. Recommended Delivery Sequence

To reduce implementation risk, purchase work should be delivered in phases.

Phase 1:

- suppliers table
- supplier CRUD
- supplier list and get by id

Phase 2:

- purchase order tables
- purchase order create, list, get, update
- draft and issue workflow

Phase 3:

- purchase receipt tables
- receipt create, list, detail
- validation for partial receipt quantities

Phase 4:

- transactional receipt posting into inventory
- `RECEIPT` movement creation
- automatic purchase order status progression

Phase 5:

- API reference and smoke verification
- deeper tests around duplicate posting, over-receipt prevention, and concurrent receipt scenarios

9. Current Repository Status

Verified from the repository:

- app already includes `auth`, `product`, `warehouse`, and `inventory` modules
- inventory supports stock balances, movements, and transfers
- inventory movement types already include `RECEIPT`
- current stock increase flow uses manual adjustment APIs rather than purchase receipts
- no supplier or purchase schema files exist in `src/database/schema`
- no purchase module exists under `src/modules`

10. Final Assessment

Architecture fit:

- the purchase requirements fit the project architecture well
- purchase should be implemented as a separate operational domain rather than merged into inventory or warehouse

Functionality fit:

- the requested purchase functionality does not yet exist in the codebase
- the existing inventory module provides the right integration point for receipt posting

Documentation position made by this file:

- this file reflects the real implementation state
- this file identifies the additional APIs required
- this file aligns purchase work with the current MySQL and repository-based architecture already used in the project
