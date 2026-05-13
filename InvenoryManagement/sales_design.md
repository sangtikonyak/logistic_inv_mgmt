UPDATED V1: Sales Domain Design

This document defines the target sales domain for this multi-tenant Inventory Management backend.

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
  - warehouse module
  - inventory module
  - purchase module
- The current repository does not yet implement:
  - sales module
  - customer master data
  - sales order workflow
  - reservation workflow
  - shipment or dispatch workflow
  - sales invoice tracking

2. Sales Design Goal

Design a sales domain that:

- stays fully tenant-scoped
- fits the current MySQL and repository-based architecture
- supports customer master management
- supports sales order lifecycle tracking
- supports stock reservation before dispatch
- supports full and partial shipment flows
- integrates with inventory without moving outbound business logic into stock services
- keeps sales history auditable for fulfillment and reporting needs
- remains extensible for future invoicing, returns, delivery workflows, and analytics

Important boundary:

- Product data is master data
- Warehouse data is location master data
- Inventory data owns stock balances and movement ledgers
- Sales data owns customer-facing order, reservation, and shipment workflows
- Stock should leave inventory through sales reservation and issue flows, not only through manual adjustments

3. Scope of the Sales Domain

The sales domain should support:

- customer master records per tenant
- customer contact and address details
- sales order header and line items
- order statuses from draft to shipped or cancelled
- warehouse-targeted fulfillment
- line-level ordered, reserved, shipped, and pending quantities
- reservation and release workflows
- shipment or dispatch workflow
- ability to post outbound stock into inventory as `ISSUE` movements
- sales notes and document references
- audit fields for mutable sales records

4. Recommended Data Model

4.1 Core Tables

- `customers`
- `sales_orders`
- `sales_order_items`
- `sales_reservations`
- `sales_reservation_items`
- `sales_shipments`
- `sales_shipment_items`

Optional future tables:

- `customer_contacts`
- `sales_invoices`
- `sales_returns`
- `sales_order_approvals`

4.2 Customers

Recommended columns:

- `id`
- `tenant_id`
- `name`
- `code`
- `email`
- `phone`
- `contact_person`
- `tax_number`
- `address_line_1`
- `address_line_2`
- `city`
- `state`
- `postal_code`
- `country`
- `status`
- `notes`
- `created_at`
- `updated_at`
- `deleted_at`
- `created_by`
- `updated_by`
- `deleted_by`

Rules:

- tenant-scoped uniqueness for `code`
- soft-deleted customers must be excluded from normal lookups
- inactive customers should not be selectable for new sales orders unless explicitly allowed later

4.3 Sales Orders

Recommended columns:

- `id`
- `tenant_id`
- `customer_id`
- `warehouse_id`
- `sales_order_number`
- `status`
- `order_date`
- `expected_ship_date`
- `currency_code`
- `subtotal_amount`
- `tax_amount`
- `discount_amount`
- `total_amount`
- `notes`
- `created_at`
- `updated_at`
- `deleted_at`
- `created_by`
- `updated_by`
- `deleted_by`

Suggested statuses:

- `DRAFT`
- `CONFIRMED`
- `PARTIALLY_RESERVED`
- `RESERVED`
- `PARTIALLY_SHIPPED`
- `SHIPPED`
- `CANCELLED`

Rules:

- customer and warehouse must belong to the same tenant
- sales order numbers should be unique per tenant
- cancelled orders must not accept reservations or shipments
- fully shipped orders should not accept extra outbound quantity beyond policy limits

4.4 Sales Order Items

Recommended columns:

- `id`
- `tenant_id`
- `sales_order_id`
- `product_id`
- `product_variant_id`
- `ordered_quantity`
- `reserved_quantity`
- `shipped_quantity`
- `unit_price`
- `tax_amount`
- `discount_amount`
- `line_total`
- `notes`
- `created_at`
- `updated_at`

Rules:

- each item must reference either `product_id` or `product_variant_id`
- service products should not participate in stock reservation or shipment flows
- reserved quantity must not exceed ordered quantity
- shipped quantity must not exceed reserved or ordered quantity based on enforced fulfillment policy

4.5 Sales Reservations

Recommended columns:

- `id`
- `tenant_id`
- `sales_order_id`
- `warehouse_id`
- `reservation_number`
- `reservation_date`
- `status`
- `notes`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`

Suggested statuses:

- `DRAFT`
- `POSTED`
- `RELEASED`
- `CANCELLED`

Rules:

- reservation belongs to one sales order
- reservation belongs to the same tenant and warehouse as the sales order
- posted reservations should update reserved stock and movement history transactionally

4.6 Sales Reservation Items

Recommended columns:

- `id`
- `tenant_id`
- `sales_reservation_id`
- `sales_order_item_id`
- `product_id`
- `product_variant_id`
- `bin_id`
- `reserved_quantity`
- `created_at`
- `updated_at`

Rules:

- posted reservation quantities must update the matching sales order item reserved balance
- each line must map clearly to a sales order line for auditability

4.7 Sales Shipments

Recommended columns:

- `id`
- `tenant_id`
- `sales_order_id`
- `warehouse_id`
- `shipment_number`
- `shipment_date`
- `status`
- `notes`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`

Suggested statuses:

- `DRAFT`
- `POSTED`
- `CANCELLED`

Rules:

- shipment belongs to one sales order
- posted shipments should reduce inventory balances and create `ISSUE` movements transactionally

4.8 Sales Shipment Items

