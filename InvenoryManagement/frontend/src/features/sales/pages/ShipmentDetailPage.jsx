import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { getShipment, postShipment, cancelShipment } from '../api/salesApi.js'

function statusBadge(status) {
  switch (status) {
    case 'DRAFT':     return 'bg-[#F3F4F6] text-[#374151]'
    case 'POSTED':    return 'bg-[#DCFCE7] text-[#15803D]'
    case 'CANCELLED': return 'bg-[#FEE2E2] text-[#B91C1C]'
    default:          return 'bg-[#F3F4F6] text-[#374151]'
  }
}

export function ShipmentDetailPage() {
  const { shipmentId } = useParams()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('SALES', 'CREATE') || can('SALES', 'UPDATE')

  const [shipment, setShipment] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' })
  const [isProcessing, setIsProcessing] = useState(false)

  async function load() {
    try {
      setIsLoading(true)
      const r = await getShipment(shipmentId)
      setShipment(r.data)
    } catch (e) { setFeedback({ tone: 'error', message: e.message }) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { load() }, [shipmentId]) // eslint-disable-line

  async function act(fn, msg) {
    if (!window.confirm(msg)) return
    setIsProcessing(true)
    try {
      await fn(shipmentId)
      setFeedback({ tone: 'success', message: 'Action completed.' })
      await load()
    } catch (e) { setFeedback({ tone: 'error', message: e.message }) }
    finally { setIsProcessing(false) }
  }

  if (isLoading && !shipment) return <div className="p-4 text-sm text-[#6B7280]">Loading shipment...</div>
  if (!shipment) return <div className="rounded-lg border-l-4 border-l-[#EF4444] border border-[#E5E7EB] bg-[#FFF1F2] px-4 py-3 text-sm text-[#B91C1C]">Shipment not found.</div>

  const isDraft = shipment.status === 'DRAFT'

  return (
    <div className="space-y-6">
      <StatusAlert tone={feedback.tone} message={feedback.message} />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">Shipment</p>
          <h2 className="mt-1 text-2xl font-semibold text-[#111827]">
            {shipment.shipmentNumber || shipment.id.slice(0, 8).toUpperCase()}
          </h2>
          <div className="mt-2 flex items-center gap-3">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(shipment.status)}`}>
              {shipment.status}
            </span>
            <span className="text-sm text-[#6B7280]">
              {shipment.shipmentDate ? format(new Date(shipment.shipmentDate), 'PPP') : 'â€”'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canEdit && isDraft && (
            <>
              <button onClick={() => act(postShipment, 'Post this shipment? Inventory will be decremented.')}
                disabled={isProcessing}
                className="rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16A34A] disabled:opacity-60 transition">
                Post Shipment
              </button>
              <button onClick={() => act(cancelShipment, 'Cancel this shipment?')}
                disabled={isProcessing}
                className="rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-semibold text-white hover:bg-[#DC2626] disabled:opacity-60 transition">
                Cancel
              </button>
            </>
          )}
          {canEdit && shipment.status === 'POSTED' && (
            <Link to={`/app/returns/shipments/${shipmentId}/return`}
              className="rounded-lg border-2 border-[#F59E0B] bg-white px-4 py-2 text-sm font-semibold text-[#F59E0B] hover:bg-[#FEF3C7] transition">
              Create Return
            </Link>
          )}
          <Link to={`/app/sales/orders/${shipment.salesOrderId}`}
            className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] transition">
            View Order
          </Link>
          <Link to="/app/sales/shipments"
            className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] transition">
            Back
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">Sales Order</p>
          <Link to={`/app/sales/orders/${shipment.salesOrderId}`}
            className="mt-2 block text-sm font-semibold text-[#3B82F6] hover:underline">
            {shipment.salesOrderNumber || shipment.salesOrderId?.slice(0, 8).toUpperCase()}
          </Link>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">Warehouse</p>
          <p className="mt-2 text-sm font-semibold text-[#111827]">{shipment.warehouseName || 'â€”'}</p>
        </div>
      </div>

      {shipment.notes && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF] mb-2">Notes</p>
          <p className="text-sm text-[#111827]">{shipment.notes}</p>
        </div>
      )}

      <div className="rounded-xl border border-[#E5E7EB] bg-white">
        <div className="border-b border-[#E5E7EB] px-5 py-4">
          <h3 className="text-sm font-semibold text-[#111827]">Shipped Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#F9FAFB]">
                {['Item', 'SKU', 'Bin', 'Shipped Qty'].map(h => (
                  <th key={h} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!shipment.items?.length && (
                <tr><td colSpan={4} className="px-5 py-6 text-center text-sm text-[#6B7280]">No items.</td></tr>
              )}
              {shipment.items?.map(item => {
                const name = item.variantName ? `${item.productName} â€” ${item.variantName}` : item.productName || 'Unknown'
                return (
                  <tr key={item.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                    <td className="px-5 py-3.5 font-medium text-[#111827]">{name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[#6B7280]">{item.sku || 'â€”'}</td>
                    <td className="px-5 py-3.5 text-[#6B7280]">{item.binName || 'â€”'}</td>
                    <td className="px-5 py-3.5 font-semibold text-[#111827]">{item.shippedQuantity}</td>
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
