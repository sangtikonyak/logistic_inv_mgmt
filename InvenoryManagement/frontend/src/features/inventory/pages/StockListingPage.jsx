import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { createStockAdjustment, listStock } from '../api/inventoryApi.js'
import { listInventoryMasterProducts } from '../lib/inventoryProducts.js'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { FormField } from '../../../shared/ui/FormField.jsx'

const DEFAULT_FILTERS = { search: '' }
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

function SearchableProductSelect({
  label,
  products,
  value,
  onChange,
  isLoading,
  error,
  placeholder = 'Select master product...',
}) {
  const rootRef = useRef(null)
  const selectedProduct = products.find((product) => product.id === value) ?? null
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return products.slice(0, 12)
    }

    return products
      .filter((product) =>
        [product.name, product.sku, product.barcode]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(normalizedQuery))
      )
      .slice(0, 12)
  }, [products, query])

  function handleSelect(product) {
    onChange(product.id)
    setQuery('')
    setIsOpen(false)
  }

  function handleInputChange(event) {
    const nextValue = event.target.value
    setQuery(nextValue)
    setIsOpen(true)
    if (value) {
      onChange('')
    }
  }

  const inputValue = isOpen ? query : selectedProduct ? buildProductLabel(selectedProduct) : query

  return (
    <label className="space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <div ref={rootRef} className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            setQuery(selectedProduct ? buildProductLabel(selectedProduct) : query)
            setIsOpen(true)
          }}
          placeholder={isLoading ? 'Loading products...' : placeholder}
          className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition ${
            error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[var(--accent)]'
          }`}
        />
        {isOpen ? (
          <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-[var(--line)] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            {isLoading ? (
              <p className="px-4 py-3 text-sm text-[var(--muted)]">Loading inventory-tracked products...</p>
            ) : filteredProducts.length ? (
              filteredProducts.map((product) => {
                const selected = product.id === value
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelect(product)}
                    className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-sm transition ${
                      selected ? 'bg-[var(--panel)] text-[#1F2937]' : 'text-[var(--ink)] hover:bg-[var(--panel)]'
                    }`}
                  >
                    <span className="font-medium">{product.name}</span>
                    <span className="text-xs text-[var(--muted)]">{product.sku || product.barcode || 'No code'}</span>
                  </button>
                )
              })
            ) : (
              <p className="px-4 py-3 text-sm text-[var(--muted)]">No matching master products found.</p>
            )}
          </div>
        ) : null}
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </label>
  )
}

function buildProductLabel(product) {
  return `${product.name}${product.sku ? ` (${product.sku})` : ''}`
}

