import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPurchaseReceipts } from '../api/purchaseApi.js'

export function ReceiptListPage() {
  const [receipts, setReceipts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchReceipts() {
      try {
        setIsLoading(true)
        const response = await listPurchaseReceipts()
        setReceipts(response.data?.items ?? response.data ?? [])
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchReceipts()
  }, [])

  function getStatusStyle(status) {
    switch (status) {
      case 'DRAFT':     return 'bg-amber-50 text-amber-700'
      case 'POSTED':    return 'bg-emerald-50 text-emerald-700'
      case 'CANCELLED': return 'bg-rose-50 text-rose-700'
      default:          return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-[var(--ink)]">Inbound Receipts</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Track delivery receipts and ledger postings against arriving purchase orders.</p>
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
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Receipt Ref</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Purchase Order</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Supplier</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Warehouse</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Status</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Received Date</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-[var(--muted)]">Loading receipts...</td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-[var(--muted)]">No receipts found.</td>
                </tr>
              ) : (
                receipts.map((receipt) => {
                  // Backend returns camelCase from toPurchaseReceiptSummary()
                  const receiptNumber = receipt.receiptNumber || receipt.id.slice(0, 8).toUpperCase()
                  const supplierName = receipt.supplierName || '-'
                  const warehouseName = receipt.warehouseName || '-'

                  return (
                    <tr key={receipt.id} className="border-b border-[var(--line)] last:border-b-0 hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-medium text-[var(--ink)]">
                        <Link to={`/app/purchases/receipts/${receipt.id}`} className="hover:text-[var(--accent)] transition">
                          {receiptNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-[var(--ink)]">
                        <Link
                          to={`/app/purchases/orders/${receipt.purchaseOrderId}`}
                          className="font-mono text-xs hover:text-[var(--accent)] underline decoration-[var(--line)]"
                        >
                          {receipt.purchaseOrderNumber || receipt.purchaseOrderId?.slice(0, 8).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-[var(--muted)]">{supplierName}</td>
                      <td className="px-6 py-4 text-[var(--muted)]">{warehouseName}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getStatusStyle(receipt.status)}`}>
                          {receipt.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--muted)]">
                        {receipt.receiptDate ? format(new Date(receipt.receiptDate), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/app/purchases/receipts/${receipt.id}`}
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
