You are a Senior Backend Engineer and Code Reviewer implementing the Product module for this project.

Build a production-grade Product Module for the existing multi-tenant Inventory Management backend.

Project Architecture You Must Follow
- Use the existing backend style: `route -> controller -> service -> repository -> database`.
- Use TypeScript strict mode with no `any`.
- Use MySQL with `mysql2` and SQL schema files.
- Reuse the existing shared infrastructure:
  - auth middleware
  - tenant middleware
  - RBAC middleware
  - centralized error handling
  - standardized API response format
  - environment config from `src/config/env.ts`
  - Unit of Work
  - Transaction Manager
- Do not introduce Prisma or another ORM for this module.

Module Scope
- Create product.
- Update product.
- Soft delete product.
- Get product by id.
- List products with search, filter, sort, and pagination.
- Manage product variants.
- Manage product categories.
- Manage product units if tenant-defined units are required.
- Support SKU generation and barcode storage.
- Support tenant-specific dynamic or custom fields.

Required Functional Features
- Strict tenant isolation on every product, variant, category, unit, and custom-field query.
- Product creation with optional variants.
- Variant-aware SKU generation.
- Category assignment.
- Barcode capture and uniqueness rules.
- Dynamic custom-field definitions and custom-field values.
- Soft delete behavior that excludes deleted records from normal listing and lookup flows.
- Pagination, filtering, and search-ready repository queries.

Expected Implementation Deliverables
1. SQL schema files under the database schema folder.
2. Product module folder structure under `src/modules/product`.
3. DTO validation schemas with Zod.
4. Controllers.
5. Services.
6. Repositories.
7. Routes.
8. Types or interfaces where needed.
9. Example API contracts or sample request shapes where useful.

Suggested Module Structure
- `src/modules/product/controllers`
- `src/modules/product/services`
- `src/modules/product/repositories`
- `src/modules/product/dtos`
- `src/modules/product/routes`
- `src/modules/product/types`

Transaction and Unit of Work Rules
- Any multi-step write flow must use the existing Unit of Work abstraction.
- Do not open raw transactions directly inside controllers.
- Services must orchestrate transaction boundaries.
- Repositories must support running against either the default executor or an active transaction context.
- Product create flows that include variants, category links, dynamic-field values, or generated identifiers must be treated as transactional workflows.
- Product update flows that modify multiple related tables must also be transactional.

Repository and Query Rules
- Repository methods must make tenant scoping explicit and difficult to bypass.
- All SQL must be parameterized.
- Add appropriate indexes for:
  - `tenant_id`
  - SKU
  - barcode
  - category lookups
  - list/search filters
- Prefer stable pagination and deterministic sorting.
- Do not return soft-deleted records in normal queries.

API and Security Rules
- Product routes must be protected with auth middleware and tenant middleware.
- Use RBAC for write operations.
- Define which roles can create, update, delete, and view products.
- Controllers only parse input, call services, and format responses.
- Keep business rules in services, not controllers.

Dynamic Field Expectations
- Support tenant-defined field definitions.
- Support validation metadata such as type, required, allowed values, and variant applicability.
- Separate field-definition storage from field-value storage.
- Design the implementation so future reporting and filtering can evolve without breaking tenant isolation.

Self-Review Requirements
Before finalizing the implementation, you must verify:
1. Tenant isolation is enforced in every repository query path.
2. Unit of Work is used for all multi-table write flows.
3. Controllers are thin and services own business rules.
4. SQL is parameterized and indexed appropriately.
5. Soft delete behavior is consistent.
6. SKU and barcode uniqueness are handled correctly.
7. Search, filter, and pagination queries are scalable.
8. Naming and folder structure are consistent with the existing auth module.
9. Error handling and API responses use the shared common layer.
10. The module is extensible for future inventory and stock operations.

Output Expectations
- Return production-oriented code and structure.
- Keep the implementation aligned with this repo's actual stack.
- Do not drift into a different architecture than the auth module already established.

## Current Implementation Status

The Product module is now implemented and validated against the current codebase and live API behavior.

### Implemented and Verified

- Product routes are mounted at `/api/v1/products`
- Auth and tenant middleware protect all product routes
- RBAC is enforced as:
  - `ADMIN`, `MANAGER` for create and update flows
  - `ADMIN` for delete
  - `ADMIN`, `MANAGER`, `STAFF` for reads
- Product support endpoints are implemented and verified:
  - units
  - categories
  - custom field definitions
  - product attributes for `VARIABLE` products
- Core product flows are implemented and verified:
  - create simple product
  - create variable product with variants
  - get product by id
  - list products
  - filtered list products
  - update product
  - soft delete product
- Tenant isolation is verified on product reads
- Staff write access is correctly blocked with `403`

### Repository and Query Notes

- Product insert SQL was corrected to match column and placeholder counts
- Product variant insert SQL was corrected to match column and placeholder counts
- Product list and count reads now use the shared query path instead of prepared execute for that read shape
- Product list ordering remains deterministic using validated sort keys and a stable secondary `id` ordering

### Verification Summary

The following flows were exercised successfully through HTTP in-process verification:

- company registration
- login
- token refresh
- invite user
- accept invite
- invited staff login
- staff forbidden write attempt
- create unit
- create category
- create custom field definition
- list products before creation
- create simple product
- filtered product list
- create variable product with variants
- list variable product attributes
- cross-tenant product fetch returning `404`
- soft delete product and confirm deleted product fetch returns `404`

### Practical Clarification

The implementation is aligned with the repo architecture and current stack. The docs above remain the architectural contract; this section records the current verified state of the module in the repository.
