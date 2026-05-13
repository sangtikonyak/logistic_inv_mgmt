import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { formatPaymentValue } from '../../../shared/lib/paymentOptions.js'
import { listSalesOrders } from '../api/salesApi.js'

function statusBadge(status) {
  switch (status) {
    case 'DRAFT':
      return 'bg-[#F3F4F6] text-[#374151]'
    case 'CONFIRMED':
      return 'bg-[#EFF6FF] text-[#1D4ED8]'
    case 'PARTIALLY_RESERVED':
      return 'bg-[#FEF9C3] text-[#A16207]'
    case 'RESERVED':
      return 'bg-[#FEF3C7] text-[#92400E]'
    case 'PARTIALLY_SHIPPED':
      return 'bg-[#FEF9C3] text-[#A16207]'
    case 'SHIPPED':
      return 'bg-[#DCFCE7] text-[#15803D]'
    case 'CANCELLED':
      return 'bg-[#FEE2E2] text-[#B91C1C]'
    default:
      return 'bg-[#F3F4F6] text-[#374151]'
  }
}

const initialFilters = {
  search: '',
  status: '',
  sortBy: 'created_at',
  sortDir: 'DESC',
}

export function SalesOrderListPage() {
  const { can } = usePermissions()
  const canEdit = can('SALES', 'CREATE') || can('SALES', 'UPDATE')
  const [orders, setOrders] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    listSalesOrders({ limit: 100, ...filters })
      .then((response) => setOrders(response.data?.items ?? response.data ?? []))
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#111827]">Sales Orders</h2>
          <p className="mt-1 text-sm text-[#6B7280]">Track customer orders from draft through shipment.</p>
        </div>
        {canEdit && (
          <Link
            to="/app/sales/orders/new"
            className="inline-flex items-center rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#16A34A]"
          >
            Create Order
          </Link>
        )}
      </div>

      <div className="grid gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Search order or customer"
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
          <option value="CONFIRMED">Confirmed</option>
          <option value="PARTIALLY_RESERVED">Partially Reserved</option>
          <option value="RESERVED">Reserved</option>
          <option value="PARTIALLY_SHIPPED">Partially Shipped</option>
          <option value="SHIPPED">Shipped</option>
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
          <option value="sales_order_number">Order Number</option>
          <option value="order_date">Order Date</option>
          <option value="customer_name">Customer</option>
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
                {['Order #', 'Customer', 'Warehouse', 'Status', 'Payment', 'Order Date', 'Expected Ship', 'Total', 'Actions'].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-[#6B7280]">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-[#6B7280]">
                    No sales orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                    <td className="px-5 py-3.5 font-medium text-[#111827]">
                      <Link to={`/app/sales/orders/${order.id}`} className="transition hover:text-[#3B82F6]">
                        {order.salesOrderNumber || order.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[#111827]">{order.customerName || '-'}</td>
                    <td className="px-5 py-3.5 text-[#6B7280]">{order.warehouseName || '-'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(order.status)}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#6B7280]">{formatPaymentValue(order.paymentStatus)}</td>
                    <td className="px-5 py-3.5 text-[#6B7280]">
                      {order.orderDate ? format(new Date(order.orderDate), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-[#6B7280]">
                      {order.expectedShipDate ? format(new Date(order.expectedShipDate), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#111827]">
                      {order.totalAmount != null ? `${order.currencyCode || 'INR'} ${Number(order.totalAmount).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/app/sales/orders/${order.id}`}
                          className="rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] transition hover:bg-[#F9FAFB]"
                        >
                          View
                        </Link>
                        {canEdit && order.status === 'DRAFT' && (
                          <Link
                            to={`/app/sales/orders/${order.id}/edit`}
                            className="rounded-md bg-[#3B82F6] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2563EB]"
                          >
                            Edit
                          </Link>
                        )}
                      </div>
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
