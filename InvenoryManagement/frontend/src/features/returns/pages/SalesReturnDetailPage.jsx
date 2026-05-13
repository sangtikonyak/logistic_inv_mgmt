import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { getSalesReturn, postSalesReturn, cancelSalesReturn } from '../api/returnsApi.js'

export function SalesReturnDetailPage() {
  const { salesReturnId } = useParams()
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
      const response = await getSalesReturn(salesReturnId)
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
  }, [salesReturnId])

  async function handlePost() {
    if (!window.confirm('Are you sure you want to Post this return? Inventory will be adjusted and the return will be finalized.')) return
    setIsProcessing(true)
    try {
      await postSalesReturn(salesReturnId)
      setPageFeedback({ tone: 'success', message: 'Sales return successfully posted to inventory.' })
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
      await cancelSalesReturn(salesReturnId)
      setPageFeedback({ tone: 'success', message: 'Sales return cancelled.' })
      await loadReturn()
    } catch (error) {
      setPageFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading && !returnData) {
    return <div className="p-4 text-sm text-[#6B7280]">Loading return details...</div>
  }

  if (!returnData) {
    return (
      <div className="rounded-lg border-l-4 border-l-[#EF4444] border border-[#E5E7EB] bg-[#FFF1F2] px-4 py-3 text-sm font-medium text-[#B91C1C]">
        Sales return not found.
      </div>
    )
  }

  const isDraft = returnData.status === 'DRAFT'
  const returnNumber = returnData.returnNumber || returnData.id.slice(0, 8).toUpperCase()
  const customerName = returnData.customerName || '-'
  const warehouseName = returnData.warehouseName || '-'

  return (
    <div className="space-y-6">
      <StatusAlert tone={pageFeedback.tone} message={pageFeedback.message} />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] mb-1">Sales Return</p>
          <h2 className="text-2xl font-bold text-[#111827]">{returnNumber}</h2>
          <p className="mt-1 text-sm font-medium text-[#6B7280]">
            Against Shipment:{' '}
            {returnData.salesShipmentId ? (
              <Link
                to={`/app/sales/shipments/${returnData.salesShipmentId}`}
                className="text-[#3B82F6] hover:underline"
              >
                {returnData.shipmentNumber || returnData.salesShipmentId.slice(0, 8).toUpperCase()}
              </Link>
            ) : (
              'N/A'
            )}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                returnData.status === 'POSTED'
                  ? 'bg-[#DCFCE7] text-[#15803D]'
                  : returnData.status === 'CANCELLED'
                    ? 'bg-[#FEE2E2] text-[#B91C1C]'
                    : 'bg-[#F3F4F6] text-[#374151]'
              }`}
            >
              {returnData.status}
            </span>
            <span className="text-sm text-[#6B7280]">
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
                className="rounded-md bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16A34A] disabled:opacity-60 transition"
              >
                {isProcessing ? 'Posting...' : 'Post to Inventory'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="rounded-md bg-[#EF4444] px-4 py-2 text-sm font-semibold text-white hover:bg-[#DC2626] disabled:opacity-60 transition"
              >
                {isProcessing ? 'Cancelling...' : 'Cancel Return'}
              </button>
            </>
          )}
          <Link
            to="/app/returns/sales"
            className="rounded-md bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] transition"
          >
            Back to Returns
          </Link>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Customer</p>
          <p className="mt-2 text-sm font-semibold text-[#111827]">{customerName}</p>
          {returnData.customerId && (
            <Link
              to={`/app/sales/customers/${returnData.customerId}`}
              className="mt-1 inline-block text-xs font-semibold text-[#3B82F6] hover:underline"
            >
              View customer â†’
            </Link>
          )}
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Warehouse</p>
          <p className="mt-2 text-sm font-semibold text-[#111827]">{warehouseName}</p>
          {returnData.warehouseId && (
            <Link
              to={`/app/warehouses/${returnData.warehouseId}`}
              className="mt-1 inline-block text-xs font-semibold text-[#3B82F6] hover:underline"
            >
              View warehouse â†’
            </Link>
          )}
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Return Date</p>
          <p className="mt-2 text-sm font-semibold text-[#111827]">
            {returnData.returnDate ? format(new Date(returnData.returnDate), 'PPP') : '-'}
          </p>
          <p className="mt-1 text-xs text-[#6B7280]">
            {returnData.items?.length ?? 0} line item{returnData.items?.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Items table */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-[#E5E7EB]">
          <h3 className="font-semibold text-[#111827]">Returned Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#F9FAFB]">
                <th className="px-6 py-3 font-semibold text-[#9CA3AF]">Item</th>
                <th className="px-6 py-3 font-semibold text-[#9CA3AF]">SKU</th>
                <th className="px-6 py-3 font-semibold text-[#9CA3AF]">Bin</th>
                <th className="px-6 py-3 font-semibold text-[#9CA3AF] text-right">Unit Price</th>
                <th className="px-6 py-3 font-semibold text-[#9CA3AF] text-right">Qty Returned</th>
                <th className="px-6 py-3 font-semibold text-[#9CA3AF] text-right">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {!returnData.items?.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-sm text-[#6B7280]">
                    No items on this return.
                  </td>
                </tr>
              )}
              {returnData.items?.map((item) => {
                const displayName = item.variantName
                  ? `${item.productName} â€” ${item.variantName}`
                  : item.productName || 'Unknown'
                const totalValue = Number(item.unitPrice || 0) * Number(item.returnedQuantity || 0)

                return (
                  <tr key={item.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                    <td className="px-6 py-4">
                      <p className="font-medium text-[#111827]">{displayName}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-[#6B7280] font-mono">{item.sku || '-'}</td>
                    <td className="px-6 py-4 text-sm text-[#6B7280]">{item.binName || 'â€”'}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-[#6B7280]">
                      {Number(item.unitPrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-[#111827]">{item.returnedQuantity ?? 0}</span>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums font-semibold text-[#111827]">
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
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Return Reason</p>
          <p className="mt-2 text-sm text-[#111827]">{returnData.reason}</p>
        </div>
      )}

      {returnData.notes && (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Notes</p>
          <p className="mt-2 text-sm text-[#111827]">{returnData.notes}</p>
        </div>
      )}
    </div>
  )
}
