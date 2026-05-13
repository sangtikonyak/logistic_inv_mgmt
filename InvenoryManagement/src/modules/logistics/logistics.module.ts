import { Router } from 'express';
import { Queryable } from '../../database/database.types';
import { UnitOfWork } from '../../database/unit-of-work';
import { setupLogisticsRoutes } from './routes/logistics.routes';

export class LogisticsModule {
  public readonly router: Router;

  constructor(db: Queryable, unitOfWork: UnitOfWork) {
    this.router = setupLogisticsRoutes({ db, unitOfWork });
  }
}
