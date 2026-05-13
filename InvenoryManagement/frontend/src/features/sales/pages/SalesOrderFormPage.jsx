import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { useAuthForm } from '../../auth/hooks/useAuthForm.js'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { FormSelect } from '../../../shared/ui/FormSelect.jsx'
import { FormTextarea } from '../../../shared/ui/FormTextarea.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { createSalesOrder, getSalesOrder, listCustomers, updateSalesOrder } from '../api/salesApi.js'
import { listWarehouses } from '../../warehouses/api/warehousesApi.js'
import { listProducts } from '../../products/api/productsApi.js'

function getInitial() {
  return {
    customerName: '',
    selectedCustomerId: '',
    saveAsCustomer: false,
    customerDetails: {
      email: '', phone: '', contactPerson: '', taxNumber: '',
      addressLine1: '', addressLine2: '', city: '', state: '',
      postalCode: '', country: '', notes: '',
    },
    warehouseId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedShipDate: '',
    currencyCode: 'INR',
    notes: '',
    items: [{ productPickerId: '', orderedQuantity: '', unitPrice: '', taxAmount: '0', discountAmount: '0' }],
  }
}

// â”€â”€ Customer name field with frequent-customer typeahead â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Behaviour:
//   â€¢ User can type ANY name â€” no customer record required
//   â€¢ After 3 chars, matching frequent customers appear as suggestions
//   â€¢ Selecting a suggestion links the order to that customer record
//   â€¢ onMouseDown + preventDefault prevents the input's onBlur from firing
//     before the click is registered, which would close the list prematurely
function CustomerNameInput({ customers, customerName, selectedCustomerId, onNameChange, onSelect, onUnlink, error }) {
  const [focused, setFocused] = useState(false)
  const ref = useRef(null)

  const suggestions = useMemo(() => {
    if (selectedCustomerId || customerName.trim().length < 3) return []
    const q = customerName.trim().toLowerCase()
    return customers
      .filter(c => [c.name, c.code, c.email, c.phone].filter(Boolean).some(f => f.toLowerCase().includes(q)))
      .slice(0, 8)
  }, [customers, customerName, selectedCustomerId])

  const showDropdown = focused && suggestions.length > 0
  const linked = customers.find(c => c.id === selectedCustomerId) ?? null
  const charsLeft = 3 - customerName.trim().length

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[#374151]">
        Customer Name <span className="text-[#EF4444]">*</span>
      </label>
      <div ref={ref} className="relative">
        <input
          type="text"
          value={customerName}
          onChange={e => onNameChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Enter any customer name..."
          autoComplete="off"
          className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF] ${
            error
              ? 'border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/20'
              : 'border-[#E5E7EB] focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/10'
          }`}
        />

        {showDropdown && (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
            <p className="border-b border-[#F3F4F6] px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
              Frequent customers
            </p>
            {suggestions.map(c => (
              <button
                key={c.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); onSelect(c); setFocused(false) }}
                className="flex w-full items-center justify-between gap-3 border-b border-[#F3F4F6] px-4 py-2.5 text-left text-sm last:border-0 hover:bg-[#F9FAFB]"
              >
                <div>
                  <p className="font-medium text-[#111827]">{c.name}</p>
                  {(c.phone || c.email) && <p className="text-xs text-[#9CA3AF]">{c.phone || c.email}</p>}
                </div>
                <span className="shrink-0 text-xs text-[#9CA3AF]">{c.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {linked && (
        <div className="flex items-center gap-2 rounded-lg border border-[#DCFCE7] bg-[#F0FDF4] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
          <p className="flex-1 text-xs font-medium text-[#15803D]">
            Linked: <strong>{linked.name}</strong> ({linked.code})
          </p>
          <button type="button" onClick={onUnlink} className="text-xs text-[#EF4444] hover:underline">
            Unlink
          </button>
        </div>
      )}

      {!linked && customerName.trim().length > 0 && charsLeft > 0 && (
        <p className="text-xs text-[#9CA3AF]">
          Type {charsLeft} more character{charsLeft !== 1 ? 's' : ''} to search frequent customers
        </p>
      )}

      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
    </div>
  )
}

export function SalesOrderFormPage() {
  const { orderId } = useParams()
  const isEdit = Boolean(orderId)
  const navigate = useNavigate()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('SALES', 'CREATE') || can('SALES', 'UPDATE')

  const [isLoading, setIsLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [rawProducts, setRawProducts] = useState([])
  const [pageFeedback, setPageFeedback] = useState({ tone: 'success', message: '' })
  const form = useAuthForm(getInitial())

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true)
        // limit: 100 â€” backend caps at 100, sending more causes a validation error
        const [cRes, wRes, pRes] = await Promise.all([
          listCustomers({ limit: 100, sortBy: 'name', sortDir: 'ASC' }),
          listWarehouses({ limit: 100 }),
          listProducts({ limit: 100, isSellable: true, status: 'ACTIVE', sortBy: 'name', sortDir: 'ASC' }),
        ])
        setCustomers(cRes.data?.items ?? cRes.data ?? [])
        setWarehouses(wRes.data?.items ?? wRes.data ?? [])
        setRawProducts(pRes.data?.items ?? pRes.data ?? [])

        if (isEdit) {
          const oRes = await getSalesOrder(orderId)
          const o = oRes.data
          form.setValues({
            customerName: o.customerName || '',
            selectedCustomerId: o.customerId || '',
            saveAsCustomer: false,
            customerDetails: getInitial().customerDetails,
            warehouseId: o.warehouseId || '',
            orderDate: o.orderDate ? o.orderDate.split('T')[0] : new Date().toISOString().split('T')[0],
            expectedShipDate: o.expectedShipDate ? o.expectedShipDate.split('T')[0] : '',
            currencyCode: o.currencyCode || 'INR',
            notes: o.notes || '',
            items: (o.items || []).map(item => ({
              id: item.id,
              productPickerId: item.productVariantId ? `VAR_${item.productVariantId}` : `PROD_${item.productId}`,
              orderedQuantity: item.orderedQuantity.toString(),
              unitPrice: item.unitPrice?.toString() || '0',
              taxAmount: item.taxAmount?.toString() || '0',
              discountAmount: item.discountAmount?.toString() || '0',
            })),
          })
        }
      } catch (e) {
        setPageFeedback({ tone: 'error', message: e.message })
      } finally {
        setIsLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const productOptions = useMemo(() => {
    const opts = []
    rawProducts.forEach(p => {
      if (p.productType === 'SERVICE') return
      if (p.productType === 'VARIABLE' && p.variants?.length) {
        p.variants.forEach(v => opts.push({ value: `VAR_${v.id}`, label: `${p.name} â€” ${v.name || v.sku}` }))
      } else {
        opts.push({ value: `PROD_${p.id}`, label: p.name })
      }
    })
    return opts.sort((a, b) => a.label.localeCompare(b.label))
  }, [rawProducts])

  function handleChange(e) {
    const { name, value } = e.target
    form.setValues(c => ({ ...c, [name]: value }))
    form.setErrors(c => ({ ...c, [name]: undefined }))
  }

  function handleDetailChange(field, value) {
    form.setValues(c => ({ ...c, customerDetails: { ...c.customerDetails, [field]: value } }))
  }

  function handleItemChange(idx, field, value) {
    form.setValues(c => {
      const items = [...c.items]
      items[idx] = { ...items[idx], [field]: value }
      return { ...c, items }
    })
  }

  function addItem() {
    form.setValues(c => ({
      ...c,
      items: [...c.items, { productPickerId: '', orderedQuantity: '', unitPrice: '', taxAmount: '0', discountAmount: '0' }],
    }))
  }

  function removeItem(idx) {
    form.setValues(c => ({ ...c, items: c.items.filter((_, i) => i !== idx) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    form.clearFeedback()
    try {
      form.setIsSubmitting(true)

      const payloadItems = form.values.items.map(item => {
        const pi = {
          orderedQuantity: Number(item.orderedQuantity),
          unitPrice: Number(item.unitPrice),
          taxAmount: Number(item.taxAmount || 0),
          discountAmount: Number(item.discountAmount || 0),
        }
        if (item.productPickerId.startsWith('VAR_')) pi.productVariantId = item.productPickerId.replace('VAR_', '')
        else if (item.productPickerId.startsWith('PROD_')) pi.productId = item.productPickerId.replace('PROD_', '')
        return pi
      })

      const shouldSaveDetails = form.values.saveAsCustomer && !form.values.selectedCustomerId
      const payload = {
        customerName: form.values.customerName,
        selectedCustomerId: form.values.selectedCustomerId || undefined,
        saveAsCustomer: shouldSaveDetails,
        customerDetails: shouldSaveDetails ? {
          email: form.values.customerDetails.email || null,
          phone: form.values.customerDetails.phone || null,
          contactPerson: form.values.customerDetails.contactPerson || null,
          taxNumber: form.values.customerDetails.taxNumber || null,
          addressLine1: form.values.customerDetails.addressLine1 || null,
          addressLine2: form.values.customerDetails.addressLine2 || null,
          city: form.values.customerDetails.city || null,
          state: form.values.customerDetails.state || null,
          postalCode: form.values.customerDetails.postalCode || null,
          country: form.values.customerDetails.country || null,
          notes: form.values.customerDetails.notes || null,
        } : null,
        warehouseId: form.values.warehouseId,
        orderDate: form.values.orderDate,
        expectedShipDate: form.values.expectedShipDate || null,
        currencyCode: form.values.currencyCode || null,
        notes: form.values.notes || null,
        items: payloadItems,
      }

      if (isEdit) {
        await updateSalesOrder(orderId, payload)
        navigate(`/app/sales/orders/${orderId}`, { replace: true })
      } else {
        const res = await createSalesOrder(payload)
        navigate(`/app/sales/orders/${res.data?.id || ''}`, { replace: true })
      }
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

  const showSaveDetails = form.values.saveAsCustomer && !form.values.selectedCustomerId

  return (
    <div className="space-y-6">
      <StatusAlert tone={pageFeedback.tone} message={pageFeedback.message} />

      <section className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <div className="mb-6 border-b border-[#E5E7EB] pb-5">
          <h2 className="text-lg font-semibold text-[#111827]">
            {isEdit ? 'Edit Sales Order' : 'Create Sales Order'}
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Enter any customer name. Type 3+ characters to find frequent customers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Customer + Warehouse */}
          <div className="grid gap-4 sm:grid-cols-2">
            <CustomerNameInput
              customers={customers}
              customerName={form.values.customerName}
              selectedCustomerId={form.values.selectedCustomerId}
              onNameChange={name => form.setValues(c => ({ ...c, customerName: name, selectedCustomerId: '', saveAsCustomer: false }))}
              onSelect={customer => form.setValues(c => ({ ...c, customerName: customer.name, selectedCustomerId: customer.id, saveAsCustomer: false }))}
              onUnlink={() => form.setValues(c => ({ ...c, selectedCustomerId: '', saveAsCustomer: false }))}
              error={form.errors.customerName}
            />
            <FormSelect
              label="Warehouse" name="warehouseId"
              value={form.values.warehouseId} onChange={handleChange}
              error={form.errors.warehouseId} required
              options={[{ label: 'Select Warehouse...', value: '' }, ...warehouses.map(w => ({ label: w.name, value: w.id }))]}
            />
          </div>

          {/* Save as frequent customer â€” only when no existing customer linked */}
          {!form.values.selectedCustomerId && form.values.customerName.trim().length > 0 && (
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.values.saveAsCustomer}
                  onChange={e => form.setValues(c => ({ ...c, saveAsCustomer: e.target.checked }))}
                  className="h-4 w-4 rounded border-[#D1D5DB] accent-[#22C55E]"
                />
                <div>
                  <p className="text-sm font-medium text-[#111827]">Save as frequent customer</p>
                  <p className="text-xs text-[#6B7280]">Add to your customer records for future order suggestions.</p>
                </div>
              </label>

              {showSaveDetails && (
                <div className="mt-4 border-t border-[#E5E7EB] pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">Customer details (optional)</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Phone" value={form.values.customerDetails.phone} onChange={e => handleDetailChange('phone', e.target.value)} />
                    <FormField label="Email" type="email" value={form.values.customerDetails.email} onChange={e => handleDetailChange('email', e.target.value)} />
                    <FormField label="Contact Person" value={form.values.customerDetails.contactPerson} onChange={e => handleDetailChange('contactPerson', e.target.value)} />
                    <FormField label="Tax Number" value={form.values.customerDetails.taxNumber} onChange={e => handleDetailChange('taxNumber', e.target.value)} />
                    <FormField label="Address Line 1" value={form.values.customerDetails.addressLine1} onChange={e => handleDetailChange('addressLine1', e.target.value)} />
                    <FormField label="Address Line 2" value={form.values.customerDetails.addressLine2} onChange={e => handleDetailChange('addressLine2', e.target.value)} />
                    <FormField label="City" value={form.values.customerDetails.city} onChange={e => handleDetailChange('city', e.target.value)} />
                    <FormField label="State" value={form.values.customerDetails.state} onChange={e => handleDetailChange('state', e.target.value)} />
                    <FormField label="Postal Code" value={form.values.customerDetails.postalCode} onChange={e => handleDetailChange('postalCode', e.target.value)} />
                    <FormField label="Country" value={form.values.customerDetails.country} onChange={e => handleDetailChange('country', e.target.value)} />
                    <div className="sm:col-span-2">
                      <FormTextarea label="Customer Notes" rows={2} value={form.values.customerDetails.notes} onChange={e => handleDetailChange('notes', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dates + Currency */}
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Order Date" type="date" name="orderDate"
              value={form.values.orderDate} onChange={handleChange}
              error={form.errors.orderDate} required />
            <FormField label="Expected Ship Date" type="date" name="expectedShipDate"
              value={form.values.expectedShipDate} onChange={handleChange}
              error={form.errors.expectedShipDate} />
            <FormField label="Currency" name="currencyCode"
              value={form.values.currencyCode} onChange={handleChange}
              error={form.errors.currencyCode} />
          </div>

          {/* Order Notes */}
          <FormTextarea label="Order Notes" name="notes" rows={2}
            value={form.values.notes} onChange={handleChange}
            error={form.errors.notes} />

          {/* Items */}
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#111827]">Order Items</p>
              {canEdit && (
                <button type="button" onClick={addItem} className="text-sm font-semibold text-[#22C55E] hover:underline">
                  + Add Item
                </button>
              )}
            </div>

            <StatusAlert tone="error" message={form.errors.items} />

            <div className="space-y-3">
              {form.values.items.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">Item {idx + 1}</p>
                    {canEdit && form.values.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)}
                        className="text-xs font-semibold text-[#EF4444] hover:text-[#DC2626]">
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="mb-3">
                    <FormSelect
                      label="Product"
                      value={item.productPickerId}
                      onChange={e => handleItemChange(idx, 'productPickerId', e.target.value)}
                      error={form.errors[`items.${idx}.productId`] || form.errors[`items.${idx}.productVariantId`]}
                      options={[{ label: 'Select product...', value: '' }, ...productOptions]}
                      required
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField label="Qty" type="number" min="1"
                      value={item.orderedQuantity}
                      onChange={e => handleItemChange(idx, 'orderedQuantity', e.target.value)}
                      error={form.errors[`items.${idx}.orderedQuantity`]} required />
                    <FormField label="Unit Price" type="number" min="0"
                      value={item.unitPrice}
                      onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                      error={form.errors[`items.${idx}.unitPrice`]} required />
                    <FormField label="Tax Amount" type="number" min="0"
                      value={item.taxAmount}
                      onChange={e => handleItemChange(idx, 'taxAmount', e.target.value)} />
                    <FormField label="Discount" type="number" min="0"
                      value={item.discountAmount}
                      onChange={e => handleItemChange(idx, 'discountAmount', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <StatusAlert tone={form.serverTone} message={form.serverMessage} />

          {canEdit && (
            <div className="flex flex-wrap gap-3 border-t border-[#E5E7EB] pt-5">
              <button type="submit" disabled={form.isSubmitting}
                className="rounded-lg bg-[#22C55E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] disabled:opacity-60 transition">
                {form.isSubmitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create order'}
              </button>
              <Link to="/app/sales/orders"
                className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] transition">
                Cancel
              </Link>
            </div>
          )}
        </form>
      </section>
    </div>
  )
}
