import { useAuth } from '../../app/providers/AuthProvider.jsx'

export const ROLE_VALUES = ['SUPER_ADMIN', 'MANAGER', 'ADMIN', 'STAFF', 'OPERATOR']
export const PERMISSION_ACTIONS = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'ALL']
export const PERMISSION_RESOURCES = [
  'USERS',
  'PRODUCTS',
  'WAREHOUSES',
  'INVENTORY',
  'SUPPLIERS',
  'PURCHASES',
  'CUSTOMERS',
  'SALES',
  'RETURNS',
  'REPORTS',
  'REPLENISHMENT',
]

const CRUD = ['CREATE', 'READ', 'UPDATE', 'DELETE']
const CRUD_ALL = [...CRUD, 'ALL']
const READ_ONLY = ['READ']

export const DEFAULT_ROLE_PERMISSIONS = {
  MANAGER: {
    USERS: READ_ONLY,
    PRODUCTS: CRUD_ALL,
    WAREHOUSES: CRUD_ALL,
    INVENTORY: CRUD_ALL,
    SUPPLIERS: CRUD_ALL,
    PURCHASES: CRUD_ALL,
    CUSTOMERS: CRUD_ALL,
    SALES: CRUD_ALL,
    RETURNS: CRUD_ALL,
    REPORTS: READ_ONLY,
    REPLENISHMENT: CRUD_ALL,
  },
  ADMIN: {
    USERS: READ_ONLY,
    PRODUCTS: CRUD,
    WAREHOUSES: CRUD,
    INVENTORY: CRUD,
    SUPPLIERS: CRUD,
    PURCHASES: CRUD,
    CUSTOMERS: CRUD,
    SALES: CRUD,
    RETURNS: CRUD,
    REPORTS: READ_ONLY,
    REPLENISHMENT: CRUD,
  },
  STAFF: {
    USERS: READ_ONLY,
    PRODUCTS: READ_ONLY,
    WAREHOUSES: READ_ONLY,
    INVENTORY: READ_ONLY,
    SUPPLIERS: READ_ONLY,
    PURCHASES: READ_ONLY,
    CUSTOMERS: READ_ONLY,
    SALES: READ_ONLY,
    RETURNS: READ_ONLY,
    REPLENISHMENT: READ_ONLY,
  },
  OPERATOR: {
    INVENTORY: READ_ONLY,
    PURCHASES: READ_ONLY,
    SALES: READ_ONLY,
    RETURNS: READ_ONLY,
    REPLENISHMENT: READ_ONLY,
  },
}

export function normalizePermissions(permissions) {
  if (!permissions || typeof permissions !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(permissions).map(([resource, actions]) => [
      resource,
      Array.from(new Set(Array.isArray(actions) ? actions : [])),
    ]),
  )
}

export function hasPermission(session, resource, action) {
  const role = session?.user?.role

  if (!role) {
    return false
  }

  if (role === 'SUPER_ADMIN') {
    return true
  }

  // If the session carries explicit permissions (set via the permission editor),
  // honour them exclusively — do NOT fall back to role defaults.
  const userPermissions = session?.user?.permissions
  const hasExplicitPermissions =
    userPermissions &&
    typeof userPermissions === 'object' &&
    Object.keys(userPermissions).length > 0

  if (hasExplicitPermissions) {
    const explicit = userPermissions[resource]
    if (!Array.isArray(explicit) || explicit.length === 0) return false
    return explicit.includes('ALL') || explicit.includes(action)
  }

  // No explicit permissions saved — fall back to the role's default access matrix.
  const fallbackActions = DEFAULT_ROLE_PERMISSIONS[role]?.[resource] ?? []
  return fallbackActions.includes('ALL') || fallbackActions.includes(action)
}

export function isRole(session, role) {
  return session?.user?.role === role
}

export function formatRoleLabel(role) {
  if (!role) {
    return 'Unknown'
  }

  return role
    .split('_')
    .map((segment) => `${segment.slice(0, 1)}${segment.slice(1).toLowerCase()}`)
    .join(' ')
}

export function usePermissions() {
  const { session } = useAuth()

  return {
    session,
    role: session?.user?.role ?? null,
    isSuperAdmin: session?.user?.role === 'SUPER_ADMIN',
    can: (resource, action) => hasPermission(session, resource, action),
    hasRole: (role) => isRole(session, role),
  }
}
