import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { FormSelect } from '../../../shared/ui/FormSelect.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { listBins, listZones } from '../../warehouses/api/warehousesApi.js'
import { getStockItem, updateStockLocation } from '../api/inventoryApi.js'

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-2xl">
        <h3 className="mb-4 text-xl font-semibold text-[var(--ink)]">{title}</h3>
        {children}
      </div>
    </div>
  )
}

const EMPTY_LOCATION_FORM = {
  zoneId: '',
  binId: '',
}

export function StockDetailPage() {
  const { itemId } = useParams()
  const { activeWarehouseId } = useOutletContext()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canManage = can('INVENTORY', 'CREATE') || can('INVENTORY', 'UPDATE')

  const [stockItem, setStockItem] = useState(null)
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSavingLocation, setIsSavingLocation] = useState(false)
  const [zones, setZones] = useState([])
  const [bins, setBins] = useState([])
  const [locationForm, setLocationForm] = useState(EMPTY_LOCATION_FORM)

  useEffect(() => {
    async function fetchItem() {
      if (!activeWarehouseId) return

      try {
        setIsLoading(true)
        const response = await getStockItem(activeWarehouseId, itemId)
        setStockItem(response.data)
      } catch (error) {
        setFeedback({ tone: 'error', message: error.message })
      } finally {
        setIsLoading(false)
      }
    }

    fetchItem()
  }, [activeWarehouseId, itemId])

  useEffect(() => {
    async function fetchZones() {
      if (!activeWarehouseId || !isEditModalOpen) {
        return
      }

      try {
        const response = await listZones(activeWarehouseId)
        setZones(response.data ?? [])
      } catch (error) {
        setFeedback({ tone: 'error', message: error.message })
      }
    }

    fetchZones()
  }, [activeWarehouseId, isEditModalOpen])

  useEffect(() => {
    async function fetchBins() {
      if (!locationForm.zoneId) {
        setBins([])
        return
      }

      try {
        const response = await listBins(locationForm.zoneId)
        setBins(response.data ?? [])
      } catch (error) {
        setFeedback({ tone: 'error', message: error.message })
      }
    }

    if (isEditModalOpen) {
      fetchBins()
    }
  }, [isEditModalOpen, locationForm.zoneId])

  function openEditModal() {
    setLocationForm({
      zoneId: stockItem?.zoneId ?? '',
      binId: stockItem?.binId ?? '',
    })
    setIsEditModalOpen(true)
  }

  async function handleLocationSubmit(event) {
    event.preventDefault()

    try {
      setIsSavingLocation(true)
      const response = await updateStockLocation(activeWarehouseId, itemId, {
        zoneId: locationForm.zoneId || null,
        binId: locationForm.binId || null,
      })
      setStockItem(response.data)
      setFeedback({ tone: 'success', message: 'Stock location updated successfully.' })
      setIsEditModalOpen(false)
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsSavingLocation(false)
    }
  }

  if (!activeWarehouseId) {
    return <div className="p-8 text-center text-[var(--muted)]">Please select a warehouse from the header.</div>
  }

  if (isLoading) return <div className="p-8 text-center">Loading stock details...</div>
  if (!stockItem) return <div className="p-8 text-center text-rose-600">Stock not found.</div>

  const itemName = stockItem.variantName ?? stockItem.productName ?? 'Unknown Item'
  const zoneOptions = [{ value: '', label: 'No zone' }, ...zones.map((zone) => ({ value: zone.id, label: zone.name }))]
  const binOptions = [{ value: '', label: locationForm.zoneId ? 'No bin' : 'Select a zone first' }, ...bins.map((bin) => ({ value: bin.id, label: bin.name }))]

  return (
    <div className="space-y-6">
      <StatusAlert tone={feedback.tone} message={feedback.message} />

      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white p-6  sm:p-10">
        <Link to="/app/inventory/stock" className="mb-4 inline-block text-sm font-semibold text-[#3B82F6] hover:underline">
          &larr; Back to Stock List
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[var(--ink)]">{itemName}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Stock Balance Detail Record</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-soft)]">Available</p>
            <p className="text-3xl font-[var(--font-body)] text-[var(--accent)]">{stockItem.availableQuantity}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="text-xs font-semibold uppercase text-[var(--muted)]">On Hand</p>
            <p className="mt-1 text-xl font-medium text-[var(--ink)]">{stockItem.onHandQuantity}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="text-xs font-semibold uppercase text-[var(--muted)]">Reserved</p>
            <p className="mt-1 text-xl font-medium text-amber-600">{stockItem.reservedQuantity}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--muted)]">Location</p>
                <p className="mt-1 text-sm font-medium text-[var(--ink)]">
                  Zone: {stockItem.zoneName || 'N/A'}
                  <br />
                  Bin: {stockItem.binName || 'N/A'}
                </p>
              </div>
              {canManage ? (
                <button type="button" onClick={openEditModal} className="text-sm font-semibold text-[#3B82F6] hover:underline">
                  Edit
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--line)] pt-8">
          <p className="mb-4 text-sm font-semibold text-[var(--ink)]">Reference IDs</p>
          <div className="grid gap-2 text-sm text-[var(--muted)]">
            <p><strong>Stock Row ID:</strong> {stockItem.id}</p>
            <p><strong>Product ID:</strong> {stockItem.productId || 'N/A'}</p>
            <p><strong>Variant ID:</strong> {stockItem.productVariantId || 'N/A'}</p>
          </div>
        </div>
      </section>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Stock Location">
        <form onSubmit={handleLocationSubmit} className="space-y-4">
          <FormSelect
            label="Zone"
            value={locationForm.zoneId}
            onChange={(event) => setLocationForm({ zoneId: event.target.value, binId: '' })}
            options={zoneOptions}
          />
          <FormSelect
            label="Bin"
            value={locationForm.binId}
            onChange={(event) => setLocationForm((current) => ({ ...current, binId: event.target.value }))}
            options={binOptions}
            description={locationForm.zoneId ? 'Bins are filtered by the selected zone.' : 'Choose a zone before selecting a bin.'}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="rounded-lg px-4 py-2 text-sm text-[var(--muted)]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingLocation}
              className="rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16A34A] disabled:opacity-60 transition"
            >
              {isSavingLocation ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
