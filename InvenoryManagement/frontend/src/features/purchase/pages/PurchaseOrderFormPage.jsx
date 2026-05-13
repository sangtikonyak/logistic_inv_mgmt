import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { useAuthForm } from '../../auth/hooks/useAuthForm.js'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import { paymentModeOptions, paymentStatusOptions, paymentTypeOptions } from '../../../shared/lib/paymentOptions.js'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { FormSelect } from '../../../shared/ui/FormSelect.jsx'
import { FormTextarea } from '../../../shared/ui/FormTextarea.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { listSuppliers, createPurchaseOrder, getPurchaseOrder, updatePurchaseOrder } from '../api/purchaseApi.js'
import { listWarehouses } from '../../warehouses/api/warehousesApi.js'
import { listProducts } from '../../products/api/productsApi.js'

function getInitialValues() {
  return {
    supplierId: '',
    warehouseId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    currencyCode: 'INR',
    paymentType: 'NOT_APPLICABLE',
    paymentStatus: 'NOT_APPLICABLE',
    paymentMode: 'NOT_APPLICABLE',
    notes: '',
    items: [
      {
        productPickerId: '',
        orderedQuantity: '',
        unitCost: '',
        taxAmount: '0',
        discountAmount: '0',
        notes: ''
      }
    ]
  }
}

