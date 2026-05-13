import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { listMovements } from '../api/inventoryApi.js'

const PAGE_SIZE_OPTIONS = [20, 50, 100]

function buildPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  const filtered = Array.from(pages).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b)
  const output = []

  for (let index = 0; index < filtered.length; index += 1) {
    const page = filtered[index]
    const previous = filtered[index - 1]

    if (previous && page - previous > 1) {
      output.push(`ellipsis-${previous}-${page}`)
    }

    output.push(page)
  }

  return output
}

const MovementTypeBadge = ({ type }) => {
  const styles = {
    ADJUSTMENT_IN: 'bg-green-100 text-green-800',
    RECEIPT: 'bg-green-100 text-green-800',
    TRANSFER_IN: 'bg-teal-100 text-teal-800',
    ADJUSTMENT_OUT: 'bg-rose-100 text-rose-800',
    ISSUE: 'bg-rose-100 text-rose-800',
    TRANSFER_OUT: 'bg-orange-100 text-orange-800',
    RESERVATION: 'bg-amber-100 text-amber-800',
    RESERVATION_RELEASE: 'bg-blue-100 text-blue-800',
    OPENING: 'bg-purple-100 text-purple-800',
  }
  return (
    <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
      {type}
    </span>
  )
}

export function MovementsPage() {
  const { activeWarehouseId } = useOutletContext()
  const [movements, setMovements] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState({ movementType: '' })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })

  useEffect(() => {
    if (!activeWarehouseId) {
      setMovements([])
      setPagination((current) => ({
        ...current,
        page: 1,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      }))
      return
    }

    let cancelled = false

    async function loadMovements() {
      try {
        setIsLoading(true)
        const res = await listMovements(activeWarehouseId, {
          ...filters,
          page: pagination.page,
          limit: pagination.limit,
        })

        if (cancelled) {
          return
        }

        const payload = res.data ?? {}
        const nextPagination = payload.pagination ?? {}

        setMovements(payload.items ?? [])
        setPagination((current) => ({
          ...current,
          page: nextPagination.page ?? current.page,
          limit: nextPagination.limit ?? current.limit,
          total: nextPagination.total ?? 0,
          totalPages: nextPagination.totalPages ?? 0,
          hasNextPage: nextPagination.hasNextPage ?? false,
          hasPrevPage: nextPagination.hasPrevPage ?? false,
        }))
      } catch (error) {
        console.error(error)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadMovements()

    return () => {
      cancelled = true
    }
  }, [activeWarehouseId, filters, pagination.page, pagination.limit])

  const pageNumbers = useMemo(
    () => buildPageNumbers(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages]
  )

  const pageStart = movements.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const pageEnd = movements.length === 0 ? 0 : pageStart + movements.length - 1

  if (!activeWarehouseId) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-[var(--line)] bg-white p-12 text-center shadow-sm">
        <p className="text-lg font-semibold text-[var(--ink)]">No Context Selected</p>
        <p className="text-sm text-[var(--muted)]">Please select an Active Warehouse to view its ledger.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4 sm:flex-row">
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">Stock Movements Ledger</p>
            <p className="text-xs text-[var(--muted)]">Historical log of all quantity changes.</p>
          </div>
          <select
            value={filters.movementType}
            onChange={(e) => {
              const movementType = e.target.value
              setFilters({ movementType })
              setPagination((current) => ({ ...current, page: 1 }))
            }}
            className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink)] outline-none"
          >
            <option value="">All Types</option>
            <option value="ADJUSTMENT_IN">Adjustment In</option>
            <option value="ADJUSTMENT_OUT">Adjustment Out</option>
            <option value="TRANSFER_IN">Transfer In</option>
            <option value="TRANSFER_OUT">Transfer Out</option>
            <option value="RESERVATION">Reservation</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead className="bg-[var(--panel)]">
              <tr>
                {['Timestamp', 'Type', 'Item/SKU', 'Qty Chg', 'Notes'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" className="px-5 py-10 text-center text-sm text-[var(--muted)]">Loading ledger...</td></tr>
              ) : movements.length ? (
                movements.map((m) => (
                  <tr key={m.id} className="border-t border-[var(--line)] hover:bg-[var(--panel)]">
                    <td className="px-5 py-4 text-xs font-medium text-[var(--muted)]">
                      {new Date(m.createdAt).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                    </td>
                    <td className="px-5 py-4"><MovementTypeBadge type={m.movementType} /></td>
                    <td className="px-5 py-4 text-sm font-semibold text-[var(--ink)]">
                      {m.variantName ?? m.productName ?? m.productId ?? 'Unknown'}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-[var(--ink)]">
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td className="max-w-xs truncate px-5 py-4 text-xs text-[var(--muted)]" title={m.notes || m.referenceId}>
                      {m.notes || m.referenceId}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="px-5 py-10 text-center text-sm text-[var(--muted)]">No movements found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-[var(--line)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 text-sm text-[var(--muted)] sm:flex-row sm:items-center">
            <label className="flex items-center gap-2">
              <span>Rows per page</span>
              <select
                value={pagination.limit}
                onChange={(event) =>
                  setPagination((current) => ({
                    ...current,
                    limit: Number(event.target.value),
                    page: 1,
                  }))
                }
                className="rounded-[0.85rem] border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Showing {pageStart}-{pageEnd} of {pagination.total}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!pagination.hasPrevPage || isLoading}
              onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}
              className="rounded-[0.85rem] border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>

            {pageNumbers.map((entry) =>
              typeof entry === 'string' ? (
                <span key={entry} className="px-2 text-sm text-[var(--muted)]">
                  ...
                </span>
              ) : (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setPagination((current) => ({ ...current, page: entry }))}
                  disabled={entry === pagination.page || isLoading}
                  className={`min-w-[2.5rem] rounded-[0.85rem] border px-3 py-2 text-sm font-semibold ${
                    entry === pagination.page
                      ? 'border-[#22C55E] bg-[#DCFCE7] text-[#166534]'
                      : 'border-[var(--line)] text-[var(--ink)]'
                  } disabled:cursor-default`}
                >
                  {entry}
                </button>
              )
            )}

            <button
              type="button"
              disabled={!pagination.hasNextPage || isLoading}
              onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}
              className="rounded-[0.85rem] border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
