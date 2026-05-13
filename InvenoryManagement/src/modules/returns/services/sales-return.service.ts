import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { InventoryRepository } from '../../inventory/repositories/inventory.repository';
import { WarehouseRepository } from '../../warehouse/repositories/warehouse.repository';
import { ActivityService } from '../../activity/services/activity.service';
import { SalesReturnRepository } from '../repositories/sales-return.repository';
import {
  SalesReturnCreateInput,
  SalesReturnItemInput,
  SalesReturnListFilters,
  SalesReturnReferenceItemRow,
  SalesReturnUpdateInput,
} from '../types/returns.types';

export class SalesReturnService {
  private readonly repository: SalesReturnRepository;
  private readonly inventoryRepository: InventoryRepository;
  private readonly warehouseRepository: WarehouseRepository;

  constructor(
    db: Queryable,
    private readonly unitOfWork: UnitOfWork,
    private readonly activityService: ActivityService
  ) {
    this.repository = new SalesReturnRepository(db);
    this.inventoryRepository = new InventoryRepository(db);
    this.warehouseRepository = new WarehouseRepository(db);
  }

  async createSalesReturn(tenantId: string, actorUserId: string, input: SalesReturnCreateInput) {
    const reference = await this.mustGetShipmentReference(tenantId, input.salesShipmentId);
    const referenceItems = await this.mustGetShipmentItems(tenantId, input.salesShipmentId);
    const plans = this.prepareItemPlans(referenceItems, input.items);

    const salesReturnId = uuidv4();
    const salesReturnNumber = `SRTN-${Date.now()}-${salesReturnId.slice(0, 8).toUpperCase()}`;

    await this.unitOfWork.execute(async (transaction) => {
      await this.repository.createSalesReturn(
        {
          id: salesReturnId,
          tenant_id: tenantId,
          customer_id: reference.customer_id,
          warehouse_id: reference.warehouse_id,
          sales_order_id: reference.sales_order_id,
          sales_shipment_id: input.salesShipmentId,
          sales_return_number: salesReturnNumber,
          return_date: new Date(input.returnDate),
          status: 'DRAFT',
          notes: input.notes ?? null,
          created_by: actorUserId,
          updated_by: actorUserId,
        },
        transaction
      );

      for (const plan of plans) {
        await this.repository.createSalesReturnItem(
          {
            id: uuidv4(),
            tenant_id: tenantId,
            sales_return_id: salesReturnId,
            sales_shipment_item_id: plan.reference.id,
            product_id: plan.reference.product_id,
            product_variant_id: plan.reference.product_variant_id,
            bin_id: plan.binId,
            returned_quantity: this.toDecimal(plan.returnedQuantity),
            created_at: new Date(),
            updated_at: new Date(),
          },
          transaction
        );
      }
    });

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'CREATE',
      module: 'RETURNS',
      description: `Created sales return: ${salesReturnNumber}`,
      metadata: { salesReturnId, salesReturnNumber },
    });

    return this.getSalesReturnById(tenantId, salesReturnId);
  }

  async updateSalesReturn(
    tenantId: string,
    actorUserId: string,
    salesReturnId: string,
    input: SalesReturnUpdateInput
  ) {
    const existing = await this.mustGetSalesReturn(tenantId, salesReturnId);
    if (existing.status !== 'DRAFT') {
      throw new AppError('Only draft sales returns can be updated.', 409);
    }

    const referenceItems = await this.mustGetShipmentItems(tenantId, existing.sales_shipment_id);
    const plans = input.items ? this.prepareItemPlans(referenceItems, input.items) : null;

    await this.unitOfWork.execute(async (transaction) => {
      await this.repository.updateSalesReturn(
        tenantId,
        salesReturnId,
        {
          return_date: input.returnDate ? new Date(input.returnDate) : existing.return_date,
          notes: input.notes === undefined ? existing.notes : input.notes ?? null,
          updated_by: actorUserId,
        },
        transaction
      );

      if (plans) {
        await this.repository.deleteSalesReturnItems(tenantId, salesReturnId, transaction);
        for (const plan of plans) {
          await this.repository.createSalesReturnItem(
            {
              id: uuidv4(),
              tenant_id: tenantId,
              sales_return_id: salesReturnId,
              sales_shipment_item_id: plan.reference.id,
              product_id: plan.reference.product_id,
              product_variant_id: plan.reference.product_variant_id,
              bin_id: plan.binId,
              returned_quantity: this.toDecimal(plan.returnedQuantity),
              created_at: new Date(),
              updated_at: new Date(),
            },
            transaction
          );
        }
      }
    });

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'RETURNS',
      description: `Updated sales return: ${existing.sales_return_number}`,
      metadata: { salesReturnId, updates: input },
    });

    return this.getSalesReturnById(tenantId, salesReturnId);
  }

  async cancelSalesReturn(tenantId: string, actorUserId: string, salesReturnId: string) {
    const existing = await this.mustGetSalesReturn(tenantId, salesReturnId);
    if (existing.status === 'POSTED') {
      throw new AppError('Posted sales returns cannot be cancelled without a reversal workflow.', 409);
    }
    if (existing.status === 'CANCELLED') {
      throw new AppError('Sales return has already been cancelled.', 409);
    }

    await this.repository.updateSalesReturnStatus(tenantId, salesReturnId, {
      status: 'CANCELLED',
      updatedBy: actorUserId,
    });

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'RETURNS',
      description: `Cancelled sales return: ${existing.sales_return_number}`,
      metadata: { salesReturnId },
    });

    return this.getSalesReturnById(tenantId, salesReturnId);
  }

  async listSalesReturns(tenantId: string, filters: SalesReturnListFilters) {
    const [items, total] = await Promise.all([
      this.repository.listSalesReturns(tenantId, filters),
      this.repository.countSalesReturns(tenantId, filters),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / filters.limit);
    return {
      items: items.map((item) => ({
        id: item.id,
        customerId: item.customer_id,
        customerName: item.customer_name,
        warehouseId: item.warehouse_id,
        warehouseName: item.warehouse_name,
        salesOrderId: item.sales_order_id,
        salesOrderNumber: item.sales_order_number,
        salesShipmentId: item.sales_shipment_id,
        shipmentNumber: item.shipment_number,
        salesReturnNumber: item.sales_return_number,
        returnDate: item.return_date,
        status: item.status,
        notes: item.notes,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
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

  async getSalesReturnById(tenantId: string, salesReturnId: string) {
    const salesReturn = await this.repository.findSalesReturnDetailById(tenantId, salesReturnId);
    if (!salesReturn) {
      throw new AppError('Sales return not found.', 404);
    }

    const items = await this.repository.listSalesReturnItems(tenantId, salesReturnId);
    return {
      id: salesReturn.id,
      customerId: salesReturn.customer_id,
      customerName: salesReturn.customer_name,
      warehouseId: salesReturn.warehouse_id,
      warehouseName: salesReturn.warehouse_name,
      salesOrderId: salesReturn.sales_order_id,
      salesOrderNumber: salesReturn.sales_order_number,
      salesShipmentId: salesReturn.sales_shipment_id,
      shipmentNumber: salesReturn.shipment_number,
      salesReturnNumber: salesReturn.sales_return_number,
      returnDate: salesReturn.return_date,
      status: salesReturn.status,
      notes: salesReturn.notes,
      createdAt: salesReturn.created_at,
      updatedAt: salesReturn.updated_at,
      items: items.map((item) => ({
        id: item.id,
        salesShipmentItemId: item.sales_shipment_item_id,
        salesOrderItemId: item.sales_order_item_id,
        productId: item.product_id,
        productVariantId: item.product_variant_id,
        productName: item.product_name,
        variantName: item.variant_name,
        productType: item.product_type,
        sku: item.sku,
        binId: item.bin_id,
        binName: item.bin_name,
        returnedQuantity: Number(item.returned_quantity),
      })),
    };
  }

  async postSalesReturn(tenantId: string, actorUserId: string, salesReturnId: string) {
    await this.unitOfWork.execute(async (transaction) => {
      const salesReturn = await this.repository.findSalesReturnByIdForUpdate(tenantId, salesReturnId, transaction);
      if (!salesReturn) {
        throw new AppError('Sales return not found.', 404);
      }
      if (salesReturn.status === 'POSTED') {
        throw new AppError('Sales return has already been posted.', 409);
      }
      if (salesReturn.status === 'CANCELLED') {
        throw new AppError('Cancelled sales return cannot be posted.', 409);
      }

      await this.mustGetShipmentReference(tenantId, salesReturn.sales_shipment_id, transaction);
      const referenceItems = await this.mustGetShipmentItems(tenantId, salesReturn.sales_shipment_id, transaction);
      const returnItems = await this.repository.listSalesReturnItems(tenantId, salesReturnId, transaction);
      if (returnItems.length === 0) {
        throw new AppError('Sales return must contain at least one item.', 400);
      }

      const alreadyReturnedMap = await this.repository.sumReturnedQuantityByShipmentItem(
        tenantId,
        returnItems.map((item) => item.sales_shipment_item_id),
        transaction
      );

      for (const item of returnItems) {
        const referenceItem = referenceItems.find((candidate) => candidate.id === item.sales_shipment_item_id);
        if (!referenceItem) {
          throw new AppError('Sales return item references an invalid sales shipment item.', 400);
        }

        this.assertReferenceItemEligible(referenceItem);

        const previouslyReturned = alreadyReturnedMap.get(item.sales_shipment_item_id) ?? 0;
        const quantity = Number(item.returned_quantity);
        const remainingReturnable = Number(referenceItem.shipped_quantity) - previouslyReturned;
        if (quantity > remainingReturnable) {
          throw new AppError('Sales return quantity exceeds remaining returnable shipment quantity.', 409);
        }

        const bin = item.bin_id ? await this.mustGetBin(tenantId, item.bin_id, transaction) : null;
        if (bin && bin.warehouse_id !== salesReturn.warehouse_id) {
          throw new AppError('Sales return bin does not belong to the shipment warehouse.', 400);
        }

        let stock = await this.inventoryRepository.findStockByLocatorForUpdate(
          {
            tenantId,
            warehouseId: salesReturn.warehouse_id,
            binId: item.bin_id ?? null,
            productId: item.product_id,
            productVariantId: item.product_variant_id,
          },
          transaction
        );

        if (!stock) {
          stock = {
            id: uuidv4(),
            tenant_id: tenantId,
            warehouse_id: salesReturn.warehouse_id,
            zone_id: bin?.zone_id ?? null,
            bin_id: item.bin_id ?? null,
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            on_hand_quantity: this.toDecimal(0),
            reserved_quantity: this.toDecimal(0),
            available_quantity: this.toDecimal(0),
            created_at: new Date(),
            updated_at: new Date(),
          };
          await this.inventoryRepository.createStock(stock, transaction);
        }

        const nextOnHand = Number(stock.on_hand_quantity) + quantity;
        const nextReserved = Number(stock.reserved_quantity);
        await this.inventoryRepository.updateStockQuantities(
          stock.id,
          {
            onHand: this.toDecimal(nextOnHand),
            reserved: this.toDecimal(nextReserved),
            available: this.toDecimal(nextOnHand - nextReserved),
          },
          transaction
        );

        await this.inventoryRepository.createMovement(
          {
            id: uuidv4(),
            tenant_id: tenantId,
            warehouse_id: salesReturn.warehouse_id,
            zone_id: bin?.zone_id ?? stock.zone_id,
            bin_id: item.bin_id ?? null,
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            movement_type: 'RECEIPT',
            reference_type: 'SALES_RETURN',
            reference_id: salesReturnId,
            quantity: this.toDecimal(quantity),
            notes: salesReturn.notes,
            created_by: actorUserId,
          },
          transaction
        );
      }

      await this.repository.updateSalesReturnStatus(
        tenantId,
        salesReturnId,
        { status: 'POSTED', updatedBy: actorUserId },
        transaction
      );
    });

    return this.getSalesReturnById(tenantId, salesReturnId);
  }

  private async mustGetSalesReturn(tenantId: string, salesReturnId: string) {
    const salesReturn = await this.repository.findSalesReturnById(tenantId, salesReturnId);
    if (!salesReturn) {
      throw new AppError('Sales return not found.', 404);
    }
    return salesReturn;
  }

  private async mustGetShipmentReference(
    tenantId: string,
    salesShipmentId: string,
    executor?: Queryable | DatabaseTransaction
  ) {
    const reference = executor
      ? await this.repository.getSalesShipmentReference(tenantId, salesShipmentId, executor)
      : await this.repository.getSalesShipmentReference(tenantId, salesShipmentId);
    if (!reference) {
      throw new AppError('Sales shipment not found.', 404);
    }
    if (reference.shipment_status !== 'POSTED') {
      throw new AppError('Sales returns can only be created from posted sales shipments.', 409);
    }
    return reference;
  }

  private async mustGetShipmentItems(
    tenantId: string,
    salesShipmentId: string,
    executor?: Queryable | DatabaseTransaction
  ) {
    const items = executor
      ? await this.repository.listSalesShipmentReferenceItems(tenantId, salesShipmentId, executor)
      : await this.repository.listSalesShipmentReferenceItems(tenantId, salesShipmentId);
    if (items.length === 0) {
      throw new AppError('Sales shipment does not contain any returnable items.', 400);
    }
    return items;
  }

  private prepareItemPlans(referenceItems: SalesReturnReferenceItemRow[], items: SalesReturnItemInput[]) {
    const referenceMap = new Map(referenceItems.map((item) => [item.id, item]));
    const seen = new Set<string>();

    return items.map((item) => {
      if (seen.has(item.salesShipmentItemId)) {
        throw new AppError('Duplicate sales shipment items were provided in the return payload.', 400);
      }
      seen.add(item.salesShipmentItemId);

      const reference = referenceMap.get(item.salesShipmentItemId);
      if (!reference) {
        throw new AppError('Sales return item references an invalid sales shipment item.', 400);
      }
      
      if (reference.allow_returns === 0) {
        throw new AppError(`Product ${reference.product_name} does not allow returns (Backdoor disabled).`, 400);
      }

      this.assertReferenceItemEligible(reference);

      return {
        reference,
        returnedQuantity: item.returnedQuantity,
        binId: item.binId ?? reference.bin_id ?? null,
      };
    });
  }

  private assertReferenceItemEligible(referenceItem: SalesReturnReferenceItemRow) {
    if (referenceItem.product_type === 'SERVICE') {
      throw new AppError('Service products are not supported in sales return flows.', 400);
    }
    if (referenceItem.product_status !== 'ACTIVE' || !referenceItem.track_inventory || !referenceItem.is_sellable) {
      throw new AppError('Only active inventory-tracked sellable items can be returned from sales shipments.', 400);
    }
  }

  private async mustGetBin(
    tenantId: string,
    binId: string,
    executor: Queryable | DatabaseTransaction
  ) {
    const bin = await this.warehouseRepository.findBinById(tenantId, binId, executor);
    if (!bin) {
      throw new AppError('Bin not found.', 404);
    }
    return bin;
  }

  private toDecimal(value: number) {
    return value.toFixed(4);
  }
}
