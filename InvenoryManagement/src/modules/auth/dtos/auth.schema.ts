import { z } from 'zod';
import {
  USER_PERMISSION_ACTION_VALUES,
  USER_PERMISSION_RESOURCE_VALUES,
} from '../../../common/constants/permissions';

const uuidSchema = z.uuid();
const permissionActionSchema = z.enum(USER_PERMISSION_ACTION_VALUES);
const permissionResourceSchema = z.enum(USER_PERMISSION_RESOURCE_VALUES);

export const registerCompanySchema = z.object({
  body: z.object({
    companyName: z.string().min(2, 'Company name is too short').max(100),
    adminEmail: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const inviteUserSchema = z.object({
  body: z.object({
    emails: z.array(z.string().email()).min(1, 'At least one email is required'),
    role: z.enum(['MANAGER', 'ADMIN', 'STAFF', 'OPERATOR']),
  }),
});

export const acceptInviteSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Invite token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    userId: uuidSchema,
  }),
});

export const updateUserPermissionsSchema = z.object({
  params: z.object({
    userId: uuidSchema,
  }),
  body: z.object({
    permissions: z.array(
      z.object({
        resource: permissionResourceSchema,
        actions: z.array(permissionActionSchema).min(1),
      }),
    ),
  }),
});
