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

export function listWarehouses(filters) {
  return httpRequest(`/warehouses${toQueryString(filters)}`)
}

export function getWarehouse(warehouseId) {
  return httpRequest(`/warehouses/${warehouseId}`)
}

export function createWarehouse(payload) {
  return httpRequest('/warehouses', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateWarehouse(warehouseId, payload) {
  return httpRequest(`/warehouses/${warehouseId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteWarehouse(warehouseId) {
  return httpRequest(`/warehouses/${warehouseId}`, {
    method: 'DELETE',
  })
}

export function setDefaultWarehouse(warehouseId) {
  return httpRequest(`/warehouses/${warehouseId}/default`, {
    method: 'PATCH',
  })
}

export function listZones(warehouseId) {
  return httpRequest(`/warehouses/${warehouseId}/zones`)
}

export function createZone(warehouseId, payload) {
  return httpRequest(`/warehouses/${warehouseId}/zones`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateZone(zoneId, payload) {
  return httpRequest(`/warehouses/zones/${zoneId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteZone(zoneId) {
  return httpRequest(`/warehouses/zones/${zoneId}`, {
    method: 'DELETE',
  })
}

export function listBins(zoneId) {
  return httpRequest(`/warehouses/zones/${zoneId}/bins`)
}

export function createBin(zoneId, payload) {
  return httpRequest(`/warehouses/zones/${zoneId}/bins`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateBin(binId, payload) {
  return httpRequest(`/warehouses/bins/${binId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteBin(binId) {
  return httpRequest(`/warehouses/bins/${binId}`, {
    method: 'DELETE',
  })
}

// ------ WMS PICKLISTS ------

export function listPicklists(filters) {
  return httpRequest(`/warehouses/picklists${toQueryString(filters)}`)
}

export function getPicklist(picklistId) {
  return httpRequest(`/warehouses/picklists/${picklistId}`)
}

export function assignPicklist(picklistId, userId) {
  return httpRequest(`/warehouses/picklists/${picklistId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

export function startPicking(picklistId) {
  return httpRequest(`/warehouses/picklists/${picklistId}/start`, {
    method: 'POST',
  })
}

export function confirmPickItem(picklistId, itemId, payload) {
  return httpRequest(`/warehouses/picklists/${picklistId}/items/${itemId}/confirm`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function completePicklist(picklistId) {
  return httpRequest(`/warehouses/picklists/${picklistId}/complete`, {
    method: 'POST',
  })
}
