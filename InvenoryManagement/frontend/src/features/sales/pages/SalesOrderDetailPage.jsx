import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { formatPaymentValue } from '../../../shared/lib/paymentOptions.js'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { getSalesOrder, confirmSalesOrder, cancelSalesOrder } from '../api/salesApi.js'

function statusBadge(status) {
  switch (status) {
    case 'DRAFT':              return 'bg-[#F3F4F6] text-[#374151]'
    case 'CONFIRMED':          return 'bg-[#EFF6FF] text-[#1D4ED8]'
    case 'PARTIALLY_RESERVED': return 'bg-[#FEF9C3] text-[#A16207]'
    case 'RESERVED':           return 'bg-[#FEF3C7] text-[#92400E]'
    case 'PARTIALLY_SHIPPED':  return 'bg-[#FEF9C3] text-[#A16207]'
    case 'SHIPPED':            return 'bg-[#DCFCE7] text-[#15803D]'
    case 'CANCELLED':          return 'bg-[#FEE2E2] text-[#B91C1C]'
    default:                   return 'bg-[#F3F4F6] text-[#374151]'
  }
}

export function SalesOrderDetailPage() {
  const { orderId } = useParams()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('SALES', 'CREATE') || can('SALES', 'UPDATE')

  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' })
  const [isProcessing, setIsProcessing] = useState(false)

  async function loadOrder() {
    try {
      setIsLoading(true)
      const r = await getSalesOrder(orderId)
      setOrder(r.data)
    } catch (e) {
      setFeedback({ tone: 'error', message: e.message })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadOrder() }, [orderId]) // eslint-disable-line

  async function handleConfirm() {
    if (!window.confirm('Confirm this sales order? Items will be locked.')) return
    setIsProcessing(true)
    try {
      await confirmSalesOrder(orderId)
      setFeedback({ tone: 'success', message: 'Order confirmed.' })
      await loadOrder()
    } catch (e) { setFeedback({ tone: 'error', message: e.message }) }
    finally { setIsProcessing(false) }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel this sales order? This cannot be undone.')) return
    setIsProcessing(true)
    try {
      await cancelSalesOrder(orderId)
      setFeedback({ tone: 'success', message: 'Order cancelled.' })
      await loadOrder()
    } catch (e) { setFeedback({ tone: 'error', message: e.message }) }
    finally { setIsProcessing(false) }
  }

  if (isLoading && !order) return <div className="p-4 text-sm text-[#6B7280]">Loading order...</div>
  if (!order) return <div className="rounded-lg border-l-4 border-l-[#EF4444] border border-[#E5E7EB] bg-[#FFF1F2] px-4 py-3 text-sm text-[#B91C1C]">Order not found.</div>

  const isDraft = order.status === 'DRAFT'
  const isCancellable = ['DRAFT', 'CONFIRMED'].includes(order.status)
  const canReserve = ['CONFIRMED', 'PARTIALLY_RESERVED', 'RESERVED', 'PARTIALLY_SHIPPED'].includes(order.status)
  const canShip = canReserve

  return (
    <div className="space-y-6">
      <StatusAlert tone={feedback.tone} message={feedback.message} />

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">Sales Order</p>
          <h2 className="mt-1 text-2xl font-semibold text-[#111827]">
            {order.salesOrderNumber || order.id.slice(0, 8).toUpperCase()}
          </h2>
          <div className="mt-2 flex items-center gap-3">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(order.status)}`}>
              {order.status.replace(/_/g, ' ')}
            </span>
            <span className="text-sm text-[#6B7280]">
              {order.orderDate ? format(new Date(order.orderDate), 'PPP') : 'â€”'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canEdit && isDraft && (
            <>
              <button onClick={handleConfirm} disabled={isProcessing}
                className="rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16A34A] disabled:opacity-60 transition">
                Confirm Order
              </button>
              <Link to={`/app/sales/orders/${order.id}/edit`}
                className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] transition">
                Edit
              </Link>
            </>
          )}
          {canEdit && canReserve && (
            <Link to={`/app/sales/orders/${order.id}/reserve`}
              className="rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16A34A] transition">
              Reserve Stock
            </Link>
          )}
          {canEdit && canShip && (
            <Link to={`/app/sales/orders/${order.id}/ship`}
              className="rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16A34A] transition">
              Create Shipment
            </Link>
          )}
          {canEdit && isCancellable && (
            <button onClick={handleCancel} disabled={isProcessing}
              className="rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-semibold text-white hover:bg-[#DC2626] disabled:opacity-60 transition">
              Cancel Order
            </button>
          )}
          <Link to="/app/sales/orders"
            className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] transition">
            Back
          </Link>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">Customer</p>
          <p className="mt-2 text-sm font-semibold text-[#111827]">{order.customerName || 'â€”'}</p>
          {order.customerId && (
            <Link to={`/app/sales/customers/${order.customerId}`}
              className="mt-1 inline-block text-xs text-[#3B82F6] hover:underline">
              View customer â†’
            </Link>
          )}
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">Warehouse</p>
          <p className="mt-2 text-sm font-semibold text-[#111827]">{order.warehouseName || 'â€”'}</p>
          <p className="mt-1 text-sm text-[#6B7280]">
            Ship by: {order.expectedShipDate ? format(new Date(order.expectedShipDate), 'PPP') : 'Flexible'}
          </p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">Order Total</p>
          <p className="mt-2 text-2xl font-bold text-[#111827]">
            {order.currencyCode || 'INR'} {Number(order.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-2 space-y-1 text-xs text-[#6B7280]">
            <div className="flex justify-between"><span>Subtotal</span><span>{Number(order.subtotalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            {Number(order.taxAmount) > 0 && <div className="flex justify-between"><span>Tax</span><span>+ {Number(order.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
            {Number(order.discountAmount) > 0 && <div className="flex justify-between"><span>Discount</span><span>- {Number(order.discountAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
          </div>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">Payment</p>
          <div className="mt-2 space-y-1 text-sm text-[#111827]">
            <p>Type: {formatPaymentValue(order.paymentType)}</p>
            <p>Status: {formatPaymentValue(order.paymentStatus)}</p>
            <p>Mode: {formatPaymentValue(order.paymentMode)}</p>
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF] mb-2">Notes</p>
          <p className="text-sm text-[#111827]">{order.notes}</p>
        </div>
      )}

      {/* Items table */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white">
        <div className="border-b border-[#E5E7EB] px-5 py-4">
          <h3 className="text-sm font-semibold text-[#111827]">Order Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#F9FAFB]">
                {['Item', 'SKU', 'Ordered', 'Reserved', 'Shipped', 'Unit Price', 'Line Total'].map(h => (
                  <th key={h} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!order.items?.length && (
                <tr><td colSpan={7} className="px-5 py-6 text-center text-sm text-[#6B7280]">No items.</td></tr>
              )}
              {order.items?.map(item => {
                const name = item.variantName ? `${item.productName} â€” ${item.variantName}` : item.productName || 'Unknown'
                return (
                  <tr key={item.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                    <td className="px-5 py-3.5 font-medium text-[#111827]">{name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[#6B7280]">{item.sku || 'â€”'}</td>
                    <td className="px-5 py-3.5 font-semibold">{item.orderedQuantity}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-bold ${item.reservedQuantity >= item.orderedQuantity ? 'bg-[#DCFCE7] text-[#15803D]' : item.reservedQuantity > 0 ? 'bg-[#FEF9C3] text-[#A16207]' : 'bg-[#F3F4F6] text-[#374151]'}`}>
                        {item.reservedQuantity ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-bold ${item.shippedQuantity >= item.orderedQuantity ? 'bg-[#DCFCE7] text-[#15803D]' : item.shippedQuantity > 0 ? 'bg-[#FEF9C3] text-[#A16207]' : 'bg-[#F3F4F6] text-[#374151]'}`}>
                        {item.shippedQuantity ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-[#6B7280]">
                      {Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-[#111827]">
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
