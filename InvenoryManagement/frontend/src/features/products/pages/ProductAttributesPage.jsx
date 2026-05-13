import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { useAuthForm } from '../../auth/hooks/useAuthForm.js'
import {
  createProductAttribute,
  createProductAttributeValue,
  deleteProductAttribute,
  deleteProductAttributeValue,
  getProduct,
  listProductAttributes,
  updateProductAttribute,
  updateProductAttributeValue,
} from '../api/productsApi.js'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { ManagementCard } from '../components/ProductShared.jsx'

function createAttributeInitialValues(attribute) {
  return {
    name: attribute?.name ?? '',
    sortOrder: attribute?.sortOrder ?? 0,
    valuesText: attribute?.values?.map((value) => value.value).join(', ') ?? '',
  }
}

function createValueInitialValues(value) {
  return {
    value: value?.value ?? '',
    sortOrder: value?.sortOrder ?? 0,
  }
}

export function ProductAttributesPage() {
  const { productId } = useParams()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('PRODUCTS', 'CREATE') || can('PRODUCTS', 'UPDATE')
  const attributeForm = useAuthForm(createAttributeInitialValues())
  const valueForm = useAuthForm(createValueInitialValues())
  const [product, setProduct] = useState(null)
  const [attributes, setAttributes] = useState([])
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' })
  const [editAttributeId, setEditAttributeId] = useState(null)
  const [selectedAttributeId, setSelectedAttributeId] = useState(null)
  const [editValueContext, setEditValueContext] = useState(null)

  async function loadPage() {
    const [productResponse, attributesResponse] = await Promise.all([
      getProduct(productId),
      listProductAttributes(productId),
    ])
    setProduct(productResponse.data)
    setAttributes(attributesResponse.data ?? [])
  }

  useEffect(() => {
    loadPage().catch((error) => setFeedback({ tone: 'error', message: error.message }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  async function handleAttributeSubmit(event) {
    event.preventDefault()
    const values = attributeForm.values.valuesText
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    if (!attributeForm.values.name.trim()) {
      attributeForm.setErrors({ name: 'Attribute name is required' })
      return
    }

    if (!editAttributeId && !values.length) {
      attributeForm.setErrors({ valuesText: 'Add at least one value for a new attribute' })
      return
    }

    try {
      attributeForm.setIsSubmitting(true)
      if (editAttributeId) {
        await updateProductAttribute(productId, editAttributeId, {
          name: attributeForm.values.name.trim(),
          sortOrder: Number(attributeForm.values.sortOrder || 0),
        })
      } else {
        await createProductAttribute(productId, {
          name: attributeForm.values.name.trim(),
          sortOrder: Number(attributeForm.values.sortOrder || 0),
          values: values.map((value, index) => ({
            value,
            sortOrder: index,
          })),
        })
      }
      setFeedback({ tone: 'success', message: editAttributeId ? 'Attribute updated successfully.' : 'Attribute created successfully.' })
      setEditAttributeId(null)
      attributeForm.setValues(createAttributeInitialValues())
      attributeForm.clearFeedback()
      await loadPage()
    } catch (error) {
      const { fieldErrors: af, summary: as } = parseApiValidationError(error)
      attributeForm.setErrors((current) => ({ ...current, ...af }))
      attributeForm.setServerTone('error')
      attributeForm.setServerMessage(as ?? error.message)
    } finally {
      attributeForm.setIsSubmitting(false)
    }
  }

  async function handleValueSubmit(event) {
    event.preventDefault()

    if (!selectedAttributeId) {
      valueForm.setErrors({ value: 'Choose an attribute first' })
      return
    }

    if (!valueForm.values.value.trim()) {
      valueForm.setErrors({ value: 'Value is required' })
      return
    }

    try {
      valueForm.setIsSubmitting(true)
      if (editValueContext) {
        await updateProductAttributeValue(
          productId,
          selectedAttributeId,
          editValueContext.valueId,
          {
            value: valueForm.values.value.trim(),
            sortOrder: Number(valueForm.values.sortOrder || 0),
          },
        )
      } else {
        await createProductAttributeValue(productId, selectedAttributeId, {
          value: valueForm.values.value.trim(),
          sortOrder: Number(valueForm.values.sortOrder || 0),
        })
      }
      setFeedback({ tone: 'success', message: editValueContext ? 'Attribute value updated successfully.' : 'Attribute value created successfully.' })
      setEditValueContext(null)
      valueForm.setValues(createValueInitialValues())
      valueForm.clearFeedback()
      await loadPage()
    } catch (error) {
      const { fieldErrors: vf, summary: vs } = parseApiValidationError(error)
      valueForm.setErrors((current) => ({ ...current, ...vf }))
      valueForm.setServerTone('error')
      valueForm.setServerMessage(vs ?? error.message)
    } finally {
      valueForm.setIsSubmitting(false)
    }
  }

  async function handleDeleteAttribute(attributeId) {
    try {
      await deleteProductAttribute(productId, attributeId)
      setFeedback({ tone: 'success', message: 'Attribute deleted successfully.' })
      if (selectedAttributeId === attributeId) {
        setSelectedAttributeId(null)
      }
      await loadPage()
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    }
  }

  async function handleDeleteValue(attributeId, valueId) {
    try {
      await deleteProductAttributeValue(productId, attributeId, valueId)
      setFeedback({ tone: 'success', message: 'Attribute value deleted successfully.' })
      await loadPage()
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    }
  }

  return (
    <div className="space-y-6">
      <StatusAlert tone={feedback.tone} message={feedback.message} />

      <section className="rounded-[1.4rem] border border-[var(--line)] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-soft)]">Attribute Management</p>
            <h2 className="mt-2 text-2xl font-[var(--font-body)] text-[var(--ink)]">
              {product?.name ?? 'Variable product'}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Manage product-level attribute definitions and allowed values for variable products.
            </p>
          </div>
          <Link
            to={productId ? `/app/products/${productId}` : '/app/products/list'}
            className="rounded-[1rem] border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
          >
            Back to product
          </Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ManagementCard
          title="Attribute definition"
          description="Create or rename a product attribute and seed it with starting values."
          form={attributeForm}
          onSubmit={handleAttributeSubmit}
          submitLabel={editAttributeId ? 'Update attribute' : 'Create attribute'}
          onReset={() => {
            setEditAttributeId(null)
            attributeForm.setValues(createAttributeInitialValues())
            attributeForm.clearFeedback()
          }}
          canManage={canEdit}
        >
          <FormField label="Attribute Name" name="name" value={attributeForm.values.name} onChange={attributeForm.handleChange} error={attributeForm.errors.name} />
          <FormField label="Sort Order" name="sortOrder" type="number" value={attributeForm.values.sortOrder} onChange={attributeForm.handleChange} error={attributeForm.errors.sortOrder} />
          {!editAttributeId ? (
            <FormField
              label="Initial Values"
              name="valuesText"
              value={attributeForm.values.valuesText}
              onChange={attributeForm.handleChange}
              error={attributeForm.errors.valuesText}
              placeholder="Small, Medium, Large"
            />
          ) : (
            <div className="rounded-[0.9rem] bg-[var(--panel)] px-4 py-3 text-sm text-[var(--muted)]">
              Initial values are only used during creation. Add more values from the value management form.
            </div>
          )}
        </ManagementCard>

        <ManagementCard
          title="Attribute value"
          description="Choose an attribute and manage the values users can assign to variants."
          form={valueForm}
          onSubmit={handleValueSubmit}
          submitLabel={editValueContext ? 'Update value' : 'Create value'}
          onReset={() => {
            setEditValueContext(null)
            valueForm.setValues(createValueInitialValues())
            valueForm.clearFeedback()
          }}
          canManage={canEdit}
        >
          <div className="space-y-2 text-sm font-medium text-slate-700">
            <span>Attribute</span>
            <select
              value={selectedAttributeId ?? ''}
              onChange={(event) => setSelectedAttributeId(event.target.value || null)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
            >
              <option value="">Select attribute</option>
              {attributes.map((attribute) => (
                <option key={attribute.id} value={attribute.id}>
                  {attribute.name}
                </option>
              ))}
            </select>
          </div>
          <FormField label="Value" name="value" value={valueForm.values.value} onChange={valueForm.handleChange} error={valueForm.errors.value} />
          <FormField label="Sort Order" name="sortOrder" type="number" value={valueForm.values.sortOrder} onChange={valueForm.handleChange} error={valueForm.errors.sortOrder} />
        </ManagementCard>
      </div>

      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold text-[var(--ink)]">Existing attributes</p>
        <div className="mt-4 space-y-4">
          {attributes.length ? (
            attributes.map((attribute) => (
              <article key={attribute.id} className="rounded-[1rem] border border-[var(--line)] bg-[var(--panel)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">{attribute.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Sort order {attribute.sortOrder} | Used by {attribute.variantUsageCount} variants
                    </p>
                  </div>
                  {canEdit ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditAttributeId(attribute.id)
                          attributeForm.setValues(createAttributeInitialValues(attribute))
                        }}
                        className="rounded-md bg-[#3B82F6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAttributeId(attribute.id)
                          setEditValueContext(null)
                          valueForm.setValues(createValueInitialValues())
                        }}
                        className="rounded-md bg-[#3B82F6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition"
                      >
                        Add value
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttribute(attribute.id)}
                        className="rounded-[0.8rem] rounded-md bg-[#EF4444] px-3 py-2 text-xs font-semibold text-white hover:bg-[#DC2626] transition"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {attribute.values.length ? (
                    attribute.values.map((value) => (
                      <div key={value.id} className="rounded-[0.9rem] border border-[var(--line)] bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--ink)]">{value.value}</p>
                            <p className="mt-1 text-xs text-[var(--muted)]">Sort order {value.sortOrder}</p>
                          </div>
                          {canEdit ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAttributeId(attribute.id)
                                  setEditValueContext({ attributeId: attribute.id, valueId: value.id })
                                  valueForm.setValues(createValueInitialValues(value))
                                }}
                                className="rounded-[0.7rem] border border-[var(--line)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ink)]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteValue(attribute.id, value.id)}
                                className="rounded-[0.7rem] border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700"
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[0.9rem] border border-dashed border-[var(--line)] bg-white px-4 py-4 text-sm text-[var(--muted)]">
                      No values defined yet.
                    </div>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1rem] border border-dashed border-[var(--line)] bg-[var(--panel)] px-4 py-4 text-sm text-[var(--muted)]">
              No product attributes defined yet.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
