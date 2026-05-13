/**
 * Maps Zod validation issues from the backend into:
 *   1. A field-keyed errors object  { fieldName: "Friendly message" }
 *   2. A human-readable summary string for the top-level alert
 *
 * Backend shape (from error-handler.ts):
 *   error.data = [{ path: "body.customerName", message: "String must contain at least 1 character(s)" }]
 */

// ── Friendly message overrides ───────────────────────────────────────────────
// Maps raw Zod messages → readable UI copy
const MESSAGE_MAP = {
  'Required':                                          'This field is required.',
  'String must contain at least 1 character(s)':       'This field cannot be empty.',
  'String must contain at least 2 character(s)':       'Must be at least 2 characters.',
  'String must contain at least 3 character(s)':       'Must be at least 3 characters.',
  'String must contain at least 8 character(s)':       'Must be at least 8 characters.',
  'Invalid email':                                     'Enter a valid email address.',
  'Invalid uuid':                                      'Invalid ID — please re-select this value.',
  'Number must be greater than 0':                     'Must be greater than 0.',
  'Number must be greater than or equal to 0':         'Must be 0 or more.',
  'Expected number, received nan':                     'Enter a valid number.',
  'Invalid date':                                      'Enter a valid date.',
  'Invalid enum value':                                'Select a valid option.',
  'Array must contain at least 1 element(s)':          'Add at least one item.',
  'Each sales item must include either productId or productVariantId': 'Select a product for this line.',
  'String must contain exactly 3 character(s)':        'Currency code must be exactly 3 characters (e.g. INR, USD).',
}

function friendlyMessage(raw) {
  if (!raw) return 'Invalid value.'
  // Exact match first
  if (MESSAGE_MAP[raw]) return MESSAGE_MAP[raw]
  // Partial matches for dynamic Zod messages
  if (raw.includes('at least') && raw.includes('character')) return raw.replace(/String must contain at least (\d+) character\(s\)/, 'Must be at least $1 characters.')
  if (raw.includes('at most') && raw.includes('character'))  return raw.replace(/String must contain at most (\d+) character\(s\)/, 'Cannot exceed $1 characters.')
  if (raw.includes('greater than or equal to'))              return `Must be at least ${raw.match(/\d+/)?.[0] ?? 0}.`
  if (raw.includes('greater than'))                          return `Must be greater than ${raw.match(/\d+/)?.[0] ?? 0}.`
  if (raw.includes('less than or equal to'))                 return `Cannot exceed ${raw.match(/\d+/)?.[0] ?? 0}.`
  return raw
}

// ── Field label overrides ────────────────────────────────────────────────────
// Maps field path segments → readable label for the summary list
const FIELD_LABELS = {
  customerName:      'Customer Name',
  selectedCustomerId:'Customer',
  warehouseId:       'Warehouse',
  orderDate:         'Order Date',
  expectedShipDate:  'Expected Ship Date',
  currencyCode:      'Currency Code',
  supplierId:        'Supplier',
  items:             'Order Items',
  orderedQuantity:   'Quantity',
  unitPrice:         'Unit Price',
  unitCost:          'Unit Cost',
  taxAmount:         'Tax Amount',
  discountAmount:    'Discount',
  productId:         'Product',
  productVariantId:  'Product Variant',
  name:              'Name',
  code:              'Code',
  email:             'Email',
  phone:             'Phone',
  status:            'Status',
  receiptDate:       'Receipt Date',
  reservationDate:   'Reservation Date',
  shipmentDate:      'Shipment Date',
  reservedQuantity:  'Reserved Quantity',
  shippedQuantity:   'Shipped Quantity',
  salesOrderItemId:  'Order Item',
}

function fieldLabel(path) {
  const last = path.split('.').at(-1)
  return FIELD_LABELS[last] ?? FIELD_LABELS[path] ?? last
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Returns { fieldErrors, summary }
 *   fieldErrors — object keyed by form field name with friendly message
 *   summary     — single string listing all issues for the top alert
 */
export function parseApiValidationError(error) {
  if (!Array.isArray(error?.data) || error.data.length === 0) {
    return { fieldErrors: {}, summary: null }
  }

  const fieldErrors = {}
  const lines = []

  for (const issue of error.data) {
    const rawPath  = typeof issue?.path === 'string' ? issue.path.replace(/^body\./, '') : ''
    const message  = friendlyMessage(issue?.message)
    const label    = fieldLabel(rawPath)

    // Map to form field keys — try exact path, then last segment, then item-indexed key
    const aliases = getFieldAliases(rawPath)
    for (const alias of aliases) {
      if (alias && !fieldErrors[alias]) {
        fieldErrors[alias] = message
      }
    }

    lines.push(`${label}: ${message}`)
  }

  const summary = lines.length === 1
    ? lines[0]
    : lines.map(l => `• ${l}`).join('\n')

  return { fieldErrors, summary }
}

/**
 * Legacy helper — returns just the field errors object.
 * Kept for backward compatibility with existing form catch blocks.
 */
export function mapApiErrors(error) {
  return parseApiValidationError(error).fieldErrors
}

/**
 * Returns a friendly summary string, or null if no validation issues.
 */
export function getValidationSummary(error) {
  return parseApiValidationError(error).summary
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function getFieldAliases(path) {
  if (!path) return []

  const aliases = [path]

  // items.0.productId  →  also try  items.0.productId  and  productId
  // items.0.unitPrice  →  also try  items.0.unitPrice  and  unitPrice
  const parts = path.split('.')
  if (parts.length >= 2) {
    aliases.push(parts.at(-1))           // last segment
    aliases.push(parts.slice(0, 2).join('.'))  // e.g. items.0
  }

  // Legacy aliases
  if (path === 'openingStock.warehouseId') aliases.push('openingStockWarehouseId')
  if (path === 'openingStock.quantity')    aliases.push('openingStockQuantity')

  return [...new Set(aliases)]
}
