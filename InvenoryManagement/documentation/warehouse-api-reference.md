# Warehouse API Reference

This document describes the warehouse-related APIs currently exposed by [warehouse.routes.ts](/d:/AIPrompts/InvenoryManagement/src/modules/warehouse/routes/warehouse.routes.ts) and [warehouse-transfer.routes.ts](/d:/AIPrompts/InvenoryManagement/src/modules/warehouse/routes/warehouse-transfer.routes.ts).

Base paths:

`/api/v1/warehouses`

`/api/v1/warehouse-transfers`

Common rules:

- All routes require `Authorization: Bearer <accessToken>`
- Tenant context is taken from the authenticated JWT
- Read routes: `ADMIN`, `MANAGER`, `STAFF`
- Create/update routes: `ADMIN`, `MANAGER`
- Delete routes: `ADMIN`

## Warehouses

- `GET /` lists warehouses with pagination/filtering
- `POST /` creates a warehouse
- `GET /:warehouseId` fetches one warehouse
- `PUT /:warehouseId` updates a warehouse
- `DELETE /:warehouseId` soft deletes a warehouse
- `PATCH /:warehouseId/default` sets the default warehouse

## Zones And Bins

- `GET /:warehouseId/zones`
- `POST /:warehouseId/zones`
- `PUT /zones/:zoneId`
- `DELETE /zones/:zoneId`
- `GET /zones/:zoneId/bins`
- `POST /zones/:zoneId/bins`
- `PUT /bins/:binId`
- `DELETE /bins/:binId`

## Stock

- `GET /:warehouseId/stock` lists warehouse stock
- `GET /:warehouseId/stock/:itemId` fetches stock rows for one product or variant id
- `POST /:warehouseId/stock/adjustments` creates a manual stock adjustment

Example stock adjustment body:

```json
{
  "productId": "cd2b2696-5e09-4e30-9208-b01010eeea59",
  "zoneId": "3eff9df1-e107-4ce9-a93f-7b22b0846ab5",
  "binId": "ace00875-dce7-46e6-ae6c-035b7c108134",
  "adjustmentType": "ADJUSTMENT_IN",
  "quantity": 3,
  "notes": "Opening stock via API"
}
```

Behavior:

- accepts either `productId` or `productVariantId`
- supports `ADJUSTMENT_IN` and `ADJUSTMENT_OUT`
- blocks negative stock
- writes both stock balance and movement ledger records

## Movement History

- `GET /:warehouseId/movements` returns movement history for a warehouse

Query parameters:

- `movementType`
- `productId`
- `productVariantId`
- `page`
- `limit`

## Transfers

- `GET /api/v1/warehouse-transfers`
- `POST /api/v1/warehouse-transfers`
- `GET /api/v1/warehouse-transfers/:transferId`
- `POST /api/v1/warehouse-transfers/:transferId/complete`
- `POST /api/v1/warehouse-transfers/:transferId/cancel`

Transfer completion behavior:

- decrements source stock
- increments destination stock
- writes `TRANSFER_OUT` and `TRANSFER_IN` movements
- rejects completion when stock is insufficient
