import { httpRequest } from '../../../shared/api/httpClient.js'

function toQueryString(filters = {}) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    params.set(key, String(value))
  })

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function listProducts(filters) {
  return httpRequest(`/products${toQueryString(filters)}`)
}

export function getProduct(productId) {
  return httpRequest(`/products/${productId}`)
}

export function createProduct(payload) {
  return httpRequest('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateProduct(productId, payload) {
  return httpRequest(`/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteProduct(productId) {
  return httpRequest(`/products/${productId}`, {
    method: 'DELETE',
  })
}

export function listCategories() {
  return httpRequest('/products/categories')
}

export function createCategory(payload) {
  return httpRequest('/products/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCategory(categoryId, payload) {
  return httpRequest(`/products/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteCategory(categoryId) {
  return httpRequest(`/products/categories/${categoryId}`, {
    method: 'DELETE',
  })
}

export function listUnits() {
  return httpRequest('/products/units')
}

export function createUnit(payload) {
  return httpRequest('/products/units', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateUnit(unitId, payload) {
  return httpRequest(`/products/units/${unitId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteUnit(unitId) {
  return httpRequest(`/products/units/${unitId}`, {
    method: 'DELETE',
  })
}

export function listCustomFields() {
  return httpRequest('/products/custom-fields')
}

export function createCustomField(payload) {
  return httpRequest('/products/custom-fields', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCustomField(definitionId, payload) {
  return httpRequest(`/products/custom-fields/${definitionId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteCustomField(definitionId) {
  return httpRequest(`/products/custom-fields/${definitionId}`, {
    method: 'DELETE',
  })
}

export function listProductAttributes(productId) {
  return httpRequest(`/products/${productId}/attributes`)
}

export function createProductAttribute(productId, payload) {
  return httpRequest(`/products/${productId}/attributes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateProductAttribute(productId, attributeId, payload) {
  return httpRequest(`/products/${productId}/attributes/${attributeId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteProductAttribute(productId, attributeId) {
  return httpRequest(`/products/${productId}/attributes/${attributeId}`, {
    method: 'DELETE',
  })
}

export function createProductAttributeValue(productId, attributeId, payload) {
  return httpRequest(`/products/${productId}/attributes/${attributeId}/values`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateProductAttributeValue(productId, attributeId, valueId, payload) {
  return httpRequest(`/products/${productId}/attributes/${attributeId}/values/${valueId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteProductAttributeValue(productId, attributeId, valueId) {
  return httpRequest(`/products/${productId}/attributes/${attributeId}/values/${valueId}`, {
    method: 'DELETE',
  })
}
