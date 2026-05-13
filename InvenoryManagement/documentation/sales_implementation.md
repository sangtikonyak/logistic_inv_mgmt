Sales Module Implementation Plan and Status

This document translates the sales scope into the current repository's actual architecture and implementation reality.

It is written to align with the project's implemented modules and current inventory flow.

1. Stack and Architecture Constraints

The sales module must follow the same approach already used in this repository:

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

The sales module must not assume:

- Prisma
- PostgreSQL-only features
- a different folder structure than the existing `auth`, `product`, `warehouse`, `inventory`, and `purchase` modules

2. Current Scope Match Assessment

2.1 What Already Matches the Sales Prerequisites

The project already has the foundational platform pieces needed for sales implementation:

- tenant-aware authentication
- RBAC
- shared middleware for auth and tenant resolution
- centralized error handling
- consistent API responses
- transactional support through Unit of Work
- product and variant master data
- warehouse master data for fulfillment locations
- inventory stock and movement infrastructure
- purchase-driven inbound inventory support

These are strong prerequisites for sales work because sales records and shipment posting will depend on:

- authenticated user identity
- tenant isolation
- product and variant references
- warehouse and bin references
- transactional consistency
- inventory reservation and issue integration

2.2 What Does Not Yet Match the Sales Scope

The sales features described in the scope are not implemented yet.

Missing implementation areas:

- customer tables
- sales order tables
- sales reservation tables
- sales shipment tables
- customer controllers, services, repositories, DTOs, and routes
- sales controllers, services, repositories, DTOs, and routes
- sales API reference
- sales-driven inventory reservation and shipment flow

3. Functional Scope Check

Requested sales-aligned scope for this project:

- create customer
- update customer
- soft delete customer
- list customers with pagination and filtering
- create sales order
- update sales order while draft
- confirm sales order
- cancel sales order
- reserve stock
- release reservation where applicable
- record full or partial shipment
- post shipped stock into inventory
- view sales orders, reservations, and shipments with status history

Current repository support against that scope:

- customer CRUD: not implemented
- sales order lifecycle: not implemented
- reservation workflow: not implemented
- shipment workflow: not implemented
- customer-based outbound history: not implemented
- shipment posting into inventory as sales flow: not implemented
- outbound stock currently possible only through manual stock adjustment and warehouse transfer: implemented outside sales domain

Conclusion:

- the current codebase does not yet satisfy the sales scope of work
- the existing inventory module provides the necessary stock infrastructure for future reservation and shipment posting
- additional APIs and database structures are required

4. Recommended Module Structure

The sales implementation should follow the same module shape as the other modules.

Recommended structure:

- `src/modules/sales/sales.module.ts`
- `src/modules/sales/controllers`
- `src/modules/sales/services`
- `src\modules/sales/repositories`
- `src/modules/sales/dtos`
- `src/modules/sales/routes`
- `src/modules/sales/types`

Recommended schema files:

- `src/database/schema/customers.sql`
- `src/database/schema/sales_orders.sql`
- `src/database/schema/sales_order_items.sql`
- `src/database/schema/sales_reservations.sql`
- `src/database/schema/sales_reservation_items.sql`
- `src/database/schema/sales_shipments.sql`
- `src/database/schema/sales_shipment_items.sql`

5. Additional APIs Required

Based on the current project and the intended sales scope, these APIs still need to be implemented.

5.1 Customer APIs

- `GET /api/v1/customers`
- `POST /api/v1/customers`
- `GET /api/v1/customers/:customerId`
- `PUT /api/v1/customers/:customerId`
- `DELETE /api/v1/customers/:customerId`

5.2 Sales Order APIs

- `GET /api/v1/sales/orders`
- `POST /api/v1/sales/orders`
- `GET /api/v1/sales/orders/:salesOrderId`
- `PUT /api/v1/sales/orders/:salesOrderId`
- `POST /api/v1/sales/orders/:salesOrderId/confirm`
- `POST /api/v1/sales/orders/:salesOrderId/cancel`

5.3 Reservation APIs

- `GET /api/v1/sales/reservations`
- `POST /api/v1/sales/orders/:salesOrderId/reservations`
- `GET /api/v1/sales/reservations/:reservationId`
- `POST /api/v1/sales/reservations/:reservationId/post`
- `POST /api/v1/sales/reservations/:reservationId/release`
- `POST /api/v1/sales/reservations/:reservationId/cancel`

5.4 Shipment APIs

- `GET /api/v1/sales/shipments`
- `POST /api/v1/sales/orders/:salesOrderId/shipments`
- `GET /api/v1/sales/shipments/:shipmentId`
- `POST /api/v1/sales/shipments/:shipmentId/post`
- `POST /api/v1/sales/shipments/:shipmentId/cancel`

6. Implementation Rules

6.1 Tenant Isolation

