import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { AppError } from '../../../common/exceptions/app-error';
import {
  UserPermissionActionValue,
  UserPermissionResourceValue,
  expandPermissionActions,
} from '../../../common/constants/permissions';
import { generateTokens, verifyRefreshToken } from '../../../common/utils/jwt.util';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { TenantRepository } from '../repositories/tenant.repository';
import { UserRepository } from '../repositories/user.repository';
import { UserPermissionAssignmentInput, UserRole } from '../types/auth.types';
import { ActivityService } from '../../activity/services/activity.service';

export class AuthService {
  private readonly tenantRepo: TenantRepository;
  private readonly userRepo: UserRepository;

  constructor(
    db: Queryable,
    private readonly unitOfWork: UnitOfWork,
    private readonly activityService: ActivityService,
  ) {
    this.tenantRepo = new TenantRepository(db);
    this.userRepo = new UserRepository(db);
  }

  /**
   * Register a new Company/Tenant and its Super Admin User
   * Wrapped in a transation to ensure both or neither are created.
   */
  async registerCompany(companyName: string, adminEmail: string, password: string) {
    const existingTenant = await this.tenantRepo.findByName(companyName);
    if (existingTenant) {
      throw new AppError('Company name already exists', 400);
    }

    const existingUser = await this.userRepo.findByEmail(adminEmail);
    if (existingUser) {
      throw new AppError('Admin email already in use', 400);
    }

    const tenantId = uuidv4();
    const adminUserId = uuidv4();
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    try {
      await this.unitOfWork.execute(async (transaction) => {
        await this.tenantRepo.create(tenantId, companyName, transaction);
        await this.userRepo.create(
          {
            id: adminUserId,
            tenant_id: tenantId,
            email: adminEmail,
            password_hash: passwordHash,
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
            invite_token: null,
          },
          transaction
        );
        
        await this.activityService.logActivity({
          tenantId,
          userId: adminUserId,
          actionType: 'REGISTER',
          module: 'AUTH',
          description: `Company ${companyName} registered with admin ${adminEmail}`,
        });
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(`Registration failed: ${(error as Error).message}`, 500);
    }

    return {
      tenantId,
      adminUserId,
      role: 'SUPER_ADMIN',
      message: 'Company successfully registered. You can now log in.',
    };
  }

  /**
   * Authenticate a user and return JWT tokens
   */
  async login(email: string, passwordRequired: string) {
    const user = await this.userRepo.findByEmail(email);

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('Invalid credentials or inactive account.', 401);
    }

    const isMatch = await bcrypt.compare(passwordRequired, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid credentials.', 401);
    }

    const permissions = this.groupPermissions(await this.userRepo.listPermissionsByUserId(user.tenant_id, user.id));
    const tokens = generateTokens({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
    });

    await this.activityService.logActivity({
      tenantId: user.tenant_id,
      userId: user.id,
      actionType: 'LOGIN',
      module: 'AUTH',
      description: `User ${user.email} logged in`,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        permissions,
      },
      ...tokens,
    };
  }

  /**
   * Generates invites for an array of emails
   */
  async inviteUsers(tenantId: string, emails: string[], role: UserRole) {
    try {
      return await this.unitOfWork.execute(async (transaction) => {
        const results: Array<{ email: string; inviteToken: string }> = [];

        for (const email of emails) {
          await this.ensureEmailAvailable(email, transaction);

          const inviteToken = crypto.randomBytes(32).toString('hex');

          await this.userRepo.create(
            {
              id: uuidv4(),
              tenant_id: tenantId,
              email,
              password_hash: '',
              role,
              status: 'INVITED',
              invite_token: inviteToken,
            },
            transaction
          );

          results.push({ email, inviteToken });
        }

        return results;
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(`Failed to send invitations: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Completes account registration by setting the password
   */
  async acceptInvite(token: string, newPassword: string) {
    const user = await this.userRepo.findByInviteToken(token);

    if (!user || user.status !== 'INVITED') {
      throw new AppError('Invalid or expired invitation token', 400);
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Ensure we respect the user's tenant strictness bounds when doing updates
    await this.userRepo.acceptInvite(user.id, user.tenant_id, passwordHash);

    return { message: 'Invitation accepted successfully. Proceed to login.' };
  }

  /**
   * Refreshes JWT tokens using a valid refresh token
   */
  async refreshTokens(refreshTokenStr: string) {
    try {
      const decoded = verifyRefreshToken(refreshTokenStr);
      
      // Ensure user still exists and is ACTIVE
      const user = await this.userRepo.findByIdAndTenant(decoded.userId, decoded.tenantId);
      if (!user || user.status !== 'ACTIVE') {
        throw new AppError('User inactive or restricted', 401);
      }

      const tokens = generateTokens({
        userId: user.id,
        tenantId: user.tenant_id,
        role: user.role,
      });

      return tokens;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Invalid or expired refresh token', 401);
    }
  }

  async listUsers(tenantId: string) {
    const users = await this.userRepo.listByTenant(tenantId);
    const permissions = await this.userRepo.listPermissionsByUserIds(
      tenantId,
      users.map((user) => user.id),
    );
    const permissionMap = new Map<
      string,
      Partial<Record<UserPermissionResourceValue, UserPermissionActionValue[]>>
    >();

    for (const permission of permissions) {
      const current = permissionMap.get(permission.user_id) ?? {};
      const existingActions = current[permission.resource] ?? [];
      current[permission.resource] = expandPermissionActions([...existingActions, permission.action]);
      permissionMap.set(permission.user_id, current);
    }

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      permissions: permissionMap.get(user.id) ?? {},
      createdAt: user.created_at ?? null,
      updatedAt: user.updated_at ?? null,
    }));
  }

  async getUserPermissions(tenantId: string, userId: string) {
    const user = await this.userRepo.findByIdAndTenant(userId, tenantId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const permissions = await this.userRepo.listPermissionsByUserId(tenantId, userId);
    return {
      userId: user.id,
      role: user.role,
      permissions: this.groupPermissions(permissions),
    };
  }

  async updateUserPermissions(
    tenantId: string,
    actorUserId: string,
    userId: string,
    assignments: UserPermissionAssignmentInput[],
  ) {
    const user = await this.userRepo.findByIdAndTenant(userId, tenantId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    if (user.role === 'SUPER_ADMIN') {
      throw new AppError('Super admin permissions are implicit and cannot be overridden.', 409);
    }

    const normalizedPermissions = this.normalizePermissionAssignments(assignments);

    await this.unitOfWork.execute(async (transaction) => {
      await this.userRepo.replacePermissions(
        tenantId,
        userId,
        normalizedPermissions,
        actorUserId,
        transaction,
      );
    });

    return this.getUserPermissions(tenantId, userId);
  }

  private async ensureEmailAvailable(
    email: string,
    executor: Queryable | DatabaseTransaction
  ): Promise<void> {
    const emailInUse = await this.userRepo.existsByEmail(email, executor);
    if (emailInUse) {
      throw new AppError(`User with email ${email} already exists`, 409);
    }
  }

  private normalizePermissionAssignments(assignments: UserPermissionAssignmentInput[]) {
    const normalized = new Map<
      UserPermissionResourceValue,
      Set<UserPermissionActionValue>
    >();

    for (const assignment of assignments) {
      const current = normalized.get(assignment.resource) ?? new Set<UserPermissionActionValue>();
      for (const action of assignment.actions) {
        current.add(action);
      }
      normalized.set(assignment.resource, current);
    }

    return Array.from(normalized.entries()).flatMap(([resource, actions]) =>
      expandPermissionActions([...actions]).map((action) => ({ resource, action })),
    );
  }

  private groupPermissions(
    permissions: Array<{ resource: UserPermissionResourceValue; action: UserPermissionActionValue }>,
  ) {
    const grouped: Partial<Record<UserPermissionResourceValue, UserPermissionActionValue[]>> = {};

    for (const permission of permissions) {
      const nextActions = grouped[permission.resource] ?? [];
      grouped[permission.resource] = expandPermissionActions([...nextActions, permission.action]);
    }

    return grouped;
  }
}
