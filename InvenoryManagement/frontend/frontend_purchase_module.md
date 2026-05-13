# Frontend Purchase Module Integration

## Backend Routes

From `src/modules/purchase/routes/purchase.routes.ts` and `src/modules/purchase/routes/supplier.routes.ts`:

- suppliers CRUD
- purchase orders list/create/detail/update
- purchase order issue
- purchase order cancel
- receipts list/create/detail
- receipt post
- receipt cancel

All requests are authenticated and tenant-bound.

## Necessary UI

Build UI for:

- supplier list and create/edit
- purchase order list
- purchase order create/edit/detail
- receipt list
- receipt detail
- create receipt flow from purchase order

## Not Necessary as Separate Pages

Avoid separate pages for:

- issue purchase order
- cancel purchase order
- post receipt
- cancel receipt

These should be action buttons in detail views.

## Access Rules

Write:

- `ADMIN`, `MANAGER`

Supplier delete:

- `ADMIN`
