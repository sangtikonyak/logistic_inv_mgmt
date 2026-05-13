import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { deleteProduct, listCategories, listProducts, listUnits } from '../api/productsApi.js'
import { productStatusOptions, productTypeOptions } from '../lib/productForms.js'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { SummaryCards } from '../components/ProductShared.jsx'

const DEFAULT_FILTERS = { search: '', status: '', productType: '', categoryId: '', unitId: '' }
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

export function ProductListPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canCreate = can('PRODUCTS', 'CREATE')
  const canUpdate = can('PRODUCTS', 'UPDATE')
  const canDelete = can('PRODUCTS', 'DELETE')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])
  const [counts, setCounts] = useState({ products: 0, categories: 0, units: 0 })
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' })
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [reloadVersion, setReloadVersion] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
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

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        setIsBootstrapping(true)
        const [categoriesResponse, unitsResponse] = await Promise.all([listCategories(), listUnits()])
        if (cancelled) {
          return
        }

        const nextCategories = categoriesResponse.data ?? []
        const nextUnits = unitsResponse.data ?? []

        setCategories(nextCategories)
        setUnits(nextUnits)
        setCounts((current) => ({
          ...current,
          categories: nextCategories.length,
          units: nextUnits.length,
        }))
      } catch (error) {
        if (!cancelled) {
          setFeedback({ tone: 'error', message: error.message })
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false)
        }
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      try {
        setIsLoading(true)
        const response = await listProducts({
          ...appliedFilters,
          page: pagination.page,
          limit: pagination.limit,
          sortBy: 'updated_at',
          sortDir: 'DESC',
        })

        if (cancelled) {
          return
        }

        const payload = response.data ?? {}
        const nextPagination = payload.pagination ?? {}

        setProducts(payload.items ?? [])
        setPagination((current) => ({
          ...current,
          page: nextPagination.page ?? current.page,
          limit: nextPagination.limit ?? current.limit,
          total: nextPagination.total ?? 0,
          totalPages: nextPagination.totalPages ?? 0,
          hasNextPage: nextPagination.hasNextPage ?? false,
          hasPrevPage: nextPagination.hasPrevPage ?? false,
        }))
        setCounts((current) => ({
          ...current,
          products: nextPagination.total ?? payload.items?.length ?? 0,
        }))
      } catch (error) {
        if (!cancelled) {
          setFeedback({ tone: 'error', message: error.message })
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      cancelled = true
    }
  }, [appliedFilters, pagination.page, pagination.limit, reloadVersion])

  async function handleFilterSubmit(event) {
    event.preventDefault()
    setAppliedFilters(filters)
    setPagination((current) => ({ ...current, page: 1 }))
  }

  async function handleDelete(productId) {
    if (!canDelete) {
      return
    }

    try {
      await deleteProduct(productId)
      setFeedback({ tone: 'success', message: 'Product deleted successfully.' })
      setOpenMenuId(null)
      setPagination((current) => {
        const remainingTotal = Math.max(current.total - 1, 0)
        const remainingPages = remainingTotal === 0 ? 1 : Math.ceil(remainingTotal / current.limit)

        return {
          ...current,
          page: Math.min(current.page, remainingPages),
        }
      })
      setReloadVersion((current) => current + 1)
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    }
  }

  function handleMenuToggle(event, productId) {
    if (openMenuId === productId) {
      setOpenMenuId(null)
      return
    }

    const buttonRect = event.currentTarget.getBoundingClientRect()
    const sectionRect = sectionRef.current?.getBoundingClientRect()
    const estimatedMenuHeight = canDelete ? 132 : 96

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

    setOpenMenuId(productId)
  }

  const pageNumbers = useMemo(
    () => buildPageNumbers(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages]
  )

  const isInitialLoading = isLoading || isBootstrapping
  const pageStart = products.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const pageEnd = products.length === 0 ? 0 : pageStart + products.length - 1

  return (
    <div className="space-y-6">
      <SummaryCards
        productsCount={counts.products}
        categoriesCount={counts.categories}
        unitsCount={counts.units}
      />

      <StatusAlert tone={feedback.tone} message={feedback.message} />

      <section
        ref={sectionRef}
        className="relative rounded-[1.5rem] border border-[var(--line)] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
      >
        <div className="border-b border-[var(--line)] px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Product listing</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Review products, open details, or jump to edit from the actions menu
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {canCreate ? (
                <Link
                  to="/app/products/new"
                  className="rounded-[1rem] bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] transition"
                >
                  Add product
                </Link>
              ) : null}
            </div>
          </div>

          <form onSubmit={handleFilterSubmit} className="mt-4 grid gap-3 lg:grid-cols-6">
            <input
              type="text"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search by name or SKU"
              className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted-soft)]"
            />
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink)] outline-none"
            >
              <option value="">All statuses</option>
              {productStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={filters.productType}
              onChange={(event) => setFilters((current) => ({ ...current, productType: event.target.value }))}
              className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink)] outline-none"
            >
              <option value="">All types</option>
              {productTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={filters.categoryId}
              onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))}
              className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink)] outline-none"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={filters.unitId}
              onChange={(event) => setFilters((current) => ({ ...current, unitId: event.target.value }))}
              className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink)] outline-none"
            >
              <option value="">All units</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.code})
                </option>
              ))}
            </select>
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
                {['Product', 'Type', 'Status', 'Unit', 'Categories', 'Price', 'Variants', 'Actions'].map((heading) => (
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
              {isInitialLoading ? (
                <tr>
                  <td colSpan="8" className="px-5 py-10 text-center text-sm text-[var(--muted)]">
                    Loading products...
                  </td>
                </tr>
              ) : products.length ? (
                products.map((product) => (
                  <tr key={product.id} className="border-t border-[var(--line)] hover:bg-[var(--panel)]">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink)]">{product.name}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{product.sku || 'SKU auto-generated'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--muted)]">{product.productType}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                        {product.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--muted)]">{product.unit?.code ?? 'No unit'}</td>
                    <td className="px-5 py-4 text-sm text-[var(--muted)]">
                      {product.categories?.map((category) => category.name).join(', ') || 'Unassigned'}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-[var(--ink)]">
                      {product.sellingPrice !== null && product.sellingPrice !== undefined
                        ? `${product.currencyCode ?? 'INR'} ${product.sellingPrice}`
                        : 'No price'}
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--muted)]">{product.variantCount}</td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={(event) => handleMenuToggle(event, product.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-[0.85rem] border border-[var(--line)] bg-white text-xl leading-none text-[var(--ink)]"
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === product.id}
                      >
                        <span aria-hidden="true">...</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-5 py-10 text-center text-sm text-[var(--muted)]">
                    No products found for the current filter set.
                  </td>
                </tr>
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

        {openMenuId ? (
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
                navigate(`/app/products/${openMenuId}`)
              }}
              className="block w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--panel)]"
            >
              View
            </button>
            {canUpdate ? (
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null)
                  navigate(`/app/products/${openMenuId}/edit`)
                }}
                className="block w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--panel)]"
              >
                Edit
              </button>
            ) : null}
            {canCreate ? (
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null)
                  navigate(`/app/products/new?cloneOf=${openMenuId}`)
                }}
                className="block w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--panel)]"
              >
                Clone as new
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={() => handleDelete(openMenuId)}
                className="block w-full rounded-md bg-[#EF4444] px-3 py-2 text-left text-sm font-medium text-white transition hover:bg-[#DC2626]"
              >
                Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}
