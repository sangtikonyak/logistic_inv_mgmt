import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import {
  getDashboardSummary,
  getInventoryMovementSummary,
  getInventoryStockSummary,
  getInventoryValuation,
  getLowStockReport,
  getNonMovingProducts,
  getPurchaseReceiptsTrend,
  getPurchaseSummary,
  getPurchasesBySupplier,
  getReturnsSummary,
  getReturnsTrend,
  getSalesByCustomer,
  getSalesOrdersTrend,
  getSalesReservationsTrend,
  getSalesShipmentsTrend,
  getSalesSummary,
  getTopPurchasedProducts,
  getTopSellingProducts,
  getWarehouseSummary,
  getWarehouseUtilization,
} from '../api/reportingApi.js'

function isoDate(value) {
  return value.toISOString().slice(0, 10)
}

function defaultDateRange() {
  const today = new Date()
  const past = new Date()
  past.setDate(today.getDate() - 30)
  return {
    dateFrom: isoDate(past),
    dateTo: isoDate(today),
  }
}

function asNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function kpiCard(label, value, note) {
  return { label, value, note }
}

function formatMetric(value, mode = 'number') {
  const n = asNumber(value)
  if (mode === 'currency') return `₹${n.toLocaleString()}`
  if (mode === 'percent') return `${n.toFixed(1)}%`
  return n.toLocaleString()
}

