import { httpRequest } from './httpClient'

export const reportingService = {
  getDashboardSummary: (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.append('dateTo', filters.dateTo)
    if (filters.warehouseId) params.append('warehouseId', filters.warehouseId)
    
    return httpRequest(`/reports/dashboard/summary?${params.toString()}`)
  },

  getDashboardActivities: () => {
    return httpRequest('/reports/dashboard/activities')
  },

  getSalesTrend: (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.append('dateTo', filters.dateTo)
    params.append('groupBy', filters.groupBy || 'day')
    
    return httpRequest(`/reports/sales/orders-trend?${params.toString()}`)
  },

  getLowStock: (limit = 5) => {
    return httpRequest(`/reports/inventory/low-stock?limit=${limit}`)
  },

  getLowStockReport: (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.warehouseId) params.append('warehouseId', filters.warehouseId)
    if (filters.productId) params.append('productId', filters.productId)
    params.append('page', filters.page || 1)
    params.append('limit', filters.limit || 10)
    
    return httpRequest(`/reports/inventory/low-stock?${params.toString()}`)
  }
}