export function StockListingPage() {
  const { activeWarehouseId } = useOutletContext()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canManage = can('INVENTORY', 'CREATE') || can('INVENTORY', 'UPDATE')

  const [stock, setStock] = useState([])
  const [productsList, setProductsList] = useState([])
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
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)
  const [adjPayload, setAdjPayload] = useState({
    productId: '',
    productVariantId: '',
    zoneId: '',
    binId: '',
    adjustmentType: 'ADJUSTMENT_IN',
    quantity: '',
    notes: '',
  })
  const [adjTitleContext, setAdjTitleContext] = useState('')

  useEffect(() => {
    if (!activeWarehouseId) {
      setStock([])
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

    async function loadStock() {
      try {
        setIsLoading(true)
        const response = await listStock(activeWarehouseId, {
          ...appliedFilters,
          page: pagination.page,
          limit: pagination.limit,
        })

        if (cancelled) {
          return
        }

        const payload = response.data ?? {}
        const nextPagination = payload.pagination ?? {}

        setStock(payload.items ?? [])
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
        if (!cancelled) {
          setFeedback({ tone: 'error', message: error.message })
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadStock()

    return () => {
      cancelled = true
    }
  }, [activeWarehouseId, appliedFilters, pagination.page, pagination.limit, reloadVersion])

  useEffect(() => {
    let cancelled = false

    async function fetchProducts() {
      try {
        setIsLoadingProducts(true)
        const nextProducts = await listInventoryMasterProducts()
        if (!cancelled) {
          setProductsList(nextProducts)
        }
      } catch (error) {
        if (!cancelled) {
          setFeedback({ tone: 'error', message: error.message })
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProducts(false)
        }
      }
    }

    fetchProducts()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleFilterSubmit(event) {
    event.preventDefault()
    setFeedback({ tone: 'success', message: '' })
    setAppliedFilters(filters)
    setPagination((current) => ({ ...current, page: 1 }))
  }

  function openAdjustmentModal(item) {
    setAdjTitleContext(item.variantName ?? item.productName ?? 'Unknown Item')
    setAdjPayload({
      productId: item.productId || '',
      productVariantId: item.productVariantId || '',
      zoneId: item.zoneId || '',
      binId: item.binId || '',
      adjustmentType: 'ADJUSTMENT_IN',
      quantity: '',
      notes: '',
    })
    setIsAdjModalOpen(true)
  }

  function openNewAdjustmentModal() {
    setAdjTitleContext('New Item Entry')
    setAdjPayload({
      productId: '',
      productVariantId: '',
      zoneId: '',
      binId: '',
      adjustmentType: 'ADJUSTMENT_IN',
      quantity: '',
      notes: '',
    })
    setIsAdjModalOpen(true)
  }

  async function handleAdjustmentSubmit(event) {
    event.preventDefault()

    try {
      const payload = {
        adjustmentType: adjPayload.adjustmentType,
        quantity: Number(adjPayload.quantity),
      }

      if (adjPayload.productId) payload.productId = adjPayload.productId
      if (adjPayload.productVariantId) payload.productVariantId = adjPayload.productVariantId
      if (adjPayload.zoneId) payload.zoneId = adjPayload.zoneId
      if (adjPayload.binId) payload.binId = adjPayload.binId
      if (adjPayload.notes?.trim()) payload.notes = adjPayload.notes.trim()

      await createStockAdjustment(activeWarehouseId, payload)
      setFeedback({ tone: 'success', message: 'Stock adjustment saved successfully.' })
      setIsAdjModalOpen(false)
      setReloadVersion((current) => current + 1)
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    }
  }

  const pageNumbers = useMemo(
    () => buildPageNumbers(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages]
  )

  const pageStart = stock.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const pageEnd = stock.length === 0 ? 0 : pageStart + stock.length - 1

  if (!activeWarehouseId) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-[var(--line)] bg-white p-12 text-center shadow-sm">
        <p className="text-lg font-semibold text-[var(--ink)]">No Context Selected</p>
        <p className="text-sm text-[var(--muted)]">Please select an active warehouse from the top selector to view stock.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <StatusAlert tone={feedback.tone} message={feedback.message} />

      <section className="relative rounded-[1.5rem] border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Operational Stock Table</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Review available, reserved, and on-hand quantities.</p>
            </div>
            {canManage ? (
              <button
                type="button"
                onClick={openNewAdjustmentModal}
                className="rounded-[1rem] bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] transition"
              >
                + Manual Adjustment
              </button>
            ) : null}
          </div>
          <form onSubmit={handleFilterSubmit} className="mt-4 grid gap-3 lg:grid-cols-6">
            <input
              type="text"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search product..."
              className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink)] outline-none"
            />
            <button
              type="submit"
              className="rounded-[0.9rem] border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              Filter
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead className="bg-[var(--panel)]">
              <tr>
                {['Item', 'Location', 'On Hand', 'Reserved', 'Available', 'Actions'].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-sm text-[var(--muted)]">Loading stock...</td>
                </tr>
              ) : stock.length ? (
                stock.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--line)] hover:bg-[var(--panel)]">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[var(--ink)]">{item.variantName ?? item.productName ?? 'Unknown Item'}</p>
                      <p className="text-xs text-[var(--muted)]">SKU: {item.sku ?? 'N/A'}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--muted)]">
                      {item.zoneName ? `Zone: ${item.zoneName}` : 'No Zone'}
                      <br />
                      {item.binName ? `Bin: ${item.binName}` : 'No Bin'}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium">{item.onHandQuantity}</td>
                    <td className="px-5 py-4 text-sm font-medium text-amber-600">{item.reservedQuantity}</td>
                    <td className="px-5 py-4 text-sm font-medium text-[var(--accent)]">{item.availableQuantity}</td>
                    <td className="flex gap-3 px-5 py-4 text-sm">
                      {canManage ? (
                        <button type="button" onClick={() => openAdjustmentModal(item)} className="font-medium text-[var(--accent)] hover:underline">
                          Adjust
                        </button>
                      ) : null}
                      <Link to={`/app/inventory/stock/${item.id}`} className="font-medium text-[var(--ink)] hover:underline">
                        Details
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-sm text-[var(--muted)]">No stock found in this warehouse.</td>
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
      </section>

      <Modal isOpen={isAdjModalOpen} onClose={() => setIsAdjModalOpen(false)} title={`Stock Adjustment: ${adjTitleContext}`}>
        <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Adjustment Type</span>
            <select
              value={adjPayload.adjustmentType}
              onChange={(event) => setAdjPayload({ ...adjPayload, adjustmentType: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
            >
              <option value="ADJUSTMENT_IN">Adjustment In (+)</option>
              <option value="ADJUSTMENT_OUT">Adjustment Out (-)</option>
            </select>
          </label>

          {adjTitleContext === 'New Item Entry' ? (
            <SearchableProductSelect
              label="Select Master Product"
              products={productsList}
              value={adjPayload.productId}
              onChange={(productId) => setAdjPayload({ ...adjPayload, productId, productVariantId: '' })}
              isLoading={isLoadingProducts}
              placeholder="Type product name, SKU, or barcode"
            />
          ) : null}

          <FormField
            label="Quantity"
            type="number"
            value={adjPayload.quantity}
            onChange={(event) => setAdjPayload({ ...adjPayload, quantity: event.target.value })}
            placeholder="e.g. 50"
          />
          <FormField
            label="Notes"
            value={adjPayload.notes}
            onChange={(event) => setAdjPayload({ ...adjPayload, notes: event.target.value })}
            placeholder="Reason for adjustment"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsAdjModalOpen(false)} className="rounded-lg px-4 py-2 text-sm text-[var(--muted)]">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16A34A] transition">
              Confirm
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