function LineBarsChart({ title, rows, series }) {
  const maxValue = useMemo(() => {
    let max = 0
    rows.forEach((row) => {
      series.forEach((item) => {
        max = Math.max(max, asNumber(row[item.key]))
      })
    })
    return max || 1
  }, [rows, series])

  return (
    <article className="rounded-xl border border-[#E5E7EB] bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#111827]">{title}</p>
        <div className="flex flex-wrap gap-3 text-xs text-[#6B7280]">
          {series.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-[#6B7280]">No data in selected range.</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <div className="flex min-w-[760px] gap-3">
            {rows.map((row) => (
              <div key={row.bucket} className="flex w-24 flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end justify-center gap-1 rounded-lg bg-[#F9FAFB] px-1 py-2">
                  {series.map((item) => {
                    const raw = asNumber(row[item.key])
                    const height = Math.max(4, Math.round((raw / maxValue) * 120))
                    return (
                      <div key={item.key} className="flex flex-col items-center">
                        <div
                          className="w-3 rounded-t"
                          style={{ height: `${height}px`, backgroundColor: item.color }}
                          title={`${item.label}: ${raw.toLocaleString()}`}
                        />
                      </div>
                    )
                  })}
                </div>
                <p className="text-[11px] font-medium text-[#6B7280]">{row.bucket}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

function TopSellingChart({ items }) {
  const max = Math.max(...items.map((item) => asNumber(item.salesAmount)), 1)
  return (
    <article className="rounded-xl border border-[#E5E7EB] bg-white p-5">
      <p className="text-sm font-semibold text-[#111827]">Top Selling Products</p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-[#6B7280]">No products in selected range.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const value = asNumber(item.salesAmount)
            return (
              <div key={`${item.productId}-${item.productVariantId ?? 'base'}`} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <p className="truncate text-[#111827]">{item.productName}</p>
                  <p className="font-medium text-[#111827]">₹{value.toLocaleString()}</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
                  <div
                    className="h-full rounded-full bg-[#111827]"
                    style={{ width: `${Math.max(3, Math.round((value / max) * 100))}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}

function DataListCard({ title, items, renderItem, emptyText = 'No data in selected range.' }) {
  return (
    <article className="rounded-xl border border-[#E5E7EB] bg-white p-5">
      <p className="text-sm font-semibold text-[#111827]">{title}</p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-[#6B7280]">{emptyText}</p>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item, index) => (
            <div key={index} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm">
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function mergeByBucket(left = [], right = [], leftKey, rightKey) {
  const map = new Map()
  left.forEach((row) => {
    map.set(row.bucket, { bucket: row.bucket, [leftKey]: asNumber(row[leftKey]), [rightKey]: 0 })
  })
  right.forEach((row) => {
    const existing = map.get(row.bucket) ?? { bucket: row.bucket, [leftKey]: 0, [rightKey]: 0 }
    existing[rightKey] = asNumber(row[rightKey])
    map.set(row.bucket, existing)
  })
  return [...map.values()].sort((a, b) => String(a.bucket).localeCompare(String(b.bucket)))
}

function extractData(payload) {
  return payload?.data ?? {}
}

export function ReportingDashboardPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [filters, setFilters] = useState(defaultDateRange)
  const [groupBy, setGroupBy] = useState('week')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState({
    dashboard: null,
    purchaseSummary: null,
    salesSummary: null,
    returnsSummary: null,
    purchaseTrend: [],
    salesTrend: [],
    returnsTrend: [],
    shipmentsTrend: [],
    reservationsTrend: [],
    topSelling: [],
    inventoryStockSummary: null,
    inventoryMovementSummary: null,
    lowStockItems: [],
    inventoryValuation: null,
    purchasesBySupplier: [],
    salesByCustomer: [],
    warehouseSummary: [],
    warehouseUtilization: [],
    topPurchased: [],
    nonMoving: [],
  })

  useEffect(() => {
    let isMounted = true
    async function load() {
      setLoading(true)
      setError('')
      const common = { ...filters, groupBy }
      try {
        const [
          dashboardRes,
          purchaseSummaryRes,
          salesSummaryRes,
          returnsSummaryRes,
          purchaseTrendRes,
          salesTrendRes,
          returnsTrendRes,
          shipmentsTrendRes,
          reservationsTrendRes,
          topSellingRes,
          inventoryStockRes,
          inventoryMovementRes,
          lowStockRes,
          inventoryValuationRes,
          purchasesBySupplierRes,
          salesByCustomerRes,
          warehouseSummaryRes,
          warehouseUtilizationRes,
          topPurchasedRes,
          nonMovingRes,
        ] = await Promise.all([
          getDashboardSummary(filters),
          getPurchaseSummary(filters),
          getSalesSummary(filters),
          getReturnsSummary(filters),
          getPurchaseReceiptsTrend(common),
          getSalesOrdersTrend(common),
          getReturnsTrend(common),
          getSalesShipmentsTrend(common),
          getSalesReservationsTrend(common),
          getTopSellingProducts({ ...filters, limit: 8 }),
          getInventoryStockSummary(filters),
          getInventoryMovementSummary(filters),
          getLowStockReport({ ...filters, limit: 8 }),
          getInventoryValuation(filters),
          getPurchasesBySupplier({ ...filters, limit: 8 }),
          getSalesByCustomer({ ...filters, limit: 8 }),
          getWarehouseSummary(filters),
          getWarehouseUtilization(filters),
          getTopPurchasedProducts({ ...filters, limit: 8 }),
          getNonMovingProducts({ ...filters, limit: 8 }),
        ])

        if (!isMounted) return

        setData({
          dashboard: extractData(dashboardRes)?.summary ?? null,
          purchaseSummary: extractData(purchaseSummaryRes)?.summary ?? null,
          salesSummary: extractData(salesSummaryRes)?.summary ?? null,
          returnsSummary: extractData(returnsSummaryRes)?.summary ?? null,
          purchaseTrend: extractData(purchaseTrendRes)?.series ?? [],
          salesTrend: extractData(salesTrendRes)?.series ?? [],
          returnsTrend: extractData(returnsTrendRes)?.series ?? [],
          shipmentsTrend: extractData(shipmentsTrendRes)?.series ?? [],
          reservationsTrend: extractData(reservationsTrendRes)?.series ?? [],
          topSelling: extractData(topSellingRes)?.items ?? [],
          inventoryStockSummary: extractData(inventoryStockRes)?.summary ?? null,
          inventoryMovementSummary: extractData(inventoryMovementRes)?.summary ?? null,
          lowStockItems: extractData(lowStockRes)?.items ?? [],
          inventoryValuation: extractData(inventoryValuationRes)?.summary ?? null,
          purchasesBySupplier: extractData(purchasesBySupplierRes)?.items ?? [],
          salesByCustomer: extractData(salesByCustomerRes)?.items ?? [],
          warehouseSummary: extractData(warehouseSummaryRes)?.items ?? [],
          warehouseUtilization: extractData(warehouseUtilizationRes)?.items ?? [],
          topPurchased: extractData(topPurchasedRes)?.items ?? [],
          nonMoving: extractData(nonMovingRes)?.items ?? [],
        })
      } catch (requestError) {
        if (!isMounted) return
        if (requestError?.status === 401) {
          logout()
          navigate('/auth/login', { replace: true })
          return
        }
        setError(requestError?.message ?? 'Failed to load reporting dashboard.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [filters, groupBy])

  const salesVsPurchase = useMemo(
    () => mergeByBucket(data.salesTrend, data.purchaseTrend, 'salesAmount', 'receivedValue'),
    [data.salesTrend, data.purchaseTrend],
  )

  const salesVsReturns = useMemo(() => {
    const salesRows = data.salesTrend.map((row) => ({ bucket: row.bucket, salesAmount: asNumber(row.salesAmount) }))
    const returnsRows = data.returnsTrend.map((row) => ({
      bucket: row.bucket,
      salesReturnedQuantity: asNumber(row.salesReturnedQuantity),
    }))
    return mergeByBucket(salesRows, returnsRows, 'salesAmount', 'salesReturnedQuantity')
  }, [data.salesTrend, data.returnsTrend])

  const shipmentsVsReservations = useMemo(() => {
    const shipmentsRows = data.shipmentsTrend.map((row) => ({
      bucket: row.bucket,
      shippedQuantity: asNumber(row.shippedQuantity),
    }))
    const reservationRows = data.reservationsTrend.map((row) => ({
      bucket: row.bucket,
      reservedQuantity: asNumber(row.reservedQuantity),
    }))
    return mergeByBucket(shipmentsRows, reservationRows, 'shippedQuantity', 'reservedQuantity')
  }, [data.shipmentsTrend, data.reservationsTrend])

  const kpis = [
    kpiCard('Sales Amount', formatMetric(data.salesSummary?.totalSalesAmount, 'currency'), 'from sales summary'),
    kpiCard('Purchase Amount', formatMetric(data.purchaseSummary?.totalOrderAmount, 'currency'), 'from purchase summary'),
    kpiCard('Sales Returns Qty', formatMetric(data.returnsSummary?.salesReturnedQuantity), 'from returns summary'),
    kpiCard('Pending Shipments', formatMetric(data.dashboard?.pendingShipmentCount), 'from dashboard summary'),
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#111827]">Shared Dashboard Filters</p>
            <p className="text-xs text-[#6B7280]">All charts update from one common date range.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="text-xs text-[#6B7280]">
              Start
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
                className="mt-1 block rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#111827]"
              />
            </label>
            <label className="text-xs text-[#6B7280]">
              End
              <input
                type="date"
                value={filters.dateTo}
                onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
                className="mt-1 block rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#111827]"
              />
            </label>
            <label className="text-xs text-[#6B7280]">
              Group
              <select
                value={groupBy}
                onChange={(event) => setGroupBy(event.target.value)}
                className="mt-1 block rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#111827]"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">{error}</section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="rounded-xl border border-[#E5E7EB] bg-white p-5">
            <p className="text-xs text-[#6B7280]">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#111827]">{kpi.value}</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">{kpi.note}</p>
          </article>
        ))}
      </section>

      {loading ? (
        <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 text-sm text-[#6B7280]">Loading charts...</section>
      ) : (
        <>
          <section className="grid gap-6 xl:grid-cols-2">
            <LineBarsChart
              title="Sales vs Purchase Trend"
              rows={salesVsPurchase}
              series={[
                { key: 'salesAmount', label: 'Sales', color: '#111827' },
                { key: 'receivedValue', label: 'Purchase', color: '#2563EB' },
              ]}
            />
            <LineBarsChart
              title="Sales vs Returns Trend"
              rows={salesVsReturns}
              series={[
                { key: 'salesAmount', label: 'Sales', color: '#111827' },
                { key: 'salesReturnedQuantity', label: 'Sales Returns Qty', color: '#DC2626' },
              ]}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <LineBarsChart
              title="Sales Shipments vs Reservations Trend"
              rows={shipmentsVsReservations}
              series={[
                { key: 'shippedQuantity', label: 'Shipped Qty', color: '#16A34A' },
                { key: 'reservedQuantity', label: 'Reserved Qty', color: '#7C3AED' },
              ]}
            />
            <TopSellingChart items={data.topSelling} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <DataListCard
              title="Inventory Summary"
              items={[
                {
                  label: 'Stock rows',
                  value: formatMetric(data.inventoryStockSummary?.stockRows),
                },
                {
                  label: 'Movement count',
                  value: formatMetric(data.inventoryMovementSummary?.totalMovements),
                },
                {
                  label: 'Inventory valuation',
                  value: formatMetric(data.inventoryValuation?.totalValuation, 'currency'),
                },
                {
                  label: 'Low stock items',
                  value: formatMetric(data.lowStockItems.length),
                },
              ]}
              renderItem={(item) => (
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280]">{item.label}</span>
                  <span className="font-medium text-[#111827]">{item.value}</span>
                </div>
              )}
            />
            <DataListCard
              title="Purchases by Supplier"
              items={data.purchasesBySupplier}
              renderItem={(item) => (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[#111827]">{item.supplierName}</span>
                  <span className="font-medium text-[#111827]">₹{asNumber(item.totalSpend).toLocaleString()}</span>
                </div>
              )}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <DataListCard
              title="Sales by Customer"
              items={data.salesByCustomer}
              emptyText="No customer-linked sales orders found in selected range. Walk-in/no-customer orders are excluded."
              renderItem={(item) => (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[#111827]">{item.customerName}</span>
                  <span className="font-medium text-[#111827]">₹{asNumber(item.totalSalesAmount).toLocaleString()}</span>
                </div>
              )}
            />
            <DataListCard
              title="Warehouse Summary"
              items={data.warehouseSummary}
              emptyText="No warehouse summary records found for this tenant/date range."
              renderItem={(item) => (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[#111827]">{item.warehouseName}</span>
                  <span className="text-[#111827]">Shipments: {asNumber(item.postedShipmentCount).toLocaleString()}</span>
                </div>
              )}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <DataListCard
              title="Warehouse Utilization"
              items={data.warehouseUtilization}
              emptyText="No warehouse utilization records found for this tenant/date range."
              renderItem={(item) => (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[#111827]">{item.warehouseName}</span>
                  <span className="text-[#111827]">Bins: {asNumber(item.binCount).toLocaleString()}</span>
                </div>
              )}
            />
            <DataListCard
              title="Top Purchased Products"
              items={data.topPurchased}
              emptyText="No posted purchase receipts found in selected range. This card is based on receiving, not sales orders."
              renderItem={(item) => (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[#111827]">{item.productName}</span>
                  <span className="text-[#111827]">{asNumber(item.receivedQuantity).toLocaleString()}</span>
                </div>
              )}
            />
            <DataListCard
              title="Non-moving Products"
              items={data.nonMoving}
              renderItem={(item) => (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[#111827]">{item.productName}</span>
                  <span className="text-[#111827]">{asNumber(item.onHandQuantity).toLocaleString()}</span>
                </div>
              )}
            />
          </section>
        </>
      )}
    </div>
  )
}
