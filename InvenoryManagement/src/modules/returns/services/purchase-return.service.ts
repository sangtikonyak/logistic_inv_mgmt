import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { InventoryRepository } from '../../inventory/repositories/inventory.repository';
import { WarehouseRepository } from '../../warehouse/repositories/warehouse.repository';
import { ActivityService } from '../../activity/services/activity.service';
import { PurchaseReturnRepository } from '../repositories/purchase-return.repository';
import {
  PurchaseReturnCreateInput,
  PurchaseReturnItemInput,
  PurchaseReturnListFilters,
  PurchaseReturnReferenceItemRow,
  PurchaseReturnUpdateInput,
} from '../types/returns.types';

export class PurchaseReturnService {
  private readonly repository: PurchaseReturnRepository;
  private readonly inventoryRepository: InventoryRepository;
  private readonly warehouseRepository: WarehouseRepository;

  constructor(
    db: Queryable,
    private readonly unitOfWork: UnitOfWork,
    private readonly activityService: ActivityService
  ) {
    this.repository = new PurchaseReturnRepository(db);
    this.inventoryRepository = new InventoryRepository(db);
    this.warehouseRepository = new WarehouseRepository(db);
  }

  async createPurchaseReturn(tenantId: string, actorUserId: string, input: PurchaseReturnCreateInput) {
    const reference = await this.mustGetReceiptReference(tenantId, input.purchaseReceiptId);
    const referenceItems = await this.mustGetReceiptItems(tenantId, input.purchaseReceiptId);
    const plans = this.prepareItemPlans(referenceItems, input.items);

    const purchaseReturnId = uuidv4();
    const purchaseReturnNumber = `PRTN-${Date.now()}-${purchaseReturnId.slice(0, 8).toUpperCase()}`;

    await this.unitOfWork.execute(async (transaction) => {
      await this.repository.createPurchaseReturn(
        {
          id: purchaseReturnId,
          tenant_id: tenantId,
          supplier_id: reference.supplier_id,
          warehouse_id: reference.warehouse_id,
          purchase_order_id: reference.purchase_order_id,
          purchase_receipt_id: input.purchaseReceiptId,
          purchase_return_number: purchaseReturnNumber,
          return_date: new Date(input.returnDate),
          status: 'DRAFT',
          notes: input.notes ?? null,
          created_by: actorUserId,
          updated_by: actorUserId,
        },
        transaction
      );

      for (const plan of plans) {
        await this.repository.createPurchaseReturnItem(
          {
            id: uuidv4(),
            tenant_id: tenantId,
            purchase_return_id: purchaseReturnId,
            purchase_receipt_item_id: plan.reference.id,
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
      description: `Created purchase return: ${purchaseReturnNumber}`,
      metadata: { purchaseReturnId, purchaseReturnNumber },
    });

    return this.getPurchaseReturnById(tenantId, purchaseReturnId);
  }

  async updatePurchaseReturn(
    tenantId: string,
    actorUserId: string,
    purchaseReturnId: string,
    input: PurchaseReturnUpdateInput
  ) {
    const existing = await this.mustGetPurchaseReturn(tenantId, purchaseReturnId);
    if (existing.status !== 'DRAFT') {
      throw new AppError('Only draft purchase returns can be updated.', 409);
    }

    const referenceItems = await this.mustGetReceiptItems(tenantId, existing.purchase_receipt_id);
    const plans = input.items ? this.prepareItemPlans(referenceItems, input.items) : null;

    await this.unitOfWork.execute(async (transaction) => {
      await this.repository.updatePurchaseReturn(
        tenantId,
        purchaseReturnId,
        {
          return_date: input.returnDate ? new Date(input.returnDate) : existing.return_date,
          notes: input.notes === undefined ? existing.notes : input.notes ?? null,
          updated_by: actorUserId,
        },
        transaction
      );

      if (plans) {
        await this.repository.deletePurchaseReturnItems(tenantId, purchaseReturnId, transaction);
        for (const plan of plans) {
          await this.repository.createPurchaseReturnItem(
            {
              id: uuidv4(),
              tenant_id: tenantId,
              purchase_return_id: purchaseReturnId,
              purchase_receipt_item_id: plan.reference.id,
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
      description: `Updated purchase return: ${existing.purchase_return_number}`,
      metadata: { purchaseReturnId, updates: input },
    });

    return this.getPurchaseReturnById(tenantId, purchaseReturnId);
  }

  async cancelPurchaseReturn(tenantId: string, actorUserId: string, purchaseReturnId: string) {
    const existing = await this.mustGetPurchaseReturn(tenantId, purchaseReturnId);
    if (existing.status === 'POSTED') {
      throw new AppError('Posted purchase returns cannot be cancelled without a reversal workflow.', 409);
    }
    if (existing.status === 'CANCELLED') {
      throw new AppError('Purchase return has already been cancelled.', 409);
    }

    await this.repository.updatePurchaseReturnStatus(tenantId, purchaseReturnId, {
      status: 'CANCELLED',
      updatedBy: actorUserId,
    });

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'RETURNS',
      description: `Cancelled purchase return: ${existing.purchase_return_number}`,
      metadata: { purchaseReturnId },
    });

    return this.getPurchaseReturnById(tenantId, purchaseReturnId);
  }

  async listPurchaseReturns(tenantId: string, filters: PurchaseReturnListFilters) {
    const [items, total] = await Promise.all([
      this.repository.listPurchaseReturns(tenantId, filters),
      this.repository.countPurchaseReturns(tenantId, filters),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / filters.limit);
    return {
      items: items.map((item) => ({
        id: item.id,
        supplierId: item.supplier_id,
        supplierName: item.supplier_name,
        warehouseId: item.warehouse_id,
        warehouseName: item.warehouse_name,
        purchaseOrderId: item.purchase_order_id,
        purchaseOrderNumber: item.purchase_order_number,
        purchaseReceiptId: item.purchase_receipt_id,
        receiptNumber: item.receipt_number,
        purchaseReturnNumber: item.purchase_return_number,
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

  async getPurchaseReturnById(tenantId: string, purchaseReturnId: string) {
    const purchaseReturn = await this.repository.findPurchaseReturnDetailById(tenantId, purchaseReturnId);
    if (!purchaseReturn) {
      throw new AppError('Purchase return not found.', 404);
    }

    const items = await this.repository.listPurchaseReturnItems(tenantId, purchaseReturnId);
    return {
      id: purchaseReturn.id,
      supplierId: purchaseReturn.supplier_id,
      supplierName: purchaseReturn.supplier_name,
      warehouseId: purchaseReturn.warehouse_id,
      warehouseName: purchaseReturn.warehouse_name,
      purchaseOrderId: purchaseReturn.purchase_order_id,
      purchaseOrderNumber: purchaseReturn.purchase_order_number,
      purchaseReceiptId: purchaseReturn.purchase_receipt_id,
      receiptNumber: purchaseReturn.receipt_number,
      purchaseReturnNumber: purchaseReturn.purchase_return_number,
      returnDate: purchaseReturn.return_date,
      status: purchaseReturn.status,
      notes: purchaseReturn.notes,
      createdAt: purchaseReturn.created_at,
      updatedAt: purchaseReturn.updated_at,
      items: items.map((item) => ({
        id: item.id,
        purchaseReceiptItemId: item.purchase_receipt_item_id,
        purchaseOrderItemId: item.purchase_order_item_id,
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

  async postPurchaseReturn(tenantId: string, actorUserId: string, purchaseReturnId: string) {
    await this.unitOfWork.execute(async (transaction) => {
      const purchaseReturn = await this.repository.findPurchaseReturnByIdForUpdate(
        tenantId,
        purchaseReturnId,
        transaction
      );
      if (!purchaseReturn) {
        throw new AppError('Purchase return not found.', 404);
      }
      if (purchaseReturn.status === 'POSTED') {
        throw new AppError('Purchase return has already been posted.', 409);
      }
      if (purchaseReturn.status === 'CANCELLED') {
        throw new AppError('Cancelled purchase return cannot be posted.', 409);
      }

      await this.mustGetReceiptReference(tenantId, purchaseReturn.purchase_receipt_id, transaction);
      const referenceItems = await this.mustGetReceiptItems(tenantId, purchaseReturn.purchase_receipt_id, transaction);
      const returnItems = await this.repository.listPurchaseReturnItems(tenantId, purchaseReturnId, transaction);
      if (returnItems.length === 0) {
        throw new AppError('Purchase return must contain at least one item.', 400);
      }

      const alreadyReturnedMap = await this.repository.sumReturnedQuantityByReceiptItem(
        tenantId,
        returnItems.map((item) => item.purchase_receipt_item_id),
        transaction
      );

      for (const item of returnItems) {
        const referenceItem = referenceItems.find((candidate) => candidate.id === item.purchase_receipt_item_id);
        if (!referenceItem) {
          throw new AppError('Purchase return item references an invalid purchase receipt item.', 400);
        }

        this.assertReferenceItemEligible(referenceItem);

        const previouslyReturned = alreadyReturnedMap.get(item.purchase_receipt_item_id) ?? 0;
        const quantity = Number(item.returned_quantity);
        const remainingReturnable = Number(referenceItem.received_quantity) - previouslyReturned;
        if (quantity > remainingReturnable) {
          throw new AppError('Purchase return quantity exceeds remaining returnable receipt quantity.', 409);
        }

        const stock = await this.inventoryRepository.findStockByLocatorForUpdate(
          {
            tenantId,
            warehouseId: purchaseReturn.warehouse_id,
            binId: item.bin_id ?? null,
            productId: item.product_id,
            productVariantId: item.product_variant_id,
          },
          transaction
        );
        if (!stock) {
          throw new AppError('Source stock record not found for one or more purchase return items.', 409);
        }

        const currentOnHand = Number(stock.on_hand_quantity);
        const currentReserved = Number(stock.reserved_quantity);
        const currentAvailable = Number(stock.available_quantity);
        if (currentOnHand < quantity || currentAvailable < quantity) {
          throw new AppError('Insufficient stock available to post the purchase return.', 409);
        }

        const bin = item.bin_id ? await this.mustGetBin(tenantId, item.bin_id, transaction) : null;
        if (bin && bin.warehouse_id !== purchaseReturn.warehouse_id) {
          throw new AppError('Purchase return bin does not belong to the receipt warehouse.', 400);
        }

        await this.inventoryRepository.updateStockQuantities(
          stock.id,
          {
            onHand: this.toDecimal(currentOnHand - quantity),
            reserved: this.toDecimal(currentReserved),
            available: this.toDecimal(currentAvailable - quantity),
          },
          transaction
        );

        await this.inventoryRepository.createMovement(
          {
            id: uuidv4(),
            tenant_id: tenantId,
            warehouse_id: purchaseReturn.warehouse_id,
            zone_id: bin?.zone_id ?? stock.zone_id,
            bin_id: item.bin_id ?? null,
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            movement_type: 'ISSUE',
            reference_type: 'PURCHASE_RETURN',
            reference_id: purchaseReturnId,
            quantity: this.toDecimal(quantity),
            notes: purchaseReturn.notes,
            created_by: actorUserId,
          },
          transaction
        );
      }

      await this.repository.updatePurchaseReturnStatus(
        tenantId,
        purchaseReturnId,
        { status: 'POSTED', updatedBy: actorUserId },
        transaction
      );
    });

    return this.getPurchaseReturnById(tenantId, purchaseReturnId);
  }

  private async mustGetPurchaseReturn(tenantId: string, purchaseReturnId: string) {
    const purchaseReturn = await this.repository.findPurchaseReturnById(tenantId, purchaseReturnId);
    if (!purchaseReturn) {
      throw new AppError('Purchase return not found.', 404);
    }
    return purchaseReturn;
  }

  private async mustGetReceiptReference(
    tenantId: string,
    purchaseReceiptId: string,
    executor?: Queryable | DatabaseTransaction
  ) {
    const reference = executor
      ? await this.repository.getPurchaseReceiptReference(tenantId, purchaseReceiptId, executor)
      : await this.repository.getPurchaseReceiptReference(tenantId, purchaseReceiptId);
    if (!reference) {
      throw new AppError('Purchase receipt not found.', 404);
    }
    if (reference.receipt_status !== 'POSTED') {
      throw new AppError('Purchase returns can only be created from posted purchase receipts.', 409);
    }
    return reference;
  }

  private async mustGetReceiptItems(
    tenantId: string,
    purchaseReceiptId: string,
    executor?: Queryable | DatabaseTransaction
  ) {
    const items = executor
      ? await this.repository.listPurchaseReceiptReferenceItems(tenantId, purchaseReceiptId, executor)
      : await this.repository.listPurchaseReceiptReferenceItems(tenantId, purchaseReceiptId);
    if (items.length === 0) {
      throw new AppError('Purchase receipt does not contain any returnable items.', 400);
    }
    return items;
  }

  private prepareItemPlans(referenceItems: PurchaseReturnReferenceItemRow[], items: PurchaseReturnItemInput[]) {
    const referenceMap = new Map(referenceItems.map((item) => [item.id, item]));
    const seen = new Set<string>();

    return items.map((item) => {
      if (seen.has(item.purchaseReceiptItemId)) {
        throw new AppError('Duplicate purchase receipt items were provided in the return payload.', 400);
      }
      seen.add(item.purchaseReceiptItemId);

      const reference = referenceMap.get(item.purchaseReceiptItemId);
      if (!reference) {
        throw new AppError('Purchase return item references an invalid purchase receipt item.', 400);
      }

      if (reference.allow_returns === 0) {
        throw new AppError(`Product ${reference.product_name} does not allow returns (Backdoor disabled).`, 400);
      }

      this.assertReferenceItemEligible(reference);

      if (item.binId && reference.bin_id && item.binId !== reference.bin_id) {
        throw new AppError('Purchase return bin must match the original receipt locator when a receipt bin exists.', 400);
      }

      return {
        reference,
        returnedQuantity: item.returnedQuantity,
        binId: item.binId ?? reference.bin_id ?? null,
      };
    });
  }

  private assertReferenceItemEligible(referenceItem: PurchaseReturnReferenceItemRow) {
    if (referenceItem.product_type === 'SERVICE') {
      throw new AppError('Service products are not supported in purchase return flows.', 400);
    }
    if (referenceItem.product_status !== 'ACTIVE' || !referenceItem.track_inventory || !referenceItem.is_purchasable) {
      throw new AppError('Only active inventory-tracked purchasable items can be returned to suppliers.', 400);
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
