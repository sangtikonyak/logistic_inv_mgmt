Reporting & Analytics Backend Implementation Plan

This document defines the backend-only implementation plan for a new Reporting & Analytics module.

It is aligned to the current repository architecture:

- modular monolith
- `route -> controller -> service -> repository -> database`
- TypeScript
- Express
- MySQL
- Zod validation
- auth middleware
- tenant middleware
- RBAC middleware
- centralized error handling
- standardized API response wrapper

It is also aligned to the current privilege model already implemented in this project:

- `SUPER_ADMIN`
- `MANAGER`
- `ADMIN`
- `STAFF`
- `OPERATOR`
- explicit permission assignment by `SUPER_ADMIN`

1. Scope

This module is backend-only and read-only in phase 1.

It will provide:

- operational summary APIs
- aggregated reporting APIs
- trend APIs
- analytics APIs for inventory, purchases, sales, returns, products, and warehouses

It will not include in phase 1:

- frontend dashboards
- scheduled report jobs
- email delivery
- CSV or Excel export jobs
- materialized reporting warehouse
- advanced forecasting or ML

2. Privilege Model

Reporting must be privilege-based.

It must not be open to all authenticated users by default.

2.1 Permission Rule

Add a new permission resource:

- `REPORTS`

Supported actions:

- `READ`
- `ALL`

Phase 1 is read-only, so reporting endpoints should require:

- `requirePermission(db, 'REPORTS', 'READ')`

2.2 Effective Access

- `SUPER_ADMIN` can access all reporting endpoints automatically
- any other user can access reports only if super admin grants `REPORTS -> READ` or `REPORTS -> ALL`
- users without `REPORTS` permission must receive forbidden access

2.3 Backend RBAC Changes Required

The reporting implementation requires small RBAC extensions:

- add `REPORTS` to shared permission resource constants
- add default role permission behavior for `REPORTS`

Recommended default behavior:

- `MANAGER`: `REPORTS -> READ`
- `ADMIN`: optional `REPORTS -> READ`
- `STAFF`: no default reporting access unless explicitly granted
- `OPERATOR`: no default reporting access unless explicitly granted

If you want reporting to be entirely explicit, then:

- no non-super-admin role gets `REPORTS` by default

Recommended approach:

- keep reporting explicit
- only `SUPER_ADMIN` has implicit access
- all other roles require explicit grant from super admin

3. Recommended Module Structure

Recommended backend structure:

- `src/modules/reporting/reporting.module.ts`
- `src/modules/reporting/routes/reporting.routes.ts`
- `src/modules/reporting/controllers/reporting.controller.ts`
- `src/modules/reporting/services/reporting.service.ts`
- `src/modules/reporting/repositories/reporting.repository.ts`
- `src/modules/reporting/dtos/reporting.schema.ts`
- `src/modules/reporting/types/reporting.types.ts`

Files to modify:

- `src/index.ts`
- `src/common/constants/permissions.ts`
- `src/common/middlewares/rbac.middleware.ts` only if helper changes are needed
- `src/modules/auth/...` only if permission constants are reused there for validation or defaults

No new SQL schema files are strictly required for phase 1 because reports can be built from existing operational tables.

4. Data Sources

The reporting module should read from already existing business domains.

Primary data sources:

- products
- product variants
- warehouses
- zones
- bins
- inventory stocks
- inventory movements
- suppliers
- purchase orders
- purchase receipts
- customers
- sales orders
- reservations
- shipments
- purchase returns
- sales returns

Reporting should avoid creating duplicate reporting tables in phase 1.

5. API Design Principles

All reporting APIs should be:

- `GET` only in phase 1
- tenant-scoped
- permission-protected through `REPORTS -> READ`
- filterable
- deterministic
- aggregation-safe
- explicit about date range usage

Recommended mount path:

- `/api/v1/reports`

6. APIs To Implement

6.1 Dashboard Summary

- `GET /api/v1/reports/dashboard/summary`

Purpose:

- top-level operational snapshot for tenant dashboard

Recommended metrics:

