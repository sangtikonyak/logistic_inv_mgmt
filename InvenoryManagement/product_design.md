UPDATED V2: SaaS-Grade Product Domain Design

You are a Senior Backend Engineer and Software Architect designing the Product domain for a multi-tenant Inventory Management SaaS platform.

This design is NOT for an MVP.
It is intended for a long-lived SaaS platform where the Product module becomes durable master-data infrastructure for future inventory, purchasing, pricing, sales, warehouse, and reporting domains.

The design MUST stay compatible with the current project architecture and engineering rules.

1. Platform Context

- Multi-tenant SaaS with strict `tenant_id` isolation
- Backend architecture follows:
  - `route -> controller -> service -> repository -> database`
- Persistence uses MySQL with `mysql2`, SQL schema files, repository classes, and parameterized queries
- Multi-step writes must use the existing Unit of Work and Transaction Manager patterns
- Auth, RBAC, centralized error handling, and standardized API responses already exist and must be reused

2. Design Goal

Design a production-grade Product domain that:

- supports multiple product shapes without redesign later
- enforces tenant safety at the persistence boundary
- separates product master data from stock movement data
- remains extensible for future modules
- avoids MVP shortcuts that create schema debt

IMPORTANT:

- Product data is master data, not inventory balance data
- Do NOT model live stock quantities in product tables
- The Product module should describe what a product is, how it is sold/purchased, and how it is identified
- Future stock modules should describe where inventory is and how it moves

3. Product Domain Scope

The Product domain must support:

- multi-tenant product catalog
- strict tenant scoping on all tenant-owned reads and writes
- products with optional variants
- categories
- units
- SKU generation and manual override support
- barcode storage with tenant-scoped uniqueness
- soft delete support
- search, filtering, sorting, and pagination readiness
- tenant-defined custom fields
- future compatibility with:
  - stock
  - purchasing
  - suppliers
  - pricing
  - orders
  - reporting
  - warehouse / multi-location

4. Product Type Model

The design MUST support these product types:

- `SIMPLE`
- `VARIABLE`
- `SERVICE`
- `BUNDLE`

The design MUST support these statuses:

- `ACTIVE`
- `INACTIVE`
- `ARCHIVED`

Every product should also support these business flags and policy fields:

- `is_sellable`
- `is_purchasable`
- `track_inventory`
- `allow_backorder`
- `min_stock_level`
- `max_stock_level`

Every product should support these identity and pricing fields:

- `sku`
- `barcode`
- `slug`
- `cost_price`
- `selling_price`
- `currency_code`

5. Product Type Semantics

These are architecture-level decisions, not optional implementation details.

5.1 SIMPLE

- Represents a product sold as one master item
- Has no variants
- SKU primarily lives at product level
- Barcode may live at product level
- Inventory policy can be modeled at product level
- Pricing can be modeled at product level

5.2 VARIABLE

- Represents a parent product with multiple sellable combinations
- Variant-defining attributes create distinct sellable records
- SKU and barcode are primarily variant-level identifiers
- Product-level SKU may exist only as a parent/reference code if the business allows it
- Inventory policy is variant-oriented
- Pricing may be variant-specific

5.3 SERVICE

- Represents a non-stock-tracked catalog item
- Must not behave like a physical stock item
- `track_inventory` must be false
- `allow_backorder` must be false
- Pricing belongs at product level
- Variants are not part of the baseline design unless a later service-package model is introduced

5.4 BUNDLE

- Represents a sellable grouping of products and/or variants
- Bundle composition is master data
- Bundle definition must not be confused with inventory balance
- Bundle components must live in dedicated bundle-component tables
- Pricing may be manually maintained unless derived-pricing rules are explicitly introduced later

6. Product vs Variant Strategy

6.1 Product-Level Data

Belongs on the base product when it describes the master entity rather than a specific sellable option.

Examples:

- name
- description
- product type
- status
- sellable/purchasable flags
- inventory policy defaults
- category assignments
- unit defaults
- default pricing
- parent/reference SKU if the business allows it

6.2 Variant-Level Data

Belongs on the variant when it distinguishes one sellable combination from another.

Examples:

- variant SKU
- variant barcode
- selected variant attributes
- variant-specific pricing if enabled
- variant-specific unit override if allowed

Design rule:

- if a field is needed to distinguish one sellable option from another, it belongs at variant level

7. Inventory Tracking Strategy

The Product module must be inventory-ready but must not become the inventory system.

Rules:

