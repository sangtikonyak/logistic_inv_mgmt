import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { deleteProduct, getProduct, listProducts } from '../api/productsApi.js'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'

export function ProductDetailPage() {
  const navigate = useNavigate()
  const { productId } = useParams()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canCreate = can('PRODUCTS', 'CREATE')
  const canUpdate = can('PRODUCTS', 'UPDATE')
  const canDelete = can('PRODUCTS', 'DELETE')
  const [product, setProduct] = useState(null)
  const [bundleProductMap, setBundleProductMap] = useState(new Map())
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadDetail() {
      try {
        setIsLoading(true)
        const [productResponse, productsResponse] = await Promise.all([
          getProduct(productId),
          listProducts({ page: 1, limit: 100, sortBy: 'name', sortDir: 'ASC' }),
        ])
        setProduct(productResponse.data)
        setBundleProductMap(
          new Map((productsResponse.data?.items ?? productsResponse.data ?? []).map((item) => [item.id, item])),
        )
      } catch (error) {
        setFeedback({ tone: 'error', message: error.message })
      } finally {
        setIsLoading(false)
      }
    }

    loadDetail()
  }, [productId])

  async function handleDelete() {
    if (!canDelete) {
      return
    }

    try {
      await deleteProduct(productId)
      navigate('/app/products/list', { replace: true })
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    }
  }

  return (
    <div className="space-y-6">
      <StatusAlert tone={feedback.tone} message={feedback.message} />
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        {isLoading ? (
          <div className="text-sm text-[var(--muted)]">Loading product detail...</div>
        ) : product ? (
          <>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">
                  Product detail
                </p>
                <h2 className="mt-2 font-[var(--font-body)] text-3xl text-[var(--ink)]">{product.name}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {product.description || 'No description provided.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.productType === 'VARIABLE' && canUpdate ? (
                  <Link
                    to={`/app/products/${product.id}/attributes`}
                    className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
                  >
                    Manage attributes
                  </Link>
                ) : null}
                {canUpdate ? (
                  <Link
                    to={`/app/products/${product.id}/edit`}
                    className="rounded-[1rem] bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] transition"
                  >
                    Edit product
                  </Link>
                ) : null}
                {canCreate ? (
                  <Link
                    to={`/app/products/new?cloneOf=${product.id}`}
                    className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
                  >
                    Clone as new
                  </Link>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded-[1rem] rounded-lg bg-[#EF4444] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#DC2626] transition"
                  >
                    Delete product
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ['Status', product.status],
                ['Type', product.productType],
                ['Unit', product.unit?.name ? `${product.unit.name} (${product.unit.code})` : 'No unit'],
                ['Currency', product.currencyCode || 'Not set'],
                ['SKU', product.sku || 'Auto-generated'],
                ['Barcode', product.barcode || 'Not set'],
                ['Selling Price', product.sellingPrice ?? 'Not set'],
                ['Cost Price', product.costPrice ?? 'Not set'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1rem] bg-[var(--panel)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--panel)] p-4">
                <p className="text-sm font-semibold text-[var(--ink)]">Categories</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.categories?.length ? (
                    product.categories.map((category) => (
                      <span key={category.id} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                        {category.name}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--muted)]">No categories assigned.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--panel)] p-4">
                <p className="text-sm font-semibold text-[var(--ink)]">Operational flags</p>
                <div className="mt-3 grid gap-2">
                  {[
                    ['Sellable', product.isSellable],
                    ['Purchasable', product.isPurchasable],
                    ['Track inventory', product.trackInventory],
                    ['Allow backorder', product.allowBackorder],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-[0.85rem] bg-white px-3 py-2 text-sm">
                      <span className="text-[var(--muted)]">{label}</span>
                      <span className="font-semibold text-[var(--ink)]">{value ? 'Yes' : 'No'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--panel)] p-4">
                <p className="text-sm font-semibold text-[var(--ink)]">Custom field values</p>
                <div className="mt-3 grid gap-2">
                  {product.customFieldValues?.length ? (
                    product.customFieldValues.map((fieldValue) => (
                      <div key={fieldValue.definitionId} className="flex items-center justify-between rounded-[0.85rem] bg-white px-3 py-2 text-sm">
                        <span className="text-[var(--muted)]">{fieldValue.fieldKey}</span>
                        <span className="font-semibold text-[var(--ink)]">
                          {Array.isArray(fieldValue.value) ? fieldValue.value.join(', ') : String(fieldValue.value)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--muted)]">No custom field values saved.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--panel)] p-4">
                <p className="text-sm font-semibold text-[var(--ink)]">Bundle components</p>
                <div className="mt-3 grid gap-2">
                  {product.bundleComponents?.length ? (
                    product.bundleComponents.map((component) => (
                      <div key={component.id} className="flex items-center justify-between rounded-[0.85rem] bg-white px-3 py-2 text-sm">
                        <span className="text-[var(--muted)]">
                          {bundleProductMap.get(component.componentProductId)?.name ?? component.componentProductId}
                        </span>
                        <span className="font-semibold text-[var(--ink)]">Qty {component.quantity}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--muted)]">No bundle components saved.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[1rem] border border-[var(--line)] bg-[var(--panel)] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">Variants</p>
                  <p className="text-sm text-[var(--muted)]">
                    Review saved variant values, pricing, and attribute combinations.
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                  {product.variants?.length ?? 0} saved
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {product.variants?.length ? (
                  product.variants.map((variant, index) => (
                    <article key={variant.id} className="rounded-[1rem] border border-[var(--line)] bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[var(--ink)]">
                            {variant.name || `Variant ${index + 1}`}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {variant.sku || 'No SKU'} | {variant.barcode || 'No barcode'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                            {variant.unit?.name ? `${variant.unit.name} (${variant.unit.code})` : 'Uses product unit'}
                          </span>
                          <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                            {variant.currencyCode || product.currencyCode || 'No currency'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-[0.9rem] bg-[var(--panel)] p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Attribute</p>
                          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
                            {variant.attributes?.map((attribute) => `${attribute.name}: ${attribute.value}`).join(' | ') || 'No attributes'}
                          </p>
                        </div>
                        <div className="rounded-[0.9rem] bg-[var(--panel)] p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Selling Price</p>
                          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{variant.sellingPrice ?? 'Not set'}</p>
                        </div>
                        <div className="rounded-[0.9rem] bg-[var(--panel)] p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Cost Price</p>
                          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{variant.costPrice ?? 'Not set'}</p>
                        </div>
                        <div className="rounded-[0.9rem] bg-[var(--panel)] p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Sort Order</p>
                          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{variant.sortOrder ?? index}</p>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-[var(--line)] bg-white px-4 py-4 text-sm text-[var(--muted)]">
                    No variants saved for this product yet.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  )
}
