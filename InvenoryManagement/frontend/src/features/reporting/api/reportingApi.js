import { httpRequest } from '../../../shared/api/httpClient.js'

function toQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  })
  const serialized = query.toString()
  return serialized ? `?${serialized}` : ''
}

function get(path, params = {}) {
  return httpRequest(`/reports${path}${toQuery(params)}`)
}

export const getDashboardSummary = (params = {}) => get('/dashboard/summary', params)
export const getInventoryStockSummary = (params = {}) => get('/inventory/stock-summary', params)
export const getInventoryMovementSummary = (params = {}) => get('/inventory/movement-summary', params)
export const getLowStockReport = (params = {}) => get('/inventory/low-stock', params)
export const getInventoryValuation = (params = {}) => get('/inventory/valuation', params)
export const getPurchaseSummary = (params = {}) => get('/purchases/summary', params)
export const getPurchasesBySupplier = (params = {}) => get('/purchases/by-supplier', params)
export const getPurchaseReceiptsTrend = (params = {}) => get('/purchases/receipts-trend', params)
export const getSalesSummary = (params = {}) => get('/sales/summary', params)
export const getSalesByCustomer = (params = {}) => get('/sales/by-customer', params)
export const getSalesOrdersTrend = (params = {}) => get('/sales/orders-trend', params)
export const getSalesShipmentsTrend = (params = {}) => get('/sales/shipments-trend', params)
export const getSalesReservationsTrend = (params = {}) => get('/sales/reservations-trend', params)
export const getReturnsSummary = (params = {}) => get('/returns/summary', params)
export const getReturnsTrend = (params = {}) => get('/returns/trend', params)
export const getWarehouseSummary = (params = {}) => get('/warehouses/summary', params)
export const getWarehouseUtilization = (params = {}) => get('/warehouses/utilization', params)
export const getTopSellingProducts = (params = {}) => get('/products/top-selling', params)
export const getTopPurchasedProducts = (params = {}) => get('/products/top-purchased', params)
export const getNonMovingProducts = (params = {}) => get('/products/non-moving', params)
