import type {
  UserPermissionActionValue,
  UserPermissionResourceValue,
  UserRoleValue,
} from '../../../common/constants/permissions';

export type UserRole = UserRoleValue;
export type UserStatus = 'ACTIVE' | 'INVITED' | 'INACTIVE';

export interface Tenant {
  id: string;
  name: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  invite_token?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserPermission {
  id: string;
  tenant_id: string;
  user_id: string;
  resource: UserPermissionResourceValue;
  action: UserPermissionActionValue;
  created_by: string | null;
  updated_by: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserPermissionAssignmentInput {
  resource: UserPermissionResourceValue;
  actions: UserPermissionActionValue[];
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
}
