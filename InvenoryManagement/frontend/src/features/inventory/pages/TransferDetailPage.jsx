import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTransfer, completeTransfer, cancelTransfer } from '../api/inventoryApi.js'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'

const StatusBadge = ({ status }) => {
  const styles = {
    DRAFT: 'bg-gray-100 text-gray-800',
    IN_TRANSIT: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-rose-100 text-rose-800'
  }
  return (
    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${styles[status] || styles.DRAFT}`}>
      {status}
    </span>
  )
}

export function TransferDetailPage() {
  const { transferId } = useParams()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canManage = can('INVENTORY', 'CREATE') || can('INVENTORY', 'UPDATE')

  const [transfer, setTransfer] = useState(null)
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  async function loadTransfer() {
    try {
      setIsLoading(true)
      const res = await getTransfer(transferId)
      setTransfer(res.data)
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTransfer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferId])

  async function handleCompleteAction() {
    if (!window.confirm('Are you sure you want to complete this transfer? Stock will be received at the destination.')) return
    try {
      setIsProcessing(true)
      await completeTransfer(transferId)
      setFeedback({ tone: 'success', message: 'Transfer completed successfully!' })
      loadTransfer()
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleCancelAction() {
    if (!window.confirm('Are you sure you want to cancel this transfer?')) return
    try {
      setIsProcessing(true)
      await cancelTransfer(transferId)
      setFeedback({ tone: 'success', message: 'Transfer cancelled.' })
      loadTransfer()
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) return <div className="p-8 text-center text-sm text-[var(--muted)]">Loading transfer details...</div>
  if (!transfer) return <div className="p-8 text-center text-sm text-rose-600">Transfer request not found.</div>

  return (
    <div className="space-y-6">
      <StatusAlert tone={feedback.tone} message={feedback.message} />

      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-10">
        <Link to="/app/inventory/transfers" className="text-[var(--accent)] hover:underline text-sm font-semibold inline-block mb-4">
          &larr; Back to Transfers
        </Link>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-[var(--line)] pb-6 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--ink)]">Transfer #{transfer.id.slice(0,8)}</h2>
            <p className="text-sm text-[var(--muted)] mt-1">Inter-warehouse stock movement order</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <StatusBadge status={transfer.status} />
            {canManage && (transfer.status === 'DRAFT' || transfer.status === 'IN_TRANSIT') && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCancelAction}
                  disabled={isProcessing}
                  className="rounded-lg bg-[#EF4444] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#DC2626] disabled:opacity-50 transition"
                >
                  Cancel Transfer
                </button>
                <button
                  onClick={handleCompleteAction}
                  disabled={isProcessing}
                  className="rounded-lg bg-[#22C55E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#16A34A] transition shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  Mark as Complete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div className="rounded-xl border border-[var(--line)] p-5 bg-slate-50">
            <p className="text-xs font-semibold uppercase text-[var(--muted)] mb-2">Origin</p>
            <p className="font-semibold text-[var(--ink)]">{transfer.sourceWarehouseName || transfer.sourceWarehouseId}</p>
          </div>
          <div className="rounded-xl border border-[var(--line)] p-5 bg-slate-50">
            <p className="text-xs font-semibold uppercase text-[var(--muted)] mb-2">Destination</p>
            <p className="font-semibold text-[var(--ink)]">{transfer.destinationWarehouseName || transfer.destinationWarehouseId}</p>
          </div>
        </div>

        {transfer.notes && (
          <div className="mb-8">
            <p className="text-sm font-semibold text-[var(--ink)] mb-2">Notes</p>
            <p className="text-sm text-[var(--muted)]">{transfer.notes}</p>
          </div>
        )}

        <div>
           <p className="text-sm font-semibold text-[var(--ink)] mb-4">Transfer Items</p>
           <div className="rounded-xl border border-[var(--line)] overflow-hidden">
             <table className="w-full border-collapse text-left">
               <thead className="bg-[var(--panel)] border-b border-[var(--line)]">
                 <tr>
                   <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-soft)]">Product</th>
                   <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-soft)] text-right">Quantity</th>
                 </tr>
               </thead>
               <tbody>
                 {(transfer.items || []).map((item, idx) => (
                   <tr key={idx} className="border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--panel)]">
                     <td className="px-4 py-3 text-sm text-[var(--ink)]">
                       {item.variantName ?? item.productName ?? item.productId ?? 'Unknown Item'}
                     </td>
                     <td className="px-4 py-3 text-sm font-medium text-right text-[var(--ink)]">
                       {item.quantity}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

      </section>
    </div>
  )
}
