import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { approveRequisition, getRequisition, rejectRequisition, submitRequisition } from '../api/procurementApi.js'

export function RequisitionDetailPage() {
  const { requisitionId } = useParams()
  const [item, setItem] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isActionLoading, setIsActionLoading] = useState(false)

  async function refresh() {
    try {
      setIsLoading(true)
      const response = await getRequisition(requisitionId)
      setItem(response.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [requisitionId])

  async function runAction(action) {
    try {
      setIsActionLoading(true)
      if (action === 'submit') await submitRequisition(requisitionId)
      if (action === 'approve') await approveRequisition(requisitionId)
      if (action === 'reject') await rejectRequisition(requisitionId)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  if (isLoading) return <div className="p-4 text-sm text-[var(--muted)]">Loading requisition...</div>
  if (error) return <div className="rounded-[1rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
  if (!item) return null

  return (
    <div className="space-y-6">
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">Requisition {item.requisitionNumber}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{item.warehouseName} · Requested by {item.requestedByName}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {item.status === 'DRAFT' ? (
            <button disabled={isActionLoading} onClick={() => runAction('submit')} className="rounded-[0.8rem] bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
              Submit
            </button>
          ) : null}
          {item.status === 'SUBMITTED' ? (
            <>
              <button disabled={isActionLoading} onClick={() => runAction('approve')} className="rounded-[0.8rem] bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                Approve
              </button>
              <button disabled={isActionLoading} onClick={() => runAction('reject')} className="rounded-[0.8rem] bg-[#DC2626] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                Reject
              </button>
            </>
          ) : null}
          <Link to="/app/purchases/requisitions" className="rounded-[0.8rem] border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--ink)]">Back</Link>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="px-5 py-4 font-semibold text-[var(--muted)]">Item</th>
                <th className="px-5 py-4 font-semibold text-[var(--muted)]">SKU</th>
                <th className="px-5 py-4 font-semibold text-[var(--muted)]">Requested Qty</th>
                <th className="px-5 py-4 font-semibold text-[var(--muted)]">Approved Qty</th>
                <th className="px-5 py-4 font-semibold text-[var(--muted)]">Est Unit Cost</th>
              </tr>
            </thead>
            <tbody>
              {(item.items ?? []).map((line) => (
                <tr key={line.id} className="border-b border-[var(--line)] last:border-b-0">
                  <td className="px-5 py-4 font-medium text-[var(--ink)]">{line.variantName ? `${line.productName} - ${line.variantName}` : line.productName}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{line.sku || '-'}</td>
                  <td className="px-5 py-4 text-[var(--ink)]">{line.requestedQuantity}</td>
                  <td className="px-5 py-4 text-[var(--ink)]">{line.approvedQuantity}</td>
                  <td className="px-5 py-4 text-[var(--ink)]">{Number(line.estimatedUnitCost).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
