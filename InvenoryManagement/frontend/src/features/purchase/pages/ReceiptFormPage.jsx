import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { useAuthForm } from '../../auth/hooks/useAuthForm.js'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { FormTextarea } from '../../../shared/ui/FormTextarea.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { getPurchaseOrder, createPurchaseReceipt } from '../api/purchaseApi.js'

export function ReceiptFormPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('PURCHASES', 'CREATE') || can('PURCHASES', 'UPDATE')

  const [isLoading, setIsLoading] = useState(true)
  const [order, setOrder] = useState(null)

  const form = useAuthForm({
    receiptDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: []
  })

  useEffect(() => {
    async function loadOrder() {
      try {
        setIsLoading(true)
        const response = await getPurchaseOrder(orderId)
        const loadedOrder = response.data

        if (loadedOrder.status !== 'ISSUED' && loadedOrder.status !== 'PARTIALLY_RECEIVED') {
          throw new Error('This purchase order is not in a receivable state.')
        }

        setOrder(loadedOrder)

        // Pre-fill default quantities (outstanding remainder)
        // Backend returns camelCase from getPurchaseOrderById items mapping
        const defaultItems = (loadedOrder.items || []).map(item => {
          const orderedQuantity = item.orderedQuantity || 0
          const previouslyReceived = item.receivedQuantity || 0
          const unitCost = item.unitCost?.toString() || '0'
          const productName = item.productName || 'Unknown Item'
          const variantName = item.variantName || ''

          const remainder = Math.max(0, Number(orderedQuantity || 0) - Number(previouslyReceived || 0))

          return {
            purchaseOrderItemId: item.id,
            productName,
            variantName,
            orderedQuantity,
            previouslyReceived,
            receivedQuantity: remainder.toString(),
            acceptedQuantity: remainder.toString(),
            rejectedQuantity: '0',
            lotNumber: '',
            expiryDate: '',
            containerCode: '',
            unitCost,
          }
        }).filter(item => Number(item.receivedQuantity) > 0) // Only pre-fill unfulfilled lines

        form.setValues(current => ({
          ...current,
          items: defaultItems
        }))
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

  function handleChange(event) {
    const { name, value } = event.target
    form.setValues((current) => ({ ...current, [name]: value }))
  }

  function handleItemChange(index, field, value) {
    form.setValues(current => {
      const newItems = [...current.items]
      newItems[index] = { ...newItems[index], [field]: value }
      return { ...current, items: newItems }
    })
    form.setErrors(current => ({ ...current, [`items.${index}.${field}`]: undefined, items: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    form.clearFeedback()

    if (form.values.items.length === 0) {
      form.setServerTone('error')
      form.setServerMessage('You must receive at least one item. If all are fulfilled, there is nothing to receive.')
      return
    }

    try {
      form.setIsSubmitting(true)

      const payloadItems = form.values.items
        .filter(item => Number(item.receivedQuantity) > 0)
        .map(item => ({
          purchaseOrderItemId: item.purchaseOrderItemId,
          receivedQuantity: Number(item.receivedQuantity),
          acceptedQuantity: Number(item.acceptedQuantity || item.receivedQuantity || 0),
          rejectedQuantity: Number(item.rejectedQuantity || 0),
          lotNumber: item.lotNumber ? item.lotNumber.trim() : null,
          expiryDate: item.expiryDate || null,
          containerCode: item.containerCode ? item.containerCode.trim() : null,
          unitCost: Number(item.unitCost)
        }))

      if (payloadItems.length === 0) {
        throw new Error('All lines are 0. Cannot create empty receipt.')
      }

      const invalidLine = payloadItems.find(
        (line) => Math.abs((line.acceptedQuantity + line.rejectedQuantity) - line.receivedQuantity) > 0.0001,
      )
      if (invalidLine) {
        throw new Error('Accepted + Rejected quantity must equal received quantity for each line.')
      }

      const payload = {
        receiptDate: form.values.receiptDate,
        notes: form.values.notes || null,
        items: payloadItems
      }

      const response = await createPurchaseReceipt(orderId, payload)
      navigate(`/app/purchases/receipts/${response.data?.id || ''}`, { replace: true })
    } catch (error) {
      const { fieldErrors, summary } = parseApiValidationError(error)
      form.setErrors((current) => ({ ...current, ...fieldErrors }))
      form.setServerTone('error')
      form.setServerMessage(summary ?? error.message)
    } finally {
      form.setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="p-4 text-sm text-[var(--muted)]">Loading order context...</div>

  return (
    <div className="space-y-6">
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white p-6 shadow-sm">
        <div className="mb-6 border-b border-[var(--line)] pb-6">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Receive Purchase Order</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Log an inbound receipt against PO: <strong className="text-[var(--ink)]">{order?.purchaseOrderNumber || orderId.slice(0, 8).toUpperCase()}</strong>
          </p>
          {order?.warehouseName && (
            <p className="mt-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
              Destination: {order.warehouseName}
            </p>
          )}
        </div>

        <StatusAlert tone={form.serverTone} message={form.serverMessage} />

        {order ? (
          <form onSubmit={handleSubmit} className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Receipt Date"
                type="date"
                name="receiptDate"
                value={form.values.receiptDate}
                onChange={handleChange}
                error={form.errors.receiptDate}
                required
              />
              <FormTextarea
                label="Receiving Notes"
                name="notes"
                rows={1}
                value={form.values.notes}
                onChange={handleChange}
                error={form.errors.notes}
              />
            </div>

            <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--canvas)] p-4">
              <p className="text-sm font-semibold text-[var(--ink)] mb-4">Stock Fulfillment</p>

              <div className="grid gap-4">
                {form.values.items.map((item, index) => (
                  <div key={item.purchaseOrderItemId} className="rounded-[1rem] border border-[var(--line)] bg-white p-4">
                    <div className="grid gap-3 md:grid-cols-[1.6fr_0.9fr_0.9fr_0.9fr]">
                      <div className="flex-1">
                        <p className="font-semibold text-[var(--ink)]">{item.productName} {item.variantName ? `- ${item.variantName}` : ''}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Ordered: {item.orderedQuantity} &nbsp;&middot;&nbsp;
                          Previously Received: <span className="font-semibold text-[var(--ink)]">{item.previouslyReceived}</span>
                        </p>
                      </div>
                      <div>
                        <FormField
                          label="Qty Receiving Now"
                          type="number"
                          name={`items-${index}-qty`}
                          value={item.receivedQuantity}
                          onChange={(e) => handleItemChange(index, 'receivedQuantity', e.target.value)}
                          error={form.errors[`items.${index}.receivedQuantity`]}
                          required
                        />
                      </div>
                      <div>
                        <FormField
                          label="Accepted Qty"
                          type="number"
                          name={`items-${index}-accepted`}
                          value={item.acceptedQuantity}
                          onChange={(e) => handleItemChange(index, 'acceptedQuantity', e.target.value)}
                        />
                      </div>
                      <div>
                        <FormField
                          label="Rejected Qty"
                          type="number"
                          name={`items-${index}-rejected`}
                          value={item.rejectedQuantity}
                          onChange={(e) => handleItemChange(index, 'rejectedQuantity', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                      <FormField
                        label="Lot Number"
                        name={`items-${index}-lot`}
                        value={item.lotNumber}
                        onChange={(e) => handleItemChange(index, 'lotNumber', e.target.value)}
                      />
                      <FormField
                        label="Expiry Date"
                        type="date"
                        name={`items-${index}-expiry`}
                        value={item.expiryDate}
                        onChange={(e) => handleItemChange(index, 'expiryDate', e.target.value)}
                      />
                      <FormField
                        label="Container Code"
                        name={`items-${index}-container`}
                        value={item.containerCode}
                        onChange={(e) => handleItemChange(index, 'containerCode', e.target.value)}
                      />
                      <div className="flex items-end">
                        <span className="text-xs text-[var(--muted)] tabular-nums">@ {order.currencyCode || 'INR'} {Number(item.unitCost).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {form.values.items.length === 0 && (
                  <p className="text-sm text-emerald-600 font-semibold p-4 text-center">
                    All items on this order have been fully received! No further action needed.
                  </p>
                )}
              </div>
            </div>

            {canEdit ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={form.isSubmitting || form.values.items.length === 0}
                  className="rounded-lg bg-[#22C55E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] transition shadow-sm disabled:opacity-60"
                >
                  {form.isSubmitting ? 'Processing...' : 'Create Draft Receipt'}
                </button>
                <Link
                  to={`/app/purchases/orders/${orderId}`}
                  className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
                >
                  Cancel
                </Link>
              </div>
            ) : null}
          </form>
        ) : null}
      </section>
    </div>
  )
}
