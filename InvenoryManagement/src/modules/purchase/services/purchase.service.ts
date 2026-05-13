import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { InventoryRepository } from '../../inventory/repositories/inventory.repository';
import { WarehouseRepository } from '../../warehouse/repositories/warehouse.repository';
import { ActivityService } from '../../activity/services/activity.service';
import { PurchaseRepository } from '../repositories/purchase.repository';
import {
  PurchaseOrder,
  PurchaseOrderCreateInput,
  PurchaseOrderItemInput,
  PurchaseOrderListFilters,
  PurchaseOrderListRow,
  PurchaseOrderUpdateInput,
  PurchaseReceiptCreateInput,
  PurchaseReceiptListFilters,
  PurchaseReceiptListRow,
} from '../types/purchase.types';

export class PurchaseService {
  private readonly purchaseRepository: PurchaseRepository;
  private readonly warehouseRepository: WarehouseRepository;
  private readonly inventoryRepository: InventoryRepository;

  constructor(
    db: Queryable,
    private readonly unitOfWork: UnitOfWork,
    private readonly activityService: ActivityService
  ) {
    this.purchaseRepository = new PurchaseRepository(db);
    this.warehouseRepository = new WarehouseRepository(db);
    this.inventoryRepository = new InventoryRepository(db);
  }

  async createPurchaseOrder(tenantId: string, actorUserId: string, input: PurchaseOrderCreateInput) {
    const supplier = await this.mustGetActiveSupplier(tenantId, input.supplierId);
    await this.mustGetWarehouse(tenantId, input.warehouseId);
    await this.validatePurchaseItems(tenantId, input.items);

    const orderId = uuidv4();
    const orderNumber = `PO-${Date.now()}-${orderId.slice(0, 8).toUpperCase()}`;
    const totals = this.calculateTotals(input.items);

    await this.unitOfWork.execute(async (transaction) => {
      await this.purchaseRepository.createPurchaseOrder(
        {
          id: orderId,
          tenant_id: tenantId,
          supplier_id: supplier.id,
          warehouse_id: input.warehouseId,
          purchase_order_number: orderNumber,
          status: 'DRAFT',
          order_date: new Date(input.orderDate),
          expected_date: input.expectedDate ? new Date(input.expectedDate) : null,
          currency_code: input.currencyCode ?? null,
          payment_type: input.paymentType,
          payment_status: input.paymentStatus,
          payment_mode: input.paymentMode,
          subtotal_amount: this.toDecimal(totals.subtotal),
          tax_amount: this.toDecimal(totals.tax),
          discount_amount: this.toDecimal(totals.discount),
          total_amount: this.toDecimal(totals.total),
          notes: input.notes ?? null,
          created_by: actorUserId,
          updated_by: actorUserId,
          deleted_by: null,
        },
        transaction
      );

      await this.replacePurchaseOrderItems(tenantId, orderId, input.items, transaction);
    });

    const result = await this.getPurchaseOrderById(tenantId, orderId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'CREATE',
      module: 'PURCHASE',
      description: `Purchase order created: ${result.purchaseOrderNumber}`,
      metadata: { purchaseOrderId: orderId, purchaseOrderNumber: result.purchaseOrderNumber },
    });

