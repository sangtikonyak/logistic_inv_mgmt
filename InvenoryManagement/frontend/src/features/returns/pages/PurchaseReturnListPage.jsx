import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { listPurchaseReturns } from '../api/returnsApi.js'

function getStatusStyle(status) {
  switch (status) {
    case 'DRAFT':     return 'bg-amber-50 text-amber-700'
    case 'POSTED':    return 'bg-emerald-50 text-emerald-700'
    case 'CANCELLED': return 'bg-rose-50 text-rose-700'
    default:          return 'bg-slate-100 text-slate-700'
  }
}

export function PurchaseReturnListPage() {
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

        const response = await listPurchaseReturns(params)
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
          <h2 className="text-sm font-semibold text-[var(--ink)]">Purchase Returns</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Track goods returned to suppliers and inventory adjustments.
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
          className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--ink)] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="rounded-[1.5rem] border border-[var(--line)] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Return Ref</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Receipt Ref</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Supplier</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Warehouse</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Status</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Return Date</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-[var(--muted)]">
                    Loading purchase returns...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-[var(--muted)]">
                    No purchase returns found.
                  </td>
                </tr>
              ) : (
                returns.map((returnItem) => {
                  const returnNumber = returnItem.returnNumber || returnItem.id.slice(0, 8).toUpperCase()
                  const supplierName = returnItem.supplierName || '-'
                  const warehouseName = returnItem.warehouseName || '-'

                  return (
                    <tr
                      key={returnItem.id}
                      className="border-b border-[var(--line)] last:border-b-0 hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-4 font-medium text-[var(--ink)]">
                        <Link
                          to={`/app/returns/purchase/${returnItem.id}`}
                          className="hover:text-[var(--accent)] transition"
                        >
                          {returnNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-[var(--ink)]">
                        {returnItem.purchaseReceiptId ? (
                          <Link
                            to={`/app/purchases/receipts/${returnItem.purchaseReceiptId}`}
                            className="font-mono text-xs hover:text-[var(--accent)] underline decoration-[var(--line)]"
                          >
                            {returnItem.receiptNumber || returnItem.purchaseReceiptId.slice(0, 8).toUpperCase()}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-[var(--muted)]">{supplierName}</td>
                      <td className="px-6 py-4 text-[var(--muted)]">{warehouseName}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getStatusStyle(returnItem.status)}`}>
                          {returnItem.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--muted)]">
                        {returnItem.returnDate ? format(new Date(returnItem.returnDate), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/app/returns/purchase/${returnItem.id}`}
                          className="rounded-[0.6rem] border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--panel)] transition"
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
