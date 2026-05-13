import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { WarehouseRepository } from '../../warehouse/repositories/warehouse.repository';
import { ActivityService } from '../../activity/services/activity.service';
import { ProcurementRepository } from '../repositories/procurement.repository';
import {
  ProcurementRequisitionCreateInput,
  ProcurementRequisitionItemInput,
  ProcurementRequisitionListFilters,
} from '../types/procurement.types';

export class ProcurementService {
  private readonly procurementRepository: ProcurementRepository;
  private readonly warehouseRepository: WarehouseRepository;

  constructor(
    db: Queryable,
    private readonly unitOfWork: UnitOfWork,
    private readonly activityService: ActivityService,
  ) {
    this.procurementRepository = new ProcurementRepository(db);
    this.warehouseRepository = new WarehouseRepository(db);
  }

  async createRequisition(tenantId: string, actorUserId: string, input: ProcurementRequisitionCreateInput) {
    await this.mustGetWarehouse(tenantId, input.warehouseId);
    await this.validateItems(tenantId, input.items);

    const requisitionId = uuidv4();
    const requisitionNumber = `PR-${Date.now()}-${requisitionId.slice(0, 8).toUpperCase()}`;

    await this.unitOfWork.execute(async (transaction) => {
      await this.procurementRepository.createRequisition(
        {
          id: requisitionId,
          tenant_id: tenantId,
          requisition_number: requisitionNumber,
          warehouse_id: input.warehouseId,
          requested_by: actorUserId,
          status: 'DRAFT',
          required_by_date: input.requiredByDate ? new Date(input.requiredByDate) : null,
          notes: input.notes ?? null,
          submitted_at: null,
          approved_at: null,
          rejected_at: null,
          cancelled_at: null,
          created_by: actorUserId,
          updated_by: actorUserId,
        },
        transaction,
      );

      for (const item of input.items) {
        await this.procurementRepository.createRequisitionItem(
          {
            id: uuidv4(),
            tenant_id: tenantId,
            procurement_requisition_id: requisitionId,
            product_id: item.productId ?? null,
            product_variant_id: item.productVariantId ?? null,
            requested_quantity: this.toDecimal(item.requestedQuantity),
            approved_quantity: this.toDecimal(0),
            estimated_unit_cost: this.toDecimal(item.estimatedUnitCost ?? 0),
            notes: item.notes ?? null,
            created_at: new Date(),
            updated_at: new Date(),
          },
          transaction,
        );
      }
    });

    const result = await this.getRequisitionById(tenantId, requisitionId);
    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'CREATE',
      module: 'PURCHASE',
      description: `Procurement requisition created: ${result.requisitionNumber}`,
      metadata: { requisitionId: result.id, requisitionNumber: result.requisitionNumber },
    });
    return result;
  }

  async listRequisitions(tenantId: string, filters: ProcurementRequisitionListFilters) {
    const [items, total] = await Promise.all([
      this.procurementRepository.listRequisitions(tenantId, filters),
      this.procurementRepository.countRequisitions(tenantId, filters),
    ]);

    return {
      items: items.map((item) => this.toSummary(item)),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
      },
    };
  }

  async getRequisitionById(tenantId: string, requisitionId: string) {
    const requisition = await this.procurementRepository.findRequisitionDetailById(tenantId, requisitionId);
    if (!requisition) {
      throw new AppError('Procurement requisition not found.', 404);
    }
    const items = await this.procurementRepository.listRequisitionItems(tenantId, requisitionId);
    return {
      ...this.toSummary(requisition),
      items: items.map((item) => ({
        id: item.id,
        productId: item.product_id,
        productVariantId: item.product_variant_id,
        productName: item.product_name,
        variantName: item.variant_name,
        sku: item.sku,
        requestedQuantity: Number(item.requested_quantity),
        approvedQuantity: Number(item.approved_quantity),
        estimatedUnitCost: Number(item.estimated_unit_cost),
        notes: item.notes,
      })),
    };
  }

  async submitRequisition(tenantId: string, actorUserId: string, requisitionId: string) {
    await this.unitOfWork.execute(async (transaction) => {
      const requisition = await this.procurementRepository.findRequisitionByIdForUpdate(tenantId, requisitionId, transaction);
      if (!requisition) {
        throw new AppError('Procurement requisition not found.', 404);
      }
      if (requisition.status !== 'DRAFT') {
        throw new AppError('Only draft requisitions can be submitted.', 409);
      }
      const items = await this.procurementRepository.listRequisitionItems(tenantId, requisitionId, transaction);
      if (items.length === 0) {
        throw new AppError('Requisition must have at least one item before submit.', 400);
      }
      await this.procurementRepository.updateRequisitionStatus(
        tenantId,
        requisitionId,
        {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          approvedAt: null,
          rejectedAt: null,
          cancelledAt: null,
          updatedBy: actorUserId,
        },
        transaction,
      );
    });

    return this.getRequisitionById(tenantId, requisitionId);
  }

  async approveRequisition(tenantId: string, actorUserId: string, requisitionId: string) {
    await this.transitionTo(tenantId, actorUserId, requisitionId, 'APPROVED');
    return this.getRequisitionById(tenantId, requisitionId);
  }

  async rejectRequisition(tenantId: string, actorUserId: string, requisitionId: string) {
    await this.transitionTo(tenantId, actorUserId, requisitionId, 'REJECTED');
    return this.getRequisitionById(tenantId, requisitionId);
  }

  private async transitionTo(
    tenantId: string,
    actorUserId: string,
    requisitionId: string,
    status: 'APPROVED' | 'REJECTED',
  ) {
    await this.unitOfWork.execute(async (transaction) => {
      const requisition = await this.procurementRepository.findRequisitionByIdForUpdate(tenantId, requisitionId, transaction);
      if (!requisition) {
        throw new AppError('Procurement requisition not found.', 404);
      }
      if (requisition.status !== 'SUBMITTED') {
        throw new AppError('Only submitted requisitions can be approved or rejected.', 409);
      }
      await this.procurementRepository.updateRequisitionStatus(
        tenantId,
        requisitionId,
        {
          status,
          submittedAt: requisition.submitted_at,
          approvedAt: status === 'APPROVED' ? new Date() : null,
          rejectedAt: status === 'REJECTED' ? new Date() : null,
          cancelledAt: null,
          updatedBy: actorUserId,
        },
        transaction,
      );
    });
  }

  private async validateItems(tenantId: string, items: ProcurementRequisitionItemInput[]) {
    for (const item of items) {
      const count = Number(Boolean(item.productId)) + Number(Boolean(item.productVariantId));
      if (count !== 1) {
        throw new AppError('Each requisition line must include either productId or productVariantId.', 400);
      }
      const isValid = await this.procurementRepository.findPurchasableItemReference(tenantId, {
        productId: item.productId,
        productVariantId: item.productVariantId,
      });
      if (!isValid) {
        throw new AppError('Requisition includes an invalid or non-purchasable item.', 400);
      }
    }
  }

  private async mustGetWarehouse(tenantId: string, warehouseId: string) {
    const warehouse = await this.warehouseRepository.findWarehouseById(tenantId, warehouseId);
    if (!warehouse) {
      throw new AppError('Warehouse not found.', 404);
    }
  }

  private toSummary(item: {
    id: string;
    requisition_number: string;
    warehouse_id: string;
    warehouse_name: string;
    requested_by: string;
    requested_by_name: string;
    status: string;
    required_by_date: Date | null;
    notes: string | null;
    submitted_at: Date | null;
    approved_at: Date | null;
    rejected_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }) {
    return {
      id: item.id,
      requisitionNumber: item.requisition_number,
      warehouseId: item.warehouse_id,
      warehouseName: item.warehouse_name,
      requestedBy: item.requested_by,
      requestedByName: item.requested_by_name,
      status: item.status,
      requiredByDate: item.required_by_date,
      notes: item.notes,
      submittedAt: item.submitted_at,
      approvedAt: item.approved_at,
      rejectedAt: item.rejected_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  }

  private toDecimal(value: number) {
    return value.toFixed(4);
  }
}