- store inventory policy only, not stock balances
- do NOT store current quantity in `products`
- do NOT store current quantity in `product_variants`
- `track_inventory`, `allow_backorder`, `min_stock_level`, and `max_stock_level` are policy fields only

Interpretation by type:

- `SIMPLE`: inventory policy may live at product level
- `VARIABLE`: inventory policy is effectively variant-oriented
- `SERVICE`: inventory policy is disabled
- `BUNDLE`: bundle inventory policy is catalog policy only, not stock ledger behavior

8. Pricing Strategy

The design must remove ambiguity from pricing ownership.

Rules:

- use `DECIMAL`, not floating point
- use explicit precision such as `DECIMAL(18,4)`
- currency must not be implicit
- `currency_code` should be explicit or clearly defined as tenant-default plus override

Recommended ownership model:

- `SIMPLE`: price at product level
- `SERVICE`: price at product level
- `VARIABLE`: product-level price may serve as default, but variant-level price should be supported where combinations differ
- `BUNDLE`: price is manual unless derived-pricing logic is explicitly introduced later

9. Database Design and Relationships

9.1 Required Core Tables

- `products`
- `product_variants`
- `product_categories`
- `product_category_map`
- `product_units`
- `product_bundle_components`

9.2 Required Variant Attribute Tables

Variant-defining attributes must not be conflated with custom fields.

Recommended tables:

- `product_attributes`
- `product_attribute_values`
- `product_variant_attribute_values`

Purpose:

- `product_attributes`
  - defines attribute dimensions such as Size or Color
- `product_attribute_values`
  - defines allowed values such as Small, Medium, Red, Blue
- `product_variant_attribute_values`
  - maps a variant to its selected values

9.3 Required Dynamic Field Tables

- `custom_field_definitions`
- `custom_field_values`

9.4 Bundle Component Table

Recommended table:

- `product_bundle_components`

This table should represent bundle composition only, not bundle stock balances.

10. Required Product Table Columns

At minimum, the `products` table should include:

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

11. Tenant-Bound Uniqueness Rules

Uniqueness rules must be explicitly tenant-scoped.

Required uniqueness intent:

- slug unique per tenant
- SKU unique per tenant for active records
- barcode unique per tenant for active records
- category slug unique per tenant
- unit code unique per tenant
- custom field key unique per tenant

CRITICAL MYSQL NOTE:

Do not assume `UNIQUE(tenant_id, sku, deleted_at)` fully solves active-row uniqueness in a clean, production-safe way for MySQL.

The design must acknowledge real MySQL behavior and recommend an enforceable strategy, such as:

- service/repository-level active uniqueness checks backed by indexes
- or a generated-column / normalized active uniqueness strategy if standardized later

12. Category Model Design

Categories should be hierarchical and many-to-many with products.

Rules:

- use `parent_category_id`
- products may belong to multiple categories
- category deletion must be constrained

Deletion constraints should include:

- cannot delete a category with active child categories
- cannot delete a category still referenced by active products unless reassignment rules are explicitly defined

13. Unit Model Design

Units should be tenant-defined master data.

Minimum fields:

- `name`
- `code`
- `description`

Design principle:

- keep the base unit model simple
- preserve future readiness for conversion logic without overloading the initial schema

14. Variant Attributes vs Dynamic Fields

These concepts MUST remain separate.

14.1 Variant Attributes

Use for:

- defining sellable combinations
- building variant identity
- validating variant uniqueness
- future faceted filtering on structured options

Examples:

- size
- color
- flavor
- material

14.2 Dynamic / Custom Fields

Use for:

- tenant-specific metadata
- optional extensible catalog metadata
- future reporting/filtering support
- information that does not define variant identity

Examples:

- wash instructions
- manufacturing notes
- shelf life
- brand-specific metadata

Design rule:

- custom fields must not become the primary mechanism for variant definition

15. Dynamic Field Design

The dynamic field model must be queryable, extensible, and safe.

Definitions should support:

- field key
- display name
- field type
- required flag
- applies_to: `PRODUCT` | `VARIANT` | `BOTH`
- allowed values
- validation metadata
- sort/display order

Values should support:

- product-level values
- variant-level values
- future filtering/reporting evolution

16. SKU and Barcode Strategy

16.1 SKU Strategy

Define:

- normalization rules
- generation rules
- manual override rules
- collision handling
- tenant uniqueness scope

Recommended design:

- auto-generate where SKU is omitted
- allow manual override if it passes tenant-scoped uniqueness checks
- handle collisions deterministically

16.2 Barcode Strategy

Define:

