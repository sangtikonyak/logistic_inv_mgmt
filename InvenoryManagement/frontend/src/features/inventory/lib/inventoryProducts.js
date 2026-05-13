import { listProducts } from '../../products/api/productsApi.js'

const PRODUCT_PAGE_SIZE = 100

export async function listInventoryMasterProducts() {
  const products = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const response = await listProducts({
      page,
      limit: PRODUCT_PAGE_SIZE,
      sortBy: 'name',
      sortDir: 'ASC',
    })

    const payload = response.data ?? {}
    const items = payload.items ?? payload ?? []
    const pagination = payload.pagination ?? {}

    products.push(...items)
    totalPages = pagination.totalPages ?? 1
    page += 1
  }

  return products.filter((product) => product.trackInventory && product.productType !== 'SERVICE')
}