    return result;
  }

  async updatePurchaseOrder(
    tenantId: string,
    actorUserId: string,
    purchaseOrderId: string,
    input: PurchaseOrderUpdateInput
  ) {
    const existing = await this.mustGetPurchaseOrder(tenantId, purchaseOrderId);
    if (existing.status !== 'DRAFT') {
      throw new AppError('Only draft purchase orders can be updated.', 409);
    }

    const supplierId = input.supplierId ?? existing.supplier_id;
    const warehouseId = input.warehouseId ?? existing.warehouse_id;
    await this.mustGetActiveSupplier(tenantId, supplierId);
    await this.mustGetWarehouse(tenantId, warehouseId);

    const existingItems = await this.purchaseRepository.listPurchaseOrderItems(tenantId, purchaseOrderId);
    const nextItems =
      input.items ??
      existingItems.map((item) => ({
        productId: item.product_id ?? undefined,
        productVariantId: item.product_variant_id ?? undefined,
        orderedQuantity: Number(item.ordered_quantity),
        unitCost: Number(item.unit_cost),
        taxAmount: Number(item.tax_amount),
        discountAmount: Number(item.discount_amount),
        notes: item.notes,
      }));
    await this.validatePurchaseItems(tenantId, nextItems);

    const totals = this.calculateTotals(nextItems);
    await this.unitOfWork.execute(async (transaction) => {
      await this.purchaseRepository.updatePurchaseOrder(
        tenantId,
        purchaseOrderId,
        {
          supplier_id: supplierId,
          warehouse_id: warehouseId,
          order_date: input.orderDate ? new Date(input.orderDate) : existing.order_date,
          expected_date:
            input.expectedDate === undefined
              ? existing.expected_date
              : input.expectedDate
                ? new Date(input.expectedDate)
                : null,
          currency_code: input.currencyCode === undefined ? existing.currency_code : input.currencyCode ?? null,
          payment_type: input.paymentType ?? existing.payment_type,
          payment_status: input.paymentStatus ?? existing.payment_status,
          payment_mode: input.paymentMode ?? existing.payment_mode,
          subtotal_amount: this.toDecimal(totals.subtotal),
          tax_amount: this.toDecimal(totals.tax),
          discount_amount: this.toDecimal(totals.discount),
          total_amount: this.toDecimal(totals.total),
          notes: input.notes === undefined ? existing.notes : input.notes ?? null,
          updated_by: actorUserId,
        },
        transaction
      );

      await this.purchaseRepository.deletePurchaseOrderItems(tenantId, purchaseOrderId, transaction);
      await this.replacePurchaseOrderItems(tenantId, purchaseOrderId, nextItems, transaction);
    });

    const result = await this.getPurchaseOrderById(tenantId, purchaseOrderId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'PURCHASE',
      description: `Purchase order updated: ${result.purchaseOrderNumber}`,
      metadata: { purchaseOrderId, purchaseOrderNumber: result.purchaseOrderNumber },
    });

    return result;
  }

  async submitPurchaseOrderForApproval(tenantId: string, actorUserId: string, purchaseOrderId: string) {
    const order = await this.mustGetPurchaseOrder(tenantId, purchaseOrderId);
    if (order.status !== 'DRAFT') {
      throw new AppError('Only draft purchase orders can be submitted for approval.', 409);
    }

    const items = await this.purchaseRepository.listPurchaseOrderItems(tenantId, purchaseOrderId);
    if (items.length === 0) {
      throw new AppError('Purchase order must contain at least one item.', 400);
    }

    await this.purchaseRepository.updatePurchaseOrderStatus(tenantId, purchaseOrderId, {
      status: 'PENDING_APPROVAL',
      updatedBy: actorUserId,
    });

    const result = await this.getPurchaseOrderById(tenantId, purchaseOrderId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'PURCHASE',
      description: `Purchase order submitted for approval: ${result.purchaseOrderNumber}`,
      metadata: { purchaseOrderId, purchaseOrderNumber: result.purchaseOrderNumber, status: 'PENDING_APPROVAL' },
    });

    return result;
  }

  async approvePurchaseOrder(tenantId: string, actorUserId: string, purchaseOrderId: string) {
    const order = await this.mustGetPurchaseOrder(tenantId, purchaseOrderId);
    if (order.status !== 'PENDING_APPROVAL') {
      throw new AppError('Only pending approval purchase orders can be approved.', 409);
    }

    await this.purchaseRepository.updatePurchaseOrderStatus(tenantId, purchaseOrderId, {
      status: 'APPROVED',
      updatedBy: actorUserId,
    });

    const result = await this.getPurchaseOrderById(tenantId, purchaseOrderId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'PURCHASE',
      description: `Purchase order approved: ${result.purchaseOrderNumber}`,
      metadata: { purchaseOrderId, purchaseOrderNumber: result.purchaseOrderNumber, status: 'APPROVED' },
    });

    return result;
  }

  async rejectPurchaseOrder(tenantId: string, actorUserId: string, purchaseOrderId: string) {
    const order = await this.mustGetPurchaseOrder(tenantId, purchaseOrderId);
    if (order.status !== 'PENDING_APPROVAL') {
      throw new AppError('Only pending approval purchase orders can be rejected.', 409);
    }

    await this.purchaseRepository.updatePurchaseOrderStatus(tenantId, purchaseOrderId, {
      status: 'DRAFT',
      updatedBy: actorUserId,
    });

    const result = await this.getPurchaseOrderById(tenantId, purchaseOrderId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'PURCHASE',
      description: `Purchase order rejected and moved back to draft: ${result.purchaseOrderNumber}`,
      metadata: { purchaseOrderId, purchaseOrderNumber: result.purchaseOrderNumber, status: 'DRAFT' },
    });

    return result;
  }

  async issuePurchaseOrder(tenantId: string, actorUserId: string, purchaseOrderId: string) {
    const order = await this.mustGetPurchaseOrder(tenantId, purchaseOrderId);
    if (order.status !== 'APPROVED') {
      throw new AppError('Only approved purchase orders can be issued.', 409);
    }

    const items = await this.purchaseRepository.listPurchaseOrderItems(tenantId, purchaseOrderId);
    if (items.length === 0) {
      throw new AppError('Purchase order must contain at least one item.', 400);
    }

    await this.purchaseRepository.updatePurchaseOrderStatus(tenantId, purchaseOrderId, {
      status: 'ISSUED',
      updatedBy: actorUserId,
    });

    const result = await this.getPurchaseOrderById(tenantId, purchaseOrderId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'PURCHASE',
      description: `Purchase order issued: ${result.purchaseOrderNumber}`,
      metadata: { purchaseOrderId, purchaseOrderNumber: result.purchaseOrderNumber, status: 'ISSUED' },
    });

    return result;
  }

  async cancelPurchaseOrder(tenantId: string, actorUserId: string, purchaseOrderId: string) {
    const order = await this.mustGetPurchaseOrder(tenantId, purchaseOrderId);
    if (order.status === 'CANCELLED') {
      throw new AppError('Purchase order has already been cancelled.', 409);
    }
    if (order.status === 'PARTIALLY_RECEIVED' || order.status === 'RECEIVED') {
      throw new AppError('Received purchase orders cannot be cancelled.', 409);
    }

    await this.purchaseRepository.updatePurchaseOrderStatus(tenantId, purchaseOrderId, {
      status: 'CANCELLED',
      updatedBy: actorUserId,
    });

    const result = await this.getPurchaseOrderById(tenantId, purchaseOrderId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'PURCHASE',
      description: `Purchase order cancelled: ${result.purchaseOrderNumber}`,
      metadata: { purchaseOrderId, purchaseOrderNumber: result.purchaseOrderNumber, status: 'CANCELLED' },
    });

    return result;
  }

  async listPurchaseOrders(tenantId: string, filters: PurchaseOrderListFilters) {
    const [items, total] = await Promise.all([
      this.purchaseRepository.listPurchaseOrders(tenantId, filters),
      this.purchaseRepository.countPurchaseOrders(tenantId, filters),
    ]);

    return {
      items: items.map((item) => this.toPurchaseOrderSummary(item)),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
      },
    };
  }

  async getPurchaseOrderById(tenantId: string, purchaseOrderId: string) {
    const order = await this.purchaseRepository.findPurchaseOrderDetailById(tenantId, purchaseOrderId);
    if (!order) {
      throw new AppError('Purchase order not found.', 404);
    }
    const items = await this.purchaseRepository.listPurchaseOrderItems(tenantId, purchaseOrderId);
    return {
      ...this.toPurchaseOrderSummary(order),
      items: items.map((item) => ({
        id: item.id,
        productId: item.product_id,
        productVariantId: item.product_variant_id,
        productName: item.product_name,
        variantName: item.variant_name,
        productType: item.product_type,
        sku: item.sku,
        orderedQuantity: Number(item.ordered_quantity),
        receivedQuantity: Number(item.received_quantity),
        pendingQuantity: Number(item.ordered_quantity) - Number(item.received_quantity),
        unitCost: Number(item.unit_cost),
        taxAmount: Number(item.tax_amount),
        discountAmount: Number(item.discount_amount),
        lineTotal: Number(item.line_total),
        notes: item.notes,
      })),
    };
  }

  async createPurchaseReceipt(
    tenantId: string,
    actorUserId: string,
    purchaseOrderId: string,
    input: PurchaseReceiptCreateInput
  ) {
    const order = await this.mustGetPurchaseOrder(tenantId, purchaseOrderId);
    if (!['ISSUED', 'PARTIALLY_RECEIVED'].includes(order.status)) {
      throw new AppError('Receipts can only be created for issued or partially received purchase orders.', 409);
    }

    const orderItems = await this.purchaseRepository.listPurchaseOrderItems(tenantId, purchaseOrderId);
    const orderItemMap = new Map(orderItems.map((item) => [item.id, item]));

    for (const item of input.items) {
      const orderItem = orderItemMap.get(item.purchaseOrderItemId);
      if (!orderItem) {
        throw new AppError('Receipt item references an invalid purchase order item.', 400);
      }
      const remaining = Number(orderItem.ordered_quantity) - Number(orderItem.received_quantity);
      if (item.receivedQuantity > remaining) {
        throw new AppError('Receipt quantity exceeds pending order quantity.', 409);
      }
      const acceptedQty = item.acceptedQuantity ?? item.receivedQuantity;
      const rejectedQty = item.rejectedQuantity ?? 0;
      if (Math.abs((acceptedQty + rejectedQty) - item.receivedQuantity) > 0.0001) {
        throw new AppError('Accepted quantity and rejected quantity must match received quantity.', 400);
      }
      if (acceptedQty > 0 && item.expiryDate && !item.lotNumber) {
        throw new AppError('Lot number is required when expiry date is provided.', 400);
      }
      if (item.binId) {
        const bin = await this.mustGetBin(tenantId, item.binId);
        if (bin.warehouse_id !== order.warehouse_id) {
          throw new AppError('Receipt bin does not belong to the purchase order warehouse.', 400);
        }
      }
    }

    const receiptId = uuidv4();
    const receiptNumber = `GRN-${Date.now()}-${receiptId.slice(0, 8).toUpperCase()}`;

    await this.unitOfWork.execute(async (transaction) => {
      await this.purchaseRepository.createPurchaseReceipt(
        {
          id: receiptId,
          tenant_id: tenantId,
          purchase_order_id: purchaseOrderId,
          supplier_id: order.supplier_id,
          warehouse_id: order.warehouse_id,
          receipt_number: receiptNumber,
          receipt_date: new Date(input.receiptDate),
          status: 'DRAFT',
          notes: input.notes ?? null,
          created_by: actorUserId,
          updated_by: actorUserId,
        },
        transaction
      );

      for (const item of input.items) {
        const orderItem = orderItemMap.get(item.purchaseOrderItemId)!;
        await this.purchaseRepository.createPurchaseReceiptItem(
          {
            id: uuidv4(),
            tenant_id: tenantId,
            purchase_receipt_id: receiptId,
            purchase_order_item_id: orderItem.id,
            product_id: orderItem.product_id,
            product_variant_id: orderItem.product_variant_id,
            bin_id: item.binId ?? null,
            lot_id: null,
            container_id: null,
            lot_number: item.lotNumber ?? null,
            container_code: item.containerCode ?? null,
            expiry_date: item.expiryDate ? new Date(item.expiryDate) : null,
            received_quantity: this.toDecimal(item.receivedQuantity),
            accepted_quantity: this.toDecimal(item.acceptedQuantity ?? item.receivedQuantity),
            rejected_quantity: this.toDecimal(item.rejectedQuantity ?? 0),
            unit_cost: this.toDecimal(item.unitCost ?? Number(orderItem.unit_cost)),
            created_at: new Date(),
            updated_at: new Date(),
          },
          transaction
        );
      }
    });

    const result = await this.getPurchaseReceiptById(tenantId, receiptId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'CREATE',
      module: 'PURCHASE',
      description: `Purchase receipt created: ${result.receiptNumber}`,
      metadata: { receiptId, receiptNumber: result.receiptNumber },
    });

    return result;
  }

  async listPurchaseReceipts(tenantId: string, filters: PurchaseReceiptListFilters) {
    const [items, total] = await Promise.all([
      this.purchaseRepository.listPurchaseReceipts(tenantId, filters),
      this.purchaseRepository.countPurchaseReceipts(tenantId, filters),
    ]);

    return {
      items: items.map((item) => this.toPurchaseReceiptSummary(item)),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
      },
    };
  }

  async getPurchaseReceiptById(tenantId: string, receiptId: string) {
    const receipt = await this.purchaseRepository.findPurchaseReceiptDetailById(tenantId, receiptId);
    if (!receipt) {
      throw new AppError('Purchase receipt not found.', 404);
    }
    const items = await this.purchaseRepository.listPurchaseReceiptItems(tenantId, receiptId);
    return {
      ...this.toPurchaseReceiptSummary(receipt),
      items: items.map((item) => ({
        id: item.id,
        purchaseOrderItemId: item.purchase_order_item_id,
        productId: item.product_id,
        productVariantId: item.product_variant_id,
        productName: item.product_name,
        variantName: item.variant_name,
        productType: item.product_type,
        sku: item.sku,
        binId: item.bin_id,
        binName: item.bin_name,
        lotId: item.lot_id,
        lotNumber: item.lot_number ?? null,
        containerId: item.container_id,
        containerCode: item.container_code ?? null,
        expiryDate: item.expiry_date,
        receivedQuantity: Number(item.received_quantity),
        acceptedQuantity: Number(item.accepted_quantity),
        rejectedQuantity: Number(item.rejected_quantity),
        unitCost: Number(item.unit_cost),
      })),
    };
  }

  async postPurchaseReceipt(tenantId: string, actorUserId: string, receiptId: string) {
    await this.unitOfWork.execute(async (transaction) => {
      const receipt = await this.purchaseRepository.findPurchaseReceiptByIdForUpdate(tenantId, receiptId, transaction);
      if (!receipt) {
        throw new AppError('Purchase receipt not found.', 404);
      }
      if (receipt.status === 'POSTED') {
        throw new AppError('Purchase receipt has already been posted.', 409);
      }
      if (receipt.status === 'CANCELLED') {
        throw new AppError('Cancelled receipt cannot be posted.', 409);
      }

      const order = await this.purchaseRepository.findPurchaseOrderByIdForUpdate(
        tenantId,
        receipt.purchase_order_id,
        transaction
      );
      if (!order) {
        throw new AppError('Purchase order not found.', 404);
      }
      if (order.status === 'CANCELLED') {
        throw new AppError('Cancelled purchase order cannot receive stock.', 409);
      }

      const receiptItems = await this.purchaseRepository.listPurchaseReceiptItems(tenantId, receiptId, transaction);
      if (receiptItems.length === 0) {
        throw new AppError('Purchase receipt must contain at least one item.', 400);
      }

      for (const item of receiptItems) {
        const orderItem = await this.purchaseRepository.findPurchaseOrderItemByIdForUpdate(
          tenantId,
          item.purchase_order_item_id,
          transaction
        );
        if (!orderItem || orderItem.purchase_order_id !== receipt.purchase_order_id) {
          throw new AppError('Receipt item references an invalid purchase order item.', 400);
        }

        const remaining = Number(orderItem.ordered_quantity) - Number(orderItem.received_quantity);
        const receiptQty = Number(item.accepted_quantity);
        if (receiptQty > remaining) {
          throw new AppError('Receipt quantity exceeds pending order quantity.', 409);
        }

        const reference = await this.purchaseRepository.findPurchaseItemReference(
          tenantId,
          {
            productId: item.product_id,
            productVariantId: item.product_variant_id,
          },
          transaction
        );
        if (!reference) {
          throw new AppError('Receipt item references an invalid product or variant.', 404);
        }
        if (!reference.isPurchasable || reference.productStatus !== 'ACTIVE') {
          throw new AppError('Only active purchasable items can be received.', 400);
        }
        if (!reference.trackInventory || reference.productType === 'SERVICE') {
          throw new AppError('Only inventory-tracked non-service items can be received into stock.', 400);
        }

        let zoneId: string | null = null;
        if (item.bin_id) {
          const bin = await this.mustGetBin(tenantId, item.bin_id);
          if (bin.warehouse_id !== receipt.warehouse_id) {
            throw new AppError('Receipt bin does not belong to the receipt warehouse.', 400);
          }
          zoneId = bin.zone_id;
        }

        let lotId = item.lot_id;
        if (!lotId && item.expiry_date) {
          if (!item.lot_number) {
            throw new AppError('Lot number is required for expirable receipt item.', 400);
          }
          lotId = await this.purchaseRepository.findOrCreateInventoryLot(
            {
              tenantId,
              warehouseId: receipt.warehouse_id,
              productId: item.product_id,
              productVariantId: item.product_variant_id,
              lotNumber: item.lot_number,
              expiryDate: item.expiry_date,
              supplierId: receipt.supplier_id,
              purchaseReceiptId: receipt.id,
              actorUserId,
            },
            transaction
          );
        }

        let containerId = item.container_id;
        if (!containerId && item.container_code) {
          containerId = await this.purchaseRepository.findOrCreateContainer(
            {
              tenantId,
              warehouseId: receipt.warehouse_id,
              zoneId,
              binId: item.bin_id,
              containerCode: item.container_code,
              actorUserId,
            },
            transaction
          );
        }

        let stock = await this.inventoryRepository.findStockByLocatorForUpdate(
          {
            tenantId,
            warehouseId: receipt.warehouse_id,
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
            warehouse_id: receipt.warehouse_id,
            zone_id: zoneId,
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

        const nextOnHand = Number(stock.on_hand_quantity) + receiptQty;
        const currentReserved = Number(stock.reserved_quantity);
        await this.inventoryRepository.updateStockQuantities(
          stock.id,
          {
            onHand: this.toDecimal(nextOnHand),
            reserved: this.toDecimal(currentReserved),
            available: this.toDecimal(nextOnHand - currentReserved),
          },
          transaction
        );

        const costLayerId = uuidv4();
        await this.inventoryRepository.createInventoryCostLayer(
          {
            id: costLayerId,
            tenant_id: tenantId,
            warehouse_id: receipt.warehouse_id,
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            lot_id: lotId,
            container_id: containerId,
            reference_type: 'PURCHASE_RECEIPT',
            reference_id: receipt.id,
            receipt_date: receipt.receipt_date,
            qty_received: this.toDecimal(receiptQty),
            qty_remaining: this.toDecimal(receiptQty),
            unit_cost: this.toDecimal(Number(item.unit_cost)),
            landed_cost: this.toDecimal(0),
            currency_code: order.currency_code,
            created_by: actorUserId,
            created_at: new Date(),
          },
          transaction
        );

        if (containerId) {
          await this.purchaseRepository.createInventoryContainerItem(
            {
              id: uuidv4(),
              tenantId,
              containerId,
              warehouseId: receipt.warehouse_id,
              productId: item.product_id,
              productVariantId: item.product_variant_id,
              lotId,
              quantity: this.toDecimal(receiptQty),
              actorUserId,
            },
            transaction
          );
        }

        await this.inventoryRepository.createMovement(
          {
            id: uuidv4(),
            tenant_id: tenantId,
            warehouse_id: receipt.warehouse_id,
            zone_id: zoneId ?? stock.zone_id,
            bin_id: item.bin_id ?? null,
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            lot_id: lotId,
            container_id: containerId,
            cost_layer_id: costLayerId,
            movement_type: 'RECEIPT',
            reference_type: 'PURCHASE_RECEIPT',
            reference_id: receipt.id,
            quantity: this.toDecimal(receiptQty),
            notes: receipt.notes,
            created_by: actorUserId,
          },
          transaction
        );

        await this.purchaseRepository.updatePurchaseOrderItemReceivedQuantity(
          tenantId,
          orderItem.id,
          this.toDecimal(Number(orderItem.received_quantity) + receiptQty),
          transaction
        );
      }

      const updatedItems = await this.purchaseRepository.listPurchaseOrderItemsForUpdate(
        tenantId,
        receipt.purchase_order_id,
        transaction
      );
      const fullyReceived = updatedItems.every((item) => Number(item.received_quantity) >= Number(item.ordered_quantity));
      const anyReceived = updatedItems.some((item) => Number(item.received_quantity) > 0);

      await this.purchaseRepository.updatePurchaseReceiptStatus(
        tenantId,
        receiptId,
        { status: 'POSTED', updatedBy: actorUserId },
        transaction
      );

      await this.purchaseRepository.updatePurchaseOrderStatus(
        tenantId,
        receipt.purchase_order_id,
        {
          status: fullyReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : order.status,
          updatedBy: actorUserId,
        },
        transaction
      );
    });

    return this.getPurchaseReceiptById(tenantId, receiptId);
  }

  async cancelPurchaseReceipt(tenantId: string, actorUserId: string, receiptId: string) {
    const receipt = await this.purchaseRepository.findPurchaseReceiptById(tenantId, receiptId);
    if (!receipt) {
      throw new AppError('Purchase receipt not found.', 404);
    }
    if (receipt.status === 'POSTED') {
      throw new AppError('Posted receipts cannot be cancelled without a reversal workflow.', 409);
    }
    if (receipt.status === 'CANCELLED') {
      throw new AppError('Purchase receipt has already been cancelled.', 409);
    }

    await this.purchaseRepository.updatePurchaseReceiptStatus(tenantId, receiptId, {
      status: 'CANCELLED',
      updatedBy: actorUserId,
    });

    return this.getPurchaseReceiptById(tenantId, receiptId);
  }

  private async replacePurchaseOrderItems(
    tenantId: string,
    purchaseOrderId: string,
    items: PurchaseOrderItemInput[],
    transaction: Parameters<PurchaseRepository['createPurchaseOrder']>[1]
  ) {
    for (const item of items) {
      const totals = this.calculateLineTotal(item);
      await this.purchaseRepository.createPurchaseOrderItem(
        {
          id: uuidv4(),
          tenant_id: tenantId,
          purchase_order_id: purchaseOrderId,
          product_id: item.productId ?? null,
          product_variant_id: item.productVariantId ?? null,
          ordered_quantity: this.toDecimal(item.orderedQuantity),
          received_quantity: this.toDecimal(0),
          unit_cost: this.toDecimal(item.unitCost ?? 0),
          tax_amount: this.toDecimal(item.taxAmount ?? 0),
          discount_amount: this.toDecimal(item.discountAmount ?? 0),
          line_total: this.toDecimal(totals.total),
          procurement_requisition_item_id: item.procurementRequisitionItemId ?? null,
          notes: item.notes ?? null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        transaction
      );
    }
  }

  private async mustGetActiveSupplier(tenantId: string, supplierId: string) {
    const supplier = await this.purchaseRepository.findSupplierById(tenantId, supplierId);
    if (!supplier) {
      throw new AppError('Supplier not found.', 404);
    }
    if (supplier.status !== 'ACTIVE') {
      throw new AppError('Only active suppliers can be used for purchase orders.', 400);
    }
    return supplier;
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

  private async mustGetPurchaseOrder(tenantId: string, purchaseOrderId: string): Promise<PurchaseOrder> {
    const order = await this.purchaseRepository.findPurchaseOrderById(tenantId, purchaseOrderId);
    if (!order) {
      throw new AppError('Purchase order not found.', 404);
    }
    return order;
  }

  private async validatePurchaseItems(tenantId: string, items: PurchaseOrderItemInput[]) {
    for (const item of items) {
      const reference = await this.purchaseRepository.findPurchaseItemReference(tenantId, {
        productId: item.productId ?? null,
        productVariantId: item.productVariantId ?? null,
      });
      if (!reference) {
        throw new AppError('Purchase order references an invalid product or variant.', 404);
      }
      if (!reference.isPurchasable || reference.productStatus !== 'ACTIVE') {
        throw new AppError('Only active purchasable items can be added to purchase orders.', 400);
      }
      if (reference.productType === 'SERVICE') {
        throw new AppError('Service products are not supported in this purchase module flow.', 400);
      }
    }
  }

  private calculateLineTotal(item: PurchaseOrderItemInput) {
    const subtotal = item.orderedQuantity * (item.unitCost ?? 0);
    return {
      subtotal,
      total: subtotal + (item.taxAmount ?? 0) - (item.discountAmount ?? 0),
    };
  }

  private calculateTotals(items: PurchaseOrderItemInput[]) {
    return items.reduce(
      (acc, item) => {
        const subtotal = item.orderedQuantity * (item.unitCost ?? 0);
        acc.subtotal += subtotal;
        acc.tax += item.taxAmount ?? 0;
        acc.discount += item.discountAmount ?? 0;
        acc.total += subtotal + (item.taxAmount ?? 0) - (item.discountAmount ?? 0);
        return acc;
      },
      { subtotal: 0, tax: 0, discount: 0, total: 0 }
    );
  }

  private toPurchaseOrderSummary(order: PurchaseOrderListRow) {
    return {
      id: order.id,
      supplierId: order.supplier_id,
      supplierName: order.supplier_name,
      warehouseId: order.warehouse_id,
      warehouseName: order.warehouse_name,
      purchaseOrderNumber: order.purchase_order_number,
      status: order.status,
      orderDate: order.order_date,
      expectedDate: order.expected_date,
      currencyCode: order.currency_code,
      paymentType: order.payment_type,
      paymentStatus: order.payment_status,
      paymentMode: order.payment_mode,
      subtotalAmount: Number(order.subtotal_amount),
      taxAmount: Number(order.tax_amount),
      discountAmount: Number(order.discount_amount),
      totalAmount: Number(order.total_amount),
      notes: order.notes,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    };
  }

  private toPurchaseReceiptSummary(receipt: PurchaseReceiptListRow) {
    return {
      id: receipt.id,
      purchaseOrderId: receipt.purchase_order_id,
      purchaseOrderNumber: receipt.purchase_order_number,
      supplierId: receipt.supplier_id,
      supplierName: receipt.supplier_name,
      warehouseId: receipt.warehouse_id,
      warehouseName: receipt.warehouse_name,
      receiptNumber: receipt.receipt_number,
      receiptDate: receipt.receipt_date,
      status: receipt.status,
      notes: receipt.notes,
      createdAt: receipt.created_at,
      updatedAt: receipt.updated_at,
    };
  }

  private toDecimal(value: number) {
    return value.toFixed(4);
  }
}
