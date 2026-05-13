import { Queryable } from '../../database/database.types';
import { UnitOfWork } from '../../database/unit-of-work';
import { ActivityService } from '../activity/services/activity.service';

export interface WarehouseModuleDependencies {
  db: Queryable;
  unitOfWork: UnitOfWork;
  activityService: ActivityService;
}