- total products
- active warehouses
- total suppliers
- total customers
- total on-hand quantity
- total reserved quantity
- low-stock item count
- draft purchase order count
- issued purchase order count
- draft sales order count
- confirmed sales order count
- pending shipment count
- purchase return count in date range
- sales return count in date range

Recommended filters:

- `dateFrom`
- `dateTo`
- optional `warehouseId`

6.2 Inventory Stock Summary

- `GET /api/v1/reports/inventory/stock-summary`

Purpose:

- summarized stock position across tenant inventory

Recommended metrics:

- total sku count with stock
- total on hand
- total available
- total reserved
- stock by warehouse
- stock by product type if useful

Recommended filters:

- `warehouseId`
- `productId`
- `categoryId`
- `dateFrom`
- `dateTo`

6.3 Inventory Movement Summary

- `GET /api/v1/reports/inventory/movement-summary`

Purpose:

- aggregate inbound and outbound movement patterns

Recommended metrics:

- total receipts
- total issues
- total adjustments in
- total adjustments out
- total transfers
- total purchase return issues
- total sales return receipts

Recommended filters:

- `dateFrom`
- `dateTo`
- `warehouseId`
- `productId`
- `movementType`
- `referenceType`

6.4 Low Stock Report

- `GET /api/v1/reports/inventory/low-stock`

Purpose:

- identify products or variants where available or on-hand stock is under threshold

Recommended response:

- product
- variant
- warehouse
- on hand
- available
- reserved
- min stock level
- shortage amount

Recommended filters:

- `warehouseId`
- `productId`
- `categoryId`
- `limit`
- `sortBy`
- `sortDir`

6.5 Inventory Valuation

- `GET /api/v1/reports/inventory/valuation`

Purpose:

- estimate current stock valuation

Recommended calculation:

- `on_hand_quantity * cost_price`

If variant cost exists, prefer variant-level cost.

Recommended response:

- total valuation
- by warehouse valuation
- by product valuation

Recommended filters:

- `warehouseId`
- `productId`
- `categoryId`

6.6 Purchase Summary

- `GET /api/v1/reports/purchases/summary`

Purpose:

- summarize procurement activity

Recommended metrics:

- purchase order count by status
- total ordered quantity
- total received quantity
- total spend estimate
- active suppliers in period
- open purchase orders

Recommended filters:

- `dateFrom`
- `dateTo`
- `supplierId`
- `warehouseId`
- `status`

6.7 Purchases By Supplier

- `GET /api/v1/reports/purchases/by-supplier`

Purpose:

- compare procurement volume and spend by supplier

Recommended metrics:

- supplier id
- supplier name
- order count
- received count
- ordered quantity
- received quantity
- total spend

Recommended filters:

- `dateFrom`
- `dateTo`
- `supplierId`
- `limit`
- `sortBy`
- `sortDir`

6.8 Purchase Receipt Trend

- `GET /api/v1/reports/purchases/receipts-trend`

Purpose:

- trend of inbound receipts over time

Recommended granularity:

- daily
- weekly
- monthly

Recommended filters:

- `dateFrom`
- `dateTo`
- `supplierId`
- `warehouseId`
- `groupBy`

6.9 Sales Summary

- `GET /api/v1/reports/sales/summary`

Purpose:

- summarize sales operations

Recommended metrics:

- sales order count by status
- total ordered quantity
- total reserved quantity
- total shipped quantity
- total sales amount
- active customers in period

Recommended filters:

- `dateFrom`
- `dateTo`
- `customerId`
- `warehouseId`
- `status`

6.10 Sales By Customer

- `GET /api/v1/reports/sales/by-customer`

Purpose:

- compare order and shipment activity by customer

Recommended metrics:

- customer id
- customer name
- order count
- shipped count
- ordered quantity
- shipped quantity
- total sales amount

Recommended filters:

- `dateFrom`
- `dateTo`
- `customerId`
- `limit`
- `sortBy`
- `sortDir`

6.11 Sales Orders Trend

- `GET /api/v1/reports/sales/orders-trend`

Purpose:

- trend of sales order creation and shipment activity

Recommended filters:

- `dateFrom`
- `dateTo`
- `customerId`
- `warehouseId`
- `groupBy`

