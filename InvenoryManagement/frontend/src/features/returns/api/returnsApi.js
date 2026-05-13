import { httpRequest } from '../../../shared/api/httpClient.js'

function toQuery(params = {}) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, v)
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

// ── Purchase Returns ───────────────────────────────────────
export const listPurchaseReturns = (p = {}) => httpRequest(`/returns/purchase${toQuery(p)}`)
export const getPurchaseReturn = (id) => httpRequest(`/returns/purchase/${id}`)
export const createPurchaseReturn = (body) => httpRequest('/returns/purchase', { method: 'POST', body: JSON.stringify(body) })
export const updatePurchaseReturn = (id, body) => httpRequest(`/returns/purchase/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const postPurchaseReturn = (id) => httpRequest(`/returns/purchase/${id}/post`, { method: 'POST' })
export const cancelPurchaseReturn = (id) => httpRequest(`/returns/purchase/${id}/cancel`, { method: 'POST' })

// ── Sales Returns ──────────────────────────────────────────
export const listSalesReturns = (p = {}) => httpRequest(`/returns/sales${toQuery(p)}`)
export const getSalesReturn = (id) => httpRequest(`/returns/sales/${id}`)
export const createSalesReturn = (body) => httpRequest('/returns/sales', { method: 'POST', body: JSON.stringify(body) })
export const updateSalesReturn = (id, body) => httpRequest(`/returns/sales/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const postSalesReturn = (id) => httpRequest(`/returns/sales/${id}/post`, { method: 'POST' })
export const cancelSalesReturn = (id) => httpRequest(`/returns/sales/${id}/cancel`, { method: 'POST' })
