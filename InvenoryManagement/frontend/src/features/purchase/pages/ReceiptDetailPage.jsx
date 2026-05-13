import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { getPurchaseReceipt, postPurchaseReceipt, cancelPurchaseReceipt } from '../api/purchaseApi.js'

export function ReceiptDetailPage() {
  const { receiptId } = useParams()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('PURCHASES', 'CREATE') || can('PURCHASES', 'UPDATE')

  const [receipt, setReceipt] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pageFeedback, setPageFeedback] = useState({ tone: 'success', message: '' })
  const [isProcessing, setIsProcessing] = useState(false)

  async function loadReceipt() {
    try {
      setIsLoading(true)
      const response = await getPurchaseReceipt(receiptId)
      setReceipt(response.data)
    } catch (error) {
      setPageFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReceipt()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptId])

  async function handlePost() {
    if (!window.confirm('Are you sure you want to Post this receipt? Inventory ledgers will be permanently updated and stock quantities increased.')) return
    setIsProcessing(true)
    try {
      await postPurchaseReceipt(receiptId)
      setPageFeedback({ tone: 'success', message: 'Receipt successfully posted to the ledger.' })
      await loadReceipt()
    } catch (error) {
      setPageFeedback({ tone: 'error', message: error.message || 'Ledger posting failed.' })
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleCancel() {
    if (!window.confirm('Are you sure you want to cancel this receipt? It will be voided.')) return
    setIsProcessing(true)
    try {
      await cancelPurchaseReceipt(receiptId)
      setPageFeedback({ tone: 'success', message: 'Receipt cancelled.' })
      await loadReceipt()
    } catch (error) {
      setPageFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading && !receipt) {
    return <div className="p-4 text-sm text-[var(--muted)]">Loading receipt details...</div>
  }

  if (!receipt) {
    return (
      <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
        Receipt not found.
      </div>
    )
  }

  const isDraft = receipt.status === 'DRAFT'

  // Backend returns camelCase from toPurchaseReceiptSummary() + items mapping
  const receiptNumber = receipt.receiptNumber || receipt.id.slice(0, 8).toUpperCase()
  const supplierName = receipt.supplierName || '-'
  const warehouseName = receipt.warehouseName || '-'

  return (
    <div className="space-y-6">
      <StatusAlert tone={pageFeedback.tone} message={pageFeedback.message} />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Goods Receipt Note</p>
          <h2 className="text-2xl font-bold text-[var(--ink)]">{receiptNumber}</h2>
          <p className="mt-1 text-sm font-medium text-[var(--muted)]">
            Against PO:{' '}
            <Link
              to={`/app/purchases/orders/${receipt.purchaseOrderId}`}
              className="text-[var(--accent)] hover:underline"
            >
              {receipt.purchaseOrderNumber || receipt.purchaseOrderId?.slice(0, 8).toUpperCase()}
            </Link>
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
              receipt.status === 'POSTED'    ? 'bg-emerald-100 text-emerald-800' :
              receipt.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800'      :
                                               'bg-amber-100 text-amber-800'
            }`}>
              {receipt.status}
            </span>
            <span className="text-sm text-[var(--muted)]">
              {receipt.receiptDate ? format(new Date(receipt.receiptDate), 'PPP') : 'No date'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {canEdit && isDraft && (
            <>
              <button
                onClick={handlePost}
                disabled={isProcessing}
                className="rounded-[1rem] bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] disabled:opacity-60 transition"
              >
                Post to Ledger
              </button>
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="rounded-[1rem] rounded-lg bg-[#EF4444] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#DC2626] transition hover:bg-rose-100 disabled:opacity-60"
              >
                Cancel Receipt
              </button>
            </>
          )}
          {canEdit && receipt.status === 'POSTED' && (
            <Link
              to={`/app/returns/receipts/${receiptId}/return`}
              className="rounded-[1rem] border-2 border-[#F59E0B] bg-white px-4 py-2.5 text-sm font-semibold text-[#F59E0B] hover:bg-[#FEF3C7] transition"
            >
              Create Return
            </Link>
          )}
          <Link
            to="/app/purchases/receipts"
            className="rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] transition"
          >
            Back to Receipts
          </Link>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-[1.2rem] border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Supplier</p>
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{supplierName}</p>
          {receipt.supplierId && (
            <Link
              to={`/app/purchases/suppliers/${receipt.supplierId}`}
              className="mt-1 inline-block text-xs font-semibold text-[#3B82F6] hover:underline"
            >
              View supplier â†’
            </Link>
          )}
        </div>
        <div className="rounded-[1.2rem] border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Received Into</p>
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{warehouseName}</p>
          {receipt.warehouseId && (
            <Link
              to={`/app/warehouses/${receipt.warehouseId}`}
              className="mt-1 inline-block text-xs font-semibold text-[#3B82F6] hover:underline"
            >
              View warehouse â†’
            </Link>
          )}
        </div>
        <div className="rounded-[1.2rem] border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Receipt Date</p>
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
            {receipt.receiptDate ? format(new Date(receipt.receiptDate), 'PPP') : '-'}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">{receipt.items?.length ?? 0} line item{receipt.items?.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Items table */}
      <div className="rounded-[1.2rem] border border-[var(--line)] bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-[var(--line)]">
          <h3 className="font-semibold text-[var(--ink)]">Received Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[var(--panel)]">
                <th className="px-6 py-3 font-semibold text-[var(--muted)]">Item</th>
                <th className="px-6 py-3 font-semibold text-[var(--muted)]">SKU</th>
                <th className="px-6 py-3 font-semibold text-[var(--muted)]">Bin</th>
                <th className="px-6 py-3 font-semibold text-[var(--muted)] text-right">Unit Cost</th>
                <th className="px-6 py-3 font-semibold text-[var(--muted)] text-right">Qty Received</th>
                <th className="px-6 py-3 font-semibold text-[var(--muted)] text-right">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {!receipt.items?.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-sm text-[var(--muted)]">No items on this receipt.</td>
                </tr>
              )}
              {receipt.items?.map((item) => {
                // Backend returns camelCase from getPurchaseReceiptById items mapping
                const displayName = item.variantName
                  ? `${item.productName} â€” ${item.variantName}`
                  : item.productName || 'Unknown'
                const totalValue = Number(item.unitCost) * Number(item.receivedQuantity)

                return (
                  <tr key={item.id} className="border-b border-[var(--line)] last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-[var(--ink)]">{displayName}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--muted)] font-mono">{item.sku || '-'}</td>
                    <td className="px-6 py-4 text-sm text-[var(--muted)]">{item.binName || 'â€”'}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-[var(--muted)]">
                      {Number(item.unitCost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-[var(--ink)]">{item.receivedQuantity ?? 0}</span>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums font-semibold text-[var(--ink)]">
                      {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {receipt.notes && (
        <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Receiving Notes</p>
          <p className="mt-2 text-sm text-[var(--ink)]">{receipt.notes}</p>
        </div>
      )}
    </div>
  )
}
