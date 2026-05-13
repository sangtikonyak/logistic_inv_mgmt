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

export function listRequisitions(filters = {}) {
  return httpRequest(`/procurement/requisitions${toQueryString(filters)}`)
}

export function getRequisition(requisitionId) {
  return httpRequest(`/procurement/requisitions/${requisitionId}`)
}

export function createRequisition(payload) {
  return httpRequest('/procurement/requisitions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function submitRequisition(requisitionId) {
  return httpRequest(`/procurement/requisitions/${requisitionId}/submit`, { method: 'POST' })
}

export function approveRequisition(requisitionId) {
  return httpRequest(`/procurement/requisitions/${requisitionId}/approve`, { method: 'POST' })
}

export function rejectRequisition(requisitionId) {
  return httpRequest(`/procurement/requisitions/${requisitionId}/reject`, { method: 'POST' })
}
