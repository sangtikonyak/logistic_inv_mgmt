import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { useAuthForm } from '../../auth/hooks/useAuthForm.js'
import {
  createCategory,
  createProduct,
  createUnit,
  deleteCategory,
  deleteProduct,
  deleteUnit,
  getProduct,
  listCategories,
  listProducts,
  listUnits,
  updateCategory,
  updateProduct,
  updateUnit,
} from '../api/productsApi.js'
import {
  createCategoryInitialValues,
  createProductInitialValues,
  createUnitInitialValues,
  normalizeCategoryPayload,
  normalizeProductPayload,
  normalizeUnitPayload,
  productStatusOptions,
  productTypeOptions,
  validateCategoryForm,
  validateProductForm,
  validateUnitForm,
} from '../lib/productForms.js'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { FormSelect } from '../../../shared/ui/FormSelect.jsx'
import { FormTextarea } from '../../../shared/ui/FormTextarea.jsx'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import { listBins, listWarehouses, listZones } from '../../warehouses/api/warehousesApi.js'

const EMPTY_INITIAL_STOCK = { enabled: false, warehouseId: '', zoneId: '', binId: '', quantity: '', notes: '' }

function CheckboxField({ label, name, checked, onChange, disabled = false }) {
  return (
    <label className="flex items-center gap-3 rounded-[1rem] border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm text-[var(--ink)]">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)]"
      />
      <span>{label}</span>
    </label>
  )
}

function ToggleList({ items, selectedIds, onToggle, disabled }) {
  return (
    <div className="grid gap-2">
      {items.length ? (
        items.map((item) => {
          const active = selectedIds.includes(item.id)

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              disabled={disabled}
              className={`flex items-start justify-between rounded-[1rem] border px-4 py-3 text-left transition ${
                active
                  ? 'border-[var(--accent)] bg-[#F3F4F6] text-[#1F2937]'
                  : 'border-[var(--line)] bg-white text-[var(--muted)]'
              }`}
            >
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="mt-1 text-xs">
                  {item.description || item.code || item.slug || 'No secondary details'}
                </p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                {active ? 'Added' : 'Add'}
              </span>
            </button>
          )
        })
      ) : (
        <div className="rounded-[1rem] border border-dashed border-[var(--line)] bg-[var(--panel)] px-4 py-4 text-sm text-[var(--muted)]">
          Nothing available yet.
        </div>
      )}
    </div>
  )
}

function ManagementCard({
  title,
  description,
  form,
  onSubmit,
  submitLabel,
  onReset,
  canManage,
  children,
}) {
  return (
    <article className="rounded-[1.5rem] border border-[var(--line)] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        </div>
        {!canManage ? (
          <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
            Read only
          </span>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        {children}
        <StatusAlert tone={form.serverTone} message={form.serverMessage} />
        <div className="flex flex-wrap gap-3">
          {canManage ? (
            <button
              type="submit"
              disabled={form.isSubmitting}
              className="rounded-[1rem] bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] transition disabled:opacity-60"
            >
              {form.isSubmitting ? 'Saving...' : submitLabel}
            </button>
          ) : null}
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="rounded-[1rem] border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
            >
              Reset
            </button>
          ) : null}
        </div>
      </form>
    </article>
  )
}

