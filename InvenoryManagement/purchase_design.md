UPDATED V1: Purchase Domain Design

This document defines the target purchase domain for this multi-tenant Inventory Management backend.

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
- The current repository does not yet implement:
  - purchase module
  - supplier master data
  - purchase order workflow
  - purchase receipt workflow
  - purchase invoice tracking

2. Purchase Design Goal

Design a purchase domain that:

- stays fully tenant-scoped
- fits the current MySQL and repository-based architecture
- supports supplier master management
- supports purchase order lifecycle tracking
- supports partial and complete goods receipts
- integrates with inventory without mixing procurement logic into stock services
- keeps purchase history auditable for operational and reporting needs
- remains extensible for future payables, approval workflows, returns, and analytics

Important boundary:

- Product data is master data
- Warehouse data is location master data
- Inventory data owns stock balances and movement ledgers
- Purchase data owns procurement workflows and supplier-facing documents
- Stock should enter inventory through purchase receipt flows, not only through manual adjustments

3. Scope of the Purchase Domain

The purchase domain should support:

- supplier master records per tenant
- supplier contact and address details
- purchase order header and line items
- order statuses from draft to received or cancelled
- warehouse-targeted purchasing
- line-level ordered, received, and pending quantities
- purchase receipt or goods-received workflow
- ability to post received stock into inventory as `RECEIPT` movements
- purchase notes and document references
- audit fields for mutable purchase records

4. Recommended Data Model

4.1 Core Tables

- `suppliers`
- `purchase_orders`
- `purchase_order_items`
- `purchase_receipts`
- `purchase_receipt_items`

Optional future tables:

- `supplier_contacts`
- `purchase_invoices`
- `purchase_returns`
- `purchase_order_approvals`

4.2 Suppliers

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
- soft-deleted suppliers must be excluded from normal lookups
- inactive suppliers should not be selectable for new purchase orders unless explicitly allowed later

4.3 Purchase Orders

Recommended columns:

- `id`
- `tenant_id`
- `supplier_id`
- `warehouse_id`
- `purchase_order_number`
- `status`
- `order_date`
- `expected_date`
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
- `ISSUED`
- `PARTIALLY_RECEIVED`
- `RECEIVED`
- `CANCELLED`

Rules:

- supplier and warehouse must belong to the same tenant
- purchase order numbers should be unique per tenant
- cancelled orders must not accept further receipts
- fully received orders should not accept extra quantity beyond policy limits

4.4 Purchase Order Items

Recommended columns:

- `id`
- `tenant_id`
- `purchase_order_id`
- `product_id`
- `product_variant_id`
- `ordered_quantity`
- `received_quantity`
- `unit_cost`
- `tax_amount`
- `discount_amount`
- `line_total`
- `notes`
- `created_at`
- `updated_at`

Rules:

- each item must reference either `product_id` or `product_variant_id`
- service products should not be valid for stock receipt flows
- received quantity must never exceed ordered quantity unless over-receipt policy is added later

4.5 Purchase Receipts

Recommended columns:

- `id`
- `tenant_id`
- `purchase_order_id`
- `supplier_id`
- `warehouse_id`
- `receipt_number`
- `receipt_date`
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

- receipt belongs to one purchase order
- receipt belongs to the same tenant, supplier, and warehouse as the purchase order
- posted receipts should create inventory movements and balance updates transactionally

4.6 Purchase Receipt Items

Recommended columns:

- `id`
- `tenant_id`
- `purchase_receipt_id`
- `purchase_order_item_id`
- `product_id`
- `product_variant_id`
- `received_quantity`
- `unit_cost`
- `created_at`
- `updated_at`

Rules:

- posted receipt quantities must update the matching purchase order item received balance
- each line must map clearly to a purchase order line for auditability

5. Purchase and Inventory Integration Strategy

5.1 Ownership Boundary

The purchase module should own:

- suppliers
- purchase order creation and updates
- purchase order statuses
- receipt creation and validation
- procurement audit trail

