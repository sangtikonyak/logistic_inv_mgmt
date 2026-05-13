import { useEffect, useState } from 'react'
import { listDemandSnapshots, refreshDemandSnapshots } from '../api/replenishmentApi.js'
import { listProducts } from '../../products/api/productsApi.js'
import { listWarehouses } from '../../warehouses/api/warehousesApi.js'
import { usePermissions } from '../../../shared/lib/permissions.js'

export function DemandSnapshotsPage() {
  const { can } = usePermissions()
  const canRefresh = can('REPLENISHMENT', 'UPDATE') || can('REPLENISHMENT', 'CREATE')

  const [snapshots, setSnapshots] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 0, total: 0 })
  const [filters, setFilters] = useState({
    warehouseId: '',
    productId: '',
    snapshotDate: '',
    page: 1,
    limit: 20,
  })

  async function loadContext() {
    const [warehouseRes, productRes] = await Promise.all([
      listWarehouses({ page: 1, limit: 100 }),
      listProducts({ page: 1, limit: 100 }),
    ])
    setWarehouses(warehouseRes.data?.items ?? [])
    setProducts(productRes.data?.items ?? [])
  }

  async function loadSnapshots() {
    setLoading(true)
    setError('')
    try {
      const response = await listDemandSnapshots(filters)
      const payload = response.data ?? {}
      setSnapshots(payload.items ?? [])
      setPagination(payload.pagination ?? { page: 1, limit: 20, totalPages: 0, total: 0 })
    } catch (err) {
      setError(err.message || 'Failed to load demand snapshots.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    setError('')
    try {
      await refreshDemandSnapshots({
        warehouseId: filters.warehouseId || undefined,
        productId: filters.productId || undefined,
        snapshotDate: filters.snapshotDate || undefined,
      })
      await loadSnapshots()
    } catch (err) {
      setError(err.message || 'Failed to refresh demand snapshots.')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadContext().catch(() => {})
  }, [])

  useEffect(() => {
    loadSnapshots()
  }, [filters.page, filters.limit, filters.productId, filters.warehouseId, filters.snapshotDate])

  function formatUnitsPerDay(value) {
    return `${Number(value ?? 0).toFixed(2)} units/day`
  }

  function formatTrend(value) {
    const trend = Number(value ?? 0)
    if (trend === 0) return '0.00 (No recent demand)'
    if (trend > 1.05) return `${trend.toFixed(2)} (Rising)`
    if (trend < 0.95) return `${trend.toFixed(2)} (Falling)`
    return `${trend.toFixed(2)} (Stable)`
  }

  function formatDate(value, fallback = '-') {
    if (!value) return fallback
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return fallback
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.2rem] border border-[#BFDBFE] bg-[#EFF6FF] p-4 text-sm text-[#1E3A8A]">
        <h3 className="text-base font-semibold text-[#1E40AF]">How to read these demand fields</h3>
        <ul className="mt-2 space-y-1">
          <li><strong>Avg 7d Daily Sales:</strong> Total shipped quantity in last 7 days / 7.</li>
          <li><strong>Avg 30d Daily Sales:</strong> Total shipped quantity in last 30 days / 30.</li>
          <li><strong>Demand Trend:</strong> Avg 7d / Avg 30d. Above 1.00 means demand is increasing.</li>
          <li><strong>Stockout Days (30d):</strong> Days with no available stock in the lookback window.</li>
          <li><strong>Last Sale Date:</strong> Most recent shipment date for this product in this warehouse.</li>
          <li><strong>Snapshot Date:</strong> Date on which this metric snapshot was generated.</li>
        </ul>
      </section>

      <section className="rounded-[1.2rem] border border-[var(--line)] bg-white p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={filters.warehouseId}
            onChange={(e) => setFilters((prev) => ({ ...prev, page: 1, warehouseId: e.target.value }))}
            className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            value={filters.productId}
            onChange={(e) => setFilters((prev) => ({ ...prev, page: 1, productId: e.target.value }))}
            className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
          >
            <option value="">All Products</option>
            {products.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filters.snapshotDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, page: 1, snapshotDate: e.target.value }))}
            className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
          />
          {canRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {refreshing ? 'Refreshing...' : 'Refresh Snapshot'}
            </button>
          )}
        </div>
      </section>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <section className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right" title="Total shipped quantity in last 7 days divided by 7">
                  Avg 7d Daily Sales
                </th>
                <th className="px-4 py-3 text-right" title="Total shipped quantity in last 30 days divided by 30">
                  Avg 30d Daily Sales
                </th>
                <th className="px-4 py-3 text-right" title="Avg 7d / Avg 30d. Above 1.00 means rising demand">
                  Demand Trend (7d/30d)
                </th>
                <th className="px-4 py-3 text-right" title="Days where stock was unavailable in the 30-day window">
                  Stockout Days (30d)
                </th>
                <th className="px-4 py-3">Last Sale</th>
                <th className="px-4 py-3">Snapshot Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-[var(--muted)]" colSpan={9}>
                    Loading demand snapshots...
                  </td>
                </tr>
              ) : snapshots.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-[var(--muted)]" colSpan={9}>
                    No demand snapshots found.
                  </td>
                </tr>
              ) : (
                snapshots.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--line)] last:border-b-0">
                    <td className="px-4 py-3">{row.warehouseName}</td>
                    <td className="px-4 py-3">{row.productName}</td>
                    <td className="px-4 py-3">{row.sku || '-'}</td>
                    <td className="px-4 py-3 text-right">{formatUnitsPerDay(row.avgDailySales7d)}</td>
                    <td className="px-4 py-3 text-right">{formatUnitsPerDay(row.avgDailySales30d)}</td>
                    <td className="px-4 py-3 text-right">{formatTrend(row.trendFactor)}</td>
                    <td className="px-4 py-3 text-right">{row.stockoutDays30d}</td>
                    <td className="px-4 py-3">{formatDate(row.lastSaleDate, 'No sales yet')}</td>
                    <td className="px-4 py-3">{formatDate(row.snapshotDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">Total: {pagination.total ?? 0}</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={filters.page <= 1}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
            className="rounded border border-[var(--line)] px-3 py-1 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={pagination.totalPages === 0 || filters.page >= pagination.totalPages}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
            className="rounded border border-[var(--line)] px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
