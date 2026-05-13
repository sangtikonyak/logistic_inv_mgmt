# Product Multi-Tenant Workflow

This document explains the product workflows for multiple tenants using the APIs defined in [product.routes.ts](/d:/AIPrompts/InvenoryManagement/src/modules/product/routes/product.routes.ts).

## 1. High-Level Product Workflow

The product module follows:

`route -> controller -> service -> repository -> database`

For each request:

1. The request hits a route in `product.routes.ts`.
2. `authMiddleware` validates the JWT.
3. `tenantMiddleware` ensures the request has a tenant context.
4. `requireRole(...)` checks whether the caller can perform the action.
5. The controller validates request params/body/query using Zod.
6. The service applies business rules.
7. The repository runs tenant-scoped SQL.
8. A standardized API response is returned.

## 2. Multi-Tenant Product Isolation Workflow

Tenant A and Tenant B do not share product data.

### Step-by-step

1. Tenant A logs in and receives an access token containing `tenantId = TenantA`.
2. Tenant B logs in and receives an access token containing `tenantId = TenantB`.
3. Tenant A calls any product API:
   - `/products`
   - `/products/categories`
   - `/products/units`
   - `/products/custom-fields`
4. The repositories always filter by Tenant A's `tenantId`.
5. Tenant B calls the same APIs with a different token.
6. The repositories filter by Tenant B's `tenantId`.
7. If Tenant B tries to fetch Tenant A's product by id, the result is `404 Product not found`.

Result:

- each tenant sees only its own units
- each tenant sees only its own categories
- each tenant sees only its own custom field definitions
- each tenant sees only its own products and variants

## 3. Product Setup Workflow Per Tenant

Before creating products, a tenant typically creates supporting master data.

### Step 1: Create Units

API:

- `POST /api/v1/products/units`

Purpose:

- define tenant-specific units like `PCS`, `BOX`, `KG`

Flow:

1. Admin or Manager sends unit payload.
2. Controller validates input.
3. Service normalizes name and code.
4. Service checks duplicate name and code within the tenant.
5. Repository inserts the unit with `tenant_id`.
6. API returns the active unit list for that tenant.

### Step 2: Create Categories

API:

- `POST /api/v1/products/categories`

Purpose:

- create tenant-specific category structures

Flow:

1. Admin or Manager sends category payload.
2. Controller validates input.
3. Service normalizes the name.
4. Service generates a tenant-unique slug.
5. If `parentCategoryId` is present, service confirms that the parent exists in the same tenant.
6. Repository inserts the category.
7. API returns the category list for that tenant.

### Step 3: Create Custom Field Definitions

API:

- `POST /api/v1/products/custom-fields`

Purpose:

- define optional metadata fields for products or variants

Flow:

1. Admin or Manager sends field definition payload.
2. Controller validates body.
3. Service normalizes `fieldKey`.
4. Service validates field-type rules.
5. Service checks tenant-level key uniqueness.
6. Repository inserts the definition.
7. API returns the definition list.

## 4. Simple Product Workflow

This workflow is for products with no variants.

API:

- `POST /api/v1/products`

### Step-by-step

1. Tenant creates units, categories, and optional custom field definitions.
2. Tenant sends a simple product payload.
3. Controller validates the payload.
4. Service normalizes product values.
5. Service enforces product-type rules for `SIMPLE`.
6. Service checks:
   - referenced unit exists in the same tenant
   - referenced categories exist in the same tenant
   - custom field definitions belong to the same tenant
7. Service generates:
   - slug
   - SKU if omitted
8. Service checks SKU and barcode conflicts in the same tenant.
9. Unit of Work starts a transaction.
10. Repository inserts the product row.
11. Repository writes category assignments.
12. Repository writes product-level custom field values.
13. Transaction commits.
14. Service reloads the full product response.
15. API returns the created product.

## 5. Variable Product Workflow

This workflow is for products with multiple variant combinations.

APIs:

- `POST /api/v1/products`
- `GET /api/v1/products/:productId/attributes`
- `POST /api/v1/products/:productId/attributes`

### Step-by-step

1. Tenant prepares product-level data:
   - unit
   - categories
   - optional custom fields
2. Tenant sends a `VARIABLE` product payload with variants.
3. Controller validates the body.
4. Service enforces variable-product rules.
5. Service validates:
   - unit references
   - category references
   - custom field references
   - variant attribute uniqueness