The inventory module should own:

- stock balance creation and updates
- inventory movement ledger writes
- quantity integrity rules
- warehouse locator validation

5.2 Receipt Posting Rule

When a purchase receipt is posted:

- the purchase service should validate the order, supplier, warehouse, and remaining quantities
- the flow should run inside Unit of Work
- inventory stock should increase in the target warehouse or receiving bin
- inventory movements should be written with `movement_type = RECEIPT`
- the movement `reference_type` should be purchase-related, such as `PURCHASE_RECEIPT`
- purchase order item `received_quantity` should be updated
- purchase order status should move to `PARTIALLY_RECEIVED` or `RECEIVED`

5.3 Cost Handling

Initial scope should store unit cost and order totals for procurement traceability.

Important design note:

- inventory valuation logic should remain a future concern unless the project explicitly introduces costing methods such as weighted average or FIFO
- purchase should capture cost data now so valuation can be added later without redesigning procurement history

6. API Design

Recommended base paths:

`/api/v1/suppliers`

`/api/v1/purchases`

Recommended supplier endpoints:

- `GET /api/v1/suppliers`
- `POST /api/v1/suppliers`
- `GET /api/v1/suppliers/:supplierId`
- `PUT /api/v1/suppliers/:supplierId`
- `DELETE /api/v1/suppliers/:supplierId`

Recommended purchase order endpoints:

- `GET /api/v1/purchases/orders`
- `POST /api/v1/purchases/orders`
- `GET /api/v1/purchases/orders/:purchaseOrderId`
- `PUT /api/v1/purchases/orders/:purchaseOrderId`
- `POST /api/v1/purchases/orders/:purchaseOrderId/issue`
- `POST /api/v1/purchases/orders/:purchaseOrderId/cancel`

Recommended receipt endpoints:

- `GET /api/v1/purchases/receipts`
- `POST /api/v1/purchases/orders/:purchaseOrderId/receipts`
- `GET /api/v1/purchases/receipts/:receiptId`
- `POST /api/v1/purchases/receipts/:receiptId/post`
- `POST /api/v1/purchases/receipts/:receiptId/cancel`

7. Security and Tenant Isolation

- every supplier, purchase order, purchase item, and receipt query must filter by `tenant_id`
- supplier, warehouse, product, and variant references must belong to the same tenant
- repositories should make unscoped access difficult
- write flows should require auth and tenant middleware
- RBAC should follow current project patterns:
  - reads: `ADMIN`, `MANAGER`, `STAFF`
  - writes: `ADMIN`, `MANAGER`
  - destructive or high-risk financial actions may be `ADMIN` only

8. Scalability Considerations

- index all purchase-owned tables by `tenant_id`
- add composite indexes for supplier lookup, purchase status filtering, and document number lookups
- keep list endpoints paginated and searchable
- keep receipts and inventory posting transactional
- preserve compatibility with future modules such as accounts payable, purchase returns, and supplier analytics

9. Edge Cases

- issuing a purchase order with no line items
- creating receipt lines for products not present on the order
- receiving more than the pending quantity
- posting the same receipt twice
- cancelling an already posted receipt without a return or reversal process
- creating purchase orders for inactive or soft-deleted suppliers
- attempting to receive service products into inventory
- mismatch between purchase warehouse and receiving bin ownership
- partial receipt across multiple deliveries

10. Current Repository Status vs Target Design

Current verified repository status:

- auth module exists
- product module exists
- warehouse module exists
- inventory module exists
- inventory supports movement types including `RECEIPT`
- current inbound stock operations are still manual adjustments rather than purchase-driven receipts

Not yet implemented in this repository:

- supplier schema files
- purchase schema files
- purchase module under `src/modules/purchase`
- supplier CRUD APIs
- purchase order APIs
- purchase receipt posting APIs

This document is therefore the target purchase design for the next implementation phase, aligned with the current project architecture and scope of work.