6.12 Returns Summary

- `GET /api/v1/reports/returns/summary`

Purpose:

- summarize returns activity for both purchase and sales returns

Recommended metrics:

- total purchase returns
- total sales returns
- total returned quantity inbound side
- total returned quantity outbound side
- return counts by status
- return volume by warehouse

Recommended filters:

- `dateFrom`
- `dateTo`
- `warehouseId`
- `supplierId`
- `customerId`

6.13 Warehouse Summary

- `GET /api/v1/reports/warehouses/summary`

Purpose:

- warehouse-level operational summary

Recommended metrics:

- total stock by warehouse
- available stock by warehouse
- reserved stock by warehouse
- movement count by warehouse
- receipt count by warehouse
- shipment count by warehouse
- purchase return count by warehouse
- sales return count by warehouse

Recommended filters:

- `dateFrom`
- `dateTo`
- `warehouseId`

6.14 Warehouse Utilization

- `GET /api/v1/reports/warehouses/utilization`

Purpose:

- analyze warehouse activity and structural usage

Recommended metrics:

- active zones count
- active bins count
- stocked bins count
- unique stocked items count
- movement activity volume

Recommended filters:

- `warehouseId`
- `dateFrom`
- `dateTo`

6.15 Top Selling Products

- `GET /api/v1/reports/products/top-selling`

Purpose:

- identify highest shipped or sold products

Recommended metrics:

- product id
- variant id
- name
- shipped quantity
- sales amount

Recommended filters:

- `dateFrom`
- `dateTo`
- `warehouseId`
- `customerId`
- `limit`
- `sortBy`
- `sortDir`

6.16 Top Purchased Products

- `GET /api/v1/reports/products/top-purchased`

Purpose:

- identify highest procured items

Recommended metrics:

- product id
- variant id
- name
- ordered quantity
- received quantity
- purchase value

Recommended filters:

- `dateFrom`
- `dateTo`
- `warehouseId`
- `supplierId`
- `limit`
- `sortBy`
- `sortDir`

6.17 Non-Moving Products

- `GET /api/v1/reports/products/non-moving`

Purpose:

- identify inventory-tracked products with stock but no movement in a time window

Recommended filters:

- `dateFrom`
- `dateTo`
- `warehouseId`
- `categoryId`
- `limit`

7. DTO and Filter Rules

Recommended common validation rules:

- `dateFrom <= dateTo`
- pagination bounds
- strict sort field whitelist
- strict sort direction whitelist
- valid `groupBy` values only
- filter IDs must be UUIDs if current system uses UUIDs

Common filter fields:

- `page`
- `limit`
- `dateFrom`
- `dateTo`
- `warehouseId`
- `productId`
- `supplierId`
- `customerId`
- `categoryId`
- `status`
- `sortBy`
- `sortDir`

Trend endpoints should support:

- `groupBy=day|week|month`

8. Response Shape

Recommended response shape for simple summary:

- `data.summary`
- `data.filters`

Recommended response shape for ranking reports:

- `data.items`
- `data.pagination` when paging is needed

Recommended response shape for trend reports:

- `data.series`
- `data.groupBy`
- `data.filters`

9. Repository Responsibilities

The reporting repository should:

- contain read-only aggregate queries
- keep queries tenant-scoped
- use parameterized SQL only
- provide small focused methods per report
- avoid mixing response formatting with SQL retrieval

Recommended repository grouping:

- dashboard summary queries
- inventory reporting queries
- purchase reporting queries
- sales reporting queries
- returns reporting queries
- warehouse reporting queries
- product analytics queries

10. Service Responsibilities

The reporting service should:

- validate report filters
- normalize defaults
- build reusable date-range behavior
- map raw SQL rows into API response shape
- combine multiple repository calls for summary endpoints
- enforce any business-specific interpretation rules

11. Route Protection Rules

Every route in reporting routes must use:

- `authMiddleware`
- `tenantMiddleware`
- `requirePermission(db, 'REPORTS', 'READ')`

Example pattern:

- router-level auth and tenant protection
- endpoint-level permission enforcement if needed

Optional:

