import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import {
  getWarehouse,
  listZones,
  createZone,
  updateZone,
  deleteZone,
  listBins,
  createBin,
  updateBin,
  deleteBin,
} from '../api/warehousesApi.js'

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[1.5rem] bg-white p-6 shadow-2xl">
        <h3 className="mb-4 text-xl font-semibold text-[var(--ink)]">{title}</h3>
        {children}
      </div>
    </div>
  )
}

export function WarehouseDetailPage() {
  const { warehouseId } = useParams()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canAdmin = can('WAREHOUSES', 'DELETE')
  const canManage = can('WAREHOUSES', 'CREATE') || can('WAREHOUSES', 'UPDATE')

  const [warehouse, setWarehouse] = useState(null)
  const [zones, setZones] = useState([])
  const [bins, setBins] = useState([])
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' })
  const [isLoading, setIsLoading] = useState(true)

  // Zone Modal State
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false)
  const [editingZone, setEditingZone] = useState(null)
  const [zoneFormData, setZoneFormData] = useState({ code: '', name: '', sortOrder: 0 })

  // Bin Modal State
  const [isBinModalOpen, setIsBinModalOpen] = useState(false)
  const [editingBin, setEditingBin] = useState(null)
  const [binFormData, setBinFormData] = useState({ 
    code: '', 
    name: '',
    sortOrder: 0,
    isPickable: true,
    isReceiving: false,
    isDispatch: false
  })
  const [selectedZoneIdForBins, setSelectedZoneIdForBins] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const [whRes, zonesRes] = await Promise.all([
          getWarehouse(warehouseId),
          listZones(warehouseId),
        ])
        setWarehouse(whRes.data)
        setZones(zonesRes.data || [])
      } catch (error) {
        setFeedback({ tone: 'error', message: error.message })
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [warehouseId])

  useEffect(() => {
    async function loadBins() {
      if (!selectedZoneIdForBins) {
        setBins([])
        return
      }
      try {
        const binsRes = await listBins(selectedZoneIdForBins)
        setBins(binsRes.data || [])
      } catch (error) {
        setFeedback({ tone: 'error', message: 'Failed to load bins for selected zone: ' + error.message })
      }
    }
    loadBins()
  }, [selectedZoneIdForBins])

  // --- Zone Handlers ---
  function openZoneModal(zone = null) {
    if (zone) {
      setEditingZone(zone)
      setZoneFormData({ 
        code: zone.code || '', 
        name: zone.name || '',
        sortOrder: zone.sortOrder ?? 0
      })
    } else {
      setEditingZone(null)
      setZoneFormData({ code: '', name: '', sortOrder: 0 })
    }
    setIsZoneModalOpen(true)
  }

  async function handleZoneSubmit(e) {
    e.preventDefault()
    setFeedback({ tone: 'success', message: '' })
    try {
      if (editingZone) {
        await updateZone(editingZone.id, zoneFormData)
      } else {
        await createZone(warehouseId, zoneFormData)
      }
      setIsZoneModalOpen(false)
      const zonesRes = await listZones(warehouseId)
      setZones(zonesRes.data || [])
      setFeedback({ tone: 'success', message: editingZone ? 'Zone updated.' : 'Zone created.' })
    } catch (error) {
      if (error.errors) {
        setFeedback({ tone: 'error', message: `Validation Error: ${error.errors.map(x => Object.values(x).join(' - ')).join(', ')}` })
      } else {
        setFeedback({ tone: 'error', message: error.message })
      }
    }
  }

  async function handleDeleteZone(zoneId) {
    if (!canAdmin) return
    try {
      await deleteZone(zoneId)
      const zonesRes = await listZones(warehouseId)
      setZones(zonesRes.data || [])
      setFeedback({ tone: 'success', message: 'Zone deleted.' })
      if (selectedZoneIdForBins === zoneId) setSelectedZoneIdForBins(null)
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    }
  }

  // --- Bin Handlers ---
  function openBinModal(bin = null) {
    if (bin) {
      setEditingBin(bin)
      setBinFormData({ 
        code: bin.code || '',
        name: bin.name || '',
        sortOrder: bin.sortOrder ?? 0,
        isPickable: bin.isPickable ?? true,
        isReceiving: bin.isReceiving ?? false,
        isDispatch: bin.isDispatch ?? false
      })
    } else {
      setEditingBin(null)
      setBinFormData({ 
        code: '',
        name: '',
        sortOrder: 0,
        isPickable: true,
        isReceiving: false,
        isDispatch: false
      })
    }
    setIsBinModalOpen(true)
  }

  async function handleBinSubmit(e) {
    e.preventDefault()
    if (!selectedZoneIdForBins) return
    setFeedback({ tone: 'success', message: '' })
    try {
      if (editingBin) {
        await updateBin(editingBin.id, binFormData)
      } else {
        await createBin(selectedZoneIdForBins, binFormData)
      }
      setIsBinModalOpen(false)
      const binsRes = await listBins(selectedZoneIdForBins)
      setBins(binsRes.data || [])
      setFeedback({ tone: 'success', message: editingBin ? 'Bin updated.' : 'Bin created.' })
    } catch (error) {
      if (error.errors) {
        setFeedback({ tone: 'error', message: `Validation error: ${JSON.stringify(error.errors)}` })
      } else {
        setFeedback({ tone: 'error', message: error.message })
      }
    }
  }

  async function handleDeleteBin(binId) {
    if (!canAdmin) return
    try {
      await deleteBin(binId)
      const binsRes = await listBins(selectedZoneIdForBins)
      setBins(binsRes.data || [])
      setFeedback({ tone: 'success', message: 'Bin deleted.' })
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    }
  }

  if (isLoading) return <div className="text-sm text-[var(--muted)]">Loading warehouse details...</div>
  if (!warehouse) return <div className="text-sm text-rose-600">Warehouse not found.</div>

  return (
    <div className="space-y-6">
      <StatusAlert tone={feedback.tone} message={feedback.message} />

      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white p-6  sm:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[var(--ink)]">{warehouse.name}</h2>
            <div className="mt-2 flex items-center gap-3">
              <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                {warehouse.code}
              </span>
              <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                {warehouse.status}
              </span>
              {warehouse.isDefault === 1 && (
                <span className="rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                  Default
                </span>
              )}
            </div>
            {(warehouse.city || warehouse.country) && (
              <p className="mt-4 text-sm text-[var(--muted)]">
                Location: {[warehouse.city, warehouse.country].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          {canManage && (
            <Link
              to={`/app/warehouses/${warehouse.id}/edit`}
              className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] transition"
            >
              Edit Warehouse
            </Link>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ZONES SECTION */}
        <section className="rounded-[1.5rem] border border-[var(--line)] bg-white ">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Zones</p>
              <p className="text-xs text-[var(--muted)]">Manage structural zones in this warehouse</p>
            </div>
            {canManage && (
              <button
                onClick={() => openZoneModal()}
                className="rounded-lg bg-[#22C55E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#16A34A] transition"
              >
                Add Zone
              </button>
            )}
          </div>
          <div className="p-4">
            {zones.length > 0 ? (
              <div className="space-y-2">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className={`flex items-center justify-between rounded-xl border ${
                      selectedZoneIdForBins === zone.id ? 'border-[var(--accent)] bg-[var(--panel)]' : 'border-[var(--line)]'
                    } p-3 cursor-pointer`}
                    onClick={() => setSelectedZoneIdForBins(zone.id)}
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--ink)]">{zone.name || 'Unnamed Zone'}</p>
                      <p className="text-xs text-[var(--muted)]">Code: {zone.code} | Sort: {zone.sortOrder}</p>
                    </div>
                    <div className="flex gap-2">
                      {canManage && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openZoneModal(zone); }}
                          className="text-xs font-semibold text-[#3B82F6] hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      {canAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteZone(zone.id); }}
                          className="text-xs font-semibold text-[#EF4444] hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">No zones found.</p>
            )}
          </div>
        </section>

        {/* BINS SECTION */}
        <section className="rounded-[1.5rem] border border-[var(--line)] bg-white ">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Bins</p>
              <p className="text-xs text-[var(--muted)]">
                {selectedZoneIdForBins ? 'Managing bins for selected zone' : 'Select a zone to manage bins'}
              </p>
            </div>
            {canManage && selectedZoneIdForBins && (
              <button
                onClick={() => openBinModal()}
                className="rounded-lg bg-[#22C55E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#16A34A] transition"
              >
                Add Bin
              </button>
            )}
          </div>
          <div className="p-4">
            {!selectedZoneIdForBins ? (
              <p className="text-sm text-[var(--muted)]">Please select a zone from the list.</p>
            ) : bins.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {bins.map((bin) => (
                  <div key={bin.id} className="rounded-xl border border-[var(--line)] p-3 flex justify-between items-center bg-slate-50">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">{bin.name}</p>
                      <p className="text-xs text-[var(--muted)]">{bin.code}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {bin.isPickable && <span className="inline-block bg-blue-100 text-blue-800 text-[9px] px-1.5 py-0.5 rounded">Pick</span>}
                        {bin.isReceiving && <span className="inline-block bg-green-100 text-green-800 text-[9px] px-1.5 py-0.5 rounded">Recv</span>}
                        {bin.isDispatch && <span className="inline-block bg-purple-100 text-purple-800 text-[9px] px-1.5 py-0.5 rounded">Disp</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {canManage && (
                        <button
                          onClick={() => openBinModal(bin)}
                          className="text-[10px] font-semibold text-[#3B82F6] hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      {canAdmin && (
                        <button
                          onClick={() => handleDeleteBin(bin.id)}
                          className="text-[10px] font-semibold text-[#EF4444] hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">No bins found in this zone.</p>
            )}
          </div>
        </section>
      </div>

      <Modal
        isOpen={isZoneModalOpen}
        onClose={() => setIsZoneModalOpen(false)}
        title={editingZone ? 'Edit Zone' : 'New Zone'}
      >
        <form onSubmit={handleZoneSubmit} className="space-y-4">
          <FormField
            label="Zone Name *"
            name="name"
            value={zoneFormData.name}
            onChange={(e) => setZoneFormData({ ...zoneFormData, name: e.target.value })}
            placeholder="e.g. Bulk Storage"
          />
          <FormField
            label="Zone Code *"
            name="code"
            value={zoneFormData.code}
            onChange={(e) => setZoneFormData({ ...zoneFormData, code: e.target.value })}
            placeholder="e.g. Z1"
          />
          <FormField
            label="Sort Order"
            name="sortOrder"
            type="number"
            value={zoneFormData.sortOrder}
            onChange={(e) => setZoneFormData({ ...zoneFormData, sortOrder: parseInt(e.target.value, 10) || 0 })}
            placeholder="0"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsZoneModalOpen(false)}
              className="rounded-lg px-4 py-2 text-sm text-[var(--muted)] hover:bg-[var(--panel)]"
            >
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16A34A] transition">
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isBinModalOpen}
        onClose={() => setIsBinModalOpen(false)}
        title={editingBin ? 'Edit Bin' : 'New Bin'}
      >
        <form onSubmit={handleBinSubmit} className="space-y-4">
          <FormField
            label="Bin Name *"
            name="name"
            value={binFormData.name}
            onChange={(e) => setBinFormData({ ...binFormData, name: e.target.value })}
            placeholder="e.g. Bin Level 1"
          />
          <FormField
            label="Bin Code *"
            name="code"
            value={binFormData.code}
            onChange={(e) => setBinFormData({ ...binFormData, code: e.target.value })}
            placeholder="e.g. B1-01"
          />
          <FormField
            label="Sort Order"
            name="sortOrder"
            type="number"
            value={binFormData.sortOrder}
            onChange={(e) => setBinFormData({ ...binFormData, sortOrder: parseInt(e.target.value, 10) || 0 })}
            placeholder="0"
          />
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={binFormData.isPickable} 
                onChange={(e) => setBinFormData({...binFormData, isPickable: e.target.checked})}
                className="rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span className="text-sm text-slate-700">Is Pickable</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={binFormData.isReceiving} 
                onChange={(e) => setBinFormData({...binFormData, isReceiving: e.target.checked})}
                className="rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span className="text-sm text-slate-700">Is Receiving</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={binFormData.isDispatch} 
                onChange={(e) => setBinFormData({...binFormData, isDispatch: e.target.checked})}
                className="rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span className="text-sm text-slate-700">Is Dispatch</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsBinModalOpen(false)}
              className="rounded-lg px-4 py-2 text-sm text-[var(--muted)] hover:bg-[var(--panel)]"
            >
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16A34A] transition">
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
