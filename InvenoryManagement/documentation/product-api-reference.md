# Product API Reference

This document describes the product-related APIs currently exposed by [product.routes.ts](/d:/AIPrompts/InvenoryManagement/src/modules/product/routes/product.routes.ts).

Base path:

`/api/v1/products`

Common rules:

- All routes require `Authorization: Bearer <accessToken>`
- Tenant context is taken from the authenticated JWT
- Response wrapper is always:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {}
}
```

- Error wrapper is always:

```json
{
  "success": false,
  "message": "Error message",
  "data": null
}
```

Role rules:

- Read routes: `ADMIN`, `MANAGER`, `STAFF`
- Create/update routes: `ADMIN`, `MANAGER`
- Product delete: `ADMIN`
- Staff write attempts return `403`

## 1. Categories

### GET `/categories`

Purpose:
Returns all active categories for the current tenant.

Auth:
`ADMIN`, `MANAGER`, `STAFF`

Request body:
No body

Example response:

```json
{
  "success": true,
  "message": "Categories fetched successfully.",
  "data": [
    {
      "id": "c18c971c-8f87-4a30-91ae-09a597739a81",
      "tenant_id": "a7a98989-b458-41a0-8f77-64f28dc45dd6",
      "parent_category_id": null,
      "name": "Hardware",
      "slug": "hardware",
      "description": "Hardware items",
      "created_at": "2026-03-31T11:19:20.000Z",
      "updated_at": "2026-03-31T11:19:20.000Z",
      "deleted_at": null
    }
  ]
}
```

### POST `/categories`

Purpose:
Creates a tenant-scoped category.

Auth:
`ADMIN`, `MANAGER`

Request body:

```json
{
  "name": "Hardware",
  "parentCategoryId": null,
  "description": "Hardware items"
}
```

Example response:

```json
{
  "success": true,
  "message": "Category created successfully.",
  "data": [
    {
      "id": "c18c971c-8f87-4a30-91ae-09a597739a81",
      "tenant_id": "a7a98989-b458-41a0-8f77-64f28dc45dd6",
      "parent_category_id": null,
      "name": "Hardware",
      "slug": "hardware",
      "description": "Hardware items",
      "created_at": "2026-03-31T11:19:20.000Z",
      "updated_at": "2026-03-31T11:19:20.000Z",
      "deleted_at": null
    }
  ]
}
```

### PUT `/categories/:categoryId`

Purpose:
Updates a category in the same tenant.

Auth:
`ADMIN`, `MANAGER`

Request body:

```json
{
  "name": "Hardware & Tools",
  "parentCategoryId": null,
  "description": "Updated category description"
}
```

Example response:

```json
{
  "success": true,
  "message": "Category updated successfully.",
  "data": {
    "id": "c18c971c-8f87-4a30-91ae-09a597739a81",
    "tenant_id": "a7a98989-b458-41a0-8f77-64f28dc45dd6",
    "parent_category_id": null,
    "name": "Hardware & Tools",
    "slug": "hardware-tools",
    "description": "Updated category description",
    "created_at": "2026-03-31T11:19:20.000Z",
    "updated_at": "2026-03-31T11:25:00.000Z",
    "deleted_at": null
  }
}
```

### DELETE `/categories/:categoryId`

Purpose:
Soft deletes a category if it has no active children and no active product assignments.

Auth:
`ADMIN`, `MANAGER`

Request body:
No body

Example response:

```json
{
  "success": true,
  "message": "Category deleted successfully.",
  "data": {
    "categoryId": "c18c971c-8f87-4a30-91ae-09a597739a81"
  }
}
```

## 2. Units

### GET `/units`

Purpose:
Returns all active units for the current tenant.

Auth:
`ADMIN`, `MANAGER`, `STAFF`

Request body:
No body

Example response:

```json
{
  "success": true,
  "message": "Units fetched successfully.",
  "data": [
    {
      "id": "e6956f77-d323-47b2-82fe-5d69a3ac2a94",
      "tenant_id": "a7a98989-b458-41a0-8f77-64f28dc45dd6",
      "name": "Piece",
      "code": "PCS",
      "description": "Pieces",
      "created_at": "2026-03-31T11:19:20.000Z",
      "updated_at": "2026-03-31T11:19:20.000Z",
      "deleted_at": null
    }
  ]
}
```

### POST `/units`

Purpose:
Creates a tenant-scoped unit.

Auth:
`ADMIN`, `MANAGER`

Request body:

```json
{
  "name": "Piece",
  "code": "PCS",
  "description": "Pieces"
}
```

Example response:

```json
{
  "success": true,
  "message": "Unit created successfully.",
  "data": [
    {
      "id": "e6956f77-d323-47b2-82fe-5d69a3ac2a94",
      "tenant_id": "a7a98989-b458-41a0-8f77-64f28dc45dd6",
      "name": "Piece",
      "code": "PCS",
      "description": "Pieces",
      "created_at": "2026-03-31T11:19:20.000Z",
      "updated_at": "2026-03-31T11:19:20.000Z",
      "deleted_at": null
    }
  ]
}
```

### PUT `/units/:unitId`

Purpose:
Updates a tenant-scoped unit.

Auth:
`ADMIN`, `MANAGER`

Request body:

```json
{
  "name": "Box",
  "code": "BOX",
  "description": "Box unit"
}
```

Example response:

```json
{
  "success": true,
  "message": "Unit updated successfully.",
  "data": {
    "id": "e6956f77-d323-47b2-82fe-5d69a3ac2a94",
    "tenant_id": "a7a98989-b458-41a0-8f77-64f28dc45dd6",
    "name": "Box",
    "code": "BOX",
    "description": "Box unit",
    "created_at": "2026-03-31T11:19:20.000Z",
    "updated_at": "2026-03-31T11:28:00.000Z",
    "deleted_at": null
  }
}
```

### DELETE `/units/:unitId`

Purpose:
Soft deletes a unit if no active products or variants reference it.

Auth:
`ADMIN`, `MANAGER`

Request body:
No body

Example response:

```json
{
  "success": true,
  "message": "Unit deleted successfully.",
  "data": {
    "unitId": "e6956f77-d323-47b2-82fe-5d69a3ac2a94"
  }
}
```

## 3. Custom Field Definitions

### GET `/custom-fields`

Purpose:
Returns all active custom field definitions for the tenant.

Auth:
`ADMIN`, `MANAGER`, `STAFF`

Request body:
No body

### POST `/custom-fields`

Purpose:
Creates a custom field definition for product or variant metadata.

Auth:
`ADMIN`, `MANAGER`

Request body:

```json
{
  "name": "Brand",
  "fieldKey": "brand",
  "fieldType": "TEXT",
  "appliesTo": "PRODUCT",
  "isRequired": false,
  "sortOrder": 0
}
```

Example response:

```json
{
  "success": true,
  "message": "Custom field definition created successfully.",
  "data": [
    {
      "id": "3a288797-dd2d-4f66-b72b-b9acbd98d18d",
      "name": "Brand",
      "fieldKey": "brand",
      "fieldType": "TEXT",
      "appliesTo": "PRODUCT",
      "isRequired": false,
      "allowedValues": null,
      "validationRules": null,
      "sortOrder": 0
    }
  ]
}
```

### PUT `/custom-fields/:definitionId`

Purpose:
Updates a custom field definition.

Auth:
`ADMIN`, `MANAGER`

Request body:

```json
{
  "name": "Brand Name",
  "fieldKey": "brand_name",
  "fieldType": "TEXT",
  "appliesTo": "PRODUCT",
  "isRequired": false,
  "sortOrder": 1
}
```

### DELETE `/custom-fields/:definitionId`

Purpose:
Soft deletes a definition if no values still reference it.

Auth:
`ADMIN`, `MANAGER`

Request body:
No body

## 4. Product Attributes for VARIABLE Products

### GET `/:productId/attributes`

Purpose:
Returns product attributes and attribute values for a variable product.

Auth:
`ADMIN`, `MANAGER`, `STAFF`

Request body:
No body

Example response:

```json
{
  "success": true,
  "message": "Product attributes fetched successfully.",
  "data": [
    {
      "id": "8a210dd1-233a-4536-bb22-43ab59d71a35",
      "name": "Color",
      "slug": "color",
      "sortOrder": 0,
      "variantUsageCount": 2,
      "values": [
        {
          "id": "18e8bddb-84c4-4a8e-9b63-033a3caae495",
          "value": "Blue",
          "sortOrder": 0
        },
        {
          "id": "d14d6316-293c-456a-8cea-28ef349ed5ff",
          "value": "Red",
          "sortOrder": 0
        }
      ]
    }
  ]
}
```

### POST `/:productId/attributes`

Purpose:
Creates an attribute for a `VARIABLE` product.

Auth:
`ADMIN`, `MANAGER`

Request body:

```json
{
  "name": "Material",
  "sortOrder": 3,
  "values": [
    {
      "value": "Cotton",
      "sortOrder": 0
    }
  ]
}
```

### PUT `/:productId/attributes/:attributeId`

Purpose:
Updates a product attribute.

Auth:
`ADMIN`, `MANAGER`

Request body:

```json
{
  "name": "Fabric",
  "sortOrder": 4
}
```

### DELETE `/:productId/attributes/:attributeId`

Purpose:
Deletes an attribute if active variants do not depend on it.

Auth:
`ADMIN`, `MANAGER`

Request body:
No body

### POST `/:productId/attributes/:attributeId/values`

Purpose:
Adds a value under an existing attribute.

Auth:
`ADMIN`, `MANAGER`

Request body:

```json
{
  "value": "Polyester",
  "sortOrder": 1
}
```

### PUT `/:productId/attributes/:attributeId/values/:valueId`

Purpose:
Updates an existing attribute value.

Auth:
`ADMIN`, `MANAGER`

Request body:

```json
{
  "value": "Organic Cotton",
  "sortOrder": 0
}
```

### DELETE `/:productId/attributes/:attributeId/values/:valueId`

Purpose:
Deletes an attribute value if active variants do not depend on it.

Auth:
`ADMIN`, `MANAGER`

Request body:
No body

## 5. Products

### GET `/`

Purpose:
Lists products for the current tenant with pagination, filtering, and search.

Auth:
`ADMIN`, `MANAGER`, `STAFF`

Query parameters:

- `search`
- `categoryId`
- `unitId`
- `productType`
- `status`
- `isSellable`
- `isPurchasable`
- `page`
- `limit`
- `sortBy` = `created_at | updated_at | name`
- `sortDir` = `ASC | DESC`

Example response for an empty tenant:

```json
{
  "success": true,
  "message": "Products fetched successfully.",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

Example filtered response:

```json
{
  "success": true,
  "message": "Products fetched successfully.",
  "data": {
    "items": [
      {
        "id": "728ef560-76fe-4d39-90de-221442b4a100",
        "name": "Hammer",
        "description": null,
        "productType": "SIMPLE",
        "status": "ACTIVE",
        "sku": "HAMMER",
        "barcode": null,
        "isSellable": true,
        "isPurchasable": true,
        "trackInventory": true,
        "allowBackorder": false,
        "unit": {
          "id": "e6956f77-d323-47b2-82fe-5d69a3ac2a94",
          "name": "Piece",
          "code": "PCS"
        },
        "categories": [
          {
            "id": "c18c971c-8f87-4a30-91ae-09a597739a81",
            "name": "Hardware"
          }
        ],
        "variantCount": 0,
        "costPrice": 5,
        "sellingPrice": 10,
        "currencyCode": "USD",
        "createdAt": "2026-03-31T11:19:20.000Z",
        "updatedAt": "2026-03-31T11:19:20.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### POST `/`

Purpose:
Creates a product in the current tenant. Supports simple, variable, service, and bundle payloads.

Auth:
`ADMIN`, `MANAGER`

Example simple product request body:

```json
{
  "name": "Hammer",
  "productType": "SIMPLE",
  "unitId": "e6956f77-d323-47b2-82fe-5d69a3ac2a94",
  "status": "ACTIVE",
  "isSellable": true,
  "isPurchasable": true,
  "trackInventory": true,
  "allowBackorder": false,
  "categoryIds": [
    "c18c971c-8f87-4a30-91ae-09a597739a81"
  ],
  "customFieldValues": [
    {
      "definitionId": "3a288797-dd2d-4f66-b72b-b9acbd98d18d",
      "value": "Acme"
    }
  ],
  "sellingPrice": 10,
  "costPrice": 5,
  "currencyCode": "USD"
}
```

Example variable product request body:

```json
{
  "name": "T-Shirt",
  "productType": "VARIABLE",
  "unitId": "e6956f77-d323-47b2-82fe-5d69a3ac2a94",
  "categoryIds": [
    "c18c971c-8f87-4a30-91ae-09a597739a81"
  ],
  "currencyCode": "USD",
  "variants": [
    {
      "name": "Red Small",
      "attributes": [
        {
          "name": "Color",
          "value": "Red"
        },
        {
          "name": "Size",
          "value": "S"
        }
      ],
      "sellingPrice": 20,
      "costPrice": 8,
      "currencyCode": "USD",
      "sortOrder": 1
    },
    {
      "name": "Blue Medium",
      "attributes": [
        {
          "name": "Color",
          "value": "Blue"
        },
        {
          "name": "Size",
          "value": "M"
        }
      ],
      "sellingPrice": 22,
      "costPrice": 9,
      "currencyCode": "USD",
      "sortOrder": 2
    }
  ]
}
```

Example response:

```json
{
  "success": true,
  "message": "Product created successfully.",
  "data": {
    "id": "728ef560-76fe-4d39-90de-221442b4a100",
    "name": "Hammer",
    "description": null,
    "productType": "SIMPLE",
    "status": "ACTIVE",
    "sku": "HAMMER",
    "barcode": null,
    "isSellable": true,
    "isPurchasable": true,
    "trackInventory": true,
    "allowBackorder": false,
    "minStockLevel": null,
    "maxStockLevel": null,
    "costPrice": 5,
    "sellingPrice": 10,
    "currencyCode": "USD",
    "unit": {
      "id": "e6956f77-d323-47b2-82fe-5d69a3ac2a94",
      "name": "Piece",
      "code": "PCS"
    },
    "categories": [
      {
        "id": "c18c971c-8f87-4a30-91ae-09a597739a81",
        "name": "Hardware",
        "slug": "hardware",
        "parentCategoryId": null
      }
    ],
    "customFieldValues": [
      {
        "definitionId": "3a288797-dd2d-4f66-b72b-b9acbd98d18d",
        "fieldKey": "brand",
        "value": "Acme"
      }
    ],
    "bundleComponents": [],
    "variants": [],
    "createdAt": "2026-03-31T11:19:20.000Z",
    "updatedAt": "2026-03-31T11:19:20.000Z"
  }
}
```

### GET `/:productId`

Purpose:
Returns one active product from the current tenant.

Auth:
`ADMIN`, `MANAGER`, `STAFF`

Request body:
No body

### PUT `/:productId`

Purpose:
Updates a product and related structures in the same tenant.

Auth:
`ADMIN`, `MANAGER`

Example request body:

```json
{
  "name": "Hammer Pro",
  "sellingPrice": 12,
  "currencyCode": "USD"
}
```

### DELETE `/:productId`

Purpose:
Soft deletes a product and hides it from normal reads.

Auth:
`ADMIN`

Request body:
No body

Example response:

```json
{
  "success": true,
  "message": "Product deleted successfully.",
  "data": {
    "productId": "728ef560-76fe-4d39-90de-221442b4a100"
  }
}
```

## Functional Summary

The product module currently supports:

- tenant-scoped product master data
- units
- categories
- custom field definitions
- variable-product attributes
- simple and variable product creation
- product search and filtering
- product update and soft delete
- tenant isolation
- RBAC-protected write flows
