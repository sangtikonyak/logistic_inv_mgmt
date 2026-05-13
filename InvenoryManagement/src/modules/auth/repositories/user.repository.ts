import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { User, UserPermission } from '../types/auth.types';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import { UserPermissionActionValue, UserPermissionResourceValue } from '../../../common/constants/permissions';

export class UserRepository {
  constructor(private readonly executor: Queryable) {}

  async create(
    user: Omit<User, 'created_at' | 'updated_at'>,
    executor: Queryable | DatabaseTransaction = this.executor,
  ): Promise<void> {
    const sql = `
      INSERT INTO users
      (id, tenant_id, email, password_hash, role, status, invite_token, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    await executor.execute<mysql.ResultSetHeader>(sql, [
      user.id,
      user.tenant_id,
      user.email,
      user.password_hash,
      user.role,
      user.status,
      user.invite_token || null,
    ]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const sql = `SELECT * FROM users WHERE email = ? LIMIT 1`;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [email]);
    const results = rows as User[];
    return results.length ? results[0] : null;
  }

  async findByIdAndTenant(
    id: string,
    tenantId: string,
    executor: Queryable | DatabaseTransaction = this.executor,
  ): Promise<User | null> {
    const sql = `SELECT * FROM users WHERE id = ? AND tenant_id = ? LIMIT 1`;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [id, tenantId]);
    const results = rows as User[];
    return results.length ? results[0] : null;
  }

  async findByInviteToken(token: string): Promise<User | null> {
    const sql = `SELECT * FROM users WHERE invite_token = ? LIMIT 1`;
    const [rows] = await this.executor.execute<mysql.RowDataPacket[]>(sql, [token]);
    const results = rows as User[];
    return results.length ? results[0] : null;
  }

  async listByTenant(
    tenantId: string,
    executor: Queryable | DatabaseTransaction = this.executor,
  ): Promise<User[]> {
    const sql = `
      SELECT *
      FROM users
      WHERE tenant_id = ?
      ORDER BY created_at ASC, id ASC
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId]);
    return rows as User[];
  }

  async existsByEmail(
    email: string,
    executor: Queryable | DatabaseTransaction = this.executor,
  ): Promise<boolean> {
    const sql = `SELECT id FROM users WHERE email = ? LIMIT 1`;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [email]);
    return rows.length > 0;
  }

  async acceptInvite(
    userId: string,
    tenantId: string,
    passwordHash: string,
    executor: Queryable | DatabaseTransaction = this.executor,
  ): Promise<void> {
    const sql = `
      UPDATE users
      SET password_hash = ?, status = 'ACTIVE', invite_token = NULL, updated_at = NOW()
      WHERE id = ? AND tenant_id = ?
    `;

    await executor.execute<mysql.ResultSetHeader>(sql, [passwordHash, userId, tenantId]);
  }

  async listPermissionsByUserId(
    tenantId: string,
    userId: string,
    executor: Queryable | DatabaseTransaction = this.executor,
  ): Promise<UserPermission[]> {
    const sql = `
      SELECT *
      FROM user_permissions
      WHERE tenant_id = ? AND user_id = ?
      ORDER BY resource ASC, action ASC
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, userId]);
    return rows as UserPermission[];
  }

  async listPermissionsByUserIds(
    tenantId: string,
    userIds: string[],
    executor: Queryable | DatabaseTransaction = this.executor,
  ): Promise<UserPermission[]> {
    if (userIds.length === 0) {
      return [];
    }

    const placeholders = userIds.map(() => '?').join(', ');
    const sql = `
      SELECT *
      FROM user_permissions
      WHERE tenant_id = ? AND user_id IN (${placeholders})
      ORDER BY user_id ASC, resource ASC, action ASC
    `;
    const [rows] = await executor.execute<mysql.RowDataPacket[]>(sql, [tenantId, ...userIds]);
    return rows as UserPermission[];
  }

  async replacePermissions(
    tenantId: string,
    userId: string,
    permissions: Array<{ resource: UserPermissionResourceValue; action: UserPermissionActionValue }>,
    actorUserId: string,
    executor: Queryable | DatabaseTransaction = this.executor,
  ): Promise<void> {
    await executor.execute<mysql.ResultSetHeader>(
      `DELETE FROM user_permissions WHERE tenant_id = ? AND user_id = ?`,
      [tenantId, userId],
    );

    for (const permission of permissions) {
      await executor.execute<mysql.ResultSetHeader>(
        `
          INSERT INTO user_permissions
          (id, tenant_id, user_id, resource, action, created_by, updated_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [
          uuidv4(),
          tenantId,
          userId,
          permission.resource,
          permission.action,
          actorUserId,
          actorUserId,
        ],
      );
    }
  }
}
