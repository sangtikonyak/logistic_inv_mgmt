# Frontend Sales Module Integration

## Backend Routes

From `src/modules/sales/routes/sales.routes.ts` and `src/modules/sales/routes/customer.routes.ts`:

- customers CRUD
- sales orders list/create/detail/update
- sales order confirm
- sales order cancel
- reservations list/create/detail
- reservation post
- reservation release
- reservation cancel
- shipments list/create/detail
- shipment post
- shipment cancel

All requests are authenticated and tenant-bound.

## Necessary UI

Build UI for:

- customer list and create/edit
- sales order list
- sales order create/edit/detail
- reservation list/detail
- shipment list/detail

## Not Necessary as Separate Pages

Avoid standalone pages for:

- confirm order
- cancel order
- post reservation
- release reservation
- cancel reservation
- post shipment
- cancel shipment

These should be contextual actions in detail screens.

## Access Rules

Write:

- `ADMIN`, `MANAGER`

Customer delete:

- `ADMIN`
