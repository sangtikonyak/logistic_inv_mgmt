# Frontend Return Module Integration

## Backend Routes

From the backend `Returns` module APIs (as defined in `return_implementation.md`):

### Purchase Returns
- `GET /api/v1/returns/purchase` (List with pagination and filtering)
- `POST /api/v1/returns/purchase` (Create draft)
- `GET /api/v1/returns/purchase/:purchaseReturnId` (Detail view)
- `PUT /api/v1/returns/purchase/:purchaseReturnId` (Update draft)
- `POST /api/v1/returns/purchase/:purchaseReturnId/post` (Post to inventory)
- `POST /api/v1/returns/purchase/:purchaseReturnId/cancel` (Cancel draft)

### Sales Returns
- `GET /api/v1/returns/sales` (List with pagination and filtering)
- `POST /api/v1/returns/sales` (Create draft)
- `GET /api/v1/returns/sales/:salesReturnId` (Detail view)
- `PUT /api/v1/returns/sales/:salesReturnId` (Update draft)
- `POST /api/v1/returns/sales/:salesReturnId/post` (Post to inventory)
- `POST /api/v1/returns/sales/:salesReturnId/cancel` (Cancel draft)

All requests require authentication and are tenant-bound.

## Necessary UI Component Pages

Build UI features utilizing existing `src/features` and `src/shared` patterns:

- **Purchase Return List**: Table view displaying purchase returns. Needs to support pagination and filters (`search`, `status`, `supplierId`, `warehouseId`, `dateFrom`, `dateTo`).
- **Purchase Return Create/Edit**: Form view to draft returning items. Anchored to existing `purchaseReceiptId`.
- **Purchase Return Detail**: View to display posted/draft return details and its reference item rows.
- **Sales Return List**: Table view displaying sales returns. Needs to support pagination and filters (`search`, `status`, `customerId`, `warehouseId`, `dateFrom`, `dateTo`).
- **Sales Return Create/Edit**: Form view to draft returning items. Anchored to existing `salesShipmentId`.
- **Sales Return Detail**: View to display posted/draft return details.

## Not Necessary as Separate Pages

Avoid separate routing pages for the following actions. Simply use action buttons within the detail/list views that trigger the APIs and show success/error toasts.

- Post Purchase Return
- Cancel Purchase Return
- Post Sales Return
- Cancel Sales Return

## Layout, Font, and Color Requirements

- **Consistent Styling**: Build the new pages using the existing Tailwind CSS components and theme (`tailwind.config.js`). 
- **Fonts and Colors**: Reuse the text classes, primary colors, and gray scales already defined in `index.css` and the shared components. 
- **Status Badges**: Use existing pill/badge components for return statuses (`DRAFT`, `POSTED`, `CANCELLED`) to match styling from Sales and Purchase modules.
- **Forms and Tables**: Leverage existing controlled inputs, selects, and paginated table components from `src/shared` to enforce the standardized layout.

## Access Rules

- Write/Create/Post actions: Limited to `ADMIN` and `MANAGER` roles (following consistent RBAC middleware constraints).
- Read/List actions: Follow standard RBAC read permissions.
