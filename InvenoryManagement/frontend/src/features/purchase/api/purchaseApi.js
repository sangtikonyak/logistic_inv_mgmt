import { httpRequest } from '../../../shared/api/httpClient.js'

export async function listSuppliers(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value)
    }
  })
  return httpRequest(`/suppliers?${query.toString()}`)
}

export async function getSupplier(supplierId) {
  return httpRequest(`/suppliers/${supplierId}`)
}

export async function createSupplier(payload) {
  return httpRequest('/suppliers', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateSupplier(supplierId, payload) {
  return httpRequest(`/suppliers/${supplierId}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteSupplier(supplierId) {
  return httpRequest(`/suppliers/${supplierId}`, { method: 'DELETE' })
}

export async function listPurchaseOrders(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value)
    }
  })
  return httpRequest(`/purchases/orders?${query.toString()}`)
}

export async function getPurchaseOrder(orderId) {
  return httpRequest(`/purchases/orders/${orderId}`)
}

export async function createPurchaseOrder(payload) {
  return httpRequest('/purchases/orders', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updatePurchaseOrder(orderId, payload) {
  return httpRequest(`/purchases/orders/${orderId}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function submitForApproval(orderId) {
  return httpRequest(`/purchases/orders/${orderId}/submit-for-approval`, { method: 'POST' })
}

export async function approvePurchaseOrder(orderId) {
  return httpRequest(`/purchases/orders/${orderId}/approve`, { method: 'POST' })
}

export async function rejectPurchaseOrder(orderId) {
  return httpRequest(`/purchases/orders/${orderId}/reject`, { method: 'POST' })
}

export async function issuePurchaseOrder(orderId) {
  return httpRequest(`/purchases/orders/${orderId}/issue`, { method: 'POST' })
}

export async function cancelPurchaseOrder(orderId) {
  return httpRequest(`/purchases/orders/${orderId}/cancel`, { method: 'POST' })
}

export async function listPurchaseReceipts(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value)
    }
  })
  return httpRequest(`/purchases/receipts?${query.toString()}`)
}

export async function getPurchaseReceipt(receiptId) {
  return httpRequest(`/purchases/receipts/${receiptId}`)
}

export async function createPurchaseReceipt(orderId, payload) {
  return httpRequest(`/purchases/orders/${orderId}/receipts`, { method: 'POST', body: JSON.stringify(payload) })
}

export async function postPurchaseReceipt(receiptId) {
  return httpRequest(`/purchases/receipts/${receiptId}/post`, { method: 'POST' })
}

export async function cancelPurchaseReceipt(receiptId) {
  return httpRequest(`/purchases/receipts/${receiptId}/cancel`, { method: 'POST' })
}
