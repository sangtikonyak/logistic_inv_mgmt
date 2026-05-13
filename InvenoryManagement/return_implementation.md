Returns Module Backend Implementation Status

This document reflects the current backend implementation of the returns domain in this repository.

It is aligned to the project's actual code, runtime wiring, and database structure.

1. Stack and Architecture Constraints

The returns module must follow the same approach already used in this repository:

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

The returns module must not assume:

- Prisma
- PostgreSQL-only features
- a different folder structure than the existing `auth`, `product`, `warehouse`, `inventory`, `purchase`, and `sales` modules

2. Current Scope Match Assessment

2.1 What Already Matches the Returns Prerequisites

The project already has the foundational platform pieces needed for returns implementation:

- tenant-aware authentication
- RBAC
- shared middleware for auth and tenant resolution
- centralized error handling
- consistent API responses
- transactional support through Unit of Work
- product and variant master data
- warehouse master data for return destinations and source locations
- inventory stock and movement infrastructure
- purchase receipt posting flow
- sales reservation and shipment posting flow

These are strong prerequisites for returns work because return records and posting flows will depend on:

- authenticated user identity
- tenant isolation
- product and variant references
- warehouse and bin references
- transactional consistency
- posted purchase and sales documents
- inventory movement integration for reversals and compensating stock changes

2.2 What Still Does Not Yet Match Full Returns Scope

The backend returns domain now exists, but some broader scope areas are still not implemented.

Remaining gaps:

- frontend returns pages and API client integration
- dedicated return API reference under `documentation/`
- reversal workflow for already posted returns
- automated backend tests and smoke fixtures for returns

3. Functional Scope Check

Requested returns-aligned scope for this project:

- create sales return
- update sales return while draft
- post sales return
- cancel sales return while not posted
- list sales returns with pagination and filtering
- view sales return details
- create purchase return
- update purchase return while draft
- post purchase return
- cancel purchase return while not posted
- list purchase returns with pagination and filtering
- view purchase return details
- validate returns against original posted shipment or receipt quantities
- post inventory effects through the inventory module boundary and movement ledger

Current repository support against that scope:

- sales return workflow: implemented
- purchase return workflow: implemented
- return document lifecycle: implemented for `DRAFT`, `POSTED`, and `CANCELLED`
- return-driven inventory posting: implemented
- traceable linkage from return records to original purchase receipt or sales shipment: implemented

Conclusion:

- the backend codebase now satisfies the core returns scope of work
- the existing purchase, sales, warehouse, and inventory modules were the correct foundation for returns
- frontend work, API reference documentation, and reversal flows are still pending

4. Recommended Module Structure

The returns implementation should follow the same module shape as the other modules.

Recommended structure:

- `src/modules/returns/returns.module.ts`
- `src/modules/returns/controllers`
- `src/modules/returns/services`
- `src/modules/returns/repositories`
- `src/modules/returns/dtos`
- `src/modules/returns/routes`
- `src/modules/returns/types`

Recommended schema files:

- `src/database/schema/purchase_returns.sql`
- `src/database/schema/purchase_return_items.sql`
- `src/database/schema/sales_returns.sql`
- `src/database/schema/sales_return_items.sql`

Optional future schema additions:

- `src/database/schema/return_reasons.sql`
- `src/database/schema/return_attachments.sql`

5. Additional APIs Required

The backend now exposes these returns APIs.

5.1 Purchase Return APIs

- `GET /api/v1/returns/purchase`
- `POST /api/v1/returns/purchase`
- `GET /api/v1/returns/purchase/:purchaseReturnId`
- `PUT /api/v1/returns/purchase/:purchaseReturnId`
- `POST /api/v1/returns/purchase/:purchaseReturnId/post`
- `POST /api/v1/returns/purchase/:purchaseReturnId/cancel`

5.2 Sales Return APIs

- `GET /api/v1/returns/sales`
- `POST /api/v1/returns/sales`
- `GET /api/v1/returns/sales/:salesReturnId`
- `PUT /api/v1/returns/sales/:salesReturnId`
- `POST /api/v1/returns/sales/:salesReturnId/post`
- `POST /api/v1/returns/sales/:salesReturnId/cancel`

Current request design used in code:

- purchase return create and update flows are anchored to `purchaseReceiptId` and `purchaseReceiptItemId`
- sales return create and update flows are anchored to `salesShipmentId` and `salesShipmentItemId`
- supplier, customer, order, and warehouse context are derived from the upstream posted document instead of being accepted as free-form request inputs

6. Listing, Filtering, and Pagination Requirements

6.1 Listing Contract

Both purchase return and sales return list APIs must support:

- pagination by default
- business-field filtering
- date-range filtering
- deterministic sorting
- stable API response shape

Recommended list response shape:

- `items`
- `pagination`

Recommended pagination object:

- `page`
- `limit`
- `total`
- `totalPages`
- `hasNextPage`
- `hasPrevPage`

Recommended default behavior:

