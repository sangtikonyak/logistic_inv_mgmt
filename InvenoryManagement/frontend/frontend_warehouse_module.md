# Frontend Warehouse Module Integration

## Backend Routes

From `src/modules/warehouse/routes/warehouse.routes.ts`:

- warehouses CRUD
- set default warehouse
- warehouse zones list/create
- zones update/delete
- zone bins list/create
- bins update/delete

All requests are authenticated and tenant-bound.

## Necessary UI

Build UI for:

- warehouse list
- warehouse create/edit
- warehouse detail
- zone management within warehouse detail
- bin management within warehouse detail

## Not Necessary as Separate Pages

Avoid standalone pages for:

- delete actions
- set default action
- zone edit in isolation
- bin edit in isolation

Prefer contextual modals, drawers, and inline admin sections.

## Access Rules

Create/update/default:

- `ADMIN`, `MANAGER`

Delete:

- `ADMIN`
