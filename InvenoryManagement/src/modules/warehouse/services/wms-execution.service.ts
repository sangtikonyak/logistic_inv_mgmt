import { v4 as uuidv4 } from 'uuid';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { PicklistStatus, PicklistItemStatus } from '../types/warehouse.types';
import { SalesRepository } from '../../sales/repositories/sales.repository';
import { PurchaseRepository } from '../../purchase/repositories/purchase.repository';
import { AppError } from '../../../common/exceptions/app-error';

export class WmsExecutionService {
  constructor(
    private readonly warehouseRepository: WarehouseRepository,
    private readonly salesRepository: SalesRepository,
    private readonly purchaseRepository: PurchaseRepository,
    private readonly unitOfWork: UnitOfWork
  ) {}

  async generatePutawayTaskForReceipt(
    tenantId: string,
    receiptId: string,
    actorUserId: string,
    transaction: DatabaseTransaction
  ) {
    const receipt = await this.purchaseRepository.findPurchaseReceiptByIdForUpdate(tenantId, receiptId, transaction);
    if (!receipt) throw new AppError('Receipt not found for putaway generation', 404);

    const receiptItems = await this.purchaseRepository.listPurchaseReceiptItems(tenantId, receiptId, transaction);
    if (receiptItems.length === 0) return;

    const taskId = uuidv4();
    const taskNumber = `PUT-${Date.now()}`;

    await this.warehouseRepository.createPutawayTask({
      id: taskId,
      tenant_id: tenantId,
      warehouse_id: receipt.warehouse_id,
      task_number: taskNumber,
      reference_type: 'PURCHASE_RECEIPT',
      reference_id: receiptId,
      status: 'PENDING',
      assigned_to: null,
      notes: `Auto-generated for Receipt ${receipt.receipt_number}`,
      created_by: actorUserId,
      updated_by: actorUserId,
    }, transaction);

    for (const item of receiptItems) {
      // Create putaway from receiving bin (assumed null for general receiving area) to final bin
      await this.warehouseRepository.createPutawayTaskItem({
        id: uuidv4(),
        tenant_id: tenantId,
        task_id: taskId,
        reference_item_id: item.id,
        product_id: item.product_id!,
        product_variant_id: item.product_variant_id ?? null,
        source_zone_id: null,
        source_bin_id: null,
        target_zone_id: null,
        target_bin_id: item.bin_id ?? null,
        quantity_expected: item.accepted_quantity,
        quantity_putaway: '0.0000',
        status: 'PENDING',
      }, transaction);
    }

    console.log(`[WMS] Putaway Task ${taskNumber} generated for Receipt ${receipt.receipt_number}`);
    return taskId;
  }

  /**
   * Generates a picklist for an allocated sales shipment
   */
  async generatePicklistForShipment(
    tenantId: string,
    shipmentId: string,
    actorUserId: string,
    transaction: DatabaseTransaction
  ) {
    const shipment = await this.salesRepository.findSalesShipmentByIdForUpdate(tenantId, shipmentId, transaction);
    if (!shipment) throw new AppError('Shipment not found for picklist generation', 404);

    const shipmentItems = await this.salesRepository.listSalesShipmentItems(tenantId, shipmentId, transaction);
    if (shipmentItems.length === 0) return;

    const picklistId = uuidv4();
    const picklistNumber = `PKL-${Date.now()}`;

    await this.warehouseRepository.createPicklist({
      id: picklistId,
      tenant_id: tenantId,
      warehouse_id: shipment.warehouse_id,
      picklist_number: picklistNumber,
      status: 'DRAFT',
      assigned_to: null,
      notes: `Auto-generated for Shipment ${shipment.shipment_number}`,
      created_by: actorUserId,
      updated_by: actorUserId,
    }, transaction);

    for (const item of shipmentItems) {
      await this.warehouseRepository.createPicklistItem({
        id: uuidv4(),
        tenant_id: tenantId,
        picklist_id: picklistId,
        reference_type: 'SALES_SHIPMENT',
        reference_id: shipmentId,
        reference_item_id: item.id,
        product_id: item.product_id!,
        product_variant_id: item.product_variant_id ?? null,
        zone_id: null, // To be determined by picking strategy or bin info
        bin_id: item.bin_id ?? null,
        quantity_requested: item.shipped_quantity,
        quantity_picked: '0.0000',
        status: 'PENDING',
      }, transaction);
    }

    console.log(`[WMS] Picklist ${picklistNumber} generated for Shipment ${shipment.shipment_number}`);
    return picklistId;
  }

