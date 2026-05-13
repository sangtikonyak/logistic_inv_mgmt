import { httpRequest } from '../../../shared/api/httpClient.js'

function toQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  })
  return query.toString()
}

export async function listDemandSnapshots(params = {}) {
  const query = toQuery(params)
  return httpRequest(`/replenishment/demand-snapshots${query ? `?${query}` : ''}`)
}

export async function refreshDemandSnapshots(payload = {}) {
  return httpRequest('/replenishment/demand-snapshots/refresh', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
