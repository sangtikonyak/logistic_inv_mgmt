import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { useAuthForm } from '../../auth/hooks/useAuthForm.js'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { FormTextarea } from '../../../shared/ui/FormTextarea.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { getShipment } from '../../sales/api/salesApi.js'
import { createSalesReturn, getSalesReturn, updateSalesReturn } from '../api/returnsApi.js'

export function SalesReturnFormPage() {
  const { shipmentId, salesReturnId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('RETURNS', 'CREATE') || can('RETURNS', 'UPDATE')

  const isEditMode = Boolean(salesReturnId)
  const [isLoading, setIsLoading] = useState(true)
  const [shipment, setShipment] = useState(null)

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
          const returnResponse = await getSalesReturn(salesReturnId)
          const returnData = returnResponse.data

          if (returnData.status !== 'DRAFT') {
            throw new Error('Only draft returns can be edited.')
          }

          form.setValues({
            returnDate: returnData.returnDate?.split('T')[0] || new Date().toISOString().split('T')[0],
            reason: returnData.reason || '',
            notes: returnData.notes || '',
            items: (returnData.items || []).map(item => ({
              salesShipmentItemId: item.salesShipmentItemId,
              productName: item.productName || 'Unknown',
              variantName: item.variantName || '',
              shippedQuantity: item.shippedQuantity || 0,
              returnedQuantity: item.returnedQuantity?.toString() || '0',
              unitPrice: item.unitPrice?.toString() || '0'
            }))
          })

          // Load shipment for context
          const shipmentResponse = await getShipment(returnData.salesShipmentId)
          setShipment(shipmentResponse.data)
        } else {
          // Load shipment for new return
          const shipmentResponse = await getShipment(shipmentId)
          const loadedShipment = shipmentResponse.data

          if (loadedShipment.status !== 'POSTED') {
            throw new Error('Can only create returns against posted shipments.')
          }

          setShipment(loadedShipment)

          // Pre-fill items from shipment
          const defaultItems = (loadedShipment.items || []).map(item => ({
            salesShipmentItemId: item.id,
            productName: item.productName || 'Unknown',
            variantName: item.variantName || '',
            shippedQuantity: item.shippedQuantity || 0,
            returnedQuantity: '0',
            unitPrice: item.unitPrice?.toString() || '0'
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
  }, [shipmentId, salesReturnId, isEditMode])

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
        salesShipmentId: shipment.id,
        returnDate: form.values.returnDate,
        reason: form.values.reason || null,
        notes: form.values.notes || null,
        items: itemsToReturn.map(item => ({
          salesShipmentItemId: item.salesShipmentItemId,
          returnedQuantity: Number(item.returnedQuantity),
          unitPrice: Number(item.unitPrice)
        }))
      }

      let response
      if (isEditMode) {
        response = await updateSalesReturn(salesReturnId, payload)
      } else {
        response = await createSalesReturn(payload)
      }

      navigate(`/app/returns/sales/${response.data?.id || salesReturnId}`, { replace: true })
    } catch (error) {
      const { fieldErrors, summary } = parseApiValidationError(error)
      form.setErrors((current) => ({ ...current, ...fieldErrors }))
      form.setServerTone('error')
      form.setServerMessage(summary ?? error.message)
    } finally {
      form.setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="p-4 text-sm text-[#6B7280]">Loading...</div>

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="mb-6 border-b border-[#E5E7EB] pb-6">
          <h2 className="text-lg font-semibold text-[#111827]">
            {isEditMode ? 'Edit Sales Return' : 'Create Sales Return'}
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Return goods against Shipment: <strong className="text-[#111827]">{shipment?.shipmentNumber || shipment?.id.slice(0, 8).toUpperCase()}</strong>
          </p>
          {shipment?.warehouseName && (
            <p className="mt-2 text-xs font-semibold text-[#3B82F6] uppercase tracking-wider">
              Warehouse: {shipment.warehouseName}
            </p>
          )}
        </div>

        <StatusAlert tone={form.serverTone} message={form.serverMessage} />

        {shipment ? (
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
                placeholder="e.g., Defective, Wrong item, Customer changed mind"
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

            <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <p className="text-sm font-semibold text-[#111827] mb-4">Items to Return</p>

              <div className="grid gap-4">
                {form.values.items.map((item, index) => (
                  <div key={item.salesShipmentItemId} className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="flex-1">
                        <p className="font-semibold text-[#111827]">
                          {item.productName} {item.variantName ? `- ${item.variantName}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-[#6B7280]">
                          Shipped: {item.shippedQuantity}
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
                          max={item.shippedQuantity}
                          required
                        />
                      </div>
                      <div className="w-40 flex items-center justify-center">
                        <span className="text-xs text-[#6B7280] tabular-nums">
                          @ {Number(item.unitPrice).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {form.values.items.length === 0 && (
                  <p className="text-sm text-[#6B7280] p-4 text-center">
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
                  className="rounded-md bg-[#22C55E] px-6 py-2 text-sm font-semibold text-white hover:bg-[#16A34A] transition shadow-sm disabled:opacity-60"
                >
                  {form.isSubmitting ? 'Processing...' : isEditMode ? 'Update Return' : 'Create Draft Return'}
                </button>
                <Link
                  to={isEditMode ? `/app/returns/sales/${salesReturnId}` : '/app/returns/sales'}
                  className="rounded-md border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151]"
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
