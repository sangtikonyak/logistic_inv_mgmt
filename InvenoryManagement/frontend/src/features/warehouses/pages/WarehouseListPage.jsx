import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { listWarehouses, deleteWarehouse, setDefaultWarehouse } from '../api/warehousesApi.js'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'

export function WarehouseListPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canAdmin = can('WAREHOUSES', 'DELETE')
  const canManage = can('WAREHOUSES', 'CREATE') || can('WAREHOUSES', 'UPDATE')

  const [warehouses, setWarehouses] = useState([])
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' })
  const [filters, setFilters] = useState({ search: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 20, placement: 'bottom' })
  const menuSurfaceRef = useRef(null)
  const sectionRef = useRef(null)

  useEffect(() => {
    function handleClickAway(event) {
      if (menuSurfaceRef.current && !menuSurfaceRef.current.contains(event.target)) {
        setOpenMenuId(null)
      }
    }

    document.addEventListener('mousedown', handleClickAway)
    return () => document.removeEventListener('mousedown', handleClickAway)
  }, [])

  async function loadData(nextFilters = filters) {
    const response = await listWarehouses({
      ...nextFilters,
      page: 1,
      limit: 20,
    })
    setWarehouses(response.data?.items ?? response.data ?? [])
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        setIsLoading(true)
        await loadData(filters)
      } catch (error) {
        setFeedback({ tone: 'error', message: error.message })
      } finally {
        setIsLoading(false)
      }
    }

    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleFilterSubmit(event) {
    event.preventDefault()
    try {
      setIsLoading(true)
      await loadData(filters)
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSetDefault(warehouseId) {
    if (!canManage) return
    try {
      await setDefaultWarehouse(warehouseId)
      setFeedback({ tone: 'success', message: 'Default warehouse updated successfully.' })
      setOpenMenuId(null)
      await loadData(filters)
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    }
  }

  async function handleDelete(warehouse) {
    if (!canAdmin) return
    if (warehouse.isDefault) {
      setFeedback({ tone: 'error', message: 'You cannot delete the default warehouse.' })
      setOpenMenuId(null)
      return
    }

    try {
      await deleteWarehouse(warehouse.id)
      setFeedback({ tone: 'success', message: 'Warehouse deleted successfully.' })
      setOpenMenuId(null)
      await loadData(filters)
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    }
  }

  function handleMenuToggle(event, warehouseId) {
    if (openMenuId === warehouseId) {
      setOpenMenuId(null)
      return
    }

    const buttonRect = event.currentTarget.getBoundingClientRect()
    const sectionRect = sectionRef.current?.getBoundingClientRect()
    const estimatedMenuHeight = 160 // View, Edit, Set Default, Delete

    if (sectionRect) {
      const spaceBelow = sectionRect.bottom - buttonRect.bottom
      const spaceAbove = buttonRect.top - sectionRect.top
      const shouldOpenUpward = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow

      setMenuPosition({
        top: shouldOpenUpward
          ? Math.max(buttonRect.top - sectionRect.top - estimatedMenuHeight - 8, 16)
          : buttonRect.bottom - sectionRect.top + 8,
        right: Math.max(sectionRect.right - buttonRect.right - 12, 20),
        placement: shouldOpenUpward ? 'top' : 'bottom',
      })
    }

    setOpenMenuId(warehouseId)
  }

  return (
    <div className="space-y-6">
      <StatusAlert tone={feedback.tone} message={feedback.message} />

      <section
        ref={sectionRef}
        className="relative rounded-[1.5rem] border border-[var(--line)] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
      >
        <div className="border-b border-[var(--line)] px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Warehouse listing</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Review warehouses, open details, manage zones and bins, or mark as default.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {canManage && (
                <Link
                  to="/app/warehouses/new"
                  className="rounded-[1rem] bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] transition"
                >
                  Add warehouse
                </Link>
              )}
            </div>
          </div>

          <form onSubmit={handleFilterSubmit} className="mt-4 grid gap-3 lg:grid-cols-6">
            <input
              type="text"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search by name or code"
              className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted-soft)]"
            />
            <button
              type="submit"
              className="rounded-[0.9rem] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              Apply filters
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead className="bg-[var(--panel)]">
              <tr>
                {['Name', 'Code', 'Status', 'Actions'].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="px-5 py-10 text-center text-sm text-[var(--muted)]">
                    Loading warehouses...
                  </td>
                </tr>
              ) : warehouses.length ? (
                warehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="border-t border-[var(--line)] hover:bg-[var(--panel)]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--ink)]">{warehouse.name}</p>
                        {warehouse.isDefault === 1 && (
                          <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--muted)]">{warehouse.code}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                        {warehouse.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={(event) => handleMenuToggle(event, warehouse.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-[0.85rem] border border-[var(--line)] bg-white text-[var(--ink)]"
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === warehouse.id}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                          <circle cx="8" cy="3" r="1.5" />
                          <circle cx="8" cy="8" r="1.5" />
                          <circle cx="8" cy="13" r="1.5" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-5 py-10 text-center text-sm text-[var(--muted)]">
                    No warehouses found for the current filter set.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {openMenuId ? (() => {
          const warehouse = warehouses.find(h => h.id === openMenuId)
          return (
          <div
            ref={menuSurfaceRef}
            className="absolute z-30 min-w-[180px] rounded-[1rem] border border-[var(--line)] bg-white p-2 shadow-[0_18px_32px_rgba(15,23,42,0.16)]"
            data-placement={menuPosition.placement}
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setOpenMenuId(null)
                navigate(`/app/warehouses/${openMenuId}`)
              }}
              className="block w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--panel)]"
            >
              Quick Manage (Zones & Bins)
            </button>
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuId(null)
                    navigate(`/app/warehouses/${openMenuId}/edit`)
                  }}
                  className="block w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--panel)]"
                >
                  Edit details
                </button>
                {warehouse?.isDefault !== 1 && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(openMenuId)}
                    className="block w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--panel)]"
                  >
                    Set as default
                  </button>
                )}
              </>
            )}
            {canAdmin && warehouse?.isDefault !== 1 ? (
              <button
                type="button"
                onClick={() => handleDelete(warehouse)}
                className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-white bg-[#EF4444] hover:bg-[#DC2626] transition"
              >
                Delete
              </button>
            ) : null}
          </div>
        )})() : null}
      </section>
    </div>
  )
}
