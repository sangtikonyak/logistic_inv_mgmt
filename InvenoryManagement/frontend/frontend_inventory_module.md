# Frontend Inventory Module Integration

## Backend Routes

From `src/modules/inventory/routes/inventory.routes.ts` and `src/modules/inventory/routes/inventory-transfer.routes.ts`:

- warehouse stock list
- warehouse stock item detail
- movement list
- stock adjustment create
- transfer list/create/detail
- transfer complete
- transfer cancel

All requests are authenticated and tenant-bound.

## Necessary UI

Build UI for:

- stock overview
- stock item detail
- movement ledger
- stock adjustment form
- transfer list
- transfer detail
- transfer create flow

## Not Necessary as Separate Pages

Avoid separate pages for:

- transfer complete
- transfer cancel

These should be action buttons on transfer detail or list.

## Access Rules

Write:

- `ADMIN`, `MANAGER`
