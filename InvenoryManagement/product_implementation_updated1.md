UPDATED V2: SaaS-Grade Product Module Implementation Contract

You are a Senior Backend Engineer and Code Reviewer implementing the Product Module for a multi-tenant Inventory Management SaaS backend.

This is NOT an MVP prompt.
This specification is intended for a long-lived SaaS system that must remain maintainable, extensible, secure, and operationally safe as future modules are added.

You MUST produce production-grade, scalable, secure, and extensible code aligned with enterprise inventory systems.

1. Core Intent

Build the Product module as master-data infrastructure for the wider SaaS platform.

The Product module must:

- model products as durable business entities
- support multiple product shapes without rework later
- enforce strict tenant isolation
- support future modules such as stock, warehouse, purchase, supplier, sales, billing, discounting, and reporting
- avoid short-term shortcuts that make later module expansion expensive

IMPORTANT:

- Product data is master data, not stock ledger data
- Do NOT store live inventory balances in product tables
- Design for extensibility before convenience

2. Architecture Rules (STRICT)

Use architecture:

route -> controller -> service -> repository -> database

Mandatory platform rules:

- Use TypeScript strict mode with no `any`
- Use MySQL with `mysql2`
- Use raw SQL schema files
- Do NOT introduce Prisma, Sequelize, TypeORM, or any ORM
- Reuse existing shared infrastructure only:
  - auth middleware
  - tenant middleware
  - RBAC middleware
  - centralized error handling
  - standardized API response format
  - environment config from `src/config/env.ts`
  - Unit of Work
  - Transaction Manager

Layer responsibilities:

- Controllers:
  - validate DTOs with Zod
  - handle HTTP concerns only
  - call services
  - return standardized responses
- Services:
  - own all business logic
  - own transaction orchestration
  - own SKU generation
  - own validation of domain rules
  - own variant logic
  - own custom field validation
- Repositories:
  - own SQL and persistence only
  - no business rules
  - all SQL parameterized
  - explicit tenant scoping in every method

3. SaaS Product Domain Model

The module MUST support these product types:

- `SIMPLE`
- `VARIABLE`
- `SERVICE`
- `BUNDLE`

The module MUST support these statuses:

- `ACTIVE`
- `INACTIVE`
- `ARCHIVED`

Every product MUST also support:

- `is_sellable: boolean`
- `is_purchasable: boolean`
- `track_inventory: boolean`
- `allow_backorder: boolean`
- `min_stock_level`
- `max_stock_level`
- `slug`
- `sku`
- `barcode`
- `cost_price`
- `selling_price`
- `currency_code`

4. Product Type Rules (MANDATORY)

These rules are not optional.
The implementation MUST enforce them in the service layer.

4.1 SIMPLE

- No variants
- One primary SKU at product level
- One product-level barcode allowed
- Inventory policy may be defined at product level
- Pricing may be defined at product level

4.2 VARIABLE

- Must support one or more active variants
- Product acts as a parent/master entity
- Variant-defining attributes determine distinct sellable combinations
- SKU and barcode are expected at variant level
- Product-level SKU may exist only as a parent/reference code if the business allows it
- Inventory policy is variant-oriented
- Pricing may be variant-specific

4.3 SERVICE

- Cannot have stock-tracked inventory
- `track_inventory` MUST be `false`
- `allow_backorder` MUST be `false`
- Variants are not supported unless there is a clear service-package model explicitly added later
- Pricing lives at product level
- SKU may exist for catalog/reference use
- Barcode is optional and usually absent

4.4 BUNDLE

- Represents a sellable grouping of existing products and/or variants
- Bundle definition is product master data, not stock balance
- Component quantities must be stored separately from the main product row
- Inventory is not stored directly in product tables
- `track_inventory` on bundle must reflect bundle policy only, not stock balance
- Pricing may be manual, not automatically derived unless bundle-pricing rules are explicitly added later
- Bundle components must be modeled in dedicated tables

5. Inventory Policy Rules

This module MUST be inventory-ready but must not become the inventory module.

Rules:

