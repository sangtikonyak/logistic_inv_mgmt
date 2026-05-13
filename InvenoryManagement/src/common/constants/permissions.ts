export const USER_ROLE_VALUES = ['SUPER_ADMIN', 'MANAGER', 'ADMIN', 'STAFF', 'OPERATOR'] as const;
export const USER_PERMISSION_ACTION_VALUES = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'ALL'] as const;
export const USER_PERMISSION_RESOURCE_VALUES = [
  'USERS',
  'REPORTS',
  'PRODUCTS',
  'WAREHOUSES',
  'INVENTORY',
  'SUPPLIERS',
  'PURCHASES',
  'CUSTOMERS',
  'SALES',
  'RETURNS',
  'REPLENISHMENT',
  'LOGISTICS',
  'FINANCE',
] as const;

export type UserRoleValue = (typeof USER_ROLE_VALUES)[number];
export type UserPermissionActionValue = (typeof USER_PERMISSION_ACTION_VALUES)[number];
export type UserPermissionResourceValue = (typeof USER_PERMISSION_RESOURCE_VALUES)[number];

const CRUD_ALL = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'ALL'] as const;
const CRUD = ['CREATE', 'READ', 'UPDATE', 'DELETE'] as const;
const READ_ONLY = ['READ'] as const;

export const DEFAULT_ROLE_PERMISSIONS: Record<
  Exclude<UserRoleValue, 'SUPER_ADMIN'>,
  Partial<Record<UserPermissionResourceValue, readonly UserPermissionActionValue[]>>
> = {
  MANAGER: {
    USERS: READ_ONLY,
    REPORTS: READ_ONLY,
    PRODUCTS: CRUD_ALL,
    WAREHOUSES: CRUD_ALL,
    INVENTORY: CRUD_ALL,
    SUPPLIERS: CRUD_ALL,
    PURCHASES: CRUD_ALL,
    CUSTOMERS: CRUD_ALL,
    SALES: CRUD_ALL,
    RETURNS: CRUD_ALL,
    REPLENISHMENT: CRUD_ALL,
    LOGISTICS: CRUD_ALL,
    FINANCE: CRUD_ALL,
  },
  ADMIN: {
    USERS: READ_ONLY,
    REPORTS: READ_ONLY,
    PRODUCTS: CRUD,
    WAREHOUSES: CRUD,
    INVENTORY: CRUD,
    SUPPLIERS: CRUD,
    PURCHASES: CRUD,
    CUSTOMERS: CRUD,
    SALES: CRUD,
    RETURNS: CRUD,
    REPLENISHMENT: CRUD,
    LOGISTICS: CRUD,
    FINANCE: CRUD,
  },
  STAFF: {
    USERS: READ_ONLY,
    REPORTS: READ_ONLY,
    PRODUCTS: READ_ONLY,
    WAREHOUSES: READ_ONLY,
    INVENTORY: READ_ONLY,
    SUPPLIERS: READ_ONLY,
    PURCHASES: READ_ONLY,
    CUSTOMERS: READ_ONLY,
    SALES: READ_ONLY,
    RETURNS: READ_ONLY,
    REPLENISHMENT: READ_ONLY,
    LOGISTICS: READ_ONLY,
    FINANCE: READ_ONLY,
  },

  OPERATOR: {
    INVENTORY: READ_ONLY,
    PURCHASES: READ_ONLY,
    SALES: READ_ONLY,
    RETURNS: READ_ONLY,
    REPLENISHMENT: READ_ONLY,
    LOGISTICS: READ_ONLY,
  },
};

export function expandPermissionActions(
  actions: readonly UserPermissionActionValue[],
): UserPermissionActionValue[] {
  return actions.includes('ALL') ? [...USER_PERMISSION_ACTION_VALUES] : [...new Set(actions)];
}
