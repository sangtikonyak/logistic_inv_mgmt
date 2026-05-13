import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { useAuthForm } from '../../auth/hooks/useAuthForm.js'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { FormTextarea } from '../../../shared/ui/FormTextarea.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { getPurchaseReceipt } from '../../purchase/api/purchaseApi.js'
import { createPurchaseReturn, getPurchaseReturn, updatePurchaseReturn } from '../api/returnsApi.js'

export function PurchaseReturnFormPage() {
  const { receiptId, purchaseReturnId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('RETURNS', 'CREATE') || can('RETURNS', 'UPDATE')

  const isEditMode = Boolean(purchaseReturnId)
  const [isLoading, setIsLoading] = useState(true)
  const [receipt, setReceipt] = useState(null)

  const form = useAuthForm({
    returnDate: new Date().toISOString().split('T')[0],
    reason: '',
    notes: '',
    items: []
  })

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)

        if (isEditMode) {
          // Load existing return for editing
          const returnResponse = await getPurchaseReturn(purchaseReturnId)
          const returnData = returnResponse.data

          if (returnData.status !== 'DRAFT') {
            throw new Error('Only draft returns can be edited.')
          }

          form.setValues({
            returnDate: returnData.returnDate?.split('T')[0] || new Date().toISOString().split('T')[0],
            reason: returnData.reason || '',
            notes: returnData.notes || '',
            items: (returnData.items || []).map(item => ({
              purchaseReceiptItemId: item.purchaseReceiptItemId,
              productName: item.productName || 'Unknown',
              variantName: item.variantName || '',
              receivedQuantity: item.receivedQuantity || 0,
              returnedQuantity: item.returnedQuantity?.toString() || '0',
              unitCost: item.unitCost?.toString() || '0'
            }))
          })

          // Load receipt for context
          const receiptResponse = await getPurchaseReceipt(returnData.purchaseReceiptId)
          setReceipt(receiptResponse.data)
        } else {
          // Load receipt for new return
          const receiptResponse = await getPurchaseReceipt(receiptId)
          const loadedReceipt = receiptResponse.data

          if (loadedReceipt.status !== 'POSTED') {
            throw new Error('Can only create returns against posted receipts.')
          }

          setReceipt(loadedReceipt)

          // Pre-fill items from receipt
          const defaultItems = (loadedReceipt.items || []).map(item => ({
            purchaseReceiptItemId: item.id,
            productName: item.productName || 'Unknown',
            variantName: item.variantName || '',
            receivedQuantity: item.receivedQuantity || 0,
            returnedQuantity: '0',
            unitCost: item.unitCost?.toString() || '0'
          }))

          form.setValues(current => ({
            ...current,
            items: defaultItems
          }))
        }
      } catch (error) {
        form.setServerTone('error')
        form.setServerMessage(error.message)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptId, purchaseReturnId, isEditMode])

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

    const itemsToReturn = form.values.items.filter(item => Number(item.returnedQuantity) > 0)

    if (itemsToReturn.length === 0) {
      form.setServerTone('error')
      form.setServerMessage('You must return at least one item with quantity greater than 0.')
      return
    }

    try {
      form.setIsSubmitting(true)

      const payload = {
        purchaseReceiptId: receipt.id,
        returnDate: form.values.returnDate,
        reason: form.values.reason || null,
        notes: form.values.notes || null,
        items: itemsToReturn.map(item => ({
          purchaseReceiptItemId: item.purchaseReceiptItemId,
          returnedQuantity: Number(item.returnedQuantity),
          unitCost: Number(item.unitCost)
        }))
      }

      let response
      if (isEditMode) {
        response = await updatePurchaseReturn(purchaseReturnId, payload)
      } else {
        response = await createPurchaseReturn(payload)
      }

      navigate(`/app/returns/purchase/${response.data?.id || purchaseReturnId}`, { replace: true })
    } catch (error) {
      const { fieldErrors, summary } = parseApiValidationError(error)
      form.setErrors((current) => ({ ...current, ...fieldErrors }))
      form.setServerTone('error')
      form.setServerMessage(summary ?? error.message)
    } finally {
      form.setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="p-4 text-sm text-[var(--muted)]">Loading...</div>

  return (
    <div className="space-y-6">
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white p-6 shadow-sm">
        <div className="mb-6 border-b border-[var(--line)] pb-6">
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            {isEditMode ? 'Edit Purchase Return' : 'Create Purchase Return'}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Return goods against Receipt: <strong className="text-[var(--ink)]">{receipt?.receiptNumber || receipt?.id.slice(0, 8).toUpperCase()}</strong>
          </p>
          {receipt?.warehouseName && (
            <p className="mt-2 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
              Warehouse: {receipt.warehouseName}
            </p>
          )}
        </div>

        <StatusAlert tone={form.serverTone} message={form.serverMessage} />

        {receipt ? (
          <form onSubmit={handleSubmit} className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Return Date"
                type="date"
                name="returnDate"
                value={form.values.returnDate}
                onChange={handleChange}
                error={form.errors.returnDate}
                required
              />
              <FormField
                label="Return Reason"
                type="text"
                name="reason"
                value={form.values.reason}
                onChange={handleChange}
                error={form.errors.reason}
                placeholder="e.g., Damaged, Wrong item, Quality issue"
              />
            </div>

            <FormTextarea
              label="Additional Notes"
              name="notes"
              rows={2}
              value={form.values.notes}
              onChange={handleChange}
              error={form.errors.notes}
            />

            <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--canvas)] p-4">
              <p className="text-sm font-semibold text-[var(--ink)] mb-4">Items to Return</p>

              <div className="grid gap-4">
                {form.values.items.map((item, index) => (
                  <div key={item.purchaseReceiptItemId} className="rounded-[1rem] border border-[var(--line)] bg-white p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="flex-1">
                        <p className="font-semibold text-[var(--ink)]">
                          {item.productName} {item.variantName ? `- ${item.variantName}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Received: {item.receivedQuantity}
                        </p>
                      </div>
                      <div className="w-40">
                        <FormField
                          label="Qty Returning"
                          type="number"
                          name={`items-${index}-qty`}
                          value={item.returnedQuantity}
                          onChange={(e) => handleItemChange(index, 'returnedQuantity', e.target.value)}
                          error={form.errors[`items.${index}.returnedQuantity`]}
                          min="0"
                          max={item.receivedQuantity}
                          required
                        />
                      </div>
                      <div className="w-40 flex items-center justify-center">
                        <span className="text-xs text-[var(--muted)] tabular-nums">
                          @ {Number(item.unitCost).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {form.values.items.length === 0 && (
                  <p className="text-sm text-[var(--muted)] p-4 text-center">
                    No items available to return.
                  </p>
                )}
              </div>
            </div>

            {canEdit ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={form.isSubmitting}
                  className="rounded-lg bg-[#22C55E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] transition shadow-sm disabled:opacity-60"
                >
                  {form.isSubmitting ? 'Processing...' : isEditMode ? 'Update Return' : 'Create Draft Return'}
                </button>
                <Link
                  to={isEditMode ? `/app/returns/purchase/${purchaseReturnId}` : '/app/returns/purchase'}
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