export function ProductsPage() {
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('PRODUCTS', 'CREATE') || can('PRODUCTS', 'UPDATE')
  const canDelete = can('PRODUCTS', 'DELETE')

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [selectedProductId, setSelectedProductId] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [productFeedback, setProductFeedback] = useState({ tone: 'success', message: '' })
  const [categoryFeedback, setCategoryFeedback] = useState({ tone: 'success', message: '' })
  const [unitFeedback, setUnitFeedback] = useState({ tone: 'success', message: '' })
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    productType: '',
  })
  const [categoryEditId, setCategoryEditId] = useState(null)
  const [unitEditId, setUnitEditId] = useState(null)
  const [openingStockZones, setOpeningStockZones] = useState([])
  const [openingStockBins, setOpeningStockBins] = useState([])
  const [initialStock, setInitialStock] = useState(EMPTY_INITIAL_STOCK)

  const productForm = useAuthForm(createProductInitialValues())
  const categoryForm = useAuthForm(createCategoryInitialValues())
  const unitForm = useAuthForm(createUnitInitialValues())
  const selectedProductIdRef = useRef(selectedProductId)

  useEffect(() => {
    selectedProductIdRef.current = selectedProductId
  }, [selectedProductId])

  async function loadProducts(nextFilters = filters, keepSelected = true) {
    const response = await listProducts({
      ...nextFilters,
      page: 1,
      limit: 20,
      sortBy: 'updated_at',
      sortDir: 'DESC',
    })
    const rows = response.data?.items ?? response.data ?? []
    setProducts(rows)

    if (!rows.length) {
      setSelectedProductId(null)
      setSelectedProduct(null)
      return
    }

    const currentSelectedId = selectedProductIdRef.current
    const nextSelectedId =
      keepSelected && currentSelectedId && rows.some((item) => item.id === currentSelectedId)
        ? currentSelectedId
        : rows[0].id

    setSelectedProductId(nextSelectedId)
  }

  async function loadLookups() {
    const [categoriesResponse, unitsResponse, warehousesResponse] = await Promise.all([
      listCategories(),
      listUnits(),
      listWarehouses({ limit: 100 }),
    ])
    setCategories(categoriesResponse.data ?? [])
    setUnits(unitsResponse.data ?? [])
    setWarehouses(warehousesResponse.data?.items ?? warehousesResponse.data ?? [])
  }

  async function loadProductDetail(productId) {
    if (!productId) {
      setSelectedProduct(null)
      return
    }

    try {
      setIsLoadingDetail(true)
      const response = await getProduct(productId)
      setSelectedProduct(response.data)
      setInitialStock(EMPTY_INITIAL_STOCK)
      productForm.setValues(createProductInitialValues(response.data))
      productForm.setErrors({})
      productForm.clearFeedback()
    } catch (error) {
      setProductFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsLoadingDetail(false)
    }
  }

  // Initial bootstrap intentionally runs once for first-load hydration.
  useEffect(() => {
    async function bootstrap() {
      try {
        setIsLoading(true)
        await Promise.all([loadLookups(), loadProducts(filters, false)])
      } catch (error) {
        setProductFeedback({ tone: 'error', message: error.message })
      } finally {
        setIsLoading(false)
      }
    }

    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Detail fetch runs only when the selected product id changes.
  useEffect(() => {
    if (selectedProductId) {
      loadProductDetail(selectedProductId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId])

  useEffect(() => {
    async function loadOpeningStockZones() {
      if (!initialStock.enabled || !initialStock.warehouseId) {
        setOpeningStockZones([])
        setOpeningStockBins([])
        return
      }

      try {
        const response = await listZones(initialStock.warehouseId)
        setOpeningStockZones(response.data ?? [])
      } catch (error) {
        setProductFeedback({ tone: 'error', message: error.message })
      }
    }

    loadOpeningStockZones()
  }, [initialStock.enabled, initialStock.warehouseId])

  useEffect(() => {
    async function loadOpeningStockBins() {
      if (!initialStock.enabled || !initialStock.zoneId) {
        setOpeningStockBins([])
        return
      }

      try {
        const response = await listBins(initialStock.zoneId)
        setOpeningStockBins(response.data ?? [])
      } catch (error) {
        setProductFeedback({ tone: 'error', message: error.message })
      }
    }

    loadOpeningStockBins()
  }, [initialStock.enabled, initialStock.zoneId])

  function handleProductChange(event) {
    const { name, value, type, checked } = event.target

    if (name === 'productType' && value === 'SERVICE') {
      setInitialStock(EMPTY_INITIAL_STOCK)
    }

    productForm.setValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
    productForm.setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function handleMultiToggle(categoryId) {
    productForm.setValues((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(categoryId)
        ? current.categoryIds.filter((id) => id !== categoryId)
        : [...current.categoryIds, categoryId],
    }))
  }

  async function handleProductSubmit(event) {
    event.preventDefault()
    const submissionValues = {
      ...productForm.values,
      openingStock: initialStock,
    }
    const validationErrors = validateProductForm(submissionValues)
    productForm.setErrors(validationErrors)
    productForm.clearFeedback()

    if (Object.keys(validationErrors).length) {
      return
    }

    try {
      productForm.setIsSubmitting(true)
      const payload = normalizeProductPayload(submissionValues)

      if (selectedProductId && selectedProduct) {
        await updateProduct(selectedProductId, payload)
        productForm.setServerTone('success')
        productForm.setServerMessage('Product updated successfully.')
        setProductFeedback({ tone: 'success', message: 'Product updated successfully.' })
      } else {
        const response = await createProduct(payload)
        productForm.setServerTone('success')
        productForm.setServerMessage('Product created successfully.')
        setProductFeedback({ tone: 'success', message: 'Product created successfully.' })
        setSelectedProductId(response.data?.id ?? null)
        setInitialStock(EMPTY_INITIAL_STOCK)
      }

      await loadProducts(filters, false)
      await loadLookups()
    } catch (error) {
      const { fieldErrors: pf, summary: ps } = parseApiValidationError(error)
      productForm.setErrors((current) => ({ ...current, ...pf }))
      productForm.setServerTone('error')
      productForm.setServerMessage(ps ?? error.message)
      setProductFeedback({ tone: 'error', message: error.message })
    } finally {
      productForm.setIsSubmitting(false)
    }
  }

  async function handleDeleteProduct() {
    if (!selectedProductId || !canDelete) {
      return
    }

    try {
      await deleteProduct(selectedProductId)
      setProductFeedback({ tone: 'success', message: 'Product deleted successfully.' })
      setSelectedProductId(null)
      setSelectedProduct(null)
      productForm.setValues(createProductInitialValues())
      await loadProducts(filters, false)
    } catch (error) {
      setProductFeedback({ tone: 'error', message: error.message })
    }
  }

  async function handleCategorySubmit(event) {
    event.preventDefault()
    const validationErrors = validateCategoryForm(categoryForm.values)
    categoryForm.setErrors(validationErrors)
    categoryForm.clearFeedback()

    if (Object.keys(validationErrors).length) {
      return
    }

    try {
      categoryForm.setIsSubmitting(true)
      if (categoryEditId) {
        await updateCategory(categoryEditId, normalizeCategoryPayload(categoryForm.values))
        categoryForm.setServerTone('success')
        categoryForm.setServerMessage('Category updated successfully.')
      } else {
        await createCategory(normalizeCategoryPayload(categoryForm.values))
        categoryForm.setServerTone('success')
        categoryForm.setServerMessage('Category created successfully.')
      }

      setCategoryFeedback({
        tone: 'success',
        message: categoryEditId ? 'Category updated successfully.' : 'Category created successfully.',
      })
      setCategoryEditId(null)
      categoryForm.setValues(createCategoryInitialValues())
      await loadLookups()
    } catch (error) {
      const { fieldErrors: cf, summary: cs } = parseApiValidationError(error)
      categoryForm.setErrors((current) => ({ ...current, ...cf }))
      categoryForm.setServerTone('error')
      categoryForm.setServerMessage(cs ?? error.message)
      setCategoryFeedback({ tone: 'error', message: error.message })
    } finally {
      categoryForm.setIsSubmitting(false)
    }
  }

  async function handleUnitSubmit(event) {
    event.preventDefault()
    const validationErrors = validateUnitForm(unitForm.values)
    unitForm.setErrors(validationErrors)
    unitForm.clearFeedback()

    if (Object.keys(validationErrors).length) {
      return
    }

    try {
      unitForm.setIsSubmitting(true)
      if (unitEditId) {
        await updateUnit(unitEditId, normalizeUnitPayload(unitForm.values))
        unitForm.setServerTone('success')
        unitForm.setServerMessage('Unit updated successfully.')
      } else {
        await createUnit(normalizeUnitPayload(unitForm.values))
        unitForm.setServerTone('success')
        unitForm.setServerMessage('Unit created successfully.')
      }

      setUnitFeedback({
        tone: 'success',
        message: unitEditId ? 'Unit updated successfully.' : 'Unit created successfully.',
      })
      setUnitEditId(null)
      unitForm.setValues(createUnitInitialValues())
      await loadLookups()
    } catch (error) {
      const { fieldErrors: uf, summary: us } = parseApiValidationError(error)
      unitForm.setErrors((current) => ({ ...current, ...uf }))
      unitForm.setServerTone('error')
      unitForm.setServerMessage(us ?? error.message)
      setUnitFeedback({ tone: 'error', message: error.message })
    } finally {
      unitForm.setIsSubmitting(false)
    }
  }

  function resetProductForm() {
    setSelectedProductId(null)
    setSelectedProduct(null)
    setInitialStock(EMPTY_INITIAL_STOCK)
    productForm.setValues(createProductInitialValues())
    productForm.setErrors({})
    productForm.clearFeedback()
  }

  function selectCategoryForEdit(category) {
    setCategoryEditId(category.id)
    categoryForm.setValues(createCategoryInitialValues(category))
    categoryForm.clearFeedback()
  }

  function selectUnitForEdit(unit) {
    setUnitEditId(unit.id)
    unitForm.setValues(createUnitInitialValues(unit))
    unitForm.clearFeedback()
  }

  async function handleDeleteCategory(categoryId) {
    if (!canEdit) {
      return
    }

    try {
      await deleteCategory(categoryId)
      setCategoryFeedback({ tone: 'success', message: 'Category deleted successfully.' })
      if (categoryEditId === categoryId) {
        setCategoryEditId(null)
        categoryForm.setValues(createCategoryInitialValues())
      }
      await loadLookups()
    } catch (error) {
      setCategoryFeedback({ tone: 'error', message: error.message })
    }
  }

  async function handleDeleteUnit(unitId) {
    if (!canEdit) {
      return
    }

    try {
      await deleteUnit(unitId)
      setUnitFeedback({ tone: 'success', message: 'Unit deleted successfully.' })
      if (unitEditId === unitId) {
        setUnitEditId(null)
        unitForm.setValues(createUnitInitialValues())
      }
      await loadLookups()
    } catch (error) {
      setUnitFeedback({ tone: 'error', message: error.message })
    }
  }

  async function handleFilterSubmit(event) {
    event.preventDefault()
    try {
      setIsLoading(true)
      await loadProducts(filters, false)
    } catch (error) {
      setProductFeedback({ tone: 'error', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-soft)]">
            Product module
          </p>
          <h1 className="mt-2 font-[var(--font-body)] text-4xl text-[var(--ink)]">
            Product catalog control
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
            Manage product records, supporting units, and category structure from one operational workspace.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.2rem] border border-[var(--line)] bg-white px-4 py-4 shadow-[0_10px_25px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">Products</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{products.length}</p>
          </div>
          <div className="rounded-[1.2rem] border border-[var(--line)] bg-white px-4 py-4 shadow-[0_10px_25px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">Categories</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{categories.length}</p>
          </div>
          <div className="rounded-[1.2rem] border border-[var(--line)] bg-white px-4 py-4 shadow-[0_10px_25px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">Units</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{units.length}</p>
          </div>
        </div>
      </section>

      <StatusAlert tone={productFeedback.tone} message={productFeedback.message} />

      <section className="grid gap-6 2xl:grid-cols-[1.25fr_1fr]">
        <article className="rounded-[1.5rem] border border-[var(--line)] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Catalog listing</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Search and review tenant-bound product records
                </p>
              </div>

              <form onSubmit={handleFilterSubmit} className="grid gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, search: event.target.value }))
                  }
                  placeholder="Search by name or SKU"
                  className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted-soft)]"
                />
                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, status: event.target.value }))
                  }
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
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, productType: event.target.value }))
                  }
                  className="rounded-[0.9rem] border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink)] outline-none"
                >
                  <option value="">All types</option>
                  {productTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </form>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead className="bg-[var(--panel)]">
                <tr>
                  {['Product', 'Type', 'Status', 'Unit', 'Categories', 'Price', 'Variants'].map((heading) => (
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
                    <td colSpan="7" className="px-5 py-10 text-center text-sm text-[var(--muted)]">
                      Loading products...
                    </td>
                  </tr>
                ) : products.length ? (
                  products.map((product) => (
                    <tr
                      key={product.id}
                      onClick={() => setSelectedProductId(product.id)}
                      className={`cursor-pointer border-t border-[var(--line)] transition ${
                        selectedProductId === product.id ? 'bg-[#F3F4F6]/40' : 'hover:bg-[var(--panel)]'
                      }`}
                    >
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
                      <td className="px-5 py-4 text-sm text-[var(--muted)]">
                        {product.unit?.code ?? 'No unit'}
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--muted)]">
                        {product.categories?.map((category) => category.name).join(', ') || 'Unassigned'}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-[var(--ink)]">
                        {product.sellingPrice !== null && product.sellingPrice !== undefined
                          ? `${product.currencyCode ?? 'INR'} ${product.sellingPrice}`
                          : 'No price'}
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--muted)]">{product.variantCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-5 py-10 text-center text-sm text-[var(--muted)]">
                      No products found for the current filter set.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-[var(--line)] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">
                {selectedProductId ? 'Product detail & editor' : 'Create new product'}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {selectedProductId
                  ? 'Review the selected product and edit first-release fields.'
                  : 'Create a first-release product record with categories and unit assignment.'}
              </p>
            </div>
            {!canEdit ? (
              <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                Read only
              </span>
            ) : null}
          </div>

          {isLoadingDetail && selectedProductId ? (
            <div className="mt-6 rounded-[1rem] bg-[var(--panel)] px-4 py-4 text-sm text-[var(--muted)]">
              Loading selected product...
            </div>
          ) : (
            <form onSubmit={handleProductSubmit} className="mt-6 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Product Name" name="name" value={productForm.values.name} onChange={handleProductChange} error={productForm.errors.name} />
                <FormSelect label="Product Type" name="productType" value={productForm.values.productType} onChange={handleProductChange} error={productForm.errors.productType} options={productTypeOptions} />
                <FormSelect label="Status" name="status" value={productForm.values.status} onChange={handleProductChange} error={productForm.errors.status} options={productStatusOptions} />
                <FormSelect
                  label="Unit"
                  name="unitId"
                  value={productForm.values.unitId}
                  onChange={handleProductChange}
                  error={productForm.errors.unitId}
                  options={[{ value: '', label: 'No unit' }, ...units.map((unit) => ({ value: unit.id, label: `${unit.name} (${unit.code})` }))]}
                />
                <FormField label="SKU" name="sku" value={productForm.values.sku} onChange={handleProductChange} error={productForm.errors.sku} />
                <FormField label="Barcode" name="barcode" value={productForm.values.barcode} onChange={handleProductChange} error={productForm.errors.barcode} />
                <FormField label="Currency" name="currencyCode" value={productForm.values.currencyCode} onChange={handleProductChange} error={productForm.errors.currencyCode} />
                <FormField label="Cost Price" name="costPrice" type="number" value={productForm.values.costPrice} onChange={handleProductChange} error={productForm.errors.costPrice} />
                <FormField label="Selling Price" name="sellingPrice" type="number" value={productForm.values.sellingPrice} onChange={handleProductChange} error={productForm.errors.sellingPrice} />
                <FormField label="Min Stock" name="minStockLevel" type="number" value={productForm.values.minStockLevel} onChange={handleProductChange} error={productForm.errors.minStockLevel} />
                <FormField label="Max Stock" name="maxStockLevel" type="number" value={productForm.values.maxStockLevel} onChange={handleProductChange} error={productForm.errors.maxStockLevel} />
              </div>

              <FormTextarea label="Description" name="description" rows={4} value={productForm.values.description} onChange={handleProductChange} error={productForm.errors.description} />

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <CheckboxField label="Sellable" name="isSellable" checked={productForm.values.isSellable} onChange={handleProductChange} disabled={!canEdit} />
                <CheckboxField label="Purchasable" name="isPurchasable" checked={productForm.values.isPurchasable} onChange={handleProductChange} disabled={!canEdit} />
                <CheckboxField label="Track inventory" name="trackInventory" checked={productForm.values.trackInventory} onChange={handleProductChange} disabled={!canEdit} />
                <CheckboxField label="Allow backorder" name="allowBackorder" checked={productForm.values.allowBackorder} onChange={handleProductChange} disabled={!canEdit} />
              </div>

              {!selectedProductId && productForm.values.productType !== 'SERVICE' ? (
                <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--panel)] p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="enableInlineOpeningStock"
                      checked={initialStock.enabled}
                      onChange={(event) => setInitialStock({ ...initialStock, enabled: event.target.checked })}
                      className="h-4 w-4 rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    <div>
                      <label htmlFor="enableInlineOpeningStock" className="cursor-pointer text-sm font-semibold text-[var(--ink)]">
                        Add opening inventory with this product
                      </label>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        This creates the product and its first inventory entry together in one save for simple, variable, and bundle products.
                      </p>
                    </div>
                  </div>

                  {initialStock.enabled ? (
                    <div className="mt-4 grid gap-4 border-t border-[var(--line)] pt-4 md:grid-cols-2">
                      <StatusAlert tone="error" message={productForm.errors.openingStock} />
                      <FormSelect
                        label="Warehouse *"
                        name="openingStockWarehouseId"
                        value={initialStock.warehouseId}
                        onChange={(event) =>
                          setInitialStock({ ...initialStock, warehouseId: event.target.value, zoneId: '', binId: '' })
                        }
                        error={productForm.errors.openingStockWarehouseId}
                        options={[
                          { value: '', label: 'Choose a warehouse' },
                          ...warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
                        ]}
                      />
                      <FormSelect
                        label="Zone"
                        name="openingStockZoneId"
                        value={initialStock.zoneId}
                        onChange={(event) => setInitialStock({ ...initialStock, zoneId: event.target.value, binId: '' })}
                        options={[
                          { value: '', label: initialStock.warehouseId ? 'No zone' : 'Choose a warehouse first' },
                          ...openingStockZones.map((zone) => ({ value: zone.id, label: zone.name })),
                        ]}
                      />
                      <FormSelect
                        label="Bin"
                        name="openingStockBinId"
                        value={initialStock.binId}
                        onChange={(event) => setInitialStock({ ...initialStock, binId: event.target.value })}
                        options={[
                          { value: '', label: initialStock.zoneId ? 'No bin' : 'Choose a zone first' },
                          ...openingStockBins.map((bin) => ({ value: bin.id, label: bin.name })),
                        ]}
                      />
                      <FormField
                        label="Opening Quantity *"
                        name="openingStockQuantity"
                        type="number"
                        value={initialStock.quantity}
                        onChange={(event) => setInitialStock({ ...initialStock, quantity: event.target.value })}
                        error={productForm.errors.openingStockQuantity}
                      />
                      <div className="md:col-span-2">
                        <FormTextarea
                          label="Opening Inventory Notes"
                          name="openingStockNotes"
                          rows={3}
                          value={initialStock.notes}
                          onChange={(event) => setInitialStock({ ...initialStock, notes: event.target.value })}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--panel)] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">Categories</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">Assign the product to one or more active categories</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                    {productForm.values.categoryIds.length} selected
                  </span>
                </div>
                <div className="mt-4">
                  <ToggleList items={categories} selectedIds={productForm.values.categoryIds} onToggle={handleMultiToggle} disabled={!canEdit} />
                </div>
              </div>

              <StatusAlert tone={productForm.serverTone} message={productForm.serverMessage} />

              <div className="flex flex-wrap gap-3">
                {canEdit ? (
                  <button
                    type="submit"
                    disabled={productForm.isSubmitting}
                    className="rounded-[1rem] bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] transition disabled:opacity-60"
                  >
                    {productForm.isSubmitting ? 'Saving...' : selectedProductId ? 'Update product' : 'Create product'}
                  </button>
                ) : null}
                <button type="button" onClick={resetProductForm} className="rounded-[1rem] border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)]">
                  New form
                </button>
                {selectedProductId && canDelete ? (
                  <button type="button" onClick={handleDeleteProduct} className="rounded-[1rem] rounded-lg bg-[#EF4444] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#DC2626] transition">
                    Delete product
                  </button>
                ) : null}
              </div>
            </form>
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <StatusAlert tone={categoryFeedback.tone} message={categoryFeedback.message} />
          <ManagementCard
            title="Category management"
            description="Create and maintain product categories inside the same module workspace."
            form={categoryForm}
            onSubmit={handleCategorySubmit}
            submitLabel={categoryEditId ? 'Update category' : 'Create category'}
            onReset={() => {
              setCategoryEditId(null)
              categoryForm.setValues(createCategoryInitialValues())
              categoryForm.clearFeedback()
            }}
            canManage={canEdit}
          >
            <FormField label="Category Name" name="name" value={categoryForm.values.name} onChange={categoryForm.handleChange} error={categoryForm.errors.name} />
            <FormSelect
              label="Parent Category"
              name="parentCategoryId"
              value={categoryForm.values.parentCategoryId}
              onChange={categoryForm.handleChange}
              error={categoryForm.errors.parentCategoryId}
              options={[{ value: '', label: 'No parent category' }, ...categories.filter((category) => category.id !== categoryEditId).map((category) => ({ value: category.id, label: category.name }))]}
            />
            <FormTextarea label="Description" name="description" rows={3} value={categoryForm.values.description} onChange={categoryForm.handleChange} error={categoryForm.errors.description} />
          </ManagementCard>

          <article className="rounded-[1.5rem] border border-[var(--line)] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold text-[var(--ink)]">Existing categories</p>
            <div className="mt-4 space-y-3">
              {categories.length ? (
                categories.map((category) => (
                  <div key={category.id} className="flex items-start justify-between gap-4 rounded-[1rem] border border-[var(--line)] bg-[var(--panel)] px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">{category.name}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{category.description || category.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      {canEdit ? (
                        <>
                          <button type="button" onClick={() => selectCategoryForEdit(category)} className="rounded-md bg-[#3B82F6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition">
                            Edit
                          </button>
                          <button type="button" onClick={() => handleDeleteCategory(category.id)} className="rounded-[0.8rem] rounded-md bg-[#EF4444] px-3 py-2 text-xs font-semibold text-white hover:bg-[#DC2626] transition">
                            Delete
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1rem] border border-dashed border-[var(--line)] bg-[var(--panel)] px-4 py-4 text-sm text-[var(--muted)]">
                  No categories created yet.
                </div>
              )}
            </div>
          </article>
        </div>

        <div className="space-y-4">
          <StatusAlert tone={unitFeedback.tone} message={unitFeedback.message} />
          <ManagementCard
            title="Unit management"
            description="Maintain units used by products and future product variants."
            form={unitForm}
            onSubmit={handleUnitSubmit}
            submitLabel={unitEditId ? 'Update unit' : 'Create unit'}
            onReset={() => {
              setUnitEditId(null)
              unitForm.setValues(createUnitInitialValues())
              unitForm.clearFeedback()
            }}
            canManage={canEdit}
          >
            <FormField label="Unit Name" name="name" value={unitForm.values.name} onChange={unitForm.handleChange} error={unitForm.errors.name} />
            <FormField label="Unit Code" name="code" value={unitForm.values.code} onChange={unitForm.handleChange} error={unitForm.errors.code} />
            <FormTextarea label="Description" name="description" rows={3} value={unitForm.values.description} onChange={unitForm.handleChange} error={unitForm.errors.description} />
          </ManagementCard>

          <article className="rounded-[1.5rem] border border-[var(--line)] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold text-[var(--ink)]">Existing units</p>
            <div className="mt-4 space-y-3">
              {units.length ? (
                units.map((unit) => (
                  <div key={unit.id} className="flex items-start justify-between gap-4 rounded-[1rem] border border-[var(--line)] bg-[var(--panel)] px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">{unit.name} ({unit.code})</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{unit.description || 'No description'}</p>
                    </div>
                    <div className="flex gap-2">
                      {canEdit ? (
                        <>
                          <button type="button" onClick={() => selectUnitForEdit(unit)} className="rounded-md bg-[#3B82F6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition">
                            Edit
                          </button>
                          <button type="button" onClick={() => handleDeleteUnit(unit.id)} className="rounded-[0.8rem] rounded-md bg-[#EF4444] px-3 py-2 text-xs font-semibold text-white hover:bg-[#DC2626] transition">
                            Delete
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1rem] border border-dashed border-[var(--line)] bg-[var(--panel)] px-4 py-4 text-sm text-[var(--muted)]">
                  No units created yet.
                </div>
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