export function PurchaseOrderFormPage() {
  const { orderId } = useParams()
  const isEditMode = Boolean(orderId)
  const navigate = useNavigate()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('PURCHASES', 'CREATE') || can('PURCHASES', 'UPDATE')

  const [isLoading, setIsLoading] = useState(true)
  const form = useAuthForm(getInitialValues())
  const [pageFeedback, setPageFeedback] = useState({ tone: 'success', message: '' })

  const [suppliers, setSuppliers] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [rawProducts, setRawProducts] = useState([])

  useEffect(() => {
    async function loadResources() {
      try {
        setIsLoading(true)
        const [suppliersRes, warehousesRes, productsRes] = await Promise.all([
          listSuppliers({ limit: 100 }),
          listWarehouses({ limit: 100 }),
          listProducts({ limit: 100, isPurchasable: true })
        ])

        setSuppliers(suppliersRes.data?.items ?? suppliersRes.data ?? [])
        setWarehouses(warehousesRes.data?.items ?? warehousesRes.data ?? [])
        setRawProducts(productsRes.data?.items ?? productsRes.data ?? [])

        if (isEditMode) {
          const orderRes = await getPurchaseOrder(orderId)
          const order = orderRes.data
          form.setValues({
            supplierId: order.supplierId || '',
            warehouseId: order.warehouseId || '',
            orderDate: order.orderDate ? order.orderDate.split('T')[0] : new Date().toISOString().split('T')[0],
            expectedDate: order.expectedDate ? order.expectedDate.split('T')[0] : '',
            currencyCode: order.currencyCode || 'INR',
            paymentType: order.paymentType || 'NOT_APPLICABLE',
            paymentStatus: order.paymentStatus || 'NOT_APPLICABLE',
            paymentMode: order.paymentMode || 'NOT_APPLICABLE',
            notes: order.notes || '',
            items: (order.items || []).map(item => ({
              id: item.id,
              productPickerId: item.productVariantId ? `VAR_${item.productVariantId}` : `PROD_${item.productId}`,
              orderedQuantity: item.orderedQuantity.toString(),
              unitCost: item.unitCost?.toString() || '0',
              taxAmount: item.taxAmount?.toString() || '0',
              discountAmount: item.discountAmount?.toString() || '0',
              notes: item.notes || ''
            }))
          })
        }
      } catch (error) {
        setPageFeedback({ tone: 'error', message: error.message })
      } finally {
        setIsLoading(false)
      }
    }
    loadResources()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const productOptions = useMemo(() => {
    const options = []
    rawProducts.forEach(product => {
      if (product.productType === 'VARIABLE' && product.variants?.length) {
        product.variants.forEach(variant => {
          options.push({
            value: `VAR_${variant.id}`,
            label: `${product.name} - ${variant.name || variant.sku}`
          })
        })
      } else {
        options.push({
          value: `PROD_${product.id}`,
          label: product.name
        })
      }
    })
    return options.sort((a, b) => a.label.localeCompare(b.label))
  }, [rawProducts])

  function handleChange(event) {
    const { name, value } = event.target
    form.setValues((current) => ({ ...current, [name]: value }))
    form.setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function handleItemChange(index, field, value) {
    form.setValues(current => {
      const newItems = [...current.items]
      newItems[index] = { ...newItems[index], [field]: value }
      return { ...current, items: newItems }
    })
    form.setErrors(current => ({ ...current, [`items.${index}.${field}`]: undefined, items: undefined }))
  }

  function addItem() {
    form.setValues(current => ({
      ...current,
      items: [
        ...current.items,
        {
          productPickerId: '',
          orderedQuantity: '',
          unitCost: '',
          taxAmount: '0',
          discountAmount: '0',
          notes: ''
        }
      ]
    }))
  }

  function removeItem(index) {
    form.setValues(current => ({
      ...current,
      items: current.items.filter((_, i) => i !== index)
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    form.clearFeedback()

    try {
      form.setIsSubmitting(true)

      const payloadItems = form.values.items.map(item => {
        const payloadItem = {
          orderedQuantity: Number(item.orderedQuantity),
          unitCost: Number(item.unitCost),
          taxAmount: Number(item.taxAmount || 0),
          discountAmount: Number(item.discountAmount || 0),
          notes: item.notes || null,
        }
        if (item.productPickerId.startsWith('VAR_')) {
          payloadItem.productVariantId = item.productPickerId.replace('VAR_', '')
        } else if (item.productPickerId.startsWith('PROD_')) {
          payloadItem.productId = item.productPickerId.replace('PROD_', '')
        }
        return payloadItem
      })

      const payload = {
        supplierId: form.values.supplierId,
        warehouseId: form.values.warehouseId,
        orderDate: form.values.orderDate,
        expectedDate: form.values.expectedDate || null,
        currencyCode: form.values.currencyCode || null,
        paymentType: form.values.paymentType,
        paymentStatus: form.values.paymentStatus,
        paymentMode: form.values.paymentMode,
        notes: form.values.notes || null,
        items: payloadItems
      }

      if (isEditMode) {
        await updatePurchaseOrder(orderId, payload)
        navigate(`/app/purchases/orders/${orderId}`, { replace: true })
      } else {
        const res = await createPurchaseOrder(payload)
        navigate(`/app/purchases/orders/${res.data?.id || ''}`, { replace: true })
      }
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
      <StatusAlert tone={pageFeedback.tone} message={pageFeedback.message} />

      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">{isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order'}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Draft a new request for procurement to a supplier.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FormSelect
              label="Supplier"
              name="supplierId"
              value={form.values.supplierId}
              onChange={handleChange}
              error={form.errors.supplierId}
              options={[{ label: 'Select Supplier...', value: '' }, ...suppliers.map(s => ({ label: s.name, value: s.id }))]}
              required
            />
            <FormSelect
              label="Destination Warehouse"
              name="warehouseId"
              value={form.values.warehouseId}
              onChange={handleChange}
              error={form.errors.warehouseId}
              options={[{ label: 'Select Warehouse...', value: '' }, ...warehouses.map(w => ({ label: w.name, value: w.id }))]}
              required
            />
            <FormField label="Currency Code" name="currencyCode" value={form.values.currencyCode} onChange={handleChange} error={form.errors.currencyCode} />
            <FormField label="Order Date" type="date" name="orderDate" value={form.values.orderDate} onChange={handleChange} error={form.errors.orderDate} required />
            <FormField label="Expected Delivery Date" type="date" name="expectedDate" value={form.values.expectedDate} onChange={handleChange} error={form.errors.expectedDate} />
            <FormSelect label="Payment Type" name="paymentType" value={form.values.paymentType} onChange={handleChange} options={paymentTypeOptions} />
            <FormSelect label="Payment Status" name="paymentStatus" value={form.values.paymentStatus} onChange={handleChange} options={paymentStatusOptions} />
            <FormSelect label="Payment Mode" name="paymentMode" value={form.values.paymentMode} onChange={handleChange} options={paymentModeOptions} />
          </div>

          <FormTextarea label="Order Notes" name="notes" rows={3} value={form.values.notes} onChange={handleChange} error={form.errors.notes} />

          <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--canvas)] p-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm font-semibold text-[var(--ink)]">Purchase Items</p>
              {canEdit && (
                <button type="button" onClick={addItem} className="text-sm font-semibold text-[var(--accent)]">+ Add Item</button>
              )}
            </div>
            
            <StatusAlert tone="error" message={form.errors.items} />

            <div className="grid gap-4">
              {form.values.items.map((item, index) => (
                <div key={index} className="rounded-[1rem] border border-[var(--line)] bg-white p-4">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Item {index + 1}</p>
                    {canEdit && form.values.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)} className="text-xs font-semibold text-[#EF4444] hover:text-[#DC2626]">Remove</button>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                    <div className="lg:col-span-2">
                       <FormSelect
                        label="Product"
                        name={`items-${index}-productPickerId`}
                        value={item.productPickerId}
                        onChange={(e) => handleItemChange(index, 'productPickerId', e.target.value)}
                        error={form.errors[`items.${index}.productVariantId`] || form.errors[`items.${index}.productId`]}
                        options={[{ label: 'Select Product...', value: '' }, ...productOptions]}
                        required
                      />
                    </div>
                    <FormField
                      label="Oty"
                      type="number"
                      name={`items-${index}-qty`}
                      value={item.orderedQuantity}
                      onChange={(e) => handleItemChange(index, 'orderedQuantity', e.target.value)}
                      error={form.errors[`items.${index}.orderedQuantity`]}
                      required
                    />
                    <FormField
                      label="Unit Cost"
                      type="number"
                      name={`items-${index}-cost`}
                      value={item.unitCost}
                      onChange={(e) => handleItemChange(index, 'unitCost', e.target.value)}
                      error={form.errors[`items.${index}.unitCost`]}
                      required
                    />
                    <FormField
                      label="Tax Amount"
                      type="number"
                      name={`items-${index}-tax`}
                      value={item.taxAmount}
                      onChange={(e) => handleItemChange(index, 'taxAmount', e.target.value)}
                      error={form.errors[`items.${index}.taxAmount`]}
                    />
                    <FormField
                      label="Discount"
                      type="number"
                      name={`items-${index}-discount`}
                      value={item.discountAmount}
                      onChange={(e) => handleItemChange(index, 'discountAmount', e.target.value)}
                      error={form.errors[`items.${index}.discountAmount`]}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <StatusAlert tone={form.serverTone} message={form.serverMessage} />

          {canEdit ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={form.isSubmitting}
                className="rounded-[1rem] bg-[#22C55E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] disabled:opacity-60 transition"
              >
                {form.isSubmitting ? 'Saving...' : isEditMode ? 'Save changes' : 'Create order'}
              </button>
              <Link
                to="/app/purchases/orders"
                className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
              >
                Cancel
              </Link>
            </div>
          ) : null}
        </form>
      </section>
    </div>
  )
}
