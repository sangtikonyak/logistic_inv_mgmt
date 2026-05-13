import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { formatPaymentValue } from '../../../shared/lib/paymentOptions.js'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { getPurchaseOrder, issuePurchaseOrder, cancelPurchaseOrder, submitForApproval, approvePurchaseOrder, rejectPurchaseOrder } from '../api/purchaseApi.js'

export function PurchaseOrderDetailPage() {
  const { orderId } = useParams()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('PURCHASES', 'CREATE') || can('PURCHASES', 'UPDATE')

  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pageFeedback, setPageFeedback] = useState({ tone: 'success', message: '' })
  const [isProcessing, setIsProcessing] = useState(false)

  async function loadOrder() {
    try {
      setIsLoading(true)
      const response = await getPurchaseOrder(orderId)
      setOrder(response.data)
    } catch (error) {
      setPageFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  async function handleIssue() {
    if (!window.confirm('Are you sure you want to issue this PO to the supplier? Items and costs will be locked.')) return
    setIsProcessing(true)
    try {
      await issuePurchaseOrder(orderId)
      setPageFeedback({ tone: 'success', message: 'Purchase Order issued successfully.' })
      await loadOrder()
    } catch (error) {
      setPageFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleCancel() {
    if (!window.confirm('Are you sure you want to cancel this PO? This action cannot be undone.')) return
    setIsProcessing(true)
    try {
      await cancelPurchaseOrder(orderId)
      setPageFeedback({ tone: 'success', message: 'Purchase Order cancelled.' })
      await loadOrder()
    } catch (error) {
      setPageFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleApprovalSubmit() {
    if (!window.confirm('Submit this Purchase Order for approval?')) return
    setIsProcessing(true)
    try {
      await submitForApproval(orderId)
      setPageFeedback({ tone: 'success', message: 'Purchase Order submitted for approval.' })
      await loadOrder()
    } catch (error) {
      setPageFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleApprove() {
    if (!window.confirm('Approve this Purchase Order?')) return
    setIsProcessing(true)
    try {
      await approvePurchaseOrder(orderId)
      setPageFeedback({ tone: 'success', message: 'Purchase Order approved.' })
      await loadOrder()
    } catch (error) {
      setPageFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleReject() {
    if (!window.confirm('Reject this Purchase Order and move back to Draft?')) return
    setIsProcessing(true)
    try {
      await rejectPurchaseOrder(orderId)
      setPageFeedback({ tone: 'success', message: 'Purchase Order rejected and moved to Draft.' })
      await loadOrder()
    } catch (error) {
      setPageFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading && !order) {
    return <div className="p-4 text-sm text-[var(--muted)]">Loading order details...</div>
  }

  if (!order) {
    return (
      <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
        Order not found or you don't have access.
      </div>
    )
  }

  const isDraft = order.status === 'DRAFT'
  const isCancellable = isDraft || order.status === 'ISSUED'
  const canReceive = order.status === 'ISSUED' || order.status === 'PARTIALLY_RECEIVED'

  // Backend returns camelCase from toPurchaseOrderSummary()
  const orderNumber = order.purchaseOrderNumber || order.id.slice(0, 8).toUpperCase()
  const supplierName = order.supplierName || '-'
  const warehouseName = order.warehouseName || '-'

  return (
    <div className="space-y-6">
      <StatusAlert tone={pageFeedback.tone} message={pageFeedback.message} />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Purchase Order</p>
          <h2 className="text-2xl font-bold text-[var(--ink)]">{orderNumber}</h2>
          <div className="mt-2 flex items-center gap-3">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              order.status === 'DRAFT' ? 'bg-slate-100 text-slate-700' :
              order.status === 'ISSUED' ? 'bg-blue-50 text-blue-700' :
              order.status === 'PARTIALLY_RECEIVED' ? 'bg-amber-50 text-amber-700' :
              order.status === 'RECEIVED' ? 'bg-emerald-50 text-emerald-700' :
              'bg-rose-50 text-rose-700'
            }`}>
              {order.status.replace(/_/g, ' ')}
            </span>
            <span className="text-sm text-[var(--muted)]">
              {order.orderDate ? format(new Date(order.orderDate), 'PPP') : 'No date'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {canEdit && isDraft && (
            <>
              <button
                onClick={handleApprovalSubmit}
                disabled={isProcessing}
                className="rounded-[1rem] bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-60 transition"
              >
                Submit for Approval
              </button>
              <Link
                to={`/app/purchases/orders/${order.id}/edit`}
                className="rounded-lg border border-[#3B82F6] text-[#3B82F6] px-4 py-2.5 text-sm font-semibold hover:bg-blue-50 transition"
              >
                Edit
              </Link>
            </>
          )}

          {canEdit && order.status === 'PENDING_APPROVAL' && (
            <>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="rounded-[1rem] bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] disabled:opacity-60 transition"
              >
                Approve
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="rounded-[1rem] bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#EA580C] disabled:opacity-60 transition"
              >
                Reject
              </button>
            </>
          )}

          {canEdit && order.status === 'APPROVED' && (
            <button
              onClick={handleIssue}
              disabled={isProcessing}
              className="rounded-[1rem] bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] disabled:opacity-60 transition"
            >
              Issue Order
            </button>
          )}

          {canEdit && canReceive && (
            <Link
              to={`/app/purchases/orders/${order.id}/receive`}
              className="rounded-[1rem] bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] transition"
            >
              Receive Stock
            </Link>
          )}

          {canEdit && isCancellable && (
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="rounded-lg bg-[#EF4444] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#DC2626] transition disabled:opacity-60"
            >
              Cancel Order
            </button>
          )}

          <Link
            to="/app/purchases/orders"
            className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] transition">Back to Orders
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Supplier card */}
        <div className="rounded-[1.2rem] border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Supplier</p>
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{supplierName}</p>
          {order.supplierId && (
            <Link
              to={`/app/purchases/suppliers/${order.supplierId}`}
              className="mt-1 inline-block text-xs font-semibold text-[#3B82F6] hover:underline"
            >
              View supplier profile â†’
            </Link>
          )}
        </div>

        {/* Warehouse card */}
        <div className="rounded-[1.2rem] border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Destination Warehouse</p>
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{warehouseName}</p>
          <p className="text-sm text-[var(--muted)]">
            Expected: {order.expectedDate ? format(new Date(order.expectedDate), 'PPP') : 'Flexible'}
          </p>
          {order.warehouseId && (
            <Link
              to={`/app/warehouses/${order.warehouseId}`}
              className="mt-1 inline-block text-xs font-semibold text-[#3B82F6] hover:underline"
            >
              View warehouse â†’
            </Link>
          )}
        </div>

        {/* Totals card */}
        <div className="rounded-[1.2rem] border border-[var(--line)] bg-[#F3F4F6] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1F2937]">Order Total</p>
          <p className="mt-2 text-2xl font-bold text-[#1F2937]">
            {order.currencyCode || 'INR'} {Number(order.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-3 space-y-1 text-xs text-[#1F2937]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{Number(order.subtotalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {Number(order.taxAmount) > 0 && (
              <div className="flex justify-between">
                <span>Tax</span>
                <span>+ {Number(order.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between">
                <span>Discount</span>
                <span>- {Number(order.discountAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-[1.2rem] border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Payment</p>
          <div className="mt-2 space-y-1 text-sm text-[var(--ink)]">
            <p>Type: {formatPaymentValue(order.paymentType)}</p>
            <p>Status: {formatPaymentValue(order.paymentStatus)}</p>
            <p>Mode: {formatPaymentValue(order.paymentMode)}</p>
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="rounded-[1.2rem] border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Notes</p>
          <p className="text-sm text-[var(--ink)]">{order.notes}</p>
        </div>
      )}

      <div className="rounded-[1.2rem] border border-[var(--line)] bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-[var(--line)]">
          <h3 className="font-semibold text-[var(--ink)]">Order Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[var(--panel)]">
                <th className="px-6 py-3 font-semibold text-[var(--muted)]">Item</th>
                <th className="px-6 py-3 font-semibold text-[var(--muted)]">SKU</th>
                <th className="px-6 py-3 font-semibold text-[var(--muted)]">Ordered</th>
                <th className="px-6 py-3 font-semibold text-[var(--muted)]">Received</th>
                <th className="px-6 py-3 font-semibold text-[var(--muted)]">Pending</th>
                <th className="px-6 py-3 font-semibold text-[var(--muted)] text-right">Unit Cost</th>
                <th className="px-6 py-3 font-semibold text-[var(--muted)] text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-center text-sm text-[var(--muted)]">No items on this order.</td>
                </tr>
              )}
              {order.items?.map((item) => {
                // Backend returns camelCase from getPurchaseOrderById items mapping
                const displayName = item.variantName
                  ? `${item.productName} â€” ${item.variantName}`
                  : item.productName || 'Unknown'

                return (
                  <tr key={item.id} className="border-b border-[var(--line)] last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-[var(--ink)]">{displayName}</p>
                      {item.notes && <p className="text-xs text-[var(--muted)] mt-1">{item.notes}</p>}
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--muted)] font-mono">{item.sku || '-'}</td>
                    <td className="px-6 py-4 font-semibold">{item.orderedQuantity}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-[0.5rem] text-xs font-bold ${
                        item.receivedQuantity >= item.orderedQuantity
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.receivedQuantity > 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {item.receivedQuantity ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--muted)]">{item.pendingQuantity ?? 0}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-[var(--muted)]">
                      {Number(item.unitCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums font-semibold text-[var(--ink)]">
                      {Number(item.lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
