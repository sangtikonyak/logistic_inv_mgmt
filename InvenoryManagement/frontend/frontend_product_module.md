# Frontend Product Module Integration

## Backend Routes

From `src/modules/product/routes/product.routes.ts`:

- categories CRUD
- units CRUD
- custom-fields CRUD
- product attributes CRUD
- product attribute values CRUD
- products list/create/detail/update/delete

All requests are authenticated and tenant-bound.

## Implemented Frontend Scope

Current product routes:

- `/app/products/list`
- `/app/products/new`
- `/app/products/categories`
- `/app/products/units`
- `/app/products/custom-fields`
- `/app/products/:productId`
- `/app/products/:productId/edit`
- `/app/products/:productId/attributes`

Current product workspace includes:

- product listing with actions menu
- product create/edit
- product detail
- category management with parent/child hierarchy
- unit management
- custom field definition management
- product-level custom field value entry
- variant-level custom field value entry
- product attribute and attribute value management for variable products
- variable product variant editing
- bundle component editing for bundle products

## UI Coverage

Product listing:

- search
- status filter
- product type filter
- category filter
- unit filter
- row actions for view, edit, delete

Product form:

- base product fields
- category assignment
- unit selection
- operational flags
- variant editor for `VARIABLE`
- bundle component editor for `BUNDLE`
- type-aware behavior for `SIMPLE`, `VARIABLE`, `SERVICE`, `BUNDLE`

Product detail:

- base product summary
- categories
- operational flags
- variants
- custom field values
- bundle components

## Notes

- Custom field definitions are managed in the frontend.
- Product-level and variant-level custom field values are editable in the product form.
- Attribute management is exposed through the product detail flow for variable products.
- Delete product remains `ADMIN` only.
- Create and update remain `ADMIN` and `MANAGER`.

## Not Separate Pages

Still avoided as separate deep pages:

- individual attribute value pages
- individual custom field detail pages

These remain embedded management flows inside the product workspace.
