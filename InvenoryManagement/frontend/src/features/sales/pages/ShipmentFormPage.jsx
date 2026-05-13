import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { useAuthForm } from '../../auth/hooks/useAuthForm.js'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { FormTextarea } from '../../../shared/ui/FormTextarea.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { getSalesOrder, createShipment } from '../api/salesApi.js'

export function ShipmentFormPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('SALES', 'CREATE') || can('SALES', 'UPDATE')

  const [isLoading, setIsLoading] = useState(true)
  const [order, setOrder] = useState(null)

  const form = useAuthForm({
    shipmentDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [],
  })

  useEffect(() => {
    async function loadOrder() {
      try {
        setIsLoading(true)
        const res = await getSalesOrder(orderId)
        const loaded = res.data

        const validStatuses = ['CONFIRMED', 'PARTIALLY_RESERVED', 'RESERVED', 'PARTIALLY_SHIPPED']
        if (!validStatuses.includes(loaded.status)) {
          throw new Error(`This order (${loaded.status.replace(/_/g, ' ')}) cannot have a shipment created. Confirm the order first.`)
        }

        setOrder(loaded)

        // Pre-fill items with pending shipment quantities
        const defaultItems = (loaded.items || [])
          .map(item => {
            const pending = Math.max(0, item.orderedQuantity - item.shippedQuantity)
            return {
              salesOrderItemId: item.id,
              productName: item.productName || 'Unknown',
              variantName: item.variantName || '',
              sku: item.sku || '',
              orderedQuantity: item.orderedQuantity,
              alreadyShipped: item.shippedQuantity,
              pendingQuantity: pending,
              shippedQuantity: pending.toString(),
            }
          })
          .filter(item => item.pendingQuantity > 0)

        form.setValues(c => ({ ...c, items: defaultItems }))
      } catch (error) {
        form.setServerTone('error')
        form.setServerMessage(error.message)
      } finally {
        setIsLoading(false)
      }
    }
    loadOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  function handleChange(e) {
    const { name, value } = e.target
    form.setValues(c => ({ ...c, [name]: value }))
  }

  function handleItemChange(idx, value) {
    form.setValues(c => {
      const items = [...c.items]
      items[idx] = { ...items[idx], shippedQuantity: value }
      return { ...c, items }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    form.clearFeedback()

    const payloadItems = form.values.items.filter(i => Number(i.shippedQuantity) > 0)
    if (payloadItems.length === 0) {
      form.setServerTone('error')
      form.setServerMessage('Enter a quantity greater than 0 for at least one item.')
      return
    }

    try {
      form.setIsSubmitting(true)
      const payload = {
        shipmentDate: form.values.shipmentDate,
        notes: form.values.notes || null,
        items: payloadItems.map(i => ({
          salesOrderItemId: i.salesOrderItemId,
          shippedQuantity: Number(i.shippedQuantity),
        })),
      }
      const res = await createShipment(orderId, payload)
      navigate(`/app/sales/shipments/${res.data?.id || ''}`, { replace: true })
    } catch (error) {
      const { fieldErrors, summary } = parseApiValidationError(error)
      form.setErrors(c => ({ ...c, ...fieldErrors }))
      form.setServerTone('error')
      form.setServerMessage(summary ?? error.message)
    } finally {
      form.setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="p-4 text-sm text-[#6B7280]">Loading order context...</div>

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <div className="mb-6 border-b border-[#E5E7EB] pb-5">
          <h2 className="text-lg font-semibold text-[#111827]">Create Shipment</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Log an outbound shipment against order:{' '}
            <span className="font-semibold text-[#111827]">
              {order?.salesOrderNumber || orderId.slice(0, 8).toUpperCase()}
            </span>
          </p>
          {order?.warehouseName && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#22C55E]">
              From: {order.warehouseName}
            </p>
          )}
          {order?.customerName && (
            <p className="mt-0.5 text-xs text-[#6B7280]">
              Customer: {order.customerName}
            </p>
          )}
        </div>

        <StatusAlert tone={form.serverTone} message={form.serverMessage} />

        {order && (
          <form onSubmit={handleSubmit} className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Shipment Date" type="date" name="shipmentDate"
                value={form.values.shipmentDate} onChange={handleChange}
                error={form.errors.shipmentDate} required
              />
              <FormTextarea
                label="Notes" name="notes" rows={1}
                value={form.values.notes} onChange={handleChange}
              />
            </div>

            <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <p className="mb-4 text-sm font-semibold text-[#111827]">Items to Ship</p>

              {form.values.items.length === 0 ? (
                <p className="py-4 text-center text-sm font-semibold text-[#22C55E]">
                  All items on this order have already been fully shipped.
                </p>
              ) : (
                <div className="grid gap-3">
                  {form.values.items.map((item, idx) => (
                    <div key={item.salesOrderItemId} className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="flex-1">
                          <p className="font-semibold text-[#111827]">
                            {item.productName}{item.variantName ? ` â€” ${item.variantName}` : ''}
                          </p>
                          <p className="mt-1 text-xs text-[#6B7280]">
                            SKU: {item.sku || 'â€”'} &nbsp;Â·&nbsp;
                            Ordered: <span className="font-semibold text-[#111827]">{item.orderedQuantity}</span> &nbsp;Â·&nbsp;
                            Already shipped: <span className="font-semibold text-[#111827]">{item.alreadyShipped}</span> &nbsp;Â·&nbsp;
                            Pending: <span className="font-semibold text-[#F59E0B]">{item.pendingQuantity}</span>
                          </p>
                        </div>
                        <div className="w-44">
                          <FormField
                            label="Qty to Ship"
                            type="number"
                            value={item.shippedQuantity}
                            onChange={e => handleItemChange(idx, e.target.value)}
                            error={form.errors[`items.${idx}.shippedQuantity`]}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {canEdit && (
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={form.isSubmitting || form.values.items.length === 0}
                  className="rounded-lg bg-[#22C55E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] disabled:opacity-60 transition"
                >
                  {form.isSubmitting ? 'Creating...' : 'Create Shipment'}
                </button>
                <Link
                  to={`/app/sales/orders/${orderId}`}
                  className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] transition"
                >
                  Cancel
                </Link>
              </div>
            )}
          </form>
        )}
      </section>
    </div>
  )
}
