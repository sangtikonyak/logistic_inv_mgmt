import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { WarehouseRepository } from '../../warehouse/repositories/warehouse.repository';
import { ActivityService } from '../../activity/services/activity.service';
import { InventoryRepository } from '../repositories/inventory.repository';
import {
  InventoryPagination,
  InventoryMovementListRow,
  InventoryStockListRow,
  MovementListFilters,
  StockAdjustmentInput,
  StockListFilters,
  StockLocationUpdateInput,
} from '../types/inventory.types';

export class InventoryService {
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

  async listStock(tenantId: string, warehouseId: string, filters: StockListFilters) {
    await this.mustGetWarehouse(tenantId, warehouseId);
    const [items, total] = await Promise.all([
      this.inventoryRepository.listWarehouseStock(tenantId, warehouseId, filters),
      this.inventoryRepository.countWarehouseStock(tenantId, warehouseId, filters),
    ]);

    return {
      items: items.map((item) => this.toStockResponse(item)),
      pagination: this.toPagination(filters.page, filters.limit, total),
    };
  }

  async getStockItem(tenantId: string, warehouseId: string, itemId: string) {
    await this.mustGetWarehouse(tenantId, warehouseId);
    const item = await this.inventoryRepository.findWarehouseStockByStockId(tenantId, warehouseId, itemId);
    if (!item) {
      throw new AppError('Stock item not found in this warehouse.', 404);
    }
    return this.toStockResponse(item);
  }

  async listMovements(tenantId: string, warehouseId: string, filters: MovementListFilters) {
    await this.mustGetWarehouse(tenantId, warehouseId);
    const [items, total] = await Promise.all([
      this.inventoryRepository.listMovements(tenantId, warehouseId, filters),
      this.inventoryRepository.countMovements(tenantId, warehouseId, filters),
    ]);

    return {
      items: items.map((item) => this.toMovementResponse(item)),
      pagination: this.toPagination(filters.page, filters.limit, total),
    };
  }

