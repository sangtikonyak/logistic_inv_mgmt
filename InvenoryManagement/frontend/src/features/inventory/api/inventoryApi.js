import { httpRequest } from '../../../shared/api/httpClient.js'

function toQueryString(filters = {}) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    params.set(key, String(value))
  })

  const query = params.toString()
  return query ? `?${query}` : ''
}

// ------ STOCK & MOVEMENTS ------

export function listStock(warehouseId, filters) {
  return httpRequest(`/inventory/warehouses/${warehouseId}/stock${toQueryString(filters)}`)
}

export function getStockItem(warehouseId, itemId) {
  return httpRequest(`/inventory/warehouses/${warehouseId}/stock/${itemId}`)
}

export function listMovements(warehouseId, filters) {
  return httpRequest(`/inventory/warehouses/${warehouseId}/movements${toQueryString(filters)}`)
}

export function createStockAdjustment(warehouseId, payload) {
  return httpRequest(`/inventory/warehouses/${warehouseId}/adjustments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateStockLocation(warehouseId, itemId, payload) {
  return httpRequest(`/inventory/warehouses/${warehouseId}/stock/${itemId}/location`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

// ------ WAREHOUSE TRANSFERS ------

export function listTransfers(filters) {
  return httpRequest(`/inventory/transfers${toQueryString(filters)}`)
}

export function getTransfer(transferId) {
  return httpRequest(`/inventory/transfers/${transferId}`)
}

export function createTransfer(payload) {
  return httpRequest('/inventory/transfers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function completeTransfer(transferId) {
  return httpRequest(`/inventory/transfers/${transferId}/complete`, {
    method: 'POST',
  })
}

export function cancelTransfer(transferId) {
  return httpRequest(`/inventory/transfers/${transferId}/cancel`, {
    method: 'POST',
  })
}