- default `page` and `limit` values should follow the same conventions already used in other modules
- unsupported or invalid sort fields must be rejected or normalized through strict DTO validation
- all list queries must use matching filtered `count` queries so pagination metadata stays correct

6.2 Purchase Return Listing Filters

Recommended query parameters for `GET /api/v1/returns/purchase`:

- `page`
- `limit`
- `search`
- `status`
- `supplierId`
- `warehouseId`
- `purchaseOrderId`
- `purchaseReceiptId`
- `purchaseReturnNumber`
- `dateFrom`
- `dateTo`
- `sortBy`
- `sortDir`

Recommended purchase return searchable fields:

- purchase return number
- supplier name
- notes

Recommended purchase return sortable fields:

- `returnDate`
- `createdAt`
- `updatedAt`
- `purchaseReturnNumber`

6.3 Sales Return Listing Filters

Recommended query parameters for `GET /api/v1/returns/sales`:

- `page`
- `limit`
- `search`
- `status`
- `customerId`
- `warehouseId`
- `salesOrderId`
- `salesShipmentId`
- `salesReturnNumber`
- `dateFrom`
- `dateTo`
- `sortBy`
- `sortDir`

Recommended sales return searchable fields:

- sales return number
- customer name
- notes

Recommended sales return sortable fields:

- `returnDate`
- `createdAt`
- `updatedAt`
- `salesReturnNumber`

6.4 Date Range Rules

Date range filtering should:

- support `dateFrom` and `dateTo`
- apply to the business return date rather than only record creation date unless an additional audit-date filter is added later
- validate that `dateFrom` is not after `dateTo`
- use inclusive comparison rules consistently

6.5 Repository and Service Responsibilities for Listings

Repository layer must provide:

- paginated list query for purchase returns
- filtered count query for purchase returns
- paginated list query for sales returns
- filtered count query for sales returns

Service layer must provide:

- normalization of listing inputs
- validated sorting rules
- pagination metadata assembly
- response mapping consistent with existing modules

7. Recommended Data Ownership and References

7.1 Purchase Return Ownership

The purchase return flow should reference already posted inbound procurement records.

Recommended document linkage:

- purchase return header references:
  - `supplier_id`
  - `warehouse_id`
  - optional `purchase_order_id`
  - optional `purchase_receipt_id`
- purchase return items reference:
  - `purchase_receipt_item_id` where possible for strongest auditability
  - `product_id` or `product_variant_id`
  - optional `bin_id`

Recommended business meaning:

- purchase return removes previously received stock from inventory
- purchase return should be constrained by quantities already received and not yet already returned

7.2 Sales Return Ownership

The sales return flow should reference already posted outbound fulfillment records.

Recommended document linkage:

- sales return header references:
  - `sales_order_id`
  - optional `sales_shipment_id`
  - optional `customer_id`
  - `warehouse_id`
- sales return items reference:
  - `sales_shipment_item_id` where possible for strongest auditability
  - `product_id` or `product_variant_id`
  - optional `bin_id`

Recommended business meaning:

- sales return adds stock back into inventory after a customer return
- sales return should be constrained by quantities already shipped and not yet already returned

8. Implementation Rules

8.1 Tenant Isolation

- every repository method must require `tenantId`
- all purchase return and sales return queries must be tenant-scoped
- all upstream document references must belong to the same tenant
- cross-tenant access must return not found or forbidden behavior consistent with existing modules
- inventory posting must still validate tenant ownership for warehouse, product, variant, zone, and bin references

8.2 Transaction Rules

The following flows should be transactional:

- create return with items if header and lines are stored together
- update draft return and replace items
- post purchase return
- post sales return
- any flow that updates return records and inventory balances together

8.3 Status Rules

Recommended return statuses:

- `DRAFT`
- `POSTED`
- `CANCELLED`

Rules:

- draft returns may be edited
- posted returns must be immutable in normal flows
- cancelled returns must not be postable
- posted returns must not be cancellable without a dedicated reversal workflow
- duplicate posting attempts must be rejected with conflict errors

8.4 Quantity Validation Rules

When validating returns:

- returned quantity must be greater than zero
- return quantity must not exceed remaining returnable quantity from the original posted document
- service products must be rejected from inventory-affecting return flows
- only active inventory-tracked items may participate in inventory-affecting returns
- referenced warehouse and optional bin must match the operational context of the return policy

8.5 Purchase Return Posting Rules

When posting a purchase return:

- validate the return exists and is still draft
- validate the referenced upstream receipt and receipt items exist
- validate quantities do not exceed remaining receipted-but-not-returned quantities
- validate sufficient current stock exists in the source warehouse or bin
- reduce `inventory_stocks.on_hand_quantity`
- reduce `inventory_stocks.available_quantity` consistently
- keep `reserved_quantity` unchanged unless a future policy explicitly supports returning reserved stock
- create `inventory_movements` rows using:
  - `movement_type = ISSUE`
  - `reference_type = PURCHASE_RETURN`
- update purchase-return-specific posted quantities and status
- commit or roll back the entire flow as one unit