- Do NOT store current stock quantity in `products`
- Do NOT store current stock quantity in `product_variants`
- `track_inventory`, `allow_backorder`, `min_stock_level`, and `max_stock_level` are policy fields only
- Current balances, reservations, movements, and location-based inventory belong to future stock modules

For `SERVICE`:

- `track_inventory = false`
- `allow_backorder = false`

For `VARIABLE`:

- inventory policy is variant-oriented even if defaults can be inherited from product level

6. Pricing Model Rules

The prompt must not leave pricing ambiguous.

Pricing rules:

- `cost_price` and `selling_price` are master-data defaults
- for `SIMPLE` and `SERVICE`, prices live on the product
- for `VARIABLE`, prices may live on variants, with product-level values allowed only as defaults if explicitly supported
- for `BUNDLE`, prices are manual master-data values unless derived-pricing rules are introduced later
- use `DECIMAL`, never floating point
- define and use a consistent precision such as `DECIMAL(18,4)`
- currency must be explicit:
  - either tenant default with optional override
  - or explicit per record
- do not leave currency behavior implicit

Recommended baseline:

- store `currency_code CHAR(3)` on product
- optionally allow variant-level override later if needed

7. Identity Rules: SKU, Barcode, Slug

7.1 SKU

- Support both auto-generation and manual override
- Uniqueness boundary is tenant-scoped
- Uniqueness must be enforced across both products and variants within the same tenant where applicable
- Collision handling must be deterministic
- SKU normalization rules must be defined in services

7.2 Barcode

- Tenant-scoped uniqueness
- Optional at product level and variant level
- If present, uniqueness must be enforced among active records

7.3 Slug

- Tenant-scoped unique
- Used for stable search-friendly identity, not as the primary business identifier
- Must be generated deterministically and collision-handled safely

8. Soft Delete Rules (Production Clarification)

Use `deleted_at` for soft delete on tenant-owned product domain tables.

Default query rules:

- normal reads must exclude soft-deleted rows
- list queries must exclude soft-deleted rows
- uniqueness checks for active records must ignore soft-deleted rows logically

CRITICAL MYSQL NOTE:

Do NOT write the spec assuming `UNIQUE(tenant_id, sku, deleted_at)` alone solves active-row uniqueness cleanly.

For MySQL implementation, define a practical strategy such as one of these:

- enforce active uniqueness in service/repository logic before write and support it with indexes
- or use a generated active flag / normalized uniqueness key strategy if the team standardizes on it later

The implementation contract must acknowledge the actual MySQL behavior, not an idealized one.

9. Tenant Isolation Rules

EVERY tenant-owned table MUST include `tenant_id` unless there is a deliberate shared-reference exception.

EVERY repository query MUST include tenant scoping.

Rules:

- no cross-tenant access
- tenant filtering must not depend only on controllers
- repositories must make accidental unscoped queries difficult
- joins must also preserve tenant alignment, not just the top-level table

10. RBAC Rules

The Product module MUST align with the auth system that actually exists in the project.

Current role baseline in the codebase:

- `ADMIN`
- `MANAGER`
- `STAFF`

Do NOT introduce `VIEWER` unless the auth module is explicitly extended first.

Recommended permissions aligned to the current system:

- CREATE -> `ADMIN`, `MANAGER`
- UPDATE -> `ADMIN`, `MANAGER`
- DELETE -> `ADMIN`
- READ -> `ADMIN`, `MANAGER`, `STAFF`

If future product requirements need `VIEWER`, that must first become a platform-wide auth/RBAC change.

11. Transaction and Unit of Work Rules

MUST use Unit of Work for:

- create product with variants
- create product with category mappings
- create product with custom fields
- create bundle with components
- update product when multiple related tables are affected
- update variants in bulk
- update custom field values
- update category mappings
- soft delete product when related variant state must also be updated

Rules:

- controllers MUST NOT handle transactions
- services orchestrate transactions
- repositories must support:
  - default executor
  - transactional executor
- no ad hoc transaction handling outside Unit of Work / Transaction Manager

12. Database Design Requirements

12.1 Required Core Tables

- `products`
- `product_variants`
- `product_categories`
- `product_category_map`
- `product_units`
- `product_bundle_components`

12.2 Required Variant Attribute Tables

