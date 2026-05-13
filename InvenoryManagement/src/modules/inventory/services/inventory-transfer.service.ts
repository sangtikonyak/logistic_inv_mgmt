import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { WarehouseRepository } from '../../warehouse/repositories/warehouse.repository';
import { ActivityService } from '../../activity/services/activity.service';
import { InventoryRepository } from '../repositories/inventory.repository';
import {
  InventoryStockRow,
  TransferCreateInput,
  TransferListFilters,
  WarehouseTransferDetailRow,
} from '../types/inventory.types';

export class InventoryTransferService {
  private readonly warehouseRepository: WarehouseRepository;
  private readonly inventoryRepository: InventoryRepository;

  constructor(
    db: Queryable,
    private readonly unitOfWork: UnitOfWork,
    private readonly activityService: ActivityService
  ) {
    this.warehouseRepository = new WarehouseRepository(db);
    this.inventoryRepository = new InventoryRepository(db);
  }

  async createTransfer(tenantId: string, actorUserId: string, input: TransferCreateInput) {
    if (input.sourceWarehouseId === input.destinationWarehouseId) {
      throw new AppError('Source and destination warehouses must be different.', 400);
    }

    await Promise.all([
      this.mustGetWarehouse(tenantId, input.sourceWarehouseId),
      this.mustGetWarehouse(tenantId, input.destinationWarehouseId),
    ]);

    for (const item of input.items) {
      const reference = await this.inventoryRepository.findInventoryItemReference(tenantId, {
        productId: item.productId,
        productVariantId: item.productVariantId,
      });

      if (!reference) {
        throw new AppError('Transfer item references an invalid product or variant.', 404);
      }
      if (!reference.trackInventory || reference.productType === 'SERVICE') {
        throw new AppError('Only inventory-tracked items can be transferred.', 400);
      }

      if (item.sourceBinId) {
        const sourceBin = await this.mustGetBin(tenantId, item.sourceBinId);
        if (sourceBin.warehouse_id !== input.sourceWarehouseId) {
          throw new AppError('Source bin does not belong to the source warehouse.', 400);
        }
      }

      if (item.destinationBinId) {
        const destinationBin = await this.mustGetBin(tenantId, item.destinationBinId);
        if (destinationBin.warehouse_id !== input.destinationWarehouseId) {
          throw new AppError('Destination bin does not belong to the destination warehouse.', 400);
        }
      }
    }

    const transferId = uuidv4();
    const transferNumber = `TRF-${Date.now()}-${transferId.slice(0, 8).toUpperCase()}`;

    await this.unitOfWork.execute(async (transaction) => {
      await this.inventoryRepository.createTransfer(
        {
          id: transferId,
          tenant_id: tenantId,
          transfer_number: transferNumber,
          source_warehouse_id: input.sourceWarehouseId,
          destination_warehouse_id: input.destinationWarehouseId,
          status: 'DRAFT',
          notes: input.notes ?? null,
          requested_at: new Date(),
          completed_at: null,
          created_by: actorUserId,
          updated_by: actorUserId,
          created_at: new Date(),
          updated_at: new Date(),
        },
        transaction
      );

      for (const item of input.items) {
        await this.inventoryRepository.createTransferItem(
          {
            id: uuidv4(),
            tenant_id: tenantId,
            transfer_id: transferId,
            product_id: item.productId ?? null,
            product_variant_id: item.productVariantId ?? null,
            quantity: this.toDecimal(item.quantity),
            source_bin_id: item.sourceBinId ?? null,
            destination_bin_id: item.destinationBinId ?? null,
            created_at: new Date(),
            updated_at: new Date(),
          },
          transaction
        );
      }
    });

    const result = await this.getTransferById(tenantId, transferId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'CREATE',
      module: 'INVENTORY',
      description: `Inventory transfer created: ${result.transferNumber}`,
      metadata: { transferId, transferNumber: result.transferNumber },
    });

