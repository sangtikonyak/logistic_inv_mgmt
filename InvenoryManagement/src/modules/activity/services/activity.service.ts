import { Queryable } from '../../../database/database.types';
import { ActivityRepository } from '../repositories/activity.repository';
import { CreateActivityInput, UserActivity } from '../types/activity.types';

export class ActivityService {
  private readonly activityRepository: ActivityRepository;

  constructor(db: Queryable) {
    this.activityRepository = new ActivityRepository(db);
  }

  async logActivity(input: CreateActivityInput): Promise<void> {
    await this.activityRepository.create(input);
  }

  async getLatestActivities(tenantId: string, limit: number = 10): Promise<UserActivity[]> {
    return this.activityRepository.findLatest(tenantId, limit);
  }
}
