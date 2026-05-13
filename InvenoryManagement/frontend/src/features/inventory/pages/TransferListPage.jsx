import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listTransfers } from '../api/inventoryApi.js'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'

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

const StatusBadge = ({ status }) => {
  const styles = {
    DRAFT: 'bg-gray-100 text-gray-800',
    IN_TRANSIT: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-rose-100 text-rose-800',
  }
  return (
    <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${styles[status] || styles.DRAFT}`}>
      {status}
    </span>
  )
}

export function TransferListPage() {
  const { session } = useAuth()
  const { can } = usePermissions()
  const canManage = can('INVENTORY', 'CREATE') || can('INVENTORY', 'UPDATE')

  const [transfers, setTransfers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState({ status: '' })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })

  useEffect(() => {
    let cancelled = false

    async function fetchTransfers() {
      try {
        setIsLoading(true)
        const res = await listTransfers({
          ...filters,
          page: pagination.page,
          limit: pagination.limit,
        })

        if (cancelled) {
          return
        }

        const payload = res.data ?? {}
        const nextPagination = payload.pagination ?? {}

        setTransfers(payload.items ?? [])
        setPagination((current) => ({
          ...current,
          page: nextPagination.page ?? current.page,
          limit: nextPagination.limit ?? current.limit,
          total: nextPagination.total ?? 0,
          totalPages: nextPagination.totalPages ?? 0,
          hasNextPage: nextPagination.hasNextPage ?? false,
          hasPrevPage: nextPagination.hasPrevPage ?? false,
        }))
      } catch (err) {
        console.error(err)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchTransfers()

    return () => {
      cancelled = true
    }
  }, [filters, pagination.page, pagination.limit])

  const pageNumbers = useMemo(
    () => buildPageNumbers(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages]
  )

  const pageStart = transfers.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const pageEnd = transfers.length === 0 ? 0 : pageStart + transfers.length - 1

  return (
    <div className="space-y-6">
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4 sm:flex-row">
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">Warehouse Transfers</p>
            <p className="text-xs text-[var(--muted)]">Manage inter-warehouse stock movements.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filters.status}
              onChange={(e) => {
                const status = e.target.value
                setFilters({ status })
                setPagination((current) => ({ ...current, page: 1 }))
              }}
              className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink)] outline-none"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            {canManage && (
              <Link to="/app/inventory/transfers/new" className="rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#16A34A]">
                + New Transfer
              </Link>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead className="bg-[var(--panel)]">
              <tr>
                {['Ref/ID', 'Status', 'Source WH', 'Dest WH', 'Items', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="6" className="px-5 py-10 text-center text-sm text-[var(--muted)]">Loading transfers...</td></tr>
              ) : transfers.length ? (
                transfers.map((t) => (
                  <tr key={t.id} className="border-t border-[var(--line)] hover:bg-[var(--panel)]">
                    <td className="px-5 py-4 text-xs font-mono text-[var(--ink)]">{t.id.slice(0, 8)}...</td>
                    <td className="px-5 py-4"><StatusBadge status={t.status} /></td>
                    <td className="px-5 py-4 text-sm text-[var(--ink)]">{t.sourceWarehouseName || t.sourceWarehouseId}</td>
                    <td className="px-5 py-4 text-sm text-[var(--ink)]">{t.destinationWarehouseName || t.destinationWarehouseId}</td>
                    <td className="px-5 py-4 text-sm font-medium">{t.items?.length || 0}</td>
                    <td className="px-5 py-4">
                      <Link to={`/app/inventory/transfers/${t.id}`} className="text-sm font-semibold text-[var(--accent)] hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="px-5 py-10 text-center text-sm text-[var(--muted)]">No transfers found.</td></tr>
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