    return result;
  }

  async listTransfers(tenantId: string, filters: TransferListFilters) {
    const [items, total] = await Promise.all([
      this.inventoryRepository.listTransfers(tenantId, filters),
      this.inventoryRepository.countTransfers(tenantId, filters),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / filters.limit);

    return {
      items: items.map((item) => this.toTransferSummary(item)),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
        hasNextPage: filters.page < totalPages,
        hasPrevPage: filters.page > 1 && totalPages > 0,
      },
    };
  }

  async getTransferById(tenantId: string, transferId: string) {
    const transfer = await this.inventoryRepository.findTransferById(tenantId, transferId);
    if (!transfer) {
      throw new AppError('Transfer not found.', 404);
    }

    const items = await this.inventoryRepository.listTransferItems(tenantId, transferId);
    return {
      ...this.toTransferSummary(transfer),
      items: items.map((item) => ({
        id: item.id,
        productId: item.product_id,
        productVariantId: item.product_variant_id,
        productName: item.product_name,
        variantName: item.variant_name,
        productType: item.product_type,
        sku: item.sku,
        quantity: Number(item.quantity),
        sourceBinId: item.source_bin_id,
        destinationBinId: item.destination_bin_id,
      })),
    };
  }

  async completeTransfer(tenantId: string, actorUserId: string, transferId: string) {
    await this.unitOfWork.execute(async (transaction) => {
      const transfer = await this.inventoryRepository.findTransferByIdForUpdate(tenantId, transferId, transaction);
      if (!transfer) {
        throw new AppError('Transfer not found.', 404);
      }
      if (transfer.status === 'COMPLETED') {
        throw new AppError('Transfer has already been completed.', 409);
      }
      if (transfer.status === 'CANCELLED') {
        throw new AppError('Cancelled transfer cannot be completed.', 409);
      }

      const items = await this.inventoryRepository.listTransferItems(tenantId, transferId, transaction);

      for (const item of items) {
        const sourceBin = item.source_bin_id
          ? await this.mustGetBin(tenantId, item.source_bin_id)
          : null;
        const destinationBin = item.destination_bin_id
          ? await this.mustGetBin(tenantId, item.destination_bin_id)
          : null;

        const sourceStock = await this.inventoryRepository.findStockByLocatorForUpdate(
          {
            tenantId,
            warehouseId: transfer.source_warehouse_id,
            binId: item.source_bin_id ?? null,
            productId: item.product_id,
            productVariantId: item.product_variant_id,
          },
          transaction
        );

        if (!sourceStock) {
          throw new AppError('Source stock record not found for one or more transfer items.', 409);
        }

        const currentAvailable = Number(sourceStock.available_quantity);
        const currentReserved = Number(sourceStock.reserved_quantity);
        const currentOnHand = Number(sourceStock.on_hand_quantity);
        const transferQty = Number(item.quantity);

        if (currentAvailable < transferQty || currentOnHand < transferQty) {
          throw new AppError('Insufficient stock available for transfer.', 409);
        }

        await this.inventoryRepository.updateStockQuantities(
          sourceStock.id,
          {
            onHand: this.toDecimal(currentOnHand - transferQty),
            reserved: this.toDecimal(currentReserved),
            available: this.toDecimal(currentAvailable - transferQty),
          },
          transaction
        );

        let destinationStock = await this.inventoryRepository.findStockByLocatorForUpdate(
          {
            tenantId,
            warehouseId: transfer.destination_warehouse_id,
            binId: item.destination_bin_id ?? null,
            productId: item.product_id,
            productVariantId: item.product_variant_id,
          },
          transaction
        );

        if (!destinationStock) {
          destinationStock = {
            id: uuidv4(),
            tenant_id: tenantId,
            warehouse_id: transfer.destination_warehouse_id,
            zone_id: destinationBin?.zone_id ?? null,
            bin_id: item.destination_bin_id ?? null,
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            on_hand_quantity: this.toDecimal(0),
            reserved_quantity: this.toDecimal(0),
            available_quantity: this.toDecimal(0),
            created_at: new Date(),
            updated_at: new Date(),
          } satisfies InventoryStockRow;

          await this.inventoryRepository.createStock(destinationStock, transaction);
        }

        const destinationOnHand = Number(destinationStock.on_hand_quantity);
        const destinationReserved = Number(destinationStock.reserved_quantity);
        const destinationAvailable = Number(destinationStock.available_quantity);

        await this.inventoryRepository.updateStockQuantities(
          destinationStock.id,
          {
            onHand: this.toDecimal(destinationOnHand + transferQty),
            reserved: this.toDecimal(destinationReserved),
            available: this.toDecimal(destinationAvailable + transferQty),
          },
          transaction
        );

        // FIFO Consumption from Source and Creation in Destination
        let remainingToConsume = transferQty;
        const sourceLayers = await this.inventoryRepository.findAvailableCostLayers(
          tenantId,
          transfer.source_warehouse_id,
          item.product_id,
          item.product_variant_id,
          transaction
        );

        if (sourceLayers.length === 0) {
          throw new AppError('No available cost layers found in source warehouse for FIFO transfer.', 409);
        }

        for (const layer of sourceLayers) {
          if (remainingToConsume <= 0) break;

          const qtyInLayer = Number(layer.qty_remaining);
          const consumeQty = Math.min(qtyInLayer, remainingToConsume);

          await this.inventoryRepository.updateCostLayerRemainingQty(
            layer.id,
            this.toDecimal(qtyInLayer - consumeQty),
            transaction
          );

          await this.inventoryRepository.createLayerConsumption(
            {
              id: uuidv4(),
              tenant_id: tenantId,
              inventory_cost_layer_id: layer.id,
              reference_type: 'WAREHOUSE_TRANSFER',
              reference_id: transferId,
              consumed_quantity: this.toDecimal(consumeQty),
              unit_cost: layer.unit_cost,
              created_by: actorUserId,
              created_at: new Date(),
            },
            transaction
          );

          // Create new layer in destination with same cost information
          await this.inventoryRepository.createInventoryCostLayer(
            {
              id: uuidv4(),
              tenant_id: tenantId,
              warehouse_id: transfer.destination_warehouse_id,
              product_id: item.product_id,
              product_variant_id: item.product_variant_id,
              lot_id: layer.lot_id,
              container_id: null,
              reference_type: 'WAREHOUSE_TRANSFER',
              reference_id: transferId,
              receipt_date: layer.receipt_date,
              qty_received: this.toDecimal(consumeQty),
              qty_remaining: this.toDecimal(consumeQty),
              unit_cost: layer.unit_cost,
              landed_cost: layer.landed_cost,
              currency_code: layer.currency_code,
              created_by: actorUserId,
              created_at: new Date(),
            },
            transaction
          );

          remainingToConsume -= consumeQty;
        }

        if (remainingToConsume > 0) {
          throw new AppError('Insufficient cost layers in source warehouse to fulfill the transfer.', 409);
        }

        await this.inventoryRepository.createMovement(
          {
            id: uuidv4(),
            tenant_id: tenantId,
            warehouse_id: transfer.source_warehouse_id,
            zone_id: sourceBin?.zone_id ?? sourceStock.zone_id,
            bin_id: item.source_bin_id ?? null,
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            movement_type: 'TRANSFER_OUT',
            reference_type: 'WAREHOUSE_TRANSFER',
            reference_id: transferId,
            quantity: this.toDecimal(transferQty * -1),
            notes: transfer.notes,
            created_by: actorUserId,
          },
          transaction
        );

        await this.inventoryRepository.createMovement(
          {
            id: uuidv4(),
            tenant_id: tenantId,
            warehouse_id: transfer.destination_warehouse_id,
            zone_id: destinationBin?.zone_id ?? destinationStock.zone_id,
            bin_id: item.destination_bin_id ?? null,
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            movement_type: 'TRANSFER_IN',
            reference_type: 'WAREHOUSE_TRANSFER',
            reference_id: transferId,
            quantity: this.toDecimal(transferQty),
            notes: transfer.notes,
            created_by: actorUserId,
          },
          transaction
        );
      }

      await this.inventoryRepository.updateTransferStatus(
        tenantId,
        transferId,
        {
          status: 'COMPLETED',
          completedAt: new Date(),
          updatedBy: actorUserId,
        },
        transaction
      );
    });

    const result = await this.getTransferById(tenantId, transferId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'INVENTORY',
      description: `Inventory transfer completed: ${result.transferNumber}`,
      metadata: { transferId, transferNumber: result.transferNumber, status: 'COMPLETED' },
    });

    return result;
  }

  async cancelTransfer(tenantId: string, actorUserId: string, transferId: string) {
    await this.unitOfWork.execute(async (transaction) => {
      const transfer = await this.inventoryRepository.findTransferByIdForUpdate(tenantId, transferId, transaction);
      if (!transfer) {
        throw new AppError('Transfer not found.', 404);
      }
      if (transfer.status === 'COMPLETED') {
        throw new AppError('Completed transfer cannot be cancelled.', 409);
      }
      if (transfer.status === 'CANCELLED') {
        throw new AppError('Transfer has already been cancelled.', 409);
      }

      await this.inventoryRepository.updateTransferStatus(
        tenantId,
        transferId,
        {
          status: 'CANCELLED',
          completedAt: null,
          updatedBy: actorUserId,
        },
        transaction
      );
    });

    const result = await this.getTransferById(tenantId, transferId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'INVENTORY',
      description: `Inventory transfer cancelled: ${result.transferNumber}`,
      metadata: { transferId, transferNumber: result.transferNumber, status: 'CANCELLED' },
    });

    return result;
  }

  private async mustGetWarehouse(tenantId: string, warehouseId: string) {
    const warehouse = await this.warehouseRepository.findWarehouseById(tenantId, warehouseId);
    if (!warehouse) {
      throw new AppError('Warehouse not found.', 404);
    }
    return warehouse;
  }

  private async mustGetBin(tenantId: string, binId: string) {
    const bin = await this.warehouseRepository.findBinById(tenantId, binId);
    if (!bin) {
      throw new AppError('Bin not found.', 404);
    }
    return bin;
  }

  private toTransferSummary(transfer: WarehouseTransferDetailRow) {
    return {
      id: transfer.id,
      transferNumber: transfer.transfer_number,
      sourceWarehouseId: transfer.source_warehouse_id,
      sourceWarehouseName: transfer.source_warehouse_name,
      destinationWarehouseId: transfer.destination_warehouse_id,
      destinationWarehouseName: transfer.destination_warehouse_name,
      status: transfer.status,
      notes: transfer.notes,
      requestedAt: transfer.requested_at,
      completedAt: transfer.completed_at,
      createdAt: transfer.created_at,
      updatedAt: transfer.updated_at,
    };
  }

  private toDecimal(value: number) {
    return value.toFixed(4);
  }
}
