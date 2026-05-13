# Frontend User Management & RBAC Module Integration

## Backend Routes Overview

Based on the implemented `auth.routes.ts` and `auth.schema.ts`, the following endpoints are available for User Management. All these routes require a valid JWT, Tenant context, and the `SUPER_ADMIN` role.

- `GET /api/v1/auth/users` (List all users in the tenant)
- `POST /api/v1/auth/invite` (Invite new users by providing emails and selecting a role: `MANAGER`, `ADMIN`, `STAFF`, `OPERATOR`)
- `GET /api/v1/auth/users/:userId/permissions` (Retrieve a specific user's detailed permissions)
- `PUT /api/v1/auth/users/:userId/permissions` (Update granular permissions for a user: `CREATE`, `READ`, `UPDATE`, `DELETE`, `ALL` over specific resources)

## Necessary UI Component Pages

Build the following UI features utilizing existing `src/features` and `src/shared` patterns inside the main application shell:

1. **User Management View / List Page**: 
   - A dedicated page (e.g. `/app/settings/users`) that displays a table of all registered users under the tenant.
   - **Fields**: Email, Role, Status (Active vs Pending Invite).
   - **Actions**: "Invite User" button, "Manage Permissions" button for each row.

2. **Invite User Modal / Form**:
   - Form input for a comma-separated list of emails or dynamic tag input.
   - Select dropdown for assigning the role (`MANAGER`, `ADMIN`, `STAFF`, `OPERATOR`).
   - Triggered from the User Management List Page.

3. **User Permissions Management View / Modal**:
   - A matrix or list-based form showing all valid Resources (e.g., `PRODUCTS`, `ORDERS`, `RETURNS`, `USERS`).
   - Checkboxes or toggles for valid discrete actions: `CREATE`, `READ`, `UPDATE`, `DELETE`, `ALL`.
   - Fetches current state using `GET /api/v1/auth/users/:userId/permissions`.
   - Submits entire payload using `PUT /api/v1/auth/users/:userId/permissions`.

## Layout, Font, and Color Requirements

- **Consistent Styling**: Build the new pages using the existing Tailwind CSS components and theme (`tailwind.config.js`). 
- **Fonts and Colors**: Reuse the text classes, primary colors, and gray scales already defined in `index.css` and the shared components. 
- **Forms and Tables**: Leverage existing controlled inputs, selects, toggles/checkboxes, and table components from `src/shared` to enforce a standardized layout. 
- **Permission Matrix**: For the permissions, use a clean grid/table layout with clear toggle switches or styled checkboxes (with your accent color) to make it easy for the SuperAdmin to scan.

## Frontend Access & Visibility Rules

- **Strict Visibility Settings**:
   - The "User Management" sidebar link or settings menu option should **only** be visible to users whose session role is exactly `SUPER_ADMIN`.
   - Attempting to navigate directly to `/app/settings/users` as a `MANAGER`, `ADMIN`, `STAFF`, or `OPERATOR` should redirect to an unauthorized page or back to the dashboard, as the backend will reject their requests natively.
- **Form Validations**:
   - Ensure the invite form mandates at least one valid email.
   - Ensure the permissions form maps the boolean UI states into the expected JSON structure `{ resource: "XXXX", actions: ["CREATE", "READ", ...] }`.