Recommended columns:

- `id`
- `tenant_id`
- `sales_shipment_id`
- `sales_order_item_id`
- `product_id`
- `product_variant_id`
- `bin_id`
- `shipped_quantity`
- `created_at`
- `updated_at`

Rules:

- posted shipment quantities must update the matching sales order item shipped balance
- shipment should consume reserved stock first if reservation workflow is active

5. Sales and Inventory Integration Strategy

5.1 Ownership Boundary

The sales module should own:

- customers
- sales order creation and updates
- sales order statuses
- reservation creation and validation
- shipment creation and validation
- customer-facing outbound audit trail

The inventory module should own:

- stock balance creation and updates
- inventory movement ledger writes
- quantity integrity rules
- warehouse locator validation

5.2 Reservation Posting Rule

When a reservation is posted:

- the sales service should validate the order, warehouse, and remaining reservable quantities
- the flow should run inside Unit of Work
- inventory stock reserved quantity should increase
- available quantity should decrease consistently
- inventory movements should be written with `movement_type = RESERVATION`
- the movement `reference_type` should be sales-related, such as `SALES_RESERVATION`
- sales order item `reserved_quantity` should be updated
- sales order status should move to `PARTIALLY_RESERVED` or `RESERVED`

5.3 Shipment Posting Rule

When a shipment is posted:

- the sales service should validate remaining shippable quantities
- the flow should run inside Unit of Work
- inventory stock on-hand quantity should decrease
- reserved quantity should also decrease if shipment consumes reserved stock
- inventory movements should be written with `movement_type = ISSUE`
- the movement `reference_type` should be sales-related, such as `SALES_SHIPMENT`
- sales order item `shipped_quantity` should be updated
- sales order status should move to `PARTIALLY_SHIPPED` or `SHIPPED`

5.4 Price Handling

Initial scope should store unit price and order totals for sales traceability.

Important design note:

- sales should capture pricing data now even if invoicing and margin reporting are added later
- revenue recognition and taxation complexity should remain future concerns unless the project explicitly expands into financial workflows

6. API Design

Recommended base paths:

`/api/v1/customers`

`/api/v1/sales`

Recommended customer endpoints:

- `GET /api/v1/customers`
- `POST /api/v1/customers`
- `GET /api/v1/customers/:customerId`
- `PUT /api/v1/customers/:customerId`
- `DELETE /api/v1/customers/:customerId`

Recommended sales order endpoints:

- `GET /api/v1/sales/orders`
- `POST /api/v1/sales/orders`
- `GET /api/v1/sales/orders/:salesOrderId`
- `PUT /api/v1/sales/orders/:salesOrderId`
- `POST /api/v1/sales/orders/:salesOrderId/confirm`
- `POST /api/v1/sales/orders/:salesOrderId/cancel`

Recommended reservation endpoints:

- `GET /api/v1/sales/reservations`
- `POST /api/v1/sales/orders/:salesOrderId/reservations`
- `GET /api/v1/sales/reservations/:reservationId`
- `POST /api/v1/sales/reservations/:reservationId/post`
- `POST /api/v1/sales/reservations/:reservationId/release`
- `POST /api/v1/sales/reservations/:reservationId/cancel`

Recommended shipment endpoints:

- `GET /api/v1/sales/shipments`
- `POST /api/v1/sales/orders/:salesOrderId/shipments`
- `GET /api/v1/sales/shipments/:shipmentId`
- `POST /api/v1/sales/shipments/:shipmentId/post`
- `POST /api/v1/sales/shipments/:shipmentId/cancel`

7. Security and Tenant Isolation

- every customer, sales order, reservation, and shipment query must filter by `tenant_id`
- customer, warehouse, product, variant, zone, and bin references must belong to the same tenant
- repositories should make unscoped access difficult
- write flows should require auth and tenant middleware
- RBAC should follow current project patterns:
  - reads: `ADMIN`, `MANAGER`, `STAFF`
  - writes: `ADMIN`, `MANAGER`
  - destructive or high-risk commercial actions may be `ADMIN` only

8. Scalability Considerations

- index all sales-owned tables by `tenant_id`
- add composite indexes for customer lookup, sales status filtering, and document number lookups
- keep list endpoints paginated and searchable
- keep reservation and shipment posting transactional
- preserve compatibility with future modules such as invoicing, sales returns, and customer analytics

9. Edge Cases

- confirming a sales order with no line items
- reserving more stock than is available
- shipping more than the pending quantity
- posting the same reservation twice
- posting the same shipment twice
- releasing a reservation after shipment already consumed it
- cancelling an already posted shipment without a return or reversal process
- creating sales orders for inactive or soft-deleted customers
- attempting to reserve or ship service products
- mismatch between sales warehouse and fulfillment bin ownership
- partial reservation and partial shipment across multiple deliveries

10. Current Repository Status vs Target Design

Current verified repository status:

- auth module exists
- product module exists
- warehouse module exists
- inventory module exists
- purchase module exists
- inventory supports movement types including `ISSUE`, `RESERVATION`, and `RESERVATION_RELEASE`
- current outbound stock operations are still manual adjustments and transfers rather than sales-driven reservation and shipment flows

Not yet implemented in this repository:

- customer schema files
- sales schema files
- sales module under `src/modules/sales`
- customer CRUD APIs
- sales order APIs
- reservation posting APIs
- shipment posting APIs

This document is therefore the target sales design for the next implementation phase, aligned with the current project architecture and scope of work.
