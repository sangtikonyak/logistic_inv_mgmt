import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { useAuthForm } from '../../auth/hooks/useAuthForm.js'
import { createProduct, getProduct, listCategories, listCustomFields, listProducts, listUnits, updateProduct } from '../api/productsApi.js'
import { listBins, listWarehouses, listZones } from '../../warehouses/api/warehousesApi.js'
import {
  buildVariableProductValues,
  createBundleComponentInitialValue,
  createDefaultBundleComponent,
  createDefaultVariant,
  createProductInitialValues,
  createClonedProductInitialValues,
  normalizeProductPayload,
  productStatusOptions,
  productTypeOptions,
  validateProductForm,
} from '../lib/productForms.js'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { FormSelect } from '../../../shared/ui/FormSelect.jsx'
import { FormTextarea } from '../../../shared/ui/FormTextarea.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { CheckboxField } from '../components/ProductShared.jsx'

const EMPTY_INITIAL_STOCK = { enabled: false, warehouseId: '', zoneId: '', binId: '', quantity: '', notes: '' }

export function ProductFormPage() {
  const navigate = useNavigate()
  const { productId } = useParams()
  const [searchParams] = useSearchParams()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('PRODUCTS', 'CREATE') || can('PRODUCTS', 'UPDATE')
  const isEditMode = Boolean(productId)
  const cloneProductId = searchParams.get('cloneOf')
  const isCloneMode = !isEditMode && Boolean(cloneProductId)
  const form = useAuthForm(createProductInitialValues())
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])
  const [productOptions, setProductOptions] = useState([])
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageFeedback, setPageFeedback] = useState({ tone: 'success', message: '' })
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [warehouses, setWarehouses] = useState([])
  const [openingStockZones, setOpeningStockZones] = useState([])
  const [openingStockBins, setOpeningStockBins] = useState([])
  const [initialStock, setInitialStock] = useState(EMPTY_INITIAL_STOCK)

  useEffect(() => {
    async function loadPage() {
      try {
        setIsLoading(true)
        const [categoriesResponse, unitsResponse, productsResponse, customFieldsResponse, warehousesResponse] = await Promise.all([
          listCategories(),
          listUnits(),
          listProducts({ page: 1, limit: 100, sortBy: 'name', sortDir: 'ASC' }),
          listCustomFields(),
          !productId ? listWarehouses({ limit: 100 }) : Promise.resolve({ data: [] }),
        ])
        setCategories(categoriesResponse.data ?? [])
        setUnits(unitsResponse.data ?? [])
        setWarehouses(warehousesResponse.data?.items ?? warehousesResponse.data ?? [])
        setProductOptions((productsResponse.data?.items ?? productsResponse.data ?? []).filter((item) => item.id !== productId))
        const definitions = customFieldsResponse.data ?? []
        setCustomFieldDefinitions(definitions)

        if (productId) {
          const productResponse = await getProduct(productId)
          form.setValues(prepareProductValues(createProductInitialValues(productResponse.data), definitions))
        } else if (cloneProductId) {
          const productResponse = await getProduct(cloneProductId)
          form.setValues(prepareProductValues(createClonedProductInitialValues(productResponse.data), definitions))
        } else {
          form.setValues(prepareProductValues(createProductInitialValues(), definitions))
        }

        setSelectedCategoryId('')
        setInitialStock(EMPTY_INITIAL_STOCK)
      } catch (error) {
        setPageFeedback({ tone: 'error', message: error.message })
      } finally {
        setIsLoading(false)
      }
    }

    loadPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloneProductId, productId])

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
        setPageFeedback({ tone: 'error', message: error.message })
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
        setPageFeedback({ tone: 'error', message: error.message })
      }
    }

    loadOpeningStockBins()
  }, [initialStock.enabled, initialStock.zoneId])

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    const nextValue = type === 'checkbox' ? checked : value

    if (name === 'productType' && nextValue === 'SERVICE') {
      setInitialStock(EMPTY_INITIAL_STOCK)
    }

    form.setValues((current) => ({
      ...current,
      ...(name === 'productType' ? getProductTypeValuePatch(current, nextValue) : { [name]: nextValue }),
    }))
    form.setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function handleVariantChange(index, field, value) {
    form.setValues((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index
          ? {
              ...variant,
              [field]: value,
            }
          : variant,
      ),
    }))
    form.setErrors((current) => ({ ...current, [`variants.${index}.${field}`]: undefined, variants: undefined }))
  }

  function handleVariantAttributeChange(variantIndex, attrIndex, field, value) {
    form.setValues((current) => ({
      ...current,
      variants: current.variants.map((variant, index) =>
        index === variantIndex
          ? {
              ...variant,
              attributes: variant.attributes.map((attr, aIndex) =>
                aIndex === attrIndex ? { ...attr, [field]: value } : attr,
              ),
            }
          : variant,
      ),
    }))
    form.setErrors((current) => ({ ...current, [`variants.${variantIndex}.attributes.${attrIndex}.${field}`]: undefined, variants: undefined }))
  }

  function handleAddVariantAttribute(variantIndex) {
    form.setValues((current) => ({
      ...current,
      variants: current.variants.map((variant, index) =>
        index === variantIndex
          ? { ...variant, attributes: [...(variant.attributes || []), { name: '', value: '' }] }
          : variant,
      ),
    }))
  }

  function handleRemoveVariantAttribute(variantIndex, attrIndex) {
    form.setValues((current) => ({
      ...current,
      variants: current.variants.map((variant, index) =>
        index === variantIndex
          ? { ...variant, attributes: variant.attributes.filter((_, aIndex) => aIndex !== attrIndex) }
          : variant,
      ),
    }))
  }

  function handleProductCustomFieldChange(definition, value) {
    form.setValues((current) => ({
      ...current,
      customFieldValues: upsertCustomFieldValue(current.customFieldValues, definition, value),
    }))
    form.setErrors((current) => ({ ...current, [`customFieldValues.${definition.id}`]: undefined }))
  }

  function handleVariantCustomFieldChange(index, definition, value) {
    form.setValues((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index
          ? {
              ...variant,
              customFieldValues: upsertCustomFieldValue(variant.customFieldValues ?? [], definition, value),
            }
          : variant,
      ),
    }))
    form.setErrors((current) => ({ ...current, [`variants.${index}.customFieldValues.${definition.id}`]: undefined }))
  }

  function handleAddVariant() {
    form.setValues((current) => ({
      ...current,
      variants: [...current.variants, createDefaultVariant(current)],
    }))
    form.setErrors((current) => ({ ...current, variants: undefined }))
  }

  function handleRemoveVariant(index) {
    form.setValues((current) => ({
      ...current,
      variants: current.variants
        .filter((_, variantIndex) => variantIndex !== index)
        .map((variant, variantIndex) => ({
          ...variant,
          sortOrder: variantIndex,
        })),
    }))
    form.setErrors((current) => ({ ...current, variants: undefined }))
  }

  function handleCategoryAdd() {
    if (!selectedCategoryId) return

    form.setValues((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(selectedCategoryId)
        ? current.categoryIds
        : [...current.categoryIds, selectedCategoryId],
    }))
    setSelectedCategoryId('')
  }

  function handleCategoryRemove(categoryId) {
    form.setValues((current) => ({
      ...current,
      categoryIds: current.categoryIds.filter((id) => id !== categoryId),
    }))
  }

  function handleBundleComponentChange(index, field, value) {
    form.setValues((current) => ({
      ...current,
      bundleComponents: current.bundleComponents.map((component, componentIndex) =>
        componentIndex === index
          ? {
              ...component,
              [field]: value,
            }
          : component,
      ),
    }))
    form.setErrors((current) => ({ ...current, [`bundleComponents.${index}.${field}`]: undefined, bundleComponents: undefined }))
  }

  function handleAddBundleComponent() {
    form.setValues((current) => ({
      ...current,
      bundleComponents: [...current.bundleComponents, createDefaultBundleComponent()],
    }))
    form.setErrors((current) => ({ ...current, bundleComponents: undefined }))
  }

  function handleRemoveBundleComponent(index) {
    form.setValues((current) => ({
      ...current,
      bundleComponents: current.bundleComponents
        .filter((_, componentIndex) => componentIndex !== index)
        .map((component, componentIndex) => createBundleComponentInitialValue(component, componentIndex)),
    }))
    form.setErrors((current) => ({ ...current, bundleComponents: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const submissionValues = buildVariableProductValues({
      ...form.values,
      categoryIds:
        selectedCategoryId && !form.values.categoryIds.includes(selectedCategoryId)
          ? [...form.values.categoryIds, selectedCategoryId]
          : form.values.categoryIds,
      openingStock: initialStock,
    })
    const validationErrors = validateProductForm(submissionValues)
    const customFieldErrors = validateCustomFieldEntries(submissionValues, customFieldDefinitions)
    form.setErrors({ ...validationErrors, ...customFieldErrors })
    form.clearFeedback()

    if (Object.keys(validationErrors).length || Object.keys(customFieldErrors).length) {
      return
    }

    try {
      form.setIsSubmitting(true)
      const payload = normalizeProductPayload(submissionValues)

      if (isEditMode) {
        await updateProduct(productId, payload)
        navigate(`/app/products/${productId}`, { replace: true })
      } else {
        const response = await createProduct(payload)
        const newProductId = response.data?.id
        navigate(`/app/products/${newProductId}`, { replace: true })
      }

      setSelectedCategoryId('')
      setInitialStock(EMPTY_INITIAL_STOCK)
    } catch (error) {
      const { fieldErrors, summary } = parseApiValidationError(error)
      form.setErrors((current) => ({ ...current, ...fieldErrors }))
      form.setServerTone('error')
      form.setServerMessage(summary ?? error.message)
    } finally {
      form.setIsSubmitting(false)
    }
  }

  const hasUnits = units.length > 0
  const hasCategories = categories.length > 0
  const productFieldDefinitions = customFieldDefinitions.filter((definition) => ['PRODUCT', 'BOTH'].includes(definition.appliesTo))
  const variantFieldDefinitions = customFieldDefinitions.filter((definition) => ['VARIANT', 'BOTH'].includes(definition.appliesTo))
  const availableBundleProducts = productOptions.filter((item) => item.id !== productId)
  const selectedCategories = categories.filter((category) => form.values.categoryIds.includes(category.id))
  const availableCategoryOptions = buildCategoryOptions(categories).filter(
    (option) => option.value === '' || !form.values.categoryIds.includes(option.value),
  )

  return (
    <div className="space-y-6">
      <StatusAlert tone={pageFeedback.tone} message={pageFeedback.message} />

      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">
              {isEditMode ? 'Edit product' : isCloneMode ? 'Clone product' : 'Add product'}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {isEditMode
                ? 'Update the selected product with dedicated edit controls.'
                : isCloneMode
                  ? 'Create a new product from an existing product template.'
                  : 'Create a product from a dedicated add flow instead of the listing screen.'}
            </p>
          </div>
          {!canEdit ? (
            <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
              Read only
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="mt-6 text-sm text-[var(--muted)]">Loading form data...</div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
            {!hasUnits || !hasCategories ? (
              <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">Supporting data required</p>
                <p className="mt-1 text-sm text-amber-700">
                  Add the missing dropdown values before completing the product setup.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {!hasUnits ? (
                    <Link
                      to="/app/products/units"
                      className="rounded-[0.95rem] bg-white px-4 py-2 text-sm font-semibold text-amber-800"
                    >
                      Add unit
                    </Link>
                  ) : null}
                  {!hasCategories ? (
                    <Link
                      to="/app/products/categories"
                      className="rounded-[0.95rem] bg-white px-4 py-2 text-sm font-semibold text-amber-800"
                    >
                      Add category
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Product Name" name="name" value={form.values.name} onChange={handleChange} error={form.errors.name} required />
              <FormSelect label="Product Type" name="productType" value={form.values.productType} onChange={handleChange} error={form.errors.productType} options={productTypeOptions} required />
              <FormSelect label="Status" name="status" value={form.values.status} onChange={handleChange} error={form.errors.status} options={productStatusOptions} required />
              <FormSelect
                label="Unit"
                name="unitId"
                value={form.values.unitId}
                onChange={handleChange}
                error={form.errors.unitId}
                options={[{ value: '', label: 'No unit' }, ...units.map((unit) => ({ value: unit.id, label: `${unit.name} (${unit.code})` }))]}
              />
              <FormField label="SKU" name="sku" value={form.values.sku} onChange={handleChange} error={form.errors.sku} />
              <FormField label="Barcode" name="barcode" value={form.values.barcode} onChange={handleChange} error={form.errors.barcode} />
              <FormField label="Currency" name="currencyCode" value={form.values.currencyCode} onChange={handleChange} error={form.errors.currencyCode} />
              <FormField label="Cost Price" name="costPrice" type="number" value={form.values.costPrice} onChange={handleChange} error={form.errors.costPrice} />
              <FormField label="Selling Price" name="sellingPrice" type="number" value={form.values.sellingPrice} onChange={handleChange} error={form.errors.sellingPrice} />
              <FormField label="Min Stock" name="minStockLevel" type="number" value={form.values.minStockLevel} onChange={handleChange} error={form.errors.minStockLevel} />
              <FormField label="Max Stock" name="maxStockLevel" type="number" value={form.values.maxStockLevel} onChange={handleChange} error={form.errors.maxStockLevel} />
            </div>

            <FormTextarea label="Description" name="description" rows={4} value={form.values.description} onChange={handleChange} error={form.errors.description} />

            {productFieldDefinitions.length ? (
              <div className="grid gap-4 rounded-[1.2rem] border border-[var(--line)] bg-[var(--panel)] p-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">Product custom fields</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Fill product-level custom field values from the backend field definitions.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {productFieldDefinitions.map((definition) => (
                    <DynamicCustomFieldInput
                      key={definition.id}
                      definition={definition}
                      value={getCustomFieldValue(form.values.customFieldValues, definition)}
                      error={form.errors[`customFieldValues.${definition.id}`]}
                      onChange={(value) => handleProductCustomFieldChange(definition, value)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {form.values.productType === 'VARIABLE' ? (
              <div className="grid gap-4 rounded-[1.2rem] border border-[var(--line)] bg-[var(--panel)] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">Variants</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Add one or more variants. Each variant needs a name and one attribute pair.
                    </p>
                    {productId ? (
                      <Link
                        to={`/app/products/${productId}/attributes`}
                        className="mt-2 inline-flex text-sm font-semibold text-[#1F2937]"
                      >
                        Manage backend product attributes
                      </Link>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="rounded-[1rem] bg-white px-4 py-2.5 text-sm font-semibold text-[#1F2937] shadow-[0_10px_20px_rgba(15,23,42,0.06)]"
                    >
                      Add variant
                    </button>
                  ) : null}
                </div>

                <StatusAlert tone="error" message={form.errors.variants} />

                <div className="grid gap-4">
                  {form.values.variants.map((variant, index) => (
                    <article key={variant.id ?? `variant-${index}`} className="rounded-[1rem] border border-[var(--line)] bg-white p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[var(--ink)]">Variant {index + 1}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            Keep the attribute pair unique so this variant is easy to identify later.
                          </p>
                        </div>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(index)}
                            disabled={form.values.variants.length === 1}
                            className="rounded-[0.85rem] rounded-md bg-[#EF4444] px-3 py-2 text-xs font-semibold text-white hover:bg-[#DC2626] transition disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Remove variant
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <FormField
                          label="Variant Name"
                          name={`variant-name-${index}`}
                          value={variant.name}
                          onChange={(event) => handleVariantChange(index, 'name', event.target.value)}
                          error={form.errors[`variants.${index}.name`]}
                        />
                        <div className="md:col-span-2 space-y-4 rounded-[0.8rem] bg-[var(--background)] p-4 border border-[var(--line)]">
                          <div className="flex justify-between items-center">
                            <p className="text-xs font-semibold text-[var(--ink)]">Attributes</p>
                            {canEdit && (
                              <button type="button" onClick={() => handleAddVariantAttribute(index)} className="text-xs font-semibold text-[var(--accent)]">
                                + Add Attribute
                              </button>
                            )}
                          </div>
                          <div className="grid gap-3">
                            {variant.attributes?.map((attr, attrIndex) => (
                              <div key={attrIndex} className="flex flex-col gap-2 md:flex-row md:items-start">
                                <div className="flex-1">
                                  <FormField
                                    label="Attribute Name"
                                    name={`variant-${index}-attr-${attrIndex}-name`}
                                    value={attr.name}
                                    placeholder="e.g. Size"
                                    onChange={(event) => handleVariantAttributeChange(index, attrIndex, 'name', event.target.value)}
                                    error={form.errors[`variants.${index}.attributes.${attrIndex}.name`]}
                                    required
                                  />
                                </div>
                                <div className="flex-1">
                                  <FormField
                                    label="Attribute Value"
                                    name={`variant-${index}-attr-${attrIndex}-val`}
                                    value={attr.value}
                                    placeholder="e.g. Large"
                                    onChange={(event) => handleVariantAttributeChange(index, attrIndex, 'value', event.target.value)}
                                    error={form.errors[`variants.${index}.attributes.${attrIndex}.value`]}
                                    required
                                  />
                                </div>
                                {canEdit && variant.attributes.length > 1 && (
                                  <button type="button" onClick={() => handleRemoveVariantAttribute(index, attrIndex)} className="mt-7 rounded-[0.6rem] bg-[#EF4444] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#DC2626] transition">
                                    Remove
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <FormSelect
                          label="Variant Unit"
                          name={`variant-unit-${index}`}
                          value={variant.unitId}
                          onChange={(event) => handleVariantChange(index, 'unitId', event.target.value)}
                          error={form.errors[`variants.${index}.unitId`]}
                          options={[{ value: '', label: 'Use product unit' }, ...units.map((unit) => ({ value: unit.id, label: `${unit.name} (${unit.code})` }))]}
                        />
                        <FormField
                          label="Variant SKU"
                          name={`variant-sku-${index}`}
                          value={variant.sku}
                          onChange={(event) => handleVariantChange(index, 'sku', event.target.value)}
                          error={form.errors[`variants.${index}.sku`]}
                        />
                        <FormField
                          label="Variant Barcode"
                          name={`variant-barcode-${index}`}
                          value={variant.barcode}
                          onChange={(event) => handleVariantChange(index, 'barcode', event.target.value)}
                          error={form.errors[`variants.${index}.barcode`]}
                        />
                        <FormField
                          label="Variant Currency"
                          name={`variant-currency-${index}`}
                          value={variant.currencyCode}
                          onChange={(event) => handleVariantChange(index, 'currencyCode', event.target.value)}
                          error={form.errors[`variants.${index}.currencyCode`]}
                        />
                        <FormField
                          label="Variant Cost Price"
                          name={`variant-cost-${index}`}
                          type="number"
                          value={variant.costPrice}
                          onChange={(event) => handleVariantChange(index, 'costPrice', event.target.value)}
                          error={form.errors[`variants.${index}.costPrice`]}
                        />
                        <FormField
                          label="Variant Selling Price"
                          name={`variant-selling-${index}`}
                          type="number"
                          value={variant.sellingPrice}
                          onChange={(event) => handleVariantChange(index, 'sellingPrice', event.target.value)}
                          error={form.errors[`variants.${index}.sellingPrice`]}
                        />
                        {variantFieldDefinitions.map((definition) => (
                          <DynamicCustomFieldInput
                            key={`${variant.id ?? index}-${definition.id}`}
                            definition={definition}
                            value={getCustomFieldValue(variant.customFieldValues ?? [], definition)}
                            error={form.errors[`variants.${index}.customFieldValues.${definition.id}`]}
                            onChange={(value) => handleVariantCustomFieldChange(index, definition, value)}
                          />
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {form.values.productType === 'BUNDLE' ? (
              <div className="grid gap-4 rounded-[1.2rem] border border-[var(--line)] bg-[var(--panel)] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">Bundle components</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Add the products that make up this bundle and the quantity required for each component.
                    </p>
                  </div>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={handleAddBundleComponent}
                      className="rounded-[1rem] bg-white px-4 py-2.5 text-sm font-semibold text-[#1F2937] shadow-[0_10px_20px_rgba(15,23,42,0.06)]"
                    >
                      Add component
                    </button>
                  ) : null}
                </div>

                <StatusAlert tone="error" message={form.errors.bundleComponents} />

                <div className="grid gap-4">
                  {form.values.bundleComponents.length ? (
                    form.values.bundleComponents.map((component, index) => (
                      <article key={component.id ?? `bundle-${index}`} className="rounded-[1rem] border border-[var(--line)] bg-white p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <p className="text-sm font-semibold text-[var(--ink)]">Component {index + 1}</p>
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveBundleComponent(index)}
                              className="rounded-[0.85rem] rounded-md bg-[#EF4444] px-3 py-2 text-xs font-semibold text-white hover:bg-[#DC2626] transition"
                            >
                              Remove component
                            </button>
                          ) : null}
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <FormSelect
                            label="Component product"
                            name={`bundle-product-${index}`}
                            value={component.componentProductId}
                            onChange={(event) => handleBundleComponentChange(index, 'componentProductId', event.target.value)}
                            error={form.errors[`bundleComponents.${index}.componentProductId`]}
                            options={[
                              { value: '', label: 'Select a product' },
                              ...availableBundleProducts.map((item) => ({ value: item.id, label: item.name })),
                            ]}
                          />
                          <FormField
                            label="Quantity"
                            name={`bundle-quantity-${index}`}
                            type="number"
                            value={component.quantity}
                            onChange={(event) => handleBundleComponentChange(index, 'quantity', event.target.value)}
                            error={form.errors[`bundleComponents.${index}.quantity`]}
                          />
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[1rem] border border-dashed border-[var(--line)] bg-white px-4 py-4 text-sm text-[var(--muted)]">
                      No bundle components added yet.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <CheckboxField label="Sellable" name="isSellable" checked={form.values.isSellable} onChange={handleChange} disabled={!canEdit} />
              <CheckboxField label="Purchasable" name="isPurchasable" checked={form.values.isPurchasable} onChange={handleChange} disabled={!canEdit} />
              <CheckboxField label="Track inventory" name="trackInventory" checked={form.values.trackInventory} onChange={handleChange} disabled={!canEdit} />
              <CheckboxField label="Allow returns" name="allowReturns" checked={form.values.allowReturns} onChange={handleChange} disabled={!canEdit} />
              <CheckboxField label="Allow backorder" name="allowBackorder" checked={form.values.allowBackorder} onChange={handleChange} disabled={!canEdit} />
            </div>

            <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--panel)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">Categories</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Select a category from the dropdown and add it to this product
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-soft)]">
                    Saving will also include the currently selected dropdown category even if you do not click add first.
                  </p>
                </div>
                <Link to="/app/products/categories" className="text-sm font-semibold text-[#1F2937]">
                  Add category
                </Link>
              </div>
              <div className="mt-4 grid gap-4">
                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="flex-1">
                    <FormSelect
                      label="Select category"
                      name="selectedCategory"
                      value={selectedCategoryId}
                      onChange={(event) => setSelectedCategoryId(event.target.value)}
                      options={
                        availableCategoryOptions.length
                          ? [{ value: '', label: 'Choose a category' }, ...availableCategoryOptions.filter((option) => option.value !== '')]
                          : [{ value: '', label: 'No more categories available' }]
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleCategoryAdd}
                      disabled={!canEdit || !selectedCategoryId}
                      className="rounded-lg bg-[#22C55E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#16A34A] disabled:cursor-not-allowed disabled:opacity-60 transition"
                    >
                      Add selected category
                    </button>
                  </div>
                </div>

                <div className="grid gap-2">
                  {selectedCategories.length ? (
                    selectedCategories.map((category) => (
                      <div key={category.id} className="flex items-center justify-between rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--ink)]">{category.name}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{category.description || category.slug}</p>
                        </div>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => handleCategoryRemove(category.id)}
                            className="rounded-[0.8rem] rounded-md bg-[#EF4444] px-3 py-2 text-xs font-semibold text-white hover:bg-[#DC2626] transition"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1rem] border border-dashed border-[var(--line)] bg-white px-4 py-4 text-sm text-[var(--muted)]">
                      No categories selected yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!isEditMode && form.values.productType !== 'SERVICE' ? (
              <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--panel)] p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enableInitialStock"
                    checked={initialStock.enabled}
                    onChange={(e) => setInitialStock({ ...initialStock, enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <div>
                    <label htmlFor="enableInitialStock" className="text-sm font-semibold text-[var(--ink)] cursor-pointer">
                      Add Initial Inventory automatically
                    </label>
                    <p className="text-xs text-[var(--muted)]">
                      Add starting stock to a warehouse when this product is created. Available for simple, variable, and bundle products when inventory tracking is enabled.
                    </p>
                  </div>
                </div>
                
                {initialStock.enabled && (
                  <div className="mt-4 grid gap-4 border-t border-[var(--line)] pt-4 md:grid-cols-2">
                    <StatusAlert tone="error" message={form.errors.openingStock} />
                    <FormSelect
                      label="Select Warehouse *"
                      value={initialStock.warehouseId}
                      onChange={(e) =>
                        setInitialStock({ ...initialStock, warehouseId: e.target.value, zoneId: '', binId: '' })
                      }
                      error={form.errors.openingStockWarehouseId}
                      options={[
                        { label: 'Choose a location...', value: '' },
                        ...warehouses.map((w) => ({ label: w.name, value: w.id }))
                      ]}
                    />
                    <FormSelect
                      label="Select Zone"
                      value={initialStock.zoneId}
                      onChange={(e) => setInitialStock({ ...initialStock, zoneId: e.target.value, binId: '' })}
                      options={[
                        { label: initialStock.warehouseId ? 'No zone' : 'Choose a warehouse first', value: '' },
                        ...openingStockZones.map((zone) => ({ label: zone.name, value: zone.id }))
                      ]}
                    />
                    <FormSelect
                      label="Select Bin"
                      value={initialStock.binId}
                      onChange={(e) => setInitialStock({ ...initialStock, binId: e.target.value })}
                      options={[
                        { label: initialStock.zoneId ? 'No bin' : 'Choose a zone first', value: '' },
                        ...openingStockBins.map((bin) => ({ label: bin.name, value: bin.id }))
                      ]}
                    />
                    <FormField
                      label="Opening Quantity *"
                      type="number"
                      placeholder="e.g. 50"
                      value={initialStock.quantity}
                      onChange={(e) => setInitialStock({ ...initialStock, quantity: e.target.value })}
                      error={form.errors.openingStockQuantity}
                    />
                    <div className="md:col-span-2">
                      <FormTextarea
                        label="Opening Inventory Notes"
                        name="openingStockNotes"
                        rows={3}
                        value={initialStock.notes}
                        onChange={(e) => setInitialStock({ ...initialStock, notes: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <StatusAlert tone={form.serverTone} message={form.serverMessage} />

            {canEdit ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={form.isSubmitting}
                  className="rounded-[1rem] bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] transition disabled:opacity-60"
                >
                  {form.isSubmitting ? 'Saving...' : isEditMode ? 'Update product' : isCloneMode ? 'Create cloned product' : 'Create product'}
                </button>
                {isEditMode ? (
                  <Link
                    to={`/app/products/new?cloneOf=${productId}`}
                    className="rounded-[1rem] border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
                  >
                    Clone as new
                  </Link>
                ) : null}
                <Link
                  to="/app/products/list"
                  className="rounded-[1rem] border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
                >
                  Back to list
                </Link>
              </div>
            ) : null}
          </form>
        )}
      </section>
    </div>
  )
}

function getProductTypeValuePatch(currentValues, nextProductType) {
  if (nextProductType === 'VARIABLE') {
    return {
      productType: nextProductType,
      variants: currentValues.variants.length ? currentValues.variants : [createDefaultVariant(currentValues)],
      bundleComponents: [],
    }
  }

  if (nextProductType === 'BUNDLE') {
    return {
      productType: nextProductType,
      variants: [],
      bundleComponents: currentValues.bundleComponents.length ? currentValues.bundleComponents : [createDefaultBundleComponent()],
    }
  }

  if (nextProductType === 'SERVICE') {
    return {
      productType: nextProductType,
      variants: [],
      bundleComponents: [],
      trackInventory: false,
      allowBackorder: false,
    }
  }

  return {
    productType: nextProductType,
    variants: [],
    bundleComponents: [],
  }
}

function buildCategoryOptions(categories) {
  const byParent = new Map()
  const categoryMap = new Map(categories.map((category) => [category.id, category]))

  categories.forEach((category) => {
    const key = category.parent_category_id ?? 'root'
    const bucket = byParent.get(key) ?? []
    bucket.push(category)
    byParent.set(key, bucket)
  })

  byParent.forEach((bucket) => {
    bucket.sort((left, right) => left.name.localeCompare(right.name))
  })

  const options = []

  function buildCategoryPath(category) {
    const names = [category.name]
    let currentParentId = category.parent_category_id

    while (currentParentId) {
      const parentCategory = categoryMap.get(currentParentId)
      if (!parentCategory) break
      names.unshift(parentCategory.name)
      currentParentId = parentCategory.parent_category_id
    }

    return names.join(' > ')
  }

  function visit(parentId) {
    const children = byParent.get(parentId ?? 'root') ?? []
    children.forEach((category) => {
      options.push({
        value: category.id,
        label: buildCategoryPath(category),
      })
      visit(category.id)
    })
  }

  visit(null)
  return options
}

function prepareProductValues(values, definitions) {
  const productDefinitions = definitions.filter((definition) => ['PRODUCT', 'BOTH'].includes(definition.appliesTo))
  const variantDefinitions = definitions.filter((definition) => ['VARIANT', 'BOTH'].includes(definition.appliesTo))

  return {
    ...values,
    customFieldValues: ensureCustomFieldEntries(values.customFieldValues ?? [], productDefinitions),
    variants: (values.variants ?? []).map((variant) => ({
      ...variant,
      customFieldValues: ensureCustomFieldEntries(variant.customFieldValues ?? [], variantDefinitions),
    })),
  }
}

function ensureCustomFieldEntries(entries, definitions) {
  return definitions.map((definition) => {
    const existing = entries.find((entry) => entry.definitionId === definition.id)
    return existing ?? {
      definitionId: definition.id,
      fieldKey: definition.fieldKey,
      value: getDefaultCustomFieldValue(definition.fieldType),
    }
  })
}

function getDefaultCustomFieldValue(fieldType) {
  if (fieldType === 'MULTI_SELECT') return []
  return ''
}

function normalizeCustomFieldInputValue(fieldType, rawValue) {
  if (rawValue === '') {
    return ''
  }

  if (fieldType === 'NUMBER') {
    const parsedValue = Number(rawValue)
    return Number.isNaN(parsedValue) ? rawValue : parsedValue
  }

  return rawValue
}

function upsertCustomFieldValue(entries, definition, value) {
  const nextEntries = [...entries]
  const existingIndex = nextEntries.findIndex((entry) => entry.definitionId === definition.id)
  const nextEntry = {
    definitionId: definition.id,
    fieldKey: definition.fieldKey,
    value,
  }

  if (existingIndex >= 0) {
    nextEntries[existingIndex] = nextEntry
    return nextEntries
  }

  nextEntries.push(nextEntry)
  return nextEntries
}

function getCustomFieldValue(entries, definition) {
  return entries.find((entry) => entry.definitionId === definition.id)?.value ?? getDefaultCustomFieldValue(definition.fieldType)
}

function validateCustomFieldEntries(values, definitions) {
  const errors = {}
  const productDefinitions = definitions.filter((definition) => ['PRODUCT', 'BOTH'].includes(definition.appliesTo))
  const variantDefinitions = definitions.filter((definition) => ['VARIANT', 'BOTH'].includes(definition.appliesTo))

  productDefinitions.forEach((definition) => {
    const value = getCustomFieldValue(values.customFieldValues ?? [], definition)
    const error = validateDefinitionValue(definition, value)
    if (error) {
      errors[`customFieldValues.${definition.id}`] = error
    }
  })

  values.variants?.forEach((variant, index) => {
    variantDefinitions.forEach((definition) => {
      const value = getCustomFieldValue(variant.customFieldValues ?? [], definition)
      const error = validateDefinitionValue(definition, value)
      if (error) {
        errors[`variants.${index}.customFieldValues.${definition.id}`] = error
      }
    })
  })

  return errors
}

function isEmptyFieldValue(value) {
  if (value === '' || value === null || value === undefined) return true
  if (Array.isArray(value)) return value.length === 0
  return false
}

function validateDefinitionValue(definition, value) {
  if (definition.isRequired && isEmptyFieldValue(value)) {
    return `${definition.name} is required`
  }

  if (isEmptyFieldValue(value)) {
    return ''
  }

  const rules = definition.validationRules ?? {}

  if (definition.fieldType === 'NUMBER') {
    const numericValue = Number(value)
    if (Number.isNaN(numericValue)) {
      return `${definition.name} must be a number`
    }
    if (rules.min !== undefined && numericValue < rules.min) {
      return `${definition.name} must be at least ${rules.min}`
    }
    if (rules.max !== undefined && numericValue > rules.max) {
      return `${definition.name} must be at most ${rules.max}`
    }
  }

  if (definition.fieldType === 'TEXT' || definition.fieldType === 'DATE' || definition.fieldType === 'SELECT') {
    const textValue = String(value)
    if (rules.minLength !== undefined && textValue.length < rules.minLength) {
      return `${definition.name} must be at least ${rules.minLength} characters`
    }
    if (rules.maxLength !== undefined && textValue.length > rules.maxLength) {
      return `${definition.name} must be at most ${rules.maxLength} characters`
    }
    if (rules.pattern) {
      const regex = new RegExp(rules.pattern)
      if (!regex.test(textValue)) {
        return `${definition.name} format is invalid`
      }
    }
  }

  if (definition.fieldType === 'MULTI_SELECT') {
    const values = Array.isArray(value) ? value : []
    if (rules.min !== undefined && values.length < rules.min) {
      return `${definition.name} must include at least ${rules.min} selections`
    }
    if (rules.max !== undefined && values.length > rules.max) {
      return `${definition.name} must include at most ${rules.max} selections`
    }
  }

  return ''
}

function DynamicCustomFieldInput({ definition, value, error, onChange }) {
  const commonLabel = `${definition.name}${definition.isRequired ? ' *' : ''}`

  if (definition.fieldType === 'BOOLEAN') {
    return (
      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span>{commonLabel}</span>
        <select
          value={value === '' ? '' : String(value)}
          onChange={(event) => {
            const next = event.target.value
            onChange(next === '' ? '' : next === 'true')
          }}
          className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition ${
            error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[var(--accent)]'
          }`}
        >
          <option value="">Not set</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </label>
    )
  }

  if (definition.fieldType === 'SELECT') {
    return (
      <FormSelect
        label={commonLabel}
        name={definition.fieldKey}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        options={[
          { value: '', label: 'Select an option' },
          ...(definition.allowedValues ?? []).map((option) => ({ value: option, label: option })),
        ]}
      />
    )
  }

  if (definition.fieldType === 'MULTI_SELECT') {
    const selectedValues = Array.isArray(value) ? value : []

    return (
      <div className="space-y-2 text-sm font-medium text-slate-700">
        <span>{commonLabel}</span>
        <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3">
          {(definition.allowedValues ?? []).map((option) => {
            const active = selectedValues.includes(option)
            return (
              <label key={option} className="flex items-center gap-3 text-sm text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => {
                    onChange(
                      event.target.checked
                        ? [...selectedValues, option]
                        : selectedValues.filter((item) => item !== option),
                    )
                  }}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>{option}</span>
              </label>
            )
          })}
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    )
  }

  return (
    <FormField
      label={commonLabel}
      name={definition.fieldKey}
      type={definition.fieldType === 'NUMBER' ? 'number' : definition.fieldType === 'DATE' ? 'date' : 'text'}
      value={value}
      onChange={(event) => onChange(normalizeCustomFieldInputValue(definition.fieldType, event.target.value))}
      error={error}
    />
  )
}
