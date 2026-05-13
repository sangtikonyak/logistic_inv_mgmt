# Frontend Core Integration Guide

## Goal

Build a production-grade React frontend for the current backend with:

- industry-level project structure
- JWT authentication and protected routes
- role-aware authorization in the UI
- only necessary screens for business workflows
- modern, responsive design
- scalable API and state architecture

## Backend API Roots

From `src/index.ts`:

- `/api/v1/auth`
- `/api/v1/products`
- `/api/v1/warehouses`
- `/api/v1/inventory`
- `/api/v1/inventory/transfers`
- `/api/v1/suppliers`
- `/api/v1/purchases`
- `/api/v1/customers`
- `/api/v1/sales`

## Recommended Frontend Structure

```text
src/
  app/
    router/
    providers/
    layouts/
    store/
  features/
    auth/
    dashboard/
    products/
    warehouses/
    inventory/
    purchases/
    sales/
  entities/
  shared/
    api/
    config/
    hooks/
    lib/
    types/
    ui/
    utils/
  styles/
```

## Auth and JWT Rules

The backend uses JWT and tenant-aware middleware.

Frontend must:

- store `accessToken`, `refreshToken`, and user context after login
- send JWT on protected requests

```http
Authorization: Bearer <accessToken>
```

- refresh tokens automatically when access tokens expire
- logout and redirect to login if refresh fails
- allow only authenticated users to access dashboard and module screens

## Route Policy

Public routes:

- landing page
- login
- register company
- accept invite

Protected routes:

- dashboard
- products
- warehouses
- inventory
- purchases
- sales
- invite users

Role-aware UI:

- `ADMIN`: full admin and destructive actions
- `MANAGER`: operational create/update actions allowed by backend
- `STAFF`: restricted operational visibility only

Frontend role checks are UX controls only. Backend remains the enforcement layer.

## API Client Standards

Use one shared client that:

- prepends `VITE_API_BASE_URL`
- injects JWT automatically
- normalizes backend `ApiResponse`
- maps validation errors to fields
- handles refresh centrally

Env:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

## UI Scope Rule

Do not create UI for every endpoint.

Create UI only for:

- core business workflows
- recurring operational flows
- key master-data management
- required auth flows

Do not create standalone screens for endpoints that are better as:

- row actions
- detail-page actions
- modals/drawers
- background auth utilities

## Dashboard Rule

After login, users should land on a protected dashboard showing:

- role-aware quick actions
- top KPIs
- topbar with breadcrumb/search/actions
- fixed left admin sidebar
- operational table-style summary section
- analytics cards and alert/activity panels
- workflow alerts
- recent activity

Dashboard layout should follow a premium admin-console structure similar to a modern inventory control panel:

- persistent sidebar navigation
- slim topbar inside the app shell
- compact stat cards
- white card surfaces over a softer neutral canvas
- module pages should inherit the same shell

## Design Rule

The frontend must feel modern and production-ready:

- strong shell and navigation
- premium typography and spacing
- clean tables and detail layouts
- polished states for loading, empty, error, success
- no basic template-like look

Design direction:

- use the approved dashboard reference for structure, not for color
- keep a refined, elegant palette instead of copying the source colors
- prefer editorial-style heading typography paired with clean UI body typography
- keep cards dense, readable, and operational rather than marketing-heavy

## Module Docs

- `frontend_auth_module.md`
- `frontend_product_module.md`
- `frontend_warehouse_module.md`
- `frontend_inventory_module.md`
- `frontend_purchase_module.md`
- `frontend_sales_module.md`
