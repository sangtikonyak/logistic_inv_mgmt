import { httpRequest } from '../../../shared/api/httpClient.js'

function toQuery(params = {}) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, v)
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

// ── Customers ──────────────────────────────────────────────
export const listCustomers    = (p = {}) => httpRequest(`/customers${toQuery(p)}`)
export const getCustomer      = (id)     => httpRequest(`/customers/${id}`)
export const createCustomer   = (body)   => httpRequest('/customers', { method: 'POST', body: JSON.stringify(body) })
export const updateCustomer   = (id, b)  => httpRequest(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(b) })
export const deleteCustomer   = (id)     => httpRequest(`/customers/${id}`, { method: 'DELETE' })

// ── Sales Orders ───────────────────────────────────────────
export const listSalesOrders  = (p = {}) => httpRequest(`/sales/orders${toQuery(p)}`)
export const getSalesOrder    = (id)     => httpRequest(`/sales/orders/${id}`)
export const createSalesOrder = (body)   => httpRequest('/sales/orders', { method: 'POST', body: JSON.stringify(body) })
export const updateSalesOrder = (id, b)  => httpRequest(`/sales/orders/${id}`, { method: 'PUT', body: JSON.stringify(b) })
export const confirmSalesOrder = (id)    => httpRequest(`/sales/orders/${id}/confirm`, { method: 'POST' })
export const cancelSalesOrder  = (id)    => httpRequest(`/sales/orders/${id}/cancel`,  { method: 'POST' })

// ── Reservations ───────────────────────────────────────────
export const listReservations      = (p = {}) => httpRequest(`/sales/reservations${toQuery(p)}`)
export const getReservation        = (id)     => httpRequest(`/sales/reservations/${id}`)
export const createReservation     = (orderId, body) => httpRequest(`/sales/orders/${orderId}/reservations`, { method: 'POST', body: JSON.stringify(body) })
export const postReservation       = (id)     => httpRequest(`/sales/reservations/${id}/post`,    { method: 'POST' })
export const releaseReservation    = (id)     => httpRequest(`/sales/reservations/${id}/release`, { method: 'POST' })
export const cancelReservation     = (id)     => httpRequest(`/sales/reservations/${id}/cancel`,  { method: 'POST' })

// ── Shipments ──────────────────────────────────────────────
export const listShipments    = (p = {}) => httpRequest(`/sales/shipments${toQuery(p)}`)
export const getShipment      = (id)     => httpRequest(`/sales/shipments/${id}`)
export const createShipment   = (orderId, body) => httpRequest(`/sales/orders/${orderId}/shipments`, { method: 'POST', body: JSON.stringify(body) })
export const postShipment     = (id)     => httpRequest(`/sales/shipments/${id}/post`,   { method: 'POST' })
export const cancelShipment   = (id)     => httpRequest(`/sales/shipments/${id}/cancel`, { method: 'POST' })