  async createStockAdjustment(
    tenantId: string,
    actorUserId: string,
    warehouseId: string,
    input: StockAdjustmentInput
  ) {
    await this.mustGetWarehouse(tenantId, warehouseId);

    let zone = null;
    if (input.zoneId) {
      zone = await this.mustGetZone(tenantId, input.zoneId);
      if (zone.warehouse_id !== warehouseId) {
        throw new AppError('Zone does not belong to the target warehouse.', 400);
      }
    }

    let bin = null;
    if (input.binId) {
      bin = await this.mustGetBin(tenantId, input.binId);
      if (bin.warehouse_id !== warehouseId) {
        throw new AppError('Bin does not belong to the target warehouse.', 400);
      }
      if (zone && bin.zone_id !== zone.id) {
        throw new AppError('Bin does not belong to the provided zone.', 400);
      }
      if (!zone) {
        zone = await this.mustGetZone(tenantId, bin.zone_id);
      }
    }

    const reference = await this.inventoryRepository.findInventoryItemReference(tenantId, {
      productId: input.productId,
      productVariantId: input.productVariantId,
    });

    if (!reference) {
      throw new AppError('Product or variant not found.', 404);
    }
    if (!reference.trackInventory || reference.productType === 'SERVICE') {
      throw new AppError('Only inventory-tracked items can be adjusted.', 400);
    }

    const quantity = input.quantity;
    let resultStockId = '';

    await this.unitOfWork.execute(async (transaction) => {
      let stock = await this.inventoryRepository.findStockByLocatorForUpdate(
        {
          tenantId,
          warehouseId,
          binId: input.binId ?? null,
          productId: input.productId ?? null,
          productVariantId: input.productVariantId ?? null,
        },
        transaction
      );

      if (!stock) {
        if (input.adjustmentType === 'ADJUSTMENT_OUT') {
          throw new AppError('Cannot reduce stock because no stock record exists for this item and location.', 409);
        }

        stock = {
          id: uuidv4(),
          tenant_id: tenantId,
          warehouse_id: warehouseId,
          zone_id: zone?.id ?? null,
          bin_id: input.binId ?? null,
          product_id: input.productId ?? null,
          product_variant_id: input.productVariantId ?? null,
          on_hand_quantity: this.toQuantityString(0),
          reserved_quantity: this.toQuantityString(0),
          available_quantity: this.toQuantityString(0),
          created_at: new Date(),
          updated_at: new Date(),
        };

        await this.inventoryRepository.createStock(stock, transaction);
      }

      const currentOnHand = Number(stock.on_hand_quantity);
      const currentReserved = Number(stock.reserved_quantity);
      const nextOnHand =
        input.adjustmentType === 'ADJUSTMENT_IN' ? currentOnHand + quantity : currentOnHand - quantity;

      if (nextOnHand < 0) {
        throw new AppError('Stock adjustment would make on-hand quantity negative.', 409);
      }

      const nextAvailable = nextOnHand - currentReserved;
      if (nextAvailable < 0) {
        throw new AppError('Stock adjustment would make available quantity negative.', 409);
      }

      await this.inventoryRepository.updateStockQuantities(
        stock.id,
        {
          onHand: this.toQuantityString(nextOnHand),
          reserved: this.toQuantityString(currentReserved),
          available: this.toQuantityString(nextAvailable),
        },
        transaction
      );

      let costLayerId: string | null = null;

      if (input.adjustmentType === 'ADJUSTMENT_OUT') {
        let remainingToConsume = quantity;
        const layers = await this.inventoryRepository.findAvailableCostLayers(
          tenantId,
          warehouseId,
          input.productId ?? null,
          input.productVariantId ?? null,
          transaction
        );

        if (layers.length === 0) {
          throw new AppError('No available cost layers found for FIFO consumption.', 409);
        }

        for (const layer of layers) {
          if (remainingToConsume <= 0) break;

          const qtyInLayer = Number(layer.qty_remaining);
          const consumeQty = Math.min(qtyInLayer, remainingToConsume);

          await this.inventoryRepository.updateCostLayerRemainingQty(
            layer.id,
            this.toQuantityString(qtyInLayer - consumeQty),
            transaction
          );

          await this.inventoryRepository.createLayerConsumption(
            {
              id: uuidv4(),
              tenant_id: tenantId,
              inventory_cost_layer_id: layer.id,
              reference_type: 'STOCK_ADJUSTMENT',
              reference_id: stock.id,
              consumed_quantity: this.toQuantityString(consumeQty),
              unit_cost: layer.unit_cost,
              created_by: actorUserId,
              created_at: new Date(),
            },
            transaction
          );

          remainingToConsume -= consumeQty;
        }

        if (remainingToConsume > 0) {
          throw new AppError('Insufficient cost layers to fulfill the adjustment.', 409);
        }
      } else {
        // ADJUSTMENT_IN: Create Cost Layer
        costLayerId = uuidv4();
        await this.inventoryRepository.createInventoryCostLayer(
          {
            id: costLayerId,
            tenant_id: tenantId,
            warehouse_id: warehouseId,
            product_id: input.productId ?? null,
            product_variant_id: input.productVariantId ?? null,
            lot_id: null,
            container_id: null,
            reference_type: 'STOCK_ADJUSTMENT',
            reference_id: stock.id,
            receipt_date: input.receiptDate ? new Date(input.receiptDate) : new Date(),
            qty_received: this.toQuantityString(quantity),
            qty_remaining: this.toQuantityString(quantity),
            unit_cost: this.toQuantityString(input.unitCost ?? 0),
            landed_cost: this.toQuantityString(0),
            currency_code: null,
            created_by: actorUserId,
            created_at: new Date(),
          },
          transaction
        );
      }

      await this.inventoryRepository.createMovement(
        {
          id: uuidv4(),
          tenant_id: tenantId,
          warehouse_id: warehouseId,
          zone_id: zone?.id ?? stock.zone_id,
          bin_id: input.binId ?? null,
          product_id: input.productId ?? null,
          product_variant_id: input.productVariantId ?? null,
          movement_type: input.adjustmentType,
          cost_layer_id: costLayerId,
          reference_type: 'MANUAL_STOCK_ADJUSTMENT',
          reference_id: stock.id,
          quantity: this.toQuantityString(input.adjustmentType === 'ADJUSTMENT_IN' ? quantity : quantity * -1),
          notes: input.notes ?? null,
          created_by: actorUserId,
        },
        transaction
      );

      resultStockId = stock.id;
    });

    const adjusted = await this.inventoryRepository.findWarehouseStockByStockId(
      tenantId,
      warehouseId,
      resultStockId
    );
    if (!adjusted) {
      throw new AppError('Adjusted stock could not be loaded.', 500);
    }

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'CREATE',
      module: 'INVENTORY',
      description: `Stock adjusted for product ${adjusted.product_name}: ${input.adjustmentType} ${quantity}`,
      metadata: {
        stockId: resultStockId,
        productId: input.productId,
        warehouseId,
        adjustmentType: input.adjustmentType,
        quantity,
      },
    });

    return this.toStockResponse(adjusted);
  }

  async updateStockLocation(
    tenantId: string,
    actorUserId: string,
    warehouseId: string,
    stockId: string,
    input: StockLocationUpdateInput
  ) {
    await this.mustGetWarehouse(tenantId, warehouseId);

    let zone = null;
    if (input.zoneId) {
      zone = await this.mustGetZone(tenantId, input.zoneId);
      if (zone.warehouse_id !== warehouseId) {
        throw new AppError('Zone does not belong to the target warehouse.', 400);
      }
    }

    let bin = null;
    if (input.binId) {
      bin = await this.mustGetBin(tenantId, input.binId);
      if (bin.warehouse_id !== warehouseId) {
        throw new AppError('Bin does not belong to the target warehouse.', 400);
      }
      if (zone && bin.zone_id !== zone.id) {
        throw new AppError('Bin does not belong to the provided zone.', 400);
      }
      if (!zone) {
        zone = await this.mustGetZone(tenantId, bin.zone_id);
      }
    }

    const targetZoneId = zone?.id ?? null;
    const targetBinId = input.binId ?? null;
    let resultStockId = stockId;

    await this.unitOfWork.execute(async (transaction) => {
      const stock = await this.inventoryRepository.findStockByIdForUpdate(
        tenantId,
        warehouseId,
        stockId,
        transaction
      );
      if (!stock) {
        throw new AppError('Stock item not found in this warehouse.', 404);
      }

      if (Number(stock.reserved_quantity) > 0) {
        throw new AppError('Stock location cannot be changed while reserved quantity exists.', 409);
      }

      if ((stock.zone_id ?? null) === targetZoneId && (stock.bin_id ?? null) === targetBinId) {
        resultStockId = stock.id;
        return;
      }

      const targetStock = await this.inventoryRepository.findStockByExactLocationForUpdate(
        {
          tenantId,
          warehouseId,
          zoneId: targetZoneId,
          binId: targetBinId,
          productId: stock.product_id,
          productVariantId: stock.product_variant_id,
        },
        transaction
      );

      if (targetStock && targetStock.id !== stock.id) {
        await this.inventoryRepository.updateStockQuantities(
          targetStock.id,
          {
            onHand: this.toQuantityString(Number(targetStock.on_hand_quantity) + Number(stock.on_hand_quantity)),
            reserved: this.toQuantityString(Number(targetStock.reserved_quantity) + Number(stock.reserved_quantity)),
            available: this.toQuantityString(Number(targetStock.available_quantity) + Number(stock.available_quantity)),
          },
          transaction
        );
        await this.inventoryRepository.deleteStock(stock.id, transaction);
        resultStockId = targetStock.id;
        return;
      }

      await this.inventoryRepository.updateStockLocation(
        stock.id,
        { zoneId: targetZoneId, binId: targetBinId },
        transaction
      );
      resultStockId = stock.id;
    });

    const updated = await this.inventoryRepository.findWarehouseStockByStockId(
      tenantId,
      warehouseId,
      resultStockId
    );
    if (!updated) {
      throw new AppError('Updated stock item could not be loaded.', 500);
    }

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'INVENTORY',
      description: `Stock location updated for product ${updated.product_name} in warehouse ${updated.warehouse_name}`,
      metadata: {
        stockId: resultStockId,
        productId: updated.product_id,
        warehouseId,
        zoneId: updated.zone_id,
        binId: updated.bin_id,
      },
    });

    return this.toStockResponse(updated);
  }
  private async mustGetWarehouse(tenantId: string, warehouseId: string) {
    const warehouse = await this.warehouseRepository.findWarehouseById(tenantId, warehouseId);
    if (!warehouse) {
      throw new AppError('Warehouse not found.', 404);
    }
    return warehouse;
  }

  private async mustGetZone(tenantId: string, zoneId: string) {
    const zone = await this.warehouseRepository.findZoneById(tenantId, zoneId);
    if (!zone) {
      throw new AppError('Zone not found.', 404);
    }
    return zone;
  }

  private async mustGetBin(tenantId: string, binId: string) {
    const bin = await this.warehouseRepository.findBinById(tenantId, binId);
    if (!bin) {
      throw new AppError('Bin not found.', 404);
    }
    return bin;
  }

  private toStockResponse(item: InventoryStockListRow) {
    return {
      id: item.id,
      warehouseId: item.warehouse_id,
      warehouseName: item.warehouse_name,
      zoneId: item.zone_id,
      zoneName: item.zone_name,
      binId: item.bin_id,
      binName: item.bin_name,
      productId: item.product_id,
      productVariantId: item.product_variant_id,
      productName: item.product_name,
      variantName: item.variant_name,
      productType: item.product_type,
      sku: item.sku,
      onHandQuantity: Number(item.on_hand_quantity),
      reservedQuantity: Number(item.reserved_quantity),
      availableQuantity: Number(item.available_quantity),
      updatedAt: item.updated_at,
    };
  }

  private toMovementResponse(item: InventoryMovementListRow) {
    return {
      id: item.id,
      warehouseId: item.warehouse_id,
      warehouseName: item.warehouse_name,
      zoneId: item.zone_id,
      zoneName: item.zone_name,
      binId: item.bin_id,
      binName: item.bin_name,
      productId: item.product_id,
      productVariantId: item.product_variant_id,
      productName: item.product_name,
      variantName: item.variant_name,
      productType: item.product_type,
      sku: item.sku,
      movementType: item.movement_type,
      referenceType: item.reference_type,
      referenceId: item.reference_id,
      quantity: Number(item.quantity),
      notes: item.notes,
      createdAt: item.created_at,
    };
  }

  private toPagination(page: number, limit: number, total: number) {
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const pagination: InventoryPagination = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1 && totalPages > 0,
    };
    return pagination;
  }

  private toQuantityString(value: number) {
    return value.toFixed(4);
  }
}
