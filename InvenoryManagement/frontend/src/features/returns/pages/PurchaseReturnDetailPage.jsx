import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { getPurchaseReturn, postPurchaseReturn, cancelPurchaseReturn } from '../api/returnsApi.js'

export function PurchaseReturnDetailPage() {
  const { purchaseReturnId } = useParams()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('RETURNS', 'CREATE') || can('RETURNS', 'UPDATE')

  const [returnData, setReturnData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pageFeedback, setPageFeedback] = useState({ tone: 'success', message: '' })
  const [isProcessing, setIsProcessing] = useState(false)

  async function loadReturn() {
    try {
      setIsLoading(true)
      const response = await getPurchaseReturn(purchaseReturnId)
      setReturnData(response.data)
    } catch (error) {
      setPageFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReturn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseReturnId])

  async function handlePost() {
    if (!window.confirm('Are you sure you want to Post this return? Inventory will be adjusted and the return will be finalized.')) return
    setIsProcessing(true)
    try {
      await postPurchaseReturn(purchaseReturnId)
      setPageFeedback({ tone: 'success', message: 'Purchase return successfully posted to inventory.' })
      await loadReturn()
    } catch (error) {
      setPageFeedback({ tone: 'error', message: error.message || 'Failed to post return.' })
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleCancel() {
    if (!window.confirm('Are you sure you want to cancel this return? This action cannot be undone.')) return
    setIsProcessing(true)
    try {
      await cancelPurchaseReturn(purchaseReturnId)
      setPageFeedback({ tone: 'success', message: 'Purchase return cancelled.' })
      await loadReturn()
    } catch (error) {
      setPageFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading && !returnData) {
    return <div className="p-4 text-sm text-[var(--muted)]">Loading return details...</div>
  }

  if (!returnData) {
    return (
      <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
        Purchase return not found.
      </div>
    )
  }

  const isDraft = returnData.status === 'DRAFT'
  const returnNumber = returnData.returnNumber || returnData.id.slice(0, 8).toUpperCase()
  const supplierName = returnData.supplierName || '-'
  const warehouseName = returnData.warehouseName || '-'

  return (
    <div className="space-y-6">
      <StatusAlert tone={pageFeedback.tone} message={pageFeedback.message} />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
            Purchase Return
          </p>
          <h2 className="text-2xl font-bold text-[var(--ink)]">{returnNumber}</h2>
          <p className="mt-1 text-sm font-medium text-[var(--muted)]">
            Against Receipt:{' '}
            {returnData.purchaseReceiptId ? (
              <Link
                to={`/app/purchases/receipts/${returnData.purchaseReceiptId}`}
                className="text-[var(--accent)] hover:underline"
              >
                {returnData.receiptNumber || returnData.purchaseReceiptId.slice(0, 8).toUpperCase()}
              </Link>
            ) : (
              'N/A'
            )}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                returnData.status === 'POSTED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : returnData.status === 'CANCELLED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
              }`}
            >
              {returnData.status}
            </span>
            <span className="text-sm text-[var(--muted)]">
              {returnData.returnDate ? format(new Date(returnData.returnDate), 'PPP') : 'No date'}
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
                {isProcessing ? 'Posting...' : 'Post to Inventory'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="rounded-[1rem] bg-[#EF4444] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#DC2626] disabled:opacity-60 transition"
              >
                {isProcessing ? 'Cancelling...' : 'Cancel Return'}
              </button>
            </>
          )}
          <Link
            to="/app/returns/purchase"
            className="rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] transition"
          >
            Back to Returns
          </Link>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-[1.2rem] border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Supplier</p>
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{supplierName}</p>
          {returnData.supplierId && (
            <Link
              to={`/app/purchases/suppliers/${returnData.supplierId}`}
              className="mt-1 inline-block text-xs font-semibold text-[#3B82F6] hover:underline"
            >
              View supplier â†’
            </Link>
          )}
        </div>
        <div className="rounded-[1.2rem] border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Warehouse</p>
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{warehouseName}</p>
          {returnData.warehouseId && (
            <Link
              to={`/app/warehouses/${returnData.warehouseId}`}
              className="mt-1 inline-block text-xs font-semibold text-[#3B82F6] hover:underline"
            >
              View warehouse â†’
            </Link>
          )}
        </div>
        <div className="rounded-[1.2rem] border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Return Date</p>
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
            {returnData.returnDate ? format(new Date(returnData.returnDate), 'PPP') : '-'}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {returnData.items?.length ?? 0} line item{returnData.items?.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Items table */}
      <div className="rounded-[1.2rem] border border-[var(--line)] bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-[var(--line)]">
          <h3 className="font-semibold text-[var(--ink)]">Returned Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[var(--panel)]">
                <th className="px-6 py-3 font-semibold text-[var(--muted)]">Item</th>
                <th className="px-6 py-3 font-semibold text-[var(--muted)]">SKU</th>
                <th className="px-6 py-3 font-semibold text-[var(--muted)]">Bin</th>
                <th className="px-6 py-3 font-semibold text-[var(--muted)] text-right">Unit Cost</th>
                <th className="px-6 py-3 font-semibold text-[var(--muted)] text-right">Qty Returned</th>
                <th className="px-6 py-3 font-semibold text-[var(--muted)] text-right">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {!returnData.items?.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-sm text-[var(--muted)]">
                    No items on this return.
                  </td>
                </tr>
              )}
              {returnData.items?.map((item) => {
                const displayName = item.variantName
                  ? `${item.productName} â€” ${item.variantName}`
                  : item.productName || 'Unknown'
                const totalValue = Number(item.unitCost || 0) * Number(item.returnedQuantity || 0)

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
                      <span className="font-bold text-[var(--ink)]">{item.returnedQuantity ?? 0}</span>
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

      {returnData.reason && (
        <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Return Reason</p>
          <p className="mt-2 text-sm text-[var(--ink)]">{returnData.reason}</p>
        </div>
      )}

      {returnData.notes && (
        <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Notes</p>
          <p className="mt-2 text-sm text-[var(--ink)]">{returnData.notes}</p>
        </div>
      )}
    </div>
  )
}
