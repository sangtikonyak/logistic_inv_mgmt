export const productTypeOptions = [
  { value: 'SIMPLE', label: 'Simple' },
  { value: 'VARIABLE', label: 'Variable' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'BUNDLE', label: 'Bundle' },
]

export const productStatusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' },
]

export function createProductInitialValues(product) {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    productType: product?.productType ?? 'SIMPLE',
    status: product?.status ?? 'ACTIVE',
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? '',
    unitId: product?.unit?.id ?? '',
    currencyCode: product?.currencyCode ?? 'INR',
    costPrice: product?.costPrice ?? '',
    sellingPrice: product?.sellingPrice ?? '',
    minStockLevel: product?.minStockLevel ?? '',
    maxStockLevel: product?.maxStockLevel ?? '',
    isSellable: product?.isSellable ?? true,
    isPurchasable: product?.isPurchasable ?? true,
    trackInventory: product?.trackInventory ?? true,
    allowReturns: product?.allowReturns ?? true,
    allowBackorder: product?.allowBackorder ?? false,
    categoryIds: product?.categories?.map((category) => category.id) ?? [],
    customFieldValues: product?.customFieldValues?.map((value) => ({
      definitionId: value.definitionId,
      fieldKey: value.fieldKey,
      value: value.value,
    })) ?? [],
    bundleComponents: (product?.bundleComponents ?? []).map((component, index) => createBundleComponentInitialValue(component, index)),
    variants:
      product?.productType === 'VARIABLE'
        ? (product?.variants?.length ? product.variants : [createDefaultVariant(product)]).map((variant, index) =>
          createVariantInitialValue(variant, index),
        )
        : [],
  }
}
export function createClonedProductInitialValues(product) {
  const source = createProductInitialValues(product)

  return {
    ...source,
    name: product?.name ? `${product.name} Copy` : '',
    status: 'ACTIVE',
    sku: '',
    barcode: '',
    bundleComponents: source.bundleComponents.map((component, index) => ({
      ...component,
      id: undefined,
      sortOrder: index,
    })),
    variants: source.variants.map((variant, index) => ({
      ...variant,
      id: undefined,
      sku: '',
      barcode: '',
      sortOrder: index,
    })),
  }
}

export function createCategoryInitialValues(category) {
  return {
    name: category?.name ?? '',
    parentCategoryId: category?.parent_category_id ?? '',
    description: category?.description ?? '',
  }
}

export function createUnitInitialValues(unit) {
  return {
    name: unit?.name ?? '',
    code: unit?.code ?? '',
    description: unit?.description ?? '',
  }
}

export function createVariantInitialValue(source = {}, index = 0) {

  return {
    id: source?.id,
    name: source?.name ?? `Variant ${index + 1}`,
    sku: source?.sku ?? '',
    barcode: source?.barcode ?? '',
    costPrice: source?.costPrice ?? '',
    sellingPrice: source?.sellingPrice ?? '',
    currencyCode: source?.currencyCode ?? 'INR',
    unitId: source?.unit?.id ?? source?.unitId ?? '',
    sortOrder: source?.sortOrder ?? index,
    attributes: source?.attributes?.length ? source.attributes : [{ name: 'Option', value: 'Default' }],
    customFieldValues: source?.customFieldValues?.map((value) => ({
      definitionId: value.definitionId,
      fieldKey: value.fieldKey,
      value: value.value,
    })) ?? [],
  }
}

export function createDefaultVariant(values = {}) {
  const referenceVariant = values?.variants?.[0]

  return createVariantInitialValue(
    {
      name: values?.name || referenceVariant?.name || '',
      sku: values?.sku || referenceVariant?.sku || '',
      barcode: values?.barcode || referenceVariant?.barcode || '',
      costPrice: values?.costPrice || referenceVariant?.costPrice || '',
      sellingPrice: values?.sellingPrice || referenceVariant?.sellingPrice || '',
      currencyCode: values?.currencyCode || referenceVariant?.currencyCode || 'INR',
      unitId: values?.unitId || referenceVariant?.unitId || '',
      attributes: referenceVariant?.attributes || [{ name: 'Option', value: 'Default' }],
    },
    values?.variants?.length ?? 0,
  )
}

export function createBundleComponentInitialValue(component = {}, index = 0) {
  return {
    id: component.id,
    componentProductId: component.componentProductId ?? '',
    componentVariantId: component.componentVariantId ?? '',
    quantity: component.quantity ?? 1,
    sortOrder: index,
  }
}