- mount middleware once for the whole reporting router instead of repeating per route

12. SQL Strategy

Phase 1 should use direct aggregated SQL over operational tables.

Recommended strategy:

- summary queries with grouped counts and sums
- date-bucket trend queries
- warehouse and product ranking queries
- filtered count queries only for endpoints that paginate

Avoid in phase 1:

- background ETL
- denormalized analytics tables
- scheduled snapshot tables

13. Performance and Indexing

Reporting queries will touch large operational tables, so performance planning is required.

Recommended review areas:

- inventory movements
- inventory stocks
- purchase orders and receipts
- sales orders and shipments
- return headers and items

Recommended indexes to verify or add if missing:

- `tenant_id`
- business date fields
- status fields
- warehouse foreign keys
- supplier foreign keys
- customer foreign keys
- product and variant foreign keys
- reference type / movement type fields for movement-heavy reporting

14. Suggested Implementation Phases

Phase 1:

- add `REPORTS` permission resource
- add reporting module scaffolding
- mount `/api/v1/reports`
- implement dashboard summary
- implement inventory stock summary
- implement low-stock report

Phase 2:

- implement purchase summary
- implement sales summary
- implement returns summary
- implement warehouse summary

Phase 3:

- implement top-selling products
- implement top-purchased products
- implement non-moving products
- implement movement and trend reports

Phase 4:

- optimize slow queries
- add export-oriented endpoints if needed
- add documentation under `documentation/`

15. Validation and Edge Cases

The reporting module must handle:

- missing or invalid date ranges
- invalid sort fields
- invalid `groupBy` values
- empty result sets
- large tenant datasets
- cross-tenant leakage prevention
- reporting against cancelled and draft documents where business logic should exclude them

Recommended business rules:

- dashboard summaries should define whether draft documents count or not
- shipped metrics should come from posted shipment data, not draft orders
- received metrics should come from posted receipt data, not draft purchase orders
- return metrics should distinguish purchase returns and sales returns clearly

16. APIs Summary List

Phase 1 recommended APIs:

- `GET /api/v1/reports/dashboard/summary`
- `GET /api/v1/reports/inventory/stock-summary`
- `GET /api/v1/reports/inventory/movement-summary`
- `GET /api/v1/reports/inventory/low-stock`
- `GET /api/v1/reports/inventory/valuation`
- `GET /api/v1/reports/purchases/summary`
- `GET /api/v1/reports/purchases/by-supplier`
- `GET /api/v1/reports/purchases/receipts-trend`
- `GET /api/v1/reports/sales/summary`
- `GET /api/v1/reports/sales/by-customer`
- `GET /api/v1/reports/sales/orders-trend`
- `GET /api/v1/reports/returns/summary`
- `GET /api/v1/reports/warehouses/summary`
- `GET /api/v1/reports/warehouses/utilization`
- `GET /api/v1/reports/products/top-selling`
- `GET /api/v1/reports/products/top-purchased`
- `GET /api/v1/reports/products/non-moving`

17. Files To Create

- `src/modules/reporting/reporting.module.ts`
- `src/modules/reporting/routes/reporting.routes.ts`
- `src/modules/reporting/controllers/reporting.controller.ts`
- `src/modules/reporting/services/reporting.service.ts`
- `src/modules/reporting/repositories/reporting.repository.ts`
- `src/modules/reporting/dtos/reporting.schema.ts`
- `src/modules/reporting/types/reporting.types.ts`

18. Files To Modify

- `src/index.ts`
- `src/common/constants/permissions.ts`

Possible additional files depending on implementation style:

- `src/modules/auth/types/auth.types.ts`
- `src/modules/auth/services/auth.service.ts`
- `src/modules/auth/dtos/auth.schema.ts`

19. Final Recommendation

The Reporting & Analytics module should be implemented as a read-only backend module protected by the existing privilege system.

It should not be visible to every authenticated user by default.

The correct backend rule is:

- super admin can grant `REPORTS -> READ`
- only users with that permission can access report APIs
- all report endpoints remain tenant-scoped and read-only

This keeps reporting consistent with the permission model already implemented in the project.