6. Service generates product SKU if missing.
7. Service generates variant SKUs if missing.
8. Service checks tenant-level SKU and barcode conflicts across both products and variants.
9. Unit of Work starts a transaction.
10. Repository inserts the product row.
11. Repository inserts variant rows.
12. Repository writes category assignments.
13. Repository writes custom field values.
14. Structure repository builds:
   - product attributes
   - attribute values
   - variant-to-attribute mappings
15. Transaction commits.
16. Service reloads the full product response including variants and attributes.
17. API returns the created variable product.

## 6. Product Listing Workflow

API:

- `GET /api/v1/products`

Purpose:

- list products for the current tenant
- support search and filters
- return stable pagination

### Step-by-step

1. User sends optional query parameters:
   - `search`
   - `categoryId`
   - `unitId`
   - `productType`
   - `status`
   - `isSellable`
   - `isPurchasable`
   - `page`
   - `limit`
   - `sortBy`
   - `sortDir`
2. Controller validates query parameters.
3. Service calls:
   - repository list query
   - repository count query
4. Repository applies tenant filters and excludes soft-deleted products.
5. Repository applies validated filters and deterministic ordering.
6. Service maps raw rows into response DTOs.
7. API returns:
   - `items`
   - `pagination`

## 7. Product Get By Id Workflow

API:

- `GET /api/v1/products/:productId`

### Step-by-step

1. User sends a product id.
2. Controller validates the id.
3. Service loads the product in the current tenant.
4. If not found, returns `404`.
5. Service loads related data:
   - categories
   - variants
   - product custom fields
   - variant custom fields
   - attributes
   - bundle components
6. Service assembles a full response object.
7. API returns the hydrated product.

## 8. Product Update Workflow

API:

- `PUT /api/v1/products/:productId`

### Step-by-step

1. Admin or Manager sends update payload.
2. Controller validates params and body.
3. Service loads the existing product in the tenant.
4. Service merges existing and new values.
5. Service re-validates:
   - product type rules
   - SKU and barcode uniqueness
   - unit/category references
   - variant uniqueness if variants are included
6. Unit of Work starts a transaction.
7. Repository updates the main product row.
8. Repository updates or replaces:
   - category assignments
   - variants
   - custom field values
   - attribute structures
   - bundle components if present
9. Transaction commits.
10. Service reloads the updated product.
11. API returns the updated product.

## 9. Product Delete Workflow

API:

- `DELETE /api/v1/products/:productId`

### Step-by-step

1. Admin sends product id.
2. Controller validates params.
3. Service confirms the product exists in the tenant.
4. Unit of Work starts a transaction.
5. Repository soft deletes the product.
6. Repository soft deletes related variants.
7. Transaction commits.
8. API returns the deleted product id.

Result:

- product no longer appears in normal list reads
- product no longer appears in normal get-by-id reads

## 10. Attribute Management Workflow for Variable Products

APIs:

- `GET /api/v1/products/:productId/attributes`
- `POST /api/v1/products/:productId/attributes`
- `PUT /api/v1/products/:productId/attributes/:attributeId`
- `DELETE /api/v1/products/:productId/attributes/:attributeId`
- `POST /api/v1/products/:productId/attributes/:attributeId/values`
- `PUT /api/v1/products/:productId/attributes/:attributeId/values/:valueId`
- `DELETE /api/v1/products/:productId/attributes/:attributeId/values/:valueId`

### Step-by-step

1. User references a product id.
2. Service verifies the product exists and is `VARIABLE`.
3. For create/update:
   - controller validates payload
   - service normalizes names
   - service protects against duplicates
4. For delete:
   - service checks whether active variants depend on the attribute or value
5. Repository performs the write.
6. API returns the attribute list or deletion result.

## 11. Role-Based Workflow

### ADMIN

Can:

- read all product APIs
- create and update units
- create and update categories
- create and update custom field definitions
- create and update products
- delete products

### MANAGER

Can:

- read all product APIs
- create and update units
- create and update categories
- create and update custom field definitions
- create and update products

Cannot:

- delete products

### STAFF

Can:

- read product APIs

Cannot:

- create or update units
- create or update categories
- create or update custom field definitions
- create or update products
- delete products

## 12. Practical Tenant Example

### Tenant A

1. Creates unit `PCS`
2. Creates category `Hardware`
3. Creates custom field `Brand`
4. Creates product `Hammer`
5. Lists products and sees `Hammer`

### Tenant B

1. Logs in with a different tenant token
2. Calls `GET /api/v1/products`
3. Does not see Tenant A data
4. Calls `GET /api/v1/products/:productId` using Tenant A's product id
5. Receives `404 Product not found`

This is the expected multi-tenant product workflow in the current implementation.