export function createDefaultBundleComponent() {
  return createBundleComponentInitialValue({}, 0)
}

export function buildVariableProductValues(values) {
  if (values.productType !== 'VARIABLE') {
    return {
      ...values,
      variants: [],
    }
  }

  return {
    ...values,
    variants: values.variants.length ? values.variants : [createDefaultVariant(values)],
  }
}

export function validateProductForm(values) {
  const errors = {}

  if (!values.name.trim()) {
    errors.name = 'Product name is required'
  } else if (values.name.trim().length > 160) {
    errors.name = 'Product name must be 160 characters or less'
  }

  if (values.description.trim().length > 2000) {
    errors.description = 'Description must be 2000 characters or less'
  }

  if (!productTypeOptions.some((option) => option.value === values.productType)) {
    errors.productType = 'Select a valid product type'
  }

  if (!productStatusOptions.some((option) => option.value === values.status)) {
    errors.status = 'Select a valid product status'
  }

  if (values.sku.trim().length > 80) {
    errors.sku = 'SKU must be 80 characters or less'
  }

  if (values.barcode.trim().length > 80) {
    errors.barcode = 'Barcode must be 80 characters or less'
  }

  if (values.currencyCode && values.currencyCode.trim().length !== 3) {
    errors.currencyCode = 'Currency code must be 3 characters'
  }

  ;['costPrice', 'sellingPrice', 'minStockLevel', 'maxStockLevel'].forEach((field) => {
    const value = values[field]
    if (value !== '' && Number(value) < 0) {
      errors[field] = 'Value must be zero or greater'
    }
  })

  if (values.productType === 'VARIABLE') {
    if (!values.variants.length) {
      errors.variants = 'Add at least one variant for variable products'
    }

    values.variants.forEach((variant, index) => {
      const prefix = `variants.${index}`

      if (!variant.name.trim()) {
        errors[`${prefix}.name`] = 'Variant name is required'
      }

      if (variant.sku.trim().length > 80) {
        errors[`${prefix}.sku`] = 'Variant SKU must be 80 characters or less'
      }

      if (variant.barcode.trim().length > 80) {
        errors[`${prefix}.barcode`] = 'Variant barcode must be 80 characters or less'
      }

      if (!variant.attributes?.length) {
        errors[`${prefix}.attributes`] = 'Add at least one attribute pair'
      } else {
        variant.attributes.forEach((attr, attrIndex) => {
          if (!attr.name?.trim()) {
            errors[`${prefix}.attributes.${attrIndex}.name`] = 'Attribute label is required'
          }
          if (!attr.value?.trim()) {
            errors[`${prefix}.attributes.${attrIndex}.value`] = 'Attribute value is required'
          }
        })
      }

      ;['costPrice', 'sellingPrice'].forEach((field) => {
        const value = variant[field]
        if (value !== '' && Number(value) < 0) {
          errors[`${prefix}.${field}`] = 'Value must be zero or greater'
        }
      })

      if (variant.currencyCode && variant.currencyCode.trim().length !== 3) {
        errors[`${prefix}.currencyCode`] = 'Currency code must be 3 characters'
      }
    })
  }

  if (values.productType !== 'VARIABLE' && values.variants.length) {
    errors.variants = 'Only variable products can contain variants'
  }

  if (values.openingStock?.enabled) {
    if (values.productType === 'SERVICE') {
      errors.openingStock = 'Opening inventory is not available for service products'
    } else if (!values.trackInventory) {
      errors.openingStock = 'Enable inventory tracking before adding opening inventory'
    } else {
      if (!values.openingStock.warehouseId) {
        errors.openingStockWarehouseId = 'Select a warehouse for opening inventory'
      }
      if (values.openingStock.quantity === '' || Number(values.openingStock.quantity) <= 0) {
        errors.openingStockQuantity = 'Opening quantity must be greater than zero'
      }
    }
  }

  if (values.productType === 'BUNDLE') {
    if (!values.bundleComponents.length) {
      errors.bundleComponents = 'Add at least one component for bundle products'
    }

    values.bundleComponents.forEach((component, index) => {
      if (!component.componentProductId) {
        errors[`bundleComponents.${index}.componentProductId`] = 'Component product is required'
      }
      if (component.quantity === '' || Number(component.quantity) <= 0) {
        errors[`bundleComponents.${index}.quantity`] = 'Quantity must be greater than zero'
      }
    })
  }

  return errors
}

