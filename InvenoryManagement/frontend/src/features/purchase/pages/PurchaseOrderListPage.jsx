import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { formatPaymentValue } from '../../../shared/lib/paymentOptions.js'
import { listPurchaseOrders } from '../api/purchaseApi.js'

export function PurchaseOrderListPage() {
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('PURCHASES', 'CREATE') || can('PURCHASES', 'UPDATE')
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchOrders() {
      try {
        setIsLoading(true)
        const response = await listPurchaseOrders()
        setOrders(response.data?.items ?? response.data ?? [])
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchOrders()
  }, [])

  function getStatusStyle(status) {
    switch (status) {
      case 'DRAFT':        return 'bg-slate-100 text-slate-700'
      case 'ISSUED':       return 'bg-blue-50 text-blue-700'
      case 'PARTIALLY_RECEIVED': return 'bg-amber-50 text-amber-700'
      case 'RECEIVED':     return 'bg-emerald-50 text-emerald-700'
      case 'CANCELLED':    return 'bg-rose-50 text-rose-700'
      default:             return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink)]">Purchase Orders</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Track vendor purchasing activity and inbound expectations.</p>
        </div>
        {canEdit && (
          <Link
            to="/app/purchases/orders/new"
            className="inline-flex items-center justify-center rounded-[1rem] bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] transition"
          >
            Create Order
          </Link>
        )}
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
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Order #</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Supplier</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Warehouse</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Status</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Payment</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Order Date</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Expected</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)] text-right">Total</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-[var(--muted)]">Loading purchase orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-[var(--muted)]">No purchase orders found.</td>
                </tr>
              ) : (
                orders.map((order) => {
                  // Backend returns camelCase from toPurchaseOrderSummary()
                  const supplierName = order.supplierName || 'Unknown supplier'
                  const warehouseName = order.warehouseName || 'Unknown warehouse'
                  const orderNumber = order.purchaseOrderNumber || order.id.slice(0, 8).toUpperCase()
                  const canReceive = order.status === 'ISSUED' || order.status === 'PARTIALLY_RECEIVED'
                  const isDraft = order.status === 'DRAFT'

                  return (
                    <tr key={order.id} className="border-b border-[var(--line)] last:border-b-0 hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-medium text-[var(--ink)]">
                        <Link to={`/app/purchases/orders/${order.id}`} className="hover:text-[var(--accent)] transition">
                          {orderNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-[var(--ink)]">{supplierName}</td>
                      <td className="px-6 py-4 text-[var(--muted)]">{warehouseName}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(order.status)}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--muted)]">{formatPaymentValue(order.paymentStatus)}</td>
                      <td className="px-6 py-4 text-[var(--muted)]">
                        {order.orderDate ? format(new Date(order.orderDate), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4 text-[var(--muted)]">
                        {order.expectedDate ? format(new Date(order.expectedDate), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4 font-semibold text-[var(--ink)] text-right">
                        {order.totalAmount != null
                          ? `${order.currencyCode || 'INR'} ${Number(order.totalAmount).toLocaleString()}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/app/purchases/orders/${order.id}`}
                            className="rounded-[0.6rem] border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--panel)] transition"
                          >
                            View
                          </Link>
                          {canEdit && isDraft && (
                            <Link
                              to={`/app/purchases/orders/${order.id}/edit`}
                              className="rounded-[0.6rem] border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--panel)] transition"
                            >
                              Edit
                            </Link>
                          )}
                          {canEdit && canReceive && (
                            <Link
                              to={`/app/purchases/orders/${order.id}/receive`}
                              className="rounded-[0.6rem] bg-[#22C55E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#16A34A] transition"
                            >
                              Receive
                            </Link>
                          )}
                        </div>
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
