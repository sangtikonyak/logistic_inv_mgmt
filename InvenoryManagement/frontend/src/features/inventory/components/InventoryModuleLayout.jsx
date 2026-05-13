import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listWarehouses } from '../../warehouses/api/warehousesApi.js'

const inventoryNavItems = [
  { label: 'Stock Overview', to: '/app/inventory/stock' },
  { label: 'Stock Alerts', to: '/app/inventory/alerts' },
  { label: 'Movements Ledger', to: '/app/inventory/movements' },
  { label: 'Lot Expiry', to: '/app/inventory/lots' },
  { label: 'Container Trace', to: '/app/inventory/containers' },
  { label: 'Warehouse Transfers', to: '/app/inventory/transfers' },
]

function linkClass({ isActive }) {
  return `rounded-lg px-4 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-[#111827] text-white'
      : 'border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]'
  }`
}

export function InventoryModuleLayout() {
  const [warehouses, setWarehouses] = useState([])
  const [activeWarehouseId, setActiveWarehouseId] = useState('')

  useEffect(() => {
    async function loadWarehouses() {
      try {
        const response = await listWarehouses({ page: 1, limit: 100 })
        const whList = response.data?.items ?? response.data ?? []
        setWarehouses(whList)
        const defaultWh = whList.find(wh => wh.isDefault)
        if (defaultWh) setActiveWarehouseId(defaultWh.id)
        else if (whList.length > 0) setActiveWarehouseId(whList[0].id)
      } catch (error) {
        console.error('Failed to load warehouses context', error)
      }
    }
    loadWarehouses()
  }, [])

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">Inventory Module</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#111827]">Stock Control</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            View stock balances, adjust inventory, check movements, and process transfers between locations.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {inventoryNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>{item.label}</NavLink>
          ))}
        </nav>
      </section>

      <div className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-5 py-3">
        <p className="text-sm font-medium text-[#374151] whitespace-nowrap">Active Context:</p>
        <select
          value={activeWarehouseId}
          onChange={(e) => setActiveWarehouseId(e.target.value)}
          className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm text-[#111827] w-64 outline-none focus:border-[#111827]"
        >
          <option value="">— Select a Warehouse —</option>
          {warehouses.map(wh => (
            <option key={wh.id} value={wh.id}>{wh.name}{wh.isDefault ? ' (Default)' : ''}</option>
          ))}
        </select>
      </div>

      <Outlet context={{ activeWarehouseId, warehouses }} />
    </div>
  )
}
