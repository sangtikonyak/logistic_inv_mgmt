import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { listSalesReturns } from '../api/returnsApi.js'

function getStatusStyle(status) {
  switch (status) {
    case 'DRAFT':     return 'bg-[#F3F4F6] text-[#374151]'
    case 'POSTED':    return 'bg-[#DCFCE7] text-[#15803D]'
    case 'CANCELLED': return 'bg-[#FEE2E2] text-[#B91C1C]'
    default:          return 'bg-[#F3F4F6] text-[#374151]'
  }
}

export function SalesReturnListPage() {
  const { session } = useAuth()
  const { can } = usePermissions()
  const canCreate = can('RETURNS', 'CREATE')

  const [returns, setReturns] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter states
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function fetchReturns() {
      try {
        setIsLoading(true)
        setError(null)
        const params = {}
        if (search) params.search = search
        if (statusFilter) params.status = statusFilter

        const response = await listSalesReturns(params)
        setReturns(response.data?.items ?? response.data ?? [])
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message)
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchReturns()

    return () => controller.abort()
  }, [search, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#111827]">Sales Returns</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Track customer returns and inventory restocking.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search returns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-[#111827] placeholder:text-[#6B7280] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm text-[#111827] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border-l-4 border-l-[#EF4444] border border-[#E5E7EB] bg-[#FFF1F2] px-4 py-3 text-sm font-medium text-[#B91C1C]">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-[#E5E7EB] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Return #', 'Shipment Ref', 'Customer', 'Warehouse', 'Status', 'Return Date', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-[#6B7280]">
                    Loading sales returns...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-[#6B7280]">
                    No sales returns found.
                  </td>
                </tr>
              ) : (
                returns.map((returnItem) => {
                  const returnNumber = returnItem.returnNumber || returnItem.id.slice(0, 8).toUpperCase()
                  const customerName = returnItem.customerName || '-'
                  const warehouseName = returnItem.warehouseName || '-'

                  return (
                    <tr key={returnItem.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                      <td className="px-5 py-3.5 font-medium text-[#111827]">
                        <Link
                          to={`/app/returns/sales/${returnItem.id}`}
                          className="hover:text-[#3B82F6] transition"
                        >
                          {returnNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        {returnItem.salesShipmentId ? (
                          <Link
                            to={`/app/sales/shipments/${returnItem.salesShipmentId}`}
                            className="font-mono text-xs text-[#3B82F6] hover:underline"
                          >
                            {returnItem.shipmentNumber || returnItem.salesShipmentId.slice(0, 8).toUpperCase()}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[#6B7280]">{customerName}</td>
                      <td className="px-5 py-3.5 text-[#6B7280]">{warehouseName}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusStyle(returnItem.status)}`}>
                          {returnItem.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#6B7280]">
                        {returnItem.returnDate ? format(new Date(returnItem.returnDate), 'MMM d, yyyy') : 'â€”'}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/app/returns/sales/${returnItem.id}`}
                          className="rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] transition"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