- tenant-scoped uniqueness
- optionality by product type
- product-level vs variant-level ownership

17. Bundle Design

For `BUNDLE`, the design must define:

- a dedicated component table
- component references to products and/or variants
- quantity per component
- tenant-safe references
- transactional writes for bundle composition updates

Rules:

- bundle cannot contain itself
- quantity must be positive
- component references must belong to the same tenant

18. Auditability Design

This is not an MVP, so audit design must be intentional.

Recommendations:

- include `created_at`, `updated_at`, `deleted_at`
- include `created_by`, `updated_by`, and preferably `deleted_by`
- actor attribution should come from authenticated context, not client payload

19. API Design at High Level

Minimum product endpoints:

- `POST /products`
- `PUT /products/:productId`
- `DELETE /products/:productId`
- `GET /products/:productId`
- `GET /products`

Supportive endpoints:

- category management endpoints
- unit management endpoints
- custom field definition endpoints
- optionally attribute-definition endpoints if variant attributes are exposed separately

20. RBAC Expectations

The design must align with the current auth model in the codebase.

Current role baseline:

- `ADMIN`
- `MANAGER`
- `STAFF`

Recommended permissions:

- CREATE -> `ADMIN`, `MANAGER`
- UPDATE -> `ADMIN`, `MANAGER`
- DELETE -> `ADMIN`
- READ -> `ADMIN`, `MANAGER`, `STAFF`

Do NOT assume a `VIEWER` role unless the auth system is explicitly extended first.

21. Transaction Boundaries

The following workflows must run inside Unit of Work:

- create product with variants
- create product with category mappings
- create product with custom fields
- create bundle with components
- update product across multiple related tables
- bulk variant updates
- category remapping
- custom field value replacement
- soft delete product when related variant state also changes

22. Search, Filter, Sort, Pagination Design

Support:

- search by name
- search by sku
- search by barcode
- optional search into variant identifiers where appropriate
- filter by category
- filter by status
- filter by product type
- filter by sellable/purchasable flags where useful

Pagination strategy:

- deterministic ordering
- recommended default:
  - `ORDER BY created_at DESC, id DESC`
- use `LIMIT ? OFFSET ?`

23. Indexing and Scalability Considerations

Index all tenant-owned tables by `tenant_id`.

Add indexes for:

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

Scalability considerations:

- keep list queries deterministic
- support future reporting and filtering expansion
- avoid overloading custom fields as the only queryable extension mechanism
- preserve clean joins for future warehouse, stock, and purchase modules

24. Edge Cases and Failure Modes

The design must explicitly consider:

- duplicate SKU collisions
- duplicate barcode collisions
- variant combination duplication
- category deletion constraints
- bundle self-reference
- cross-tenant leakage through joins
- soft-deleted records appearing in normal reads
- product type rule violations
- variant explosion and unreasonable payload size

25. Architecture Rules

- Every tenant-bound table must include `tenant_id` unless there is a deliberate shared-reference exception
- Tenant isolation must be enforced in repository query patterns, not just in controllers
- Controllers must stay thin and only handle validation plus HTTP orchestration
- Services own business rules and transaction orchestration
- Repositories own SQL and persistence only
- Any multi-table write flow must explicitly use Unit of Work and Transaction Manager
- Avoid proposing ORMs or architectural drift from the current project stack

26. Output Expectations

- Do not write code
- Keep the design compatible with the current project architecture
- Prefer production-ready, implementation-friendly decisions over abstract theory
- Design for SaaS-grade longevity, not MVP shortcuts

27. Implementation Status Note

This design remains the target architecture for the Product domain. The current repository implementation now covers the main product workflows and has been verified through HTTP testing.

### Current Verified Coverage

- tenant-scoped units
- tenant-scoped categories
- tenant-scoped custom field definitions
- simple product creation
- variable product creation with variant combinations
- product attribute listing for variable products
- product retrieval by id
- product listing and filtered listing
- product update
- soft delete
- RBAC enforcement on write endpoints
- tenant isolation on reads

### Current Implementation Notes

- active SKU and barcode conflicts are enforced in the service and repository layer
- product and variant writes use transactional orchestration through Unit of Work
- list queries use deterministic ordering and a shared query path compatible with the current MySQL driver behavior
- the verified API shape is mounted under `/api/v1/products`

### Design-to-Implementation Alignment

The implementation is consistent with the core intent of this design:

- master-data only, not stock balances
- strict tenant isolation
- clear route/controller/service/repository layering
- soft delete behavior for normal reads
- separation between variant attributes and custom fields