Use separate structures for variant-defining attributes.
Do not blur this with custom fields.

Recommended structure:

- `product_attributes`
- `product_attribute_values`
- `product_variant_attribute_values`

Purpose:

- `product_attributes`
  - tenant-defined or product-bound attribute definitions used to define variants
  - examples: Size, Color, Material
- `product_attribute_values`
  - allowed values for those attributes
  - examples: Small, Medium, Red, Blue
- `product_variant_attribute_values`
  - maps a variant to its chosen attribute values

This gives durable, queryable variant structure.

13. Dynamic Fields vs Variant Attributes (MANDATORY CLARIFICATION)

These concepts MUST remain separate.

13.1 Variant Attributes

Use for:

- defining sellable variant combinations
- building variant identity
- generating variant names / combinations
- filtering product variants by structured options

Examples:

- size
- color
- flavor

13.2 Dynamic / Custom Fields

Use for:

- tenant-specific metadata
- optional extensible catalog attributes
- fields not required to define variant identity
- future reporting/filtering extensions

Examples:

- wash instructions
- shelf life
- manufacturer code
- brand notes

Do NOT use custom fields as the core mechanism for variant identity.

14. Required Product Columns

`products` table should include, at minimum:

- `id`
- `tenant_id`
- `name`
- `description`
- `product_type`
- `status`
- `sku`
- `barcode`
- `slug`
- `is_sellable`
- `is_purchasable`
- `track_inventory`
- `allow_backorder`
- `min_stock_level`
- `max_stock_level`
- `cost_price`
- `selling_price`
- `currency_code`
- `unit_id`
- `created_at`
- `updated_at`
- `deleted_at`
- `created_by`
- `updated_by`
- optionally `deleted_by`

15. Auditability Requirements

If this is not an MVP, audit metadata must be intentional.

Rules:

- include `created_at` and `updated_at`
- include `created_by` and `updated_by` where actor attribution matters
- strongly consider `deleted_by` for soft delete flows
- actor IDs should map to authenticated users where possible
- services should source actor context from authenticated request context, not client-controlled payloads

16. Category Model Rules

- Categories must be hierarchical
- Use `parent_category_id`
- Products may belong to multiple categories
- Category deletion must be constrained:
  - cannot delete if active child categories exist
  - cannot delete if active products still depend on the category unless business rule explicitly supports reassignment

17. Unit Model Rules

- Units are tenant-defined
- Units are master data
- Units must support future conversion readiness

Minimum recommendation:

- `name`
- `code`
- `description`

Future-ready extension:

- optional conversion metadata in separate structures later, not overloading the base unit model prematurely

18. Bundle Model Rules

For `BUNDLE`, define dedicated component storage.

Recommended table:

- `product_bundle_components`

Minimum columns:

- `id`
- `tenant_id`
- `bundle_product_id`
- `component_product_id`
- `component_variant_id` nullable
- `quantity`
- `created_at`
- `updated_at`

Rules:

- bundle cannot contain itself
- component references must stay within tenant
- quantity must be positive
- bundle components must be written transactionally with bundle updates

19. Custom Field Model Rules

Use dedicated tables:

- `custom_field_definitions`
- `custom_field_values`

Definitions must support:

- field key
- display name
- field type
- required flag
- applies_to: `PRODUCT` | `VARIANT` | `BOTH`
- allowed values
- validation metadata
- display / sort order

Values must support:

- product-level values
- variant-level values
- future reporting/filtering compatibility

20. Search, Filter, Sort, Pagination

Support:

- search by name
- search by sku
- search by barcode
- optional search into variant identifiers where appropriate
- filter by category
- filter by status
- filter by product type
- filter by sellable/purchasable flags when useful
- validated sorting only

Stable pagination rules:

- use deterministic ordering
- preferred default:
  - `ORDER BY created_at DESC, id DESC`
- use `LIMIT ? OFFSET ?`

21. Indexing Rules (MANDATORY)

Index all tenant-owned tables by `tenant_id`.

Also add indexes appropriate for:

- product name
- product status
- product type
- slug
- category mappings
- unit lookups
- variant product lookup
- custom field definition lookup
- custom field value lookup
- bundle component lookup