export function validateCategoryForm(values) {
  const errors = {}

  if (!values.name.trim()) {
    errors.name = 'Category name is required'
  } else if (values.name.trim().length > 120) {
    errors.name = 'Category name must be 120 characters or less'
  }

  if (values.description.trim().length > 1000) {
    errors.description = 'Description must be 1000 characters or less'
  }

  return errors
}

export function validateUnitForm(values) {
  const errors = {}

  if (!values.name.trim()) {
    errors.name = 'Unit name is required'
  } else if (values.name.trim().length > 80) {
    errors.name = 'Unit name must be 80 characters or less'
  }

  if (!values.code.trim()) {
    errors.code = 'Unit code is required'
  } else if (values.code.trim().length > 30) {
    errors.code = 'Unit code must be 30 characters or less'
  }

  if (values.description.trim().length > 1000) {
    errors.description = 'Description must be 1000 characters or less'
  }

  return errors
}

export function normalizeProductPayload(values) {
  const toNullableNumber = (value) => (value === '' ? null : Number(value))
  const toNullableString = (value) => {
    const normalized = value.trim()
    return normalized ? normalized : null
  }

  const payload = {
    name: values.name.trim(),
    description: toNullableString(values.description),
    productType: values.productType,
    status: values.status,
    sku: toNullableString(values.sku),
    barcode: toNullableString(values.barcode),
    unitId: values.unitId || null,
    currencyCode: values.currencyCode.trim().toUpperCase() || null,
    costPrice: toNullableNumber(values.costPrice),
    sellingPrice: toNullableNumber(values.sellingPrice),
    minStockLevel: toNullableNumber(values.minStockLevel),
    maxStockLevel: toNullableNumber(values.maxStockLevel),
    isSellable: values.isSellable,
    isPurchasable: values.isPurchasable,
    trackInventory: values.trackInventory,
    allowReturns: values.allowReturns,
    allowBackorder: values.allowBackorder,
    categoryIds: values.categoryIds,
  }

  if (values.productType === 'VARIABLE') {
    payload.variants = values.variants.map((variant, index) => ({
      ...(variant.id ? { id: variant.id } : {}),
      name: variant.name.trim(),
      sku: toNullableString(variant.sku),
      barcode: toNullableString(variant.barcode),
      costPrice: toNullableNumber(variant.costPrice),
      sellingPrice: toNullableNumber(variant.sellingPrice),
      currencyCode: variant.currencyCode.trim().toUpperCase() || null,
      unitId: variant.unitId || null,
      sortOrder: variant.sortOrder ?? index,
      attributes: variant.attributes.map((attr) => ({
        name: attr.name.trim(),
        value: attr.value.trim(),
      })),
      customFieldValues: (variant.customFieldValues ?? [])
        .filter((value) => !isEmptyCustomFieldValue(value.value))
        .map((value) => ({
          definitionId: value.definitionId,
          value: value.value,
        })),
    }))
  }

  if (values.productType === 'BUNDLE') {
    payload.bundleComponents = values.bundleComponents.map((component) => ({
      ...(component.id ? { id: component.id } : {}),
      componentProductId: component.componentProductId,
      componentVariantId: component.componentVariantId || null,
      quantity: Number(component.quantity),
    }))
  }

  if (values.customFieldValues?.length) {
    payload.customFieldValues = values.customFieldValues
      .filter((value) => !isEmptyCustomFieldValue(value.value))
      .map((value) => ({
        definitionId: value.definitionId,
        value: value.value,
      }))
  }

  if (values.openingStock?.enabled && values.productType !== 'SERVICE' && values.trackInventory) {
    payload.openingStock = {
      warehouseId: values.openingStock.warehouseId,
      zoneId: values.openingStock.zoneId || null,
      binId: values.openingStock.binId || null,
      quantity: Number(values.openingStock.quantity),
      notes: values.openingStock.notes?.trim() || null,
    }
  }

  return payload
}

export function normalizeCategoryPayload(values) {
  return {
    name: values.name.trim(),
    parentCategoryId: values.parentCategoryId || null,
    description: values.description.trim() || null,
  }
}

export function normalizeUnitPayload(values) {
  return {
    name: values.name.trim(),
    code: values.code.trim(),
    description: values.description.trim() || null,
  }
}

function isEmptyCustomFieldValue(value) {
  if (value === null || value === undefined || value === '') {
    return true
  }

  if (Array.isArray(value)) {
    return value.length === 0
  }

  return false
}
