import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, Link } from 'react-router-dom'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { createTransfer } from '../api/inventoryApi.js'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { FormSelect } from '../../../shared/ui/FormSelect.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { listInventoryMasterProducts } from '../lib/inventoryProducts.js'

export function TransferFormPage() {
  const navigate = useNavigate()
  const { warehouses } = useOutletContext()
  const { can } = usePermissions()
  const canSubmit = can('INVENTORY', 'CREATE') || can('INVENTORY', 'UPDATE')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' })
  const [productsList, setProductsList] = useState([])
  
  const [formData, setFormData] = useState({
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    notes: ''
  })

  // Dynamic Array of Items
  const [items, setItems] = useState([{ productId: '', quantity: 1 }])

  const whOptions = [
    { label: 'Select Warehouse...', value: '' },
    ...warehouses.map(w => ({ label: w.name, value: w.id }))
  ]

  const productOptions = [
    { label: 'Select Product...', value: '' },
    ...productsList.map(p => ({ label: `${p.name} (${p.sku || 'No SKU'})`, value: p.id }))
  ]

  useEffect(() => {
    async function fetchProducts() {
      try {
        setProductsList(await listInventoryMasterProducts())
      } catch (err) {
        console.error('Failed to load products for transfer drop down', err)
      }
    }
    fetchProducts()
  }, [])

  function addItem() {
    setItems([...items, { productId: '', quantity: 1 }])
  }

  function removeItem(index) {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index, key, value) {
    const newItems = [...items]
    newItems[index][key] = value
    setItems(newItems)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) {
      setFeedback({ tone: 'error', message: 'You do not have permission to create transfers.' })
      return
    }

    setFeedback({ tone: 'success', message: '' })
    
    if (formData.sourceWarehouseId === formData.destinationWarehouseId) {
      setFeedback({ tone: 'error', message: 'Source and Destination cannot be the same.' })
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        sourceWarehouseId: formData.sourceWarehouseId,
        destinationWarehouseId: formData.destinationWarehouseId,
        notes: formData.notes || null,
        items: items.map(item => ({
          productId: item.productId,
          // Force coercion to numbers
          quantity: parseFloat(item.quantity)
        }))
      }

      await createTransfer(payload)
      setFeedback({ tone: 'success', message: 'Transfer created successfully.' })
      setTimeout(() => navigate('/app/inventory/transfers'), 1000)
    } catch (error) {
      if (error.errors) {
        setFeedback({ tone: 'error', message: `Validation Error: ${JSON.stringify(error.errors)}` })
      } else {
        setFeedback({ tone: 'error', message: error.message })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <StatusAlert tone={feedback.tone} message={feedback.message} />

      <form onSubmit={handleSubmit} className="rounded-[1.5rem] border border-[var(--line)] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-10">
        <div className="mb-8 border-b border-[var(--line)] pb-5">
          <p className="text-xl font-semibold text-[var(--ink)]">Create Warehouse Transfer</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Initiate a stock movement between two separate warehouses. This starts in DRAFT status.
          </p>
          {!canSubmit ? (
            <span className="mt-3 inline-flex rounded-full bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
              Read only
            </span>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <FormSelect
            label="Source Warehouse *"
            value={formData.sourceWarehouseId}
            onChange={(e) => setFormData({...formData, sourceWarehouseId: e.target.value})}
            options={whOptions}
            required
          />
          <FormSelect
            label="Destination Warehouse *"
            value={formData.destinationWarehouseId}
            onChange={(e) => setFormData({...formData, destinationWarehouseId: e.target.value})}
            options={whOptions}
            required
          />
          <div className="md:col-span-2">
            <FormField
              label="Transfer Notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Optional instructions..."
            />
          </div>
        </div>

        <div className="border-t border-[var(--line)] pt-8 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-semibold text-[var(--ink)]">Transfer Items</h3>
            <button type="button" onClick={addItem} disabled={!canSubmit} className="text-sm text-[var(--accent)] hover:underline font-medium disabled:opacity-50">
              + Add Item Row
            </button>
          </div>
          
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-[var(--panel)] p-3 rounded-xl border border-[var(--line)]">
                <div className="flex-1">
                  <FormSelect
                    label="Product *"
                    value={item.productId}
                    onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                    options={productOptions}
                    required
                  />
                </div>
                <div className="w-32">
                  <FormField
                    label="Qty *"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    required
                  />
                </div>
                <button
                  type="button"
                  title="Remove Item"
                  onClick={() => removeItem(idx)}
                  className="mt-6 p-2 text-rose-500 hover:text-rose-700 font-bold"
                  disabled={items.length <= 1}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex items-center justify-end gap-3 border-t border-[var(--line)] pt-8">
          <Link to="/app/inventory/transfers" className="rounded-xl bg-[var(--panel)] px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--line)]">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !canSubmit}
            className="rounded-xl bg-[#22C55E] px-8 py-3 text-sm font-semibold text-white hover:bg-[#16A34A] transition transition hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Transfer Request'}
          </button>
        </div>
      </form>
    </div>
  )
}
