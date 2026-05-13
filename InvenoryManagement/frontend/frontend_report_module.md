# Frontend Reporting Module Integration

## Backend Routes

From `src/modules/reporting/routes/reporting.routes.ts`:

- dashboard summary
- inventory stock summary
- inventory movement summary
- low stock report
- inventory valuation
- purchase summary
- purchases by supplier
- purchase receipts trend
- sales summary
- sales by customer
- sales orders trend
- sales shipments trend
- sales reservations trend
- returns summary
- returns trend
- warehouse summary
- warehouse utilization
- top selling products
- top purchased products
- non-moving products

All requests are authenticated, tenant-bound, and read-permission guarded.

## Necessary UI

Build UI for:

- reporting dashboard overview
- comparison charts on dashboard:
- sales vs purchase trend
- sales vs returns trend
- sales shipments trend
- sales reservations trend
- top selling products chart
- inventory report views (stock, movement, low stock, valuation)
- purchase report views (summary, supplier ranking, receipts trend)
- sales report views (summary, customer ranking, orders trend, shipments trend, reservations trend)
- returns report views (summary, trend)
- warehouse report views (summary, utilization)
- product performance views (top selling, top purchased, non-moving)
- shared report filters (date range, warehouse, product/customer/supplier where applicable)

Use one common dashboard date range:

- all dashboard charts must use the same `dateFrom` and `dateTo`
- on date range change, reload every chart with the updated range

## Not Necessary as Separate Pages

Avoid separate pages for:

- each single KPI metric
- each chart/table widget endpoint
- trend endpoints used only for dashboard cards/charts

These should be grouped under consolidated reporting screens with tabs/sections.

## Access Rules

Read:

- `ADMIN`, `MANAGER`