Indexes must support real query paths, not just table creation.

22. Repository Rules

ALL SQL must be parameterized.

Repository rules:

- explicit tenant filters in every method
- default queries exclude soft-deleted records
- joins must include tenant-safe predicates
- methods should make bypassing tenant scope difficult
- keep pagination deterministic
- avoid hidden business logic in repositories

23. Service Layer Responsibilities

Services MUST handle:

- business logic
- type-specific product rules
- SKU generation
- barcode uniqueness checks
- slug generation
- pricing rules
- inventory policy validation
- variant combination validation
- category mapping validation
- bundle component validation
- custom field validation
- transaction orchestration
- soft delete logic

24. DTO Validation Rules

Define DTOs for at least:

- `CreateProductDTO`
- `UpdateProductDTO`
- `ListProductsQueryDTO`
- category DTOs
- unit DTOs
- custom field DTOs

DTO validation must include:

- enums
- booleans
- decimal-like numeric constraints
- optional vs nullable correctness
- nested variants
- nested bundle components
- custom fields
- validated sort keys only

25. Example API Surface

At minimum, design for:

- `POST /products`
- `PUT /products/:productId`
- `DELETE /products/:productId`
- `GET /products/:productId`
- `GET /products`

Supportive endpoints:

- category management endpoints
- unit management endpoints
- custom field definition endpoints

If attribute-definition endpoints are included, keep them clearly separated from custom-field endpoints.

26. Extensibility Requirements

The Product module MUST be designed to support:

- Inventory / Stock Management
- Warehouse / Multi-location
- Purchase / Supplier flows
- Sales / Orders
- Discounts / Pricing rules
- Reporting / analytics
- Channel integrations

Design principle:

- do not let Product become a dumping ground for future modules
- expose stable master data that those future modules can depend on

27. Self-Review Checklist (MANDATORY)

Before finalizing implementation, verify:

1. Tenant isolation is enforced everywhere
2. Unit of Work is used for all multi-table writes
3. Controllers are thin
4. Services contain all business logic
5. Repositories contain SQL only
6. SQL is parameterized and indexed appropriately
7. SKU and barcode uniqueness are handled correctly for active records
8. Soft delete behavior is consistent
9. Product type rules are enforced
10. Variant attributes and custom fields are clearly separated
11. Bundle behavior is modeled explicitly
12. The module is extensible for future inventory and pricing modules

28. Final Outcome Expectation

The final implementation MUST be:

- production-ready
- multi-tenant secure
- SaaS-oriented, not MVP-oriented
- scalable to enterprise usage
- extensible for future modules
- consistent with the current project architecture
- clean, maintainable, and explicit in its domain rules

29. Current Verified Status

This contract is now partially realized in the codebase and the currently implemented Product module has been exercised successfully through HTTP verification.

### Verified API Surface

- `GET /api/v1/products`
- `POST /api/v1/products`
- `GET /api/v1/products/:productId`
- `PUT /api/v1/products/:productId`
- `DELETE /api/v1/products/:productId`
- `GET /api/v1/products/units`
- `POST /api/v1/products/units`
- `GET /api/v1/products/categories`
- `POST /api/v1/products/categories`
- `GET /api/v1/products/custom-fields`
- `POST /api/v1/products/custom-fields`
- `GET /api/v1/products/:productId/attributes`
- product attribute creation for `VARIABLE` products

### Verified Behavior

- product list returns an empty list for a new tenant
- product list filtering by search, type, and status works
- simple product creation works
- variable product creation with variants works
- product retrieval by id works
- product update works
- product soft delete works
- deleted products are excluded from normal reads
- cross-tenant product access returns `404`
- `STAFF` users are blocked from write endpoints

### Query and Repository Adjustments Applied

- fixed placeholder mismatch in product insert SQL
- fixed placeholder mismatch in product variant insert SQL
- added shared `query(...)` support to the database abstraction
- product list and count reads use the safer shared query path for the current MySQL driver behavior

### Current Scope Note

The architectural rules in this file still stand as the long-term contract. This status section reflects what is implemented and verified in the repository as of the latest update.