  async listPicklists(
    tenantId: string,
    filters: { status?: string; assignedTo?: string; warehouseId?: string; page: number; limit: number }
  ) {
    const [items, total] = await Promise.all([
      this.warehouseRepository.listPicklists(tenantId, filters),
      this.warehouseRepository.countPicklists(tenantId, filters),
    ]);

    return {
      items,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async getPicklistById(tenantId: string, picklistId: string) {
    const picklist = await this.warehouseRepository.findPicklistById(tenantId, picklistId);
    if (!picklist) throw new AppError('Picklist not found', 404);

    const items = await this.warehouseRepository.listPicklistItems(tenantId, picklistId);
    return { ...picklist, items };
  }

  async assignPicklist(tenantId: string, actorUserId: string, picklistId: string, userId: string) {
    await this.unitOfWork.execute(async (transaction) => {
      const picklist = await this.warehouseRepository.findPicklistByIdForUpdate(tenantId, picklistId, transaction);
      if (!picklist) throw new AppError('Picklist not found', 404);
      if (picklist.status !== 'DRAFT' && picklist.status !== 'ASSIGNED') {
        throw new AppError('Only draft or assigned picklists can be re-assigned.', 409);
      }

      await this.warehouseRepository.updatePicklistStatus(
        tenantId,
        picklistId,
        { status: 'ASSIGNED', assignedTo: userId, updatedBy: actorUserId },
        transaction
      );
    });

    return this.getPicklistById(tenantId, picklistId);
  }

  async startPicking(tenantId: string, actorUserId: string, picklistId: string) {
    await this.unitOfWork.execute(async (transaction) => {
      const picklist = await this.warehouseRepository.findPicklistByIdForUpdate(tenantId, picklistId, transaction);
      if (!picklist) throw new AppError('Picklist not found', 404);
      if (picklist.status !== 'ASSIGNED') {
        throw new AppError('Picklist must be assigned before picking can start.', 409);
      }

      await this.warehouseRepository.updatePicklistStatus(
        tenantId,
        picklistId,
        { status: 'PICKING', updatedBy: actorUserId },
        transaction
      );
    });

    return this.getPicklistById(tenantId, picklistId);
  }

  async confirmPickItem(
    tenantId: string,
    actorUserId: string,
    picklistId: string,
    itemId: string,
    payload: { quantityPicked: number; binId?: string }
  ) {
    await this.unitOfWork.execute(async (transaction) => {
      const picklist = await this.warehouseRepository.findPicklistById(tenantId, picklistId);
      if (!picklist || picklist.status !== 'PICKING') {
        throw new AppError('Picking must be in progress to confirm items.', 409);
      }

      const item = await this.warehouseRepository.findPicklistItemByIdForUpdate(tenantId, itemId, transaction);
      if (!item || item.picklist_id !== picklistId) {
        throw new AppError('Picklist item not found.', 404);
      }

      const status: PicklistItemStatus =
        payload.quantityPicked >= Number(item.quantity_requested) ? 'COMPLETED' : 'PARTIAL';

      await this.warehouseRepository.updatePicklistItem(
        tenantId,
        itemId,
        {
          quantityPicked: payload.quantityPicked.toFixed(4),
          binId: payload.binId ?? item.bin_id,
          status,
        },
        transaction
      );
    });

    return this.getPicklistById(tenantId, picklistId);
  }

  async completePicklist(tenantId: string, actorUserId: string, picklistId: string) {
    await this.unitOfWork.execute(async (transaction) => {
      const picklist = await this.warehouseRepository.findPicklistByIdForUpdate(tenantId, picklistId, transaction);
      if (!picklist || picklist.status !== 'PICKING') {
        throw new AppError('Only picklists in picking state can be completed.', 409);
      }

      const items = await this.warehouseRepository.listPicklistItems(tenantId, picklistId, transaction);
      const anyUnpicked = items.some((i) => i.status === 'PENDING' || i.status === 'PARTIAL');

      // Update associated shipment statuses
      const shipmentIds = [...new Set(items.map((i) => i.reference_id))];
      for (const shipmentId of shipmentIds) {
        await this.salesRepository.updateSalesShipmentStatus(
          tenantId,
          shipmentId,
          { status: anyUnpicked ? 'ALLOCATED' : 'PICKED', updatedBy: actorUserId },
          transaction
        );
      }

      await this.warehouseRepository.updatePicklistStatus(
        tenantId,
        picklistId,
        { status: 'COMPLETED', updatedBy: actorUserId },
        transaction
      );
    });

    return this.getPicklistById(tenantId, picklistId);
  }
}
