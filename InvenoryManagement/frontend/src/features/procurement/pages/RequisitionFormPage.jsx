import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listWarehouses } from '../../warehouses/api/warehousesApi.js'
import { listProducts } from '../../products/api/productsApi.js'
import { createRequisition } from '../api/procurementApi.js'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { FormTextarea } from '../../../shared/ui/FormTextarea.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'

function emptyItem() {
  return {
    productId: '',
    requestedQuantity: '1',
    estimatedUnitCost: '0',
    notes: '',
  }
}

export function RequisitionFormPage() {
  const navigate = useNavigate()
  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [isLoadingMeta, setIsLoadingMeta] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverMessage, setServerMessage] = useState('')
  const [serverTone, setServerTone] = useState('neutral')
  const [values, setValues] = useState({
    warehouseId: '',
    requiredByDate: '',
    notes: '',
    items: [emptyItem()],
  })

  useEffect(() => {
    async function loadMeta() {
      try {
        setIsLoadingMeta(true)
        const [warehouseResp, productResp] = await Promise.all([
          listWarehouses({ page: 1, limit: 100 }),
          listProducts({ page: 1, limit: 100 }),
        ])
        const wh = warehouseResp.data?.items ?? []
        const pr = productResp.data?.items ?? []
        setWarehouses(wh)
        setProducts(pr.filter((p) => p.isPurchasable))
        if (wh.length > 0) {
          setValues((current) => ({ ...current, warehouseId: current.warehouseId || wh[0].id }))
        }
      } catch (error) {
        setServerTone('error')
        setServerMessage(error.message)
      } finally {
        setIsLoadingMeta(false)
      }
    }
    loadMeta()
  }, [])

  function onItemChange(index, key, value) {
    setValues((current) => {
      const items = [...current.items]
      items[index] = { ...items[index], [key]: value }
      return { ...current, items }
    })
  }

  async function onSubmit(event) {
    event.preventDefault()
    setServerMessage('')
    setServerTone('neutral')

    if (!values.warehouseId) {
      setServerTone('error')
      setServerMessage('Warehouse is required.')
      return
    }

    const payloadItems = values.items
      .filter((item) => item.productId)
      .map((item) => ({
        productId: item.productId,
        requestedQuantity: Number(item.requestedQuantity),
        estimatedUnitCost: Number(item.estimatedUnitCost),
        notes: item.notes || null,
      }))

    if (payloadItems.length === 0) {
      setServerTone('error')
      setServerMessage('Add at least one requisition line.')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await createRequisition({
        warehouseId: values.warehouseId,
        requiredByDate: values.requiredByDate || null,
        notes: values.notes || null,
        items: payloadItems,
      })
      navigate(`/app/purchases/requisitions/${response.data.id}`, { replace: true })
    } catch (error) {
      setServerTone('error')
      setServerMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingMeta) {
    return <div className="p-4 text-sm text-[var(--muted)]">Loading requisition setup...</div>
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Create Requisition</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Capture internal demand before PO issuance.</p>

        <StatusAlert tone={serverTone} message={serverMessage} />

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <FormField label="Required By Date" type="date" name="requiredByDate" value={values.requiredByDate} onChange={(e) => setValues((c) => ({ ...c, requiredByDate: e.target.value }))} />
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--ink)]">Warehouse</span>
            <select
              value={values.warehouseId}
              onChange={(e) => setValues((c) => ({ ...c, warehouseId: e.target.value }))}
              className="rounded-[0.9rem] border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none"
              required
            >
              {warehouses.map((wh) => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4">
          <FormTextarea label="Notes" name="notes" rows={2} value={values.notes} onChange={(e) => setValues((c) => ({ ...c, notes: e.target.value }))} />
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Requested Items</h3>
          <button type="button" onClick={() => setValues((c) => ({ ...c, items: [...c.items, emptyItem()] }))} className="rounded-[0.8rem] border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)]">
            Add Item
          </button>
        </div>

        <div className="space-y-3">
          {values.items.map((item, index) => (
            <div key={`line-${index}`} className="grid gap-3 rounded-[1rem] border border-[var(--line)] p-3 md:grid-cols-[2fr_1fr_1fr_auto]">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--ink)]">Product</span>
                <select
                  value={item.productId}
                  onChange={(e) => onItemChange(index, 'productId', e.target.value)}
                  className="rounded-[0.8rem] border border-[var(--line)] px-3 py-2 text-sm outline-none"
                >
                  <option value="">Select product</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <FormField label="Qty" type="number" name={`qty-${index}`} value={item.requestedQuantity} onChange={(e) => onItemChange(index, 'requestedQuantity', e.target.value)} />
              <FormField label="Est Unit Cost" type="number" name={`cost-${index}`} value={item.estimatedUnitCost} onChange={(e) => onItemChange(index, 'estimatedUnitCost', e.target.value)} />
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setValues((c) => ({ ...c, items: c.items.filter((_, i) => i !== index) }))}
                  className="rounded-[0.8rem] border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-40"
                  disabled={values.items.length === 1}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex gap-3">
        <button type="submit" disabled={isSubmitting} className="rounded-[1rem] bg-[#22C55E] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {isSubmitting ? 'Creating...' : 'Create Requisition'}
        </button>
        <Link to="/app/purchases/requisitions" className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)]">
          Cancel
        </Link>
      </div>
    </form>
  )
}
