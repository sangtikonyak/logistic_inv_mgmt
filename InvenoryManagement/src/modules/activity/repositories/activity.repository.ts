import { v4 as uuidv4 } from 'uuid';
import { DatabaseRow, Queryable } from '../../../database/database.types';
import { CreateActivityInput, UserActivity } from '../types/activity.types';

export class ActivityRepository {
  constructor(private readonly db: Queryable) {}

  async create(input: CreateActivityInput): Promise<void> {
    const id = uuidv4();
    const sql = `
      INSERT INTO user_activities (id, tenant_id, user_id, action_type, module, description, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await this.db.execute(sql, [
      id,
      input.tenantId,
      input.userId,
      input.actionType,
      input.module,
      input.description,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]);
  }

  async findLatest(tenantId: string, limit: number = 10): Promise<UserActivity[]> {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10));
    const sql = `
      SELECT a.id, a.tenant_id as tenantId, a.user_id as userId, u.email as userEmail,
             a.action_type as actionType, a.module, a.description, a.metadata, 
             a.created_at as createdAt
      FROM user_activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.tenant_id = ?
      ORDER BY a.created_at DESC
      LIMIT ${safeLimit}
    `;
    const [rows] = await this.db.query<DatabaseRow[]>(sql, [tenantId]);
    return rows as UserActivity[];
  }
}