8.6 Sales Return Posting Rules

When posting a sales return:

- validate the return exists and is still draft
- validate the referenced upstream shipment and shipment items exist
- validate quantities do not exceed remaining shipped-but-not-returned quantities
- create or update `inventory_stocks`
- increase `inventory_stocks.on_hand_quantity`
- increase `inventory_stocks.available_quantity`
- keep `reserved_quantity` unchanged unless a future restocking policy explicitly reserves returned stock
- create `inventory_movements` rows using:
  - `movement_type = RECEIPT`
  - `reference_type = SALES_RETURN`
- update sales-return-specific posted quantities and status
- commit or roll back the entire flow as one unit

8.7 Query and Index Rules

- parameterized SQL only
- stable pagination and deterministic sorting
- list endpoints must support filtered list and filtered count queries
- indexes for:
  - `tenant_id`
  - purchase return number
  - purchase return status
  - purchase return date
  - supplier lookup
  - warehouse lookup
  - purchase receipt and purchase receipt item foreign key lookups
  - sales return number
  - sales return status
  - sales return date
  - customer lookup
  - warehouse lookup
  - sales shipment and sales shipment item foreign key lookups

9. Recommended Schema Shape

9.1 Purchase Returns

Recommended header columns:

- `id`
- `tenant_id`
- `supplier_id`
- `warehouse_id`
- `purchase_order_id`
- `purchase_receipt_id`
- `purchase_return_number`
- `return_date`
- `status`
- `notes`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`

Recommended item columns:

- `id`
- `tenant_id`
- `purchase_return_id`
- `purchase_receipt_item_id`
- `product_id`
- `product_variant_id`
- `bin_id`
- `returned_quantity`
- `created_at`
- `updated_at`

9.2 Sales Returns

Recommended header columns:

- `id`
- `tenant_id`
- `customer_id`
- `warehouse_id`
- `sales_order_id`
- `sales_shipment_id`
- `sales_return_number`
- `return_date`
- `status`
- `notes`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`

Recommended item columns:

- `id`
- `tenant_id`
- `sales_return_id`
- `sales_shipment_item_id`
- `product_id`
- `product_variant_id`
- `bin_id`
- `returned_quantity`
- `created_at`
- `updated_at`

10. Scope-of-Work Alignment Notes

The current project scope is best interpreted as:

- product module = item master data
- warehouse module = location master data
- inventory module = stock and movement operations
- purchase module = controlled inbound stock
- sales module = controlled outbound stock
- returns module = controlled reversal and compensation flows around inbound and outbound stock

This means the returns documentation should not imply that return functionality already exists.

Correct project-aligned wording is:

- returns is planned and designed
- returns depends on existing purchase, sales, warehouse, and inventory foundations
- returns APIs and schema are still to be implemented

11. Delivery Status

Implemented:

- return schema files
- returns module structure
- purchase return draft, list, detail, update, post, and cancel flows
- sales return draft, list, detail, update, post, and cancel flows
- paginated and filterable purchase return listing
- paginated and filterable sales return listing
- transactional posting into inventory movements and inventory stock
- router mounting in `src/index.ts`
- schema execution wiring in `src/database/setup.ts`

Pending:

- dedicated API reference document
- frontend integration
- automated test coverage
- posted-return reversal workflow

12. Important Edge Cases

The returns module must explicitly handle:

- posting the same return twice
- cancelling a posted return without a reversal workflow
- return quantity exceeding original posted receipt or shipment quantity
- cumulative returns exceeding the remaining returnable quantity after earlier returns
- returning stock from a warehouse or bin that does not belong to the tenant
- returning items that are service products or do not track inventory
- purchase return posting when current stock is no longer available
- sales return posting when the referenced shipment exists but the restocking locator is invalid
- referencing draft, cancelled, or otherwise non-posted upstream documents
- invalid date range filters in list endpoints
- mismatched filtered count vs filtered list logic
- non-deterministic ordering causing duplicate or skipped rows across pages

13. Current Repository Status

Verified from the repository:

- app already includes `auth`, `product`, `warehouse`, `inventory`, `purchase`, and `sales` modules
- inventory supports stock balances and movement history
- purchase supports receipt posting into inventory
- sales supports reservation and shipment posting into inventory
- dedicated returns schema files now exist in `src/database/schema`
- dedicated returns module now exists under `src/modules/returns`
- return APIs are now mounted in `src/index.ts` under `/api/v1/returns`

14. Final Assessment

Architecture fit:

- the returns requirements fit the project architecture well
- returns has been implemented as a separate operational domain rather than merged into purchase, sales, or inventory

Functionality fit:

- the requested backend returns functionality now exists in the codebase
- the purchase, sales, warehouse, and inventory modules are being used as the integration points for return validation and posting

Documentation position made by this file:

- this file reflects the current backend implementation state
- this file identifies what is implemented and what still remains
- this file aligns returns behavior with the current MySQL and repository-based architecture already used in the project