- every repository method must require `tenantId`
- all customer, sales order, reservation, and shipment queries must be tenant-scoped
- cross-tenant access must return not found or forbidden behavior consistent with existing modules
- inventory posting must still validate tenant ownership for warehouse, product, variant, zone, and bin references

6.2 Transaction Rules

The following flows should be transactional:

- create sales order with items
- update sales order items in draft state
- post reservation
- release reservation when it affects inventory balances
- post shipment
- any flow that updates sales records and inventory balances together

6.3 Status Rules

- draft sales orders may be edited
- confirmed sales orders should become operationally locked except for permitted note updates
- cancelled sales orders must reject reservations and shipments
- posted reservations and shipments must be immutable in normal flows
- order status should automatically move to `PARTIALLY_RESERVED`, `RESERVED`, `PARTIALLY_SHIPPED`, or `SHIPPED` based on line balances

6.4 Reservation Posting Rules

When posting a reservation:

- validate the sales order exists and is reservable
- validate reservation items belong to the sales order
- validate quantities do not exceed remaining reservable quantities
- validate referenced items are inventory-tracked and not service products
- validate available stock is sufficient for the requested reservation
- update `inventory_stocks.reserved_quantity`
- update `inventory_stocks.available_quantity`
- create `inventory_movements` rows with `movement_type = RESERVATION`
- use `reference_type = SALES_RESERVATION` or an equivalent stable value
- update `sales_order_items.reserved_quantity`
- update sales order summary status
- commit or roll back the entire flow as one unit

6.5 Shipment Posting Rules

When posting a shipment:

- validate the sales order exists and is shippable
- validate shipment items belong to the sales order
- validate quantities do not exceed remaining shippable quantities
- validate referenced items are inventory-tracked and not service products
- reduce `inventory_stocks.on_hand_quantity`
- reduce `inventory_stocks.reserved_quantity` if shipment consumes reserved stock
- update `inventory_stocks.available_quantity` consistently
- create `inventory_movements` rows with `movement_type = ISSUE`
- use `reference_type = SALES_SHIPMENT` or an equivalent stable value
- update `sales_order_items.shipped_quantity`
- update sales order summary status
- commit or roll back the entire flow as one unit

6.6 Query and Index Rules

- parameterized SQL only
- stable pagination and deterministic sorting
- indexes for:
  - `tenant_id`
  - customer code
  - customer status
  - sales order number
  - sales order status
  - reservation number
  - shipment number
  - sales order and downstream foreign key lookups

7. Scope-of-Work Alignment Notes

The current project scope is best interpreted as:

- product module = item master data
- warehouse module = location master data
- inventory module = stock and movement operations
- purchase module = controlled inbound stock
- sales module = next business domain for controlled outbound stock

This means the sales documentation should not imply that outbound commercial functionality already exists.

Correct project-aligned wording is:

- sales is planned and designed
- sales depends on existing product, warehouse, inventory, and purchase foundations
- sales APIs and schema are still to be implemented

8. Recommended Delivery Sequence

To reduce implementation risk, sales work should be delivered in phases.

Phase 1:

- customers table
- customer CRUD
- customer list and get by id

Phase 2:

- sales order tables
- sales order create, list, get, update
- draft and confirm workflow

Phase 3:

- reservation tables
- reservation create, list, detail
- validation for available stock and partial reservation quantities

Phase 4:

- transactional reservation posting into inventory
- `RESERVATION` and `RESERVATION_RELEASE` movement creation
- automatic sales order reserved status progression

Phase 5:

- shipment tables
- shipment create, list, detail
- transactional shipment posting into inventory with `ISSUE`
- automatic sales order shipped status progression

Phase 6:

- API reference and smoke verification
- deeper tests around duplicate posting, over-shipment prevention, reservation release, and concurrent fulfillment scenarios

9. Current Repository Status

Verified from the repository:

- app already includes `auth`, `product`, `warehouse`, `inventory`, and `purchase` modules
- inventory supports stock balances, movements, and transfers
- inventory movement types already include `ISSUE`, `RESERVATION`, and `RESERVATION_RELEASE`
- purchase now supports controlled inbound stock
- current outbound stock is not yet modeled as customer-facing reservation and shipment flows
- no customer or sales schema files exist in `src/database/schema`
- no sales module exists under `src/modules`

10. Final Assessment

Architecture fit:

- the sales requirements fit the project architecture well
- sales should be implemented as a separate operational domain rather than merged into inventory, warehouse, or purchase

Functionality fit:

- the requested sales functionality does not yet exist in the codebase
- the existing inventory module provides the right integration point for reservation and shipment posting

Documentation position made by this file:

- this file reflects the real implementation state
- this file identifies the additional APIs required
- this file aligns sales work with the current MySQL and repository-based architecture already used in the project
