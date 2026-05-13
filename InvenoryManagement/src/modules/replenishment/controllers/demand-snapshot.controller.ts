import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../../../common/response/api-response';
import {
  demandSnapshotIdParamSchema,
  listDemandSnapshotsSchema,
  refreshDemandSnapshotsSchema,
} from '../dtos/demand-snapshot.schema';
import { ReplenishmentModuleDependencies } from '../replenishment.module';
import { DemandSnapshotService } from '../services/demand-snapshot.service';

export class DemandSnapshotController {
  private readonly demandSnapshotService: DemandSnapshotService;

  constructor(dependencies: ReplenishmentModuleDependencies) {
    this.demandSnapshotService = new DemandSnapshotService(
      dependencies.db,
      dependencies.unitOfWork,
      dependencies.activityService,
    );
  }

  listSnapshots = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = listDemandSnapshotsSchema.parse(req);
      const result = await this.demandSnapshotService.listSnapshots(req.user!.tenantId, validated.query);
      res.status(200).json(ApiResponse.success(result, 'Demand snapshots fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  getSnapshotById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = demandSnapshotIdParamSchema.parse(req);
      const result = await this.demandSnapshotService.getSnapshotById(
        req.user!.tenantId,
        validated.params.snapshotId,
      );
      res.status(200).json(ApiResponse.success(result, 'Demand snapshot fetched successfully.'));
    } catch (error) {
      next(error);
    }
  };

  refreshSnapshots = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = refreshDemandSnapshotsSchema.parse(req);
      const result = await this.demandSnapshotService.refreshSnapshots(
        req.user!.tenantId,
        req.user!.userId,
        validated.body,
      );
      res.status(200).json(ApiResponse.success(result, 'Demand snapshots refreshed successfully.'));
    } catch (error) {
      next(error);
    }
  };
}
