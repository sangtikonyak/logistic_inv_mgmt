import { v4 as uuidv4 } from 'uuid';
import { DatabaseTransaction } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { AppError } from '../../../common/exceptions/app-error';
import { InventoryCountRepository, InventoryCountItem } from '../repositories/inventory-count.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { WarehouseRepository } from '../../warehouse/repositories/warehouse.repository';
import { ActivityService } from '../../activity/services/activity.service';

export class InventoryCountService {
  constructor(
    private readonly countRepository: InventoryCountRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly warehouseRepository: WarehouseRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly activityService: ActivityService
  ) {}

  async createCountPlan(
    tenantId: string,
    actorUserId: string,
    input: { warehouseId: string; name: string; countType: 'FULL' | 'CYCLE' | 'SPOT'; binIds?: string[] }
  ) {
    const planId = uuidv4();
    const planNumber = `CNT-${Date.now()}`;

    await this.unitOfWork.execute(async (transaction) => {
      // 1. Create Plan
      await this.countRepository.createPlan({
        id: planId,
        tenant_id: tenantId,
        warehouse_id: input.warehouseId,
        plan_number: planNumber,
        name: input.name,
        status: 'DRAFT',
        count_type: input.countType,
        created_by: actorUserId,
        updated_by: actorUserId,
      }, transaction);

      // 2. Identify Bins to count
      let binIds: string[] = input.binIds ?? [];
      if (!input.binIds) {
        // If no bins provided, count all bins in warehouse
        const bins = await this.warehouseRepository.listBinsByWarehouse(tenantId, input.warehouseId);
        binIds = bins.map((b) => b.id);
      }

      // 3. For each bin, create a Count Task and snapshots of current stock
      for (const binId of binIds) {
        const taskId = uuidv4();
        await this.countRepository.createCountTask({
          id: taskId,
          tenant_id: tenantId,
          plan_id: planId,
          bin_id: binId,
          status: 'PENDING',
          assigned_to: null,
          started_at: null,
          completed_at: null,
        }, transaction);

        // Snapshot current stock in this bin
        const stocks = await this.inventoryRepository.listStockByBin(tenantId, binId);
        for (const stock of stocks) {
          await this.countRepository.createCountItem({
            id: uuidv4(),
            tenant_id: tenantId,
            task_id: taskId,
            product_id: stock.product_id!,
            product_variant_id: stock.product_variant_id ?? null,
            expected_quantity: stock.on_hand_quantity,
            counted_quantity: null,
            discrepancy_quantity: null,
            reconciled: false,
            reconciled_at: null,
          }, transaction);
        }
      }

      await this.activityService.logActivity({
        tenantId,
        userId: actorUserId,
        actionType: 'CREATE',
        module: 'INVENTORY',
        description: `Created Inventory Count Plan ${planNumber}: ${input.name}`,
      });
    });

    return this.countRepository.findPlanById(tenantId, planId);
  }

  async startCountTask(tenantId: string, actorUserId: string, taskId: string) {
    await this.unitOfWork.execute(async (transaction) => {
      const task = await this.countRepository.findTaskById(tenantId, taskId);
      if (!task) throw new AppError('Count task not found', 404);
      if (task.status !== 'PENDING') throw new AppError('Task already started or completed', 409);

      await this.countRepository.updateTaskStatus(tenantId, taskId, 'IN_PROGRESS', transaction);
    });

    return this.countRepository.findTaskById(tenantId, taskId);
  }

  async confirmCountItem(
    tenantId: string,
    actorUserId: string,
    taskId: string,
    itemId: string,
    countedQuantity: number
  ) {
    await this.unitOfWork.execute(async (transaction) => {
      const task = await this.countRepository.findTaskById(tenantId, taskId);
      if (!task || task.status !== 'IN_PROGRESS') {
        throw new AppError('Task must be in progress to confirm counts', 409);
      }

      const items = await this.countRepository.listItemsByTask(tenantId, taskId);
      const item = items.find(i => i.id === itemId);
      if (!item) throw new AppError('Count item not found', 404);

      const discrepancy = countedQuantity - Number(item.expected_quantity);

      await this.countRepository.updateCountItem(tenantId, itemId, {
        counted_quantity: countedQuantity.toFixed(4),
        discrepancy_quantity: discrepancy.toFixed(4),
      }, transaction);
    });

    return this.countRepository.findTaskById(tenantId, taskId);
  }

  /**
   * Reconciliation Engine:
   * Aligns system stock with physical reality based on counted discrepancies.
   */
  async reconcileCountTask(tenantId: string, actorUserId: string, taskId: string) {
    await this.unitOfWork.execute(async (transaction) => {
      const task = await this.countRepository.findTaskById(tenantId, taskId);
      if (!task || task.status !== 'IN_PROGRESS') throw new AppError('Invalid task state', 409);

      const items = await this.countRepository.listItemsByTask(tenantId, taskId);
      const bin = await this.warehouseRepository.findBinById(tenantId, task.bin_id);
      if (!bin) throw new AppError('Bin not found', 404);

      for (const item of items) {
        if (item.reconciled || item.counted_quantity === null) continue;

        const discrepancy = Number(item.discrepancy_quantity);
        if (discrepancy === 0) {
          await this.countRepository.updateCountItem(tenantId, item.id, { reconciled: true }, transaction);
          continue;
        }

        // Adjust Stock
        const stock = await this.inventoryRepository.findStockByLocatorForUpdate({
          tenantId,
          warehouseId: bin.warehouse_id,
          binId: bin.id,
          productId: item.product_id,
          product_variant_id: item.product_variant_id ?? null,
        } as any, transaction);

        if (stock) {
          const nextOnHand = Number(stock.on_hand_quantity) + discrepancy;
          const nextAvailable = nextOnHand - Number(stock.reserved_quantity);

          await this.inventoryRepository.updateStockQuantities(stock.id, {
            onHand: nextOnHand.toFixed(4),
            reserved: stock.reserved_quantity,
            available: nextAvailable.toFixed(4),
          }, transaction);
        } else if (discrepancy > 0) {
          // Create new stock if it didn't exist but was found during count
          await this.inventoryRepository.createStock({
            id: uuidv4(),
            tenant_id: tenantId,
            warehouse_id: bin.warehouse_id,
            zone_id: bin.zone_id,
            bin_id: bin.id,
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            on_hand_quantity: discrepancy.toFixed(4),
            reserved_quantity: '0.0000',
            available_quantity: discrepancy.toFixed(4),
          } as any, transaction);
        }

        // Record Adjustment Movement
        await this.inventoryRepository.createMovement({
          id: uuidv4(),
          tenant_id: tenantId,
          warehouse_id: bin.warehouse_id,
          zone_id: bin.zone_id,
          bin_id: bin.id,
          product_id: item.product_id,
          product_variant_id: item.product_variant_id,
          movement_type: discrepancy > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          reference_type: 'INVENTORY_COUNT',
          reference_id: taskId,
          quantity: Math.abs(discrepancy).toFixed(4),
          notes: `Reconciliation for Count Task ${taskId}`,
          created_by: actorUserId,
        } as any, transaction);

        await this.countRepository.updateCountItem(tenantId, item.id, { reconciled: true }, transaction);
      }

      await this.countRepository.updateTaskStatus(tenantId, taskId, 'COMPLETED', transaction);
    });

    return this.countRepository.findTaskById(tenantId, taskId);
  }
}
