import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listRequisitions } from '../api/procurementApi.js'

function statusChip(status) {
  switch (status) {
    case 'DRAFT': return 'bg-slate-100 text-slate-700'
    case 'SUBMITTED': return 'bg-blue-50 text-blue-700'
    case 'APPROVED': return 'bg-emerald-50 text-emerald-700'
    case 'REJECTED': return 'bg-rose-50 text-rose-700'
    case 'CANCELLED': return 'bg-amber-50 text-amber-700'
    default: return 'bg-slate-100 text-slate-700'
  }
}

export function RequisitionListPage() {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const response = await listRequisitions({ page: 1, limit: 50 })
        setItems(response.data?.items ?? [])
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink)]">Procurement Requisitions</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Raise and track internal purchase demands with approval status.</p>
        </div>
        <Link to="/app/purchases/requisitions/new" className="rounded-[1rem] bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A]">
          New Requisition
        </Link>
      </div>

      {error ? (
        <div className="rounded-[1rem] border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-[1.5rem] border border-[var(--line)] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)]">
              <th className="px-5 py-4 font-semibold text-[var(--muted)]">Req #</th>
              <th className="px-5 py-4 font-semibold text-[var(--muted)]">Warehouse</th>
              <th className="px-5 py-4 font-semibold text-[var(--muted)]">Requested By</th>
              <th className="px-5 py-4 font-semibold text-[var(--muted)]">Status</th>
              <th className="px-5 py-4 font-semibold text-[var(--muted)]">Required By</th>
              <th className="px-5 py-4 font-semibold text-[var(--muted)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-[var(--muted)]">Loading requisitions...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-[var(--muted)]">No requisitions found.</td></tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border-[var(--line)] last:border-b-0 hover:bg-slate-50/50">
                  <td className="px-5 py-4 font-medium text-[var(--ink)]">{row.requisitionNumber}</td>
                  <td className="px-5 py-4 text-[var(--ink)]">{row.warehouseName}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{row.requestedByName}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusChip(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[var(--muted)]">{row.requiredByDate ? new Date(row.requiredByDate).toLocaleDateString() : '-'}</td>
                  <td className="px-5 py-4">
                    <Link to={`/app/purchases/requisitions/${row.id}`} className="rounded-[0.7rem] border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)]">
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
  )
}
