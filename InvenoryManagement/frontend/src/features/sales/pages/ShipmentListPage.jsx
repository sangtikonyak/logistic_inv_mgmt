import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listShipments } from '../api/salesApi.js'

function statusBadge(status) {
  switch (status) {
    case 'DRAFT':      return 'bg-[#F3F4F6] text-[#374151]'
    case 'ALLOCATED':  return 'bg-[#DBEAFE] text-[#1E40AF]'
    case 'PICKING':    return 'bg-[#FEF3C7] text-[#92400E]'
    case 'PICKED':     return 'bg-[#D1FAE5] text-[#065F46]'
    case 'PACKED':     return 'bg-[#E0E7FF] text-[#3730A3]'
    case 'DISPATCHED': return 'bg-[#FDF2F8] text-[#9D174D]'
    case 'POSTED':     return 'bg-[#DCFCE7] text-[#15803D]'
    case 'CANCELLED':  return 'bg-[#FEE2E2] text-[#B91C1C]'
    default:           return 'bg-[#F3F4F6] text-[#374151]'
  }
}

const initialFilters = {
  search: '',
  status: '',
  sortBy: 'created_at',
  sortDir: 'DESC',
}

export function ShipmentListPage() {
  const [shipments, setShipments] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    listShipments({ limit: 100, ...filters })
      .then((response) => setShipments(response.data?.items ?? response.data ?? []))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false))
  }, [filters])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  function resetFilters() {
    setFilters(initialFilters)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-[#111827]">Shipments</h2>
        <p className="mt-1 text-sm text-[#6B7280]">Track outbound shipments against sales orders.</p>
      </div>

      <div className="grid gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Search shipment, order, warehouse"
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/10"
        />
        <select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/10"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          name="sortBy"
          value={filters.sortBy}
          onChange={handleFilterChange}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/10"
        >
          <option value="created_at">Created At</option>
          <option value="updated_at">Updated At</option>
          <option value="shipment_number">Shipment Number</option>
          <option value="shipment_date">Shipment Date</option>
          <option value="sales_order_number">Sales Order</option>
          <option value="warehouse_name">Warehouse</option>
          <option value="status">Status</option>
        </select>
        <select
          name="sortDir"
          value={filters.sortDir}
          onChange={handleFilterChange}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/10"
        >
          <option value="DESC">Newest First</option>
          <option value="ASC">Oldest First</option>
        </select>
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-sm font-semibold text-[#374151] transition hover:bg-white"
        >
          Reset Filters
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-[#E5E7EB] border-l-4 border-l-[#EF4444] bg-[#FFF1F2] px-4 py-3 text-sm font-medium text-[#B91C1C]">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-[#E5E7EB] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Shipment #', 'Sales Order', 'Warehouse', 'Status', 'Ship Date', 'Actions'].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[#6B7280]">
                    Loading shipments...
                  </td>
                </tr>
              ) : shipments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[#6B7280]">
                    No shipments found.
                  </td>
                </tr>
              ) : (
                shipments.map((shipment) => (
                  <tr key={shipment.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                    <td className="px-5 py-3.5 font-medium text-[#111827]">
                      <Link to={`/app/sales/shipments/${shipment.id}`} className="transition hover:text-[#3B82F6]">
                        {shipment.shipmentNumber || shipment.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link to={`/app/sales/orders/${shipment.salesOrderId}`} className="font-mono text-xs text-[#3B82F6] hover:underline">
                        {shipment.salesOrderNumber || shipment.salesOrderId?.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[#6B7280]">{shipment.warehouseName || '-'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(shipment.status)}`}>
                        {shipment.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#6B7280]">
                      {shipment.shipmentDate ? format(new Date(shipment.shipmentDate), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/app/sales/shipments/${shipment.id}`}
                        className="rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] transition hover:bg-[#F9FAFB]"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
