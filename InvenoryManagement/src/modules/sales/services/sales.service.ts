import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { DatabaseTransaction, Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { InventoryRepository } from '../../inventory/repositories/inventory.repository';
import { WarehouseRepository } from '../../warehouse/repositories/warehouse.repository';
import { SalesRepository } from '../repositories/sales.repository';
import {
  Customer,
  SalesOrder,
  SalesOrderCreateInput,
  SalesOrderItemInput,
  SalesOrderListFilters,
  SalesOrderListRow,
  SalesOrderStatus,
  SalesOrderUpdateInput,
  SalesReservationCreateInput,
  SalesReservationListFilters,
  SalesReservationListRow,
  SalesShipmentCreateInput,
  SalesShipmentListFilters,
  SalesShipmentListRow,
} from '../types/sales.types';
import { ActivityService } from '../../activity/services/activity.service';

export class SalesService {
  private readonly salesRepository: SalesRepository;
  private readonly warehouseRepository: WarehouseRepository;
  private readonly inventoryRepository: InventoryRepository;

  constructor(
    db: Queryable,
    private readonly unitOfWork: UnitOfWork,
    private readonly activityService: ActivityService,
  ) {
    this.salesRepository = new SalesRepository(db);
    this.warehouseRepository = new WarehouseRepository(db);
    this.inventoryRepository = new InventoryRepository(db);
  }

  async createSalesOrder(tenantId: string, actorUserId: string, input: SalesOrderCreateInput) {
    await this.mustGetWarehouse(tenantId, input.warehouseId);
    await this.validateSalesItems(tenantId, input.items);

    const salesOrderId = uuidv4();
    const salesOrderNumber = `SO-${Date.now()}-${salesOrderId.slice(0, 8).toUpperCase()}`;
    const totals = this.calculateTotals(input.items);

    await this.unitOfWork.execute(async (transaction) => {
      const customerContext = await this.resolveSalesOrderCustomerContext(tenantId, actorUserId, input, transaction);

      await this.salesRepository.createSalesOrder(
        {
          id: salesOrderId,
          tenant_id: tenantId,
          customer_id: customerContext.customerId,
          customer_name: customerContext.customerName,
          warehouse_id: input.warehouseId,
          sales_order_number: salesOrderNumber,
          status: 'DRAFT',
          order_date: new Date(input.orderDate),
          expected_ship_date: input.expectedShipDate ? new Date(input.expectedShipDate) : null,
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

      await this.replaceSalesOrderItems(tenantId, salesOrderId, input.items, transaction);
      
      await this.activityService.logActivity({
        tenantId,
        userId: actorUserId,
        actionType: 'CREATE',
        module: 'SALES',
        description: `Created Sales Order ${salesOrderNumber} for ${customerContext.customerName}`,
        metadata: { salesOrderId, salesOrderNumber }
      });
    });

    return this.getSalesOrderById(tenantId, salesOrderId);
  }

  async updateSalesOrder(tenantId: string, actorUserId: string, salesOrderId: string, input: SalesOrderUpdateInput) {
    const existing = await this.mustGetSalesOrder(tenantId, salesOrderId);
    if (existing.status !== 'DRAFT') {
      throw new AppError('Only draft sales orders can be updated.', 409);
    }

    const warehouseId = input.warehouseId ?? existing.warehouse_id;
    await this.mustGetWarehouse(tenantId, warehouseId);

    const existingItems = await this.salesRepository.listSalesOrderItems(tenantId, salesOrderId);
    const nextItems =
      input.items ??
      existingItems.map((item) => ({
        productId: item.product_id ?? undefined,
        productVariantId: item.product_variant_id ?? undefined,
        orderedQuantity: Number(item.ordered_quantity),
        unitPrice: Number(item.unit_price),
        taxAmount: Number(item.tax_amount),
        discountAmount: Number(item.discount_amount),
        notes: item.notes,
      }));

    await this.validateSalesItems(tenantId, nextItems);
    const totals = this.calculateTotals(nextItems);

    await this.unitOfWork.execute(async (transaction) => {
      const customerContext = await this.resolveSalesOrderCustomerContext(
        tenantId,
        actorUserId,
        {
          customerName: input.customerName ?? existing.customer_name,
          selectedCustomerId:
            input.selectedCustomerId === undefined ? existing.customer_id ?? undefined : input.selectedCustomerId ?? undefined,
          saveAsCustomer: input.saveAsCustomer ?? false,
          customerDetails: input.customerDetails,
        },
        transaction
      );

      await this.salesRepository.updateSalesOrder(
        tenantId,
        salesOrderId,
        {
          customer_id: customerContext.customerId,
          customer_name: customerContext.customerName,
          warehouse_id: warehouseId,
          order_date: input.orderDate ? new Date(input.orderDate) : existing.order_date,
          expected_ship_date:
            input.expectedShipDate === undefined
              ? existing.expected_ship_date
              : input.expectedShipDate
                ? new Date(input.expectedShipDate)
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

      await this.salesRepository.deleteSalesOrderItems(tenantId, salesOrderId, transaction);
      await this.replaceSalesOrderItems(tenantId, salesOrderId, nextItems, transaction);
    });

    return this.getSalesOrderById(tenantId, salesOrderId);
  }

  async confirmSalesOrder(tenantId: string, actorUserId: string, salesOrderId: string) {
    const order = await this.mustGetSalesOrder(tenantId, salesOrderId);
    if (order.status !== 'DRAFT') {
      throw new AppError('Only draft sales orders can be confirmed.', 409);
    }

    const items = await this.salesRepository.listSalesOrderItems(tenantId, salesOrderId);
    if (items.length === 0) {
      throw new AppError('Sales order must contain at least one item.', 400);
    }

    await this.salesRepository.updateSalesOrderStatus(tenantId, salesOrderId, {
      status: 'CONFIRMED',
      updatedBy: actorUserId,
    });

    return this.getSalesOrderById(tenantId, salesOrderId);
  }

  async cancelSalesOrder(tenantId: string, actorUserId: string, salesOrderId: string) {
    const order = await this.mustGetSalesOrder(tenantId, salesOrderId);
    if (order.status === 'CANCELLED') {
      throw new AppError('Sales order has already been cancelled.', 409);
    }
    if (['PARTIALLY_RESERVED', 'RESERVED', 'PARTIALLY_SHIPPED', 'SHIPPED'].includes(order.status)) {
      throw new AppError('Reserved or shipped sales orders cannot be cancelled.', 409);
    }

    await this.salesRepository.updateSalesOrderStatus(tenantId, salesOrderId, {
      status: 'CANCELLED',
      updatedBy: actorUserId,
    });

    return this.getSalesOrderById(tenantId, salesOrderId);
  }

  async listSalesOrders(tenantId: string, filters: SalesOrderListFilters) {
    const [items, total] = await Promise.all([
      this.salesRepository.listSalesOrders(tenantId, filters),
      this.salesRepository.countSalesOrders(tenantId, filters),
    ]);

    return {
      items: items.map((item) => this.toSalesOrderSummary(item)),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
      },
    };
  }

  async getSalesOrderById(tenantId: string, salesOrderId: string) {
    const order = await this.salesRepository.findSalesOrderDetailById(tenantId, salesOrderId);
    if (!order) {
      throw new AppError('Sales order not found.', 404);
    }
    const items = await this.salesRepository.listSalesOrderItems(tenantId, salesOrderId);
    return {
      ...this.toSalesOrderSummary(order),
      items: items.map((item) => ({
        id: item.id,
        productId: item.product_id,
        productVariantId: item.product_variant_id,
        productName: item.product_name,
        variantName: item.variant_name,
        productType: item.product_type,
        sku: item.sku,
        orderedQuantity: Number(item.ordered_quantity),
        reservedQuantity: Number(item.reserved_quantity),
        shippedQuantity: Number(item.shipped_quantity),
        pendingReservationQuantity: Number(item.ordered_quantity) - Number(item.reserved_quantity),
        pendingShipmentQuantity: Number(item.ordered_quantity) - Number(item.shipped_quantity),
        unitPrice: Number(item.unit_price),
        taxAmount: Number(item.tax_amount),
        discountAmount: Number(item.discount_amount),
        lineTotal: Number(item.line_total),
        notes: item.notes,
      })),
    };
  }

  async createSalesReservation(
    tenantId: string,
    actorUserId: string,
    salesOrderId: string,
    input: SalesReservationCreateInput
  ) {
    const order = await this.mustGetSalesOrder(tenantId, salesOrderId);
    if (!['CONFIRMED', 'PARTIALLY_RESERVED', 'RESERVED', 'PARTIALLY_SHIPPED'].includes(order.status)) {
      throw new AppError('Reservations can only be created for confirmed or active sales orders.', 409);
    }

    const orderItems = await this.salesRepository.listSalesOrderItems(tenantId, salesOrderId);
    const orderItemMap = new Map(orderItems.map((item) => [item.id, item]));

    for (const item of input.items) {
      const orderItem = orderItemMap.get(item.salesOrderItemId);
      if (!orderItem) {
        throw new AppError('Reservation item references an invalid sales order item.', 400);
      }
      const remaining = Number(orderItem.ordered_quantity) - Number(orderItem.reserved_quantity);
      if (item.reservedQuantity > remaining) {
        throw new AppError('Reservation quantity exceeds reservable order quantity.', 409);
      }
      if (item.binId) {
        const bin = await this.mustGetBin(tenantId, item.binId);
        if (bin.warehouse_id !== order.warehouse_id) {
          throw new AppError('Reservation bin does not belong to the sales order warehouse.', 400);
        }
      }
    }

    const reservationId = uuidv4();
    const reservationNumber = `RSV-${Date.now()}-${reservationId.slice(0, 8).toUpperCase()}`;

    await this.unitOfWork.execute(async (transaction) => {
      await this.salesRepository.createSalesReservation(
        {
          id: reservationId,
          tenant_id: tenantId,
          sales_order_id: salesOrderId,
          warehouse_id: order.warehouse_id,
          reservation_number: reservationNumber,
          reservation_date: new Date(input.reservationDate),
          status: 'DRAFT',
          notes: input.notes ?? null,
          created_by: actorUserId,
          updated_by: actorUserId,
        },
        transaction
      );

      for (const item of input.items) {
        const orderItem = orderItemMap.get(item.salesOrderItemId)!;
        await this.salesRepository.createSalesReservationItem(
          {
            id: uuidv4(),
            tenant_id: tenantId,
            sales_reservation_id: reservationId,
            sales_order_item_id: orderItem.id,
            product_id: orderItem.product_id,
            product_variant_id: orderItem.product_variant_id,
            bin_id: item.binId ?? null,
            reserved_quantity: this.toDecimal(item.reservedQuantity),
            created_at: new Date(),
            updated_at: new Date(),
          },
          transaction
        );
      }
    });

    return this.getSalesReservationById(tenantId, reservationId);
  }

  async listSalesReservations(tenantId: string, filters: SalesReservationListFilters) {
    const [items, total] = await Promise.all([
      this.salesRepository.listSalesReservations(tenantId, filters),
      this.salesRepository.countSalesReservations(tenantId, filters),
    ]);

    return {
      items: items.map((item) => this.toSalesReservationSummary(item)),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
      },
    };
  }

  async getSalesReservationById(tenantId: string, reservationId: string) {
    const reservation = await this.salesRepository.findSalesReservationDetailById(tenantId, reservationId);
    if (!reservation) {
      throw new AppError('Sales reservation not found.', 404);
    }
    const items = await this.salesRepository.listSalesReservationItems(tenantId, reservationId);
    return {
      ...this.toSalesReservationSummary(reservation),
      items: items.map((item) => ({
        id: item.id,
        salesOrderItemId: item.sales_order_item_id,
        productId: item.product_id,
        productVariantId: item.product_variant_id,
        productName: item.product_name,
        variantName: item.variant_name,
        productType: item.product_type,
        sku: item.sku,
        binId: item.bin_id,
        binName: item.bin_name,
        reservedQuantity: Number(item.reserved_quantity),
      })),
    };
  }

  async postSalesReservation(tenantId: string, actorUserId: string, reservationId: string) {
    await this.unitOfWork.execute(async (transaction) => {
      const reservation = await this.salesRepository.findSalesReservationByIdForUpdate(
        tenantId,
        reservationId,
        transaction
      );
      if (!reservation) {
        throw new AppError('Sales reservation not found.', 404);
      }
      if (reservation.status === 'POSTED') {
        throw new AppError('Sales reservation has already been posted.', 409);
      }
      if (reservation.status === 'RELEASED') {
        throw new AppError('Released reservation cannot be posted again.', 409);
      }
      if (reservation.status === 'CANCELLED') {
        throw new AppError('Cancelled reservation cannot be posted.', 409);
      }

      const order = await this.salesRepository.findSalesOrderByIdForUpdate(
        tenantId,
        reservation.sales_order_id,
        transaction
      );
      if (!order) {
        throw new AppError('Sales order not found.', 404);
      }
      if (order.status === 'CANCELLED' || order.status === 'SHIPPED') {
        throw new AppError('This sales order cannot be reserved.', 409);
      }

      const reservationItems = await this.salesRepository.listSalesReservationItems(tenantId, reservationId, transaction);
      if (reservationItems.length === 0) {
        throw new AppError('Sales reservation must contain at least one item.', 400);
      }

      for (const item of reservationItems) {
        const orderItem = await this.salesRepository.findSalesOrderItemByIdForUpdate(
          tenantId,
          item.sales_order_item_id,
          transaction
        );
        if (!orderItem || orderItem.sales_order_id !== reservation.sales_order_id) {
          throw new AppError('Reservation item references an invalid sales order item.', 400);
        }

        const remaining = Number(orderItem.ordered_quantity) - Number(orderItem.reserved_quantity);
        const reserveQty = Number(item.reserved_quantity);
        if (reserveQty > remaining) {
          throw new AppError('Reservation quantity exceeds reservable order quantity.', 409);
        }

        const reference = await this.salesRepository.findSalesItemReference(
          tenantId,
          {
            productId: item.product_id,
            productVariantId: item.product_variant_id,
          },
          transaction
        );
        if (!reference) {
          throw new AppError('Reservation item references an invalid product or variant.', 404);
        }
        if (!reference.isSellable || reference.productStatus !== 'ACTIVE') {
          throw new AppError('Only active sellable items can be reserved.', 400);
        }
        if (!reference.trackInventory || reference.productType === 'SERVICE') {
          throw new AppError('Only inventory-tracked non-service items can be reserved.', 400);
        }

        let zoneId: string | null = null;
        if (item.bin_id) {
          const bin = await this.mustGetBin(tenantId, item.bin_id);
          if (bin.warehouse_id !== reservation.warehouse_id) {
            throw new AppError('Reservation bin does not belong to the reservation warehouse.', 400);
          }
          zoneId = bin.zone_id;
        }

        const stock = await this.inventoryRepository.findStockByLocatorForUpdate(
          {
            tenantId,
            warehouseId: reservation.warehouse_id,
            binId: item.bin_id ?? null,
            productId: item.product_id,
            productVariantId: item.product_variant_id,
          },
          transaction
        );
        if (!stock) {
          throw new AppError('No stock exists for the reservation locator.', 409);
        }
        if (Number(stock.available_quantity) < reserveQty) {
          throw new AppError('Insufficient available stock for reservation.', 409);
        }

        const nextReserved = Number(stock.reserved_quantity) + reserveQty;
        const nextAvailable = Number(stock.on_hand_quantity) - nextReserved;
        await this.inventoryRepository.updateStockQuantities(
          stock.id,
          {
            onHand: this.toDecimal(Number(stock.on_hand_quantity)),
            reserved: this.toDecimal(nextReserved),
            available: this.toDecimal(nextAvailable),
          },
          transaction
        );

        await this.inventoryRepository.createMovement(
          {
            id: uuidv4(),
            tenant_id: tenantId,
            warehouse_id: reservation.warehouse_id,
            zone_id: zoneId ?? stock.zone_id,
            bin_id: item.bin_id ?? null,
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            movement_type: 'RESERVATION',
            reference_type: 'SALES_RESERVATION',
            reference_id: reservation.id,
            quantity: this.toDecimal(reserveQty),
            notes: reservation.notes,
            created_by: actorUserId,
          },
          transaction
        );

        await this.salesRepository.updateSalesOrderItemQuantities(
          tenantId,
          orderItem.id,
          {
            reservedQuantity: this.toDecimal(Number(orderItem.reserved_quantity) + reserveQty),
            shippedQuantity: orderItem.shipped_quantity,
          },
          transaction
        );
      }

      const nextOrderStatus = await this.recalculateSalesOrderStatus(
        tenantId,
        reservation.sales_order_id,
        order.status,
        transaction
      );

      await this.salesRepository.updateSalesReservationStatus(
        tenantId,
        reservationId,
        { status: 'POSTED', updatedBy: actorUserId },
        transaction
      );

      if (nextOrderStatus !== order.status) {
        await this.salesRepository.updateSalesOrderStatus(
          tenantId,
          reservation.sales_order_id,
          { status: nextOrderStatus, updatedBy: actorUserId },
          transaction
        );
      }
    });

    return this.getSalesReservationById(tenantId, reservationId);
  }

  async releaseSalesReservation(tenantId: string, actorUserId: string, reservationId: string) {
    await this.unitOfWork.execute(async (transaction) => {
      const reservation = await this.salesRepository.findSalesReservationByIdForUpdate(
        tenantId,
        reservationId,
        transaction
      );
      if (!reservation) {
        throw new AppError('Sales reservation not found.', 404);
      }
      if (reservation.status === 'RELEASED') {
        throw new AppError('Sales reservation has already been released.', 409);
      }
      if (reservation.status === 'CANCELLED') {
        throw new AppError('Cancelled reservation cannot be released.', 409);
      }
      if (reservation.status !== 'POSTED') {
        throw new AppError('Only posted reservations can be released.', 409);
      }

      const order = await this.salesRepository.findSalesOrderByIdForUpdate(
        tenantId,
        reservation.sales_order_id,
        transaction
      );
      if (!order) {
        throw new AppError('Sales order not found.', 404);
      }

      const reservationItems = await this.salesRepository.listSalesReservationItems(tenantId, reservationId, transaction);
      if (reservationItems.length === 0) {
        throw new AppError('Sales reservation must contain at least one item.', 400);
      }

      for (const item of reservationItems) {
        const orderItem = await this.salesRepository.findSalesOrderItemByIdForUpdate(
          tenantId,
          item.sales_order_item_id,
          transaction
        );
        if (!orderItem || orderItem.sales_order_id !== reservation.sales_order_id) {
          throw new AppError('Reservation item references an invalid sales order item.', 400);
        }

        const releaseQty = Number(item.reserved_quantity);
        if (Number(orderItem.reserved_quantity) < releaseQty) {
          throw new AppError('Reservation release exceeds order reserved quantity.', 409);
        }

        let zoneId: string | null = null;
        if (item.bin_id) {
          const bin = await this.mustGetBin(tenantId, item.bin_id);
          if (bin.warehouse_id !== reservation.warehouse_id) {
            throw new AppError('Reservation bin does not belong to the reservation warehouse.', 400);
          }
          zoneId = bin.zone_id;
        }

        const stock = await this.inventoryRepository.findStockByLocatorForUpdate(
          {
            tenantId,
            warehouseId: reservation.warehouse_id,
            binId: item.bin_id ?? null,
            productId: item.product_id,
            productVariantId: item.product_variant_id,
          },
          transaction
        );
        if (!stock) {
          throw new AppError('No stock exists for the reservation locator.', 409);
        }
        if (Number(stock.reserved_quantity) < releaseQty) {
          throw new AppError('Reservation release exceeds stock reserved quantity.', 409);
        }

        const nextReserved = Number(stock.reserved_quantity) - releaseQty;
        const nextAvailable = Number(stock.on_hand_quantity) - nextReserved;
        await this.inventoryRepository.updateStockQuantities(
          stock.id,
          {
            onHand: this.toDecimal(Number(stock.on_hand_quantity)),
            reserved: this.toDecimal(nextReserved),
            available: this.toDecimal(nextAvailable),
          },
          transaction
        );

        await this.inventoryRepository.createMovement(
          {
            id: uuidv4(),
            tenant_id: tenantId,
            warehouse_id: reservation.warehouse_id,
            zone_id: zoneId ?? stock.zone_id,
            bin_id: item.bin_id ?? null,
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            movement_type: 'RESERVATION_RELEASE',
            reference_type: 'SALES_RESERVATION',
            reference_id: reservation.id,
            quantity: this.toDecimal(releaseQty),
            notes: reservation.notes,
            created_by: actorUserId,
          },
          transaction
        );

        await this.salesRepository.updateSalesOrderItemQuantities(
          tenantId,
          orderItem.id,
          {
            reservedQuantity: this.toDecimal(Number(orderItem.reserved_quantity) - releaseQty),
            shippedQuantity: orderItem.shipped_quantity,
          },
          transaction
        );
      }

      const nextOrderStatus = await this.recalculateSalesOrderStatus(
        tenantId,
        reservation.sales_order_id,
        order.status,
        transaction
      );

      await this.salesRepository.updateSalesReservationStatus(
        tenantId,
        reservationId,
        { status: 'RELEASED', updatedBy: actorUserId },
        transaction
      );

      if (nextOrderStatus !== order.status) {
        await this.salesRepository.updateSalesOrderStatus(
          tenantId,
          reservation.sales_order_id,
          { status: nextOrderStatus, updatedBy: actorUserId },
          transaction
        );
      }
    });

    return this.getSalesReservationById(tenantId, reservationId);
  }

  async cancelSalesReservation(tenantId: string, actorUserId: string, reservationId: string) {
    const reservation = await this.salesRepository.findSalesReservationById(tenantId, reservationId);
    if (!reservation) {
      throw new AppError('Sales reservation not found.', 404);
    }
    if (reservation.status === 'POSTED') {
      throw new AppError('Posted reservations must be released instead of cancelled.', 409);
    }
    if (reservation.status === 'RELEASED') {
      throw new AppError('Released reservations cannot be cancelled.', 409);
    }
    if (reservation.status === 'CANCELLED') {
      throw new AppError('Sales reservation has already been cancelled.', 409);
    }

    await this.salesRepository.updateSalesReservationStatus(tenantId, reservationId, {
      status: 'CANCELLED',
      updatedBy: actorUserId,
    });

    return this.getSalesReservationById(tenantId, reservationId);
  }

  async createSalesShipment(tenantId: string, actorUserId: string, salesOrderId: string, input: SalesShipmentCreateInput) {
    const order = await this.mustGetSalesOrder(tenantId, salesOrderId);
    if (!['CONFIRMED', 'PARTIALLY_RESERVED', 'RESERVED', 'PARTIALLY_SHIPPED'].includes(order.status)) {
      throw new AppError('Shipments can only be created for confirmed or active sales orders.', 409);
    }

    const orderItems = await this.salesRepository.listSalesOrderItems(tenantId, salesOrderId);
    const orderItemMap = new Map(orderItems.map((item) => [item.id, item]));

    for (const item of input.items) {
      const orderItem = orderItemMap.get(item.salesOrderItemId);
      if (!orderItem) {
        throw new AppError('Shipment item references an invalid sales order item.', 400);
      }
      const remaining = Number(orderItem.ordered_quantity) - Number(orderItem.shipped_quantity);
      if (item.shippedQuantity > remaining) {
        throw new AppError('Shipment quantity exceeds shippable order quantity.', 409);
      }
      if (item.binId) {
        const bin = await this.mustGetBin(tenantId, item.binId);
        if (bin.warehouse_id !== order.warehouse_id) {
          throw new AppError('Shipment bin does not belong to the sales order warehouse.', 400);
        }
      }
    }

    const shipmentId = uuidv4();
    const shipmentNumber = `SHP-${Date.now()}-${shipmentId.slice(0, 8).toUpperCase()}`;

    await this.unitOfWork.execute(async (transaction) => {
      await this.salesRepository.createSalesShipment(
        {
          id: shipmentId,
          tenant_id: tenantId,
          sales_order_id: salesOrderId,
          warehouse_id: order.warehouse_id,
          shipment_number: shipmentNumber,
          shipment_date: new Date(input.shipmentDate),
          status: 'DRAFT',
          notes: input.notes ?? null,
          created_by: actorUserId,
          updated_by: actorUserId,
        },
        transaction
      );

      for (const item of input.items) {
        const orderItem = orderItemMap.get(item.salesOrderItemId)!;
        await this.salesRepository.createSalesShipmentItem(
          {
            id: uuidv4(),
            tenant_id: tenantId,
            sales_shipment_id: shipmentId,
            sales_order_item_id: orderItem.id,
            product_id: orderItem.product_id,
            product_variant_id: orderItem.product_variant_id,
            bin_id: item.binId ?? null,
            shipped_quantity: this.toDecimal(item.shippedQuantity),
            created_at: new Date(),
            updated_at: new Date(),
          },
          transaction
        );
      }
    });

    return this.getSalesShipmentById(tenantId, shipmentId);
  }

  async listSalesShipments(tenantId: string, filters: SalesShipmentListFilters) {
    const [items, total] = await Promise.all([
      this.salesRepository.listSalesShipments(tenantId, filters),
      this.salesRepository.countSalesShipments(tenantId, filters),
    ]);

    return {
      items: items.map((item) => this.toSalesShipmentSummary(item)),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
      },
    };
  }

  async getSalesShipmentById(tenantId: string, shipmentId: string) {
    const shipment = await this.salesRepository.findSalesShipmentDetailById(tenantId, shipmentId);
    if (!shipment) {
      throw new AppError('Sales shipment not found.', 404);
    }
    const items = await this.salesRepository.listSalesShipmentItems(tenantId, shipmentId);
    return {
      ...this.toSalesShipmentSummary(shipment),
      items: items.map((item) => ({
        id: item.id,
        salesOrderItemId: item.sales_order_item_id,
        productId: item.product_id,
        productVariantId: item.product_variant_id,
        productName: item.product_name,
        variantName: item.variant_name,
        productType: item.product_type,
        sku: item.sku,
        binId: item.bin_id,
        binName: item.bin_name,
        shippedQuantity: Number(item.shipped_quantity),
      })),
    };
  }

  async postSalesShipment(tenantId: string, actorUserId: string, shipmentId: string) {
    await this.unitOfWork.execute(async (transaction) => {
      const shipment = await this.salesRepository.findSalesShipmentByIdForUpdate(tenantId, shipmentId, transaction);
      if (!shipment) {
        throw new AppError('Sales shipment not found.', 404);
      }
      if (shipment.status === 'POSTED') {
        throw new AppError('Sales shipment has already been posted.', 409);
      }
      if (shipment.status === 'CANCELLED') {
        throw new AppError('Cancelled shipment cannot be posted.', 409);
      }

      const order = await this.salesRepository.findSalesOrderByIdForUpdate(tenantId, shipment.sales_order_id, transaction);
      if (!order) {
        throw new AppError('Sales order not found.', 404);
      }
      if (order.status === 'CANCELLED' || order.status === 'SHIPPED') {
        throw new AppError('This sales order cannot be shipped.', 409);
      }

      const shipmentItems = await this.salesRepository.listSalesShipmentItems(tenantId, shipmentId, transaction);
      if (shipmentItems.length === 0) {
        throw new AppError('Sales shipment must contain at least one item.', 400);
      }

      for (const item of shipmentItems) {
        const orderItem = await this.salesRepository.findSalesOrderItemByIdForUpdate(
          tenantId,
          item.sales_order_item_id,
          transaction
        );
        if (!orderItem || orderItem.sales_order_id !== shipment.sales_order_id) {
          throw new AppError('Shipment item references an invalid sales order item.', 400);
        }

        const remaining = Number(orderItem.ordered_quantity) - Number(orderItem.shipped_quantity);
        const shipQty = Number(item.shipped_quantity);
        if (shipQty > remaining) {
          throw new AppError('Shipment quantity exceeds shippable order quantity.', 409);
        }

        const reference = await this.salesRepository.findSalesItemReference(
          tenantId,
          {
            productId: item.product_id,
            productVariantId: item.product_variant_id,
          },
          transaction
        );
        if (!reference) {
          throw new AppError('Shipment item references an invalid product or variant.', 404);
        }
        if (!reference.isSellable || reference.productStatus !== 'ACTIVE') {
          throw new AppError('Only active sellable items can be shipped.', 400);
        }
        if (!reference.trackInventory || reference.productType === 'SERVICE') {
          throw new AppError('Only inventory-tracked non-service items can be shipped.', 400);
        }

        let zoneId: string | null = null;
        if (item.bin_id) {
          const bin = await this.mustGetBin(tenantId, item.bin_id);
          if (bin.warehouse_id !== shipment.warehouse_id) {
            throw new AppError('Shipment bin does not belong to the shipment warehouse.', 400);
          }
          zoneId = bin.zone_id;
        }

        const stock = await this.inventoryRepository.findStockByLocatorForUpdate(
          {
            tenantId,
            warehouseId: shipment.warehouse_id,
            binId: item.bin_id ?? null,
            productId: item.product_id,
            productVariantId: item.product_variant_id,
          },
          transaction
        );
        if (!stock) {
          throw new AppError('No stock exists for the shipment locator.', 409);
        }
        if (Number(stock.on_hand_quantity) < shipQty) {
          throw new AppError('Insufficient on-hand stock for shipment.', 409);
        }

        const reservedConsumed = Math.min(shipQty, Number(stock.reserved_quantity), Number(orderItem.reserved_quantity));
        const nextOnHand = Number(stock.on_hand_quantity) - shipQty;
        const nextReserved = Number(stock.reserved_quantity) - reservedConsumed;
        const nextAvailable = nextOnHand - nextReserved;

        await this.inventoryRepository.updateStockQuantities(
          stock.id,
          {
            onHand: this.toDecimal(nextOnHand),
            reserved: this.toDecimal(nextReserved),
            available: this.toDecimal(nextAvailable),
          },
          transaction
        );

        // FIFO Consumption for Shipment
        let remainingToConsume = shipQty;
        const layers = await this.inventoryRepository.findAvailableCostLayers(
          tenantId,
          shipment.warehouse_id,
          item.product_id,
          item.product_variant_id,
          transaction
        );

        if (layers.length === 0) {
          throw new AppError('No available cost layers found for FIFO shipment.', 409);
        }

        for (const layer of layers) {
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
              reference_type: 'SALES_SHIPMENT',
              reference_id: shipmentId,
              consumed_quantity: this.toDecimal(consumeQty),
              unit_cost: layer.unit_cost,
              created_by: actorUserId,
              created_at: new Date(),
            },
            transaction
          );

          remainingToConsume -= consumeQty;
        }

        if (remainingToConsume > 0) {
          throw new AppError('Insufficient cost layers to fulfill the shipment.', 409);
        }

        await this.inventoryRepository.createMovement(
          {
            id: uuidv4(),
            tenant_id: tenantId,
            warehouse_id: shipment.warehouse_id,
            zone_id: zoneId ?? stock.zone_id,
            bin_id: item.bin_id ?? null,
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            movement_type: 'ISSUE',
            reference_type: 'SALES_SHIPMENT',
            reference_id: shipment.id,
            quantity: this.toDecimal(shipQty),
            notes: shipment.notes,
            created_by: actorUserId,
          },
          transaction
        );

        await this.salesRepository.updateSalesOrderItemQuantities(
          tenantId,
          orderItem.id,
          {
            reservedQuantity: this.toDecimal(Number(orderItem.reserved_quantity) - reservedConsumed),
            shippedQuantity: this.toDecimal(Number(orderItem.shipped_quantity) + shipQty),
          },
          transaction
        );
      }

      const nextOrderStatus = await this.recalculateSalesOrderStatus(
        tenantId,
        shipment.sales_order_id,
        order.status,
        transaction
      );

      await this.salesRepository.updateSalesShipmentStatus(
        tenantId,
        shipmentId,
        { status: 'POSTED', updatedBy: actorUserId },
        transaction
      );

      if (nextOrderStatus !== order.status) {
        await this.salesRepository.updateSalesOrderStatus(
          tenantId,
          shipment.sales_order_id,
          { status: nextOrderStatus, updatedBy: actorUserId },
          transaction
        );
      }
    });

    return this.getSalesShipmentById(tenantId, shipmentId);
  }

  async cancelSalesShipment(tenantId: string, actorUserId: string, shipmentId: string) {
    const shipment = await this.salesRepository.findSalesShipmentById(tenantId, shipmentId);
    if (!shipment) {
      throw new AppError('Sales shipment not found.', 404);
    }
    if (shipment.status === 'POSTED') {
      throw new AppError('Posted shipments cannot be cancelled without a return workflow.', 409);
    }
    if (shipment.status === 'CANCELLED') {
      throw new AppError('Sales shipment has already been cancelled.', 409);
    }

    await this.salesRepository.updateSalesShipmentStatus(tenantId, shipmentId, {
      status: 'CANCELLED',
      updatedBy: actorUserId,
    });

    return this.getSalesShipmentById(tenantId, shipmentId);
  }

  private async replaceSalesOrderItems(
    tenantId: string,
    salesOrderId: string,
    items: SalesOrderItemInput[],
    transaction: Parameters<SalesRepository['createSalesOrder']>[1]
  ) {
    for (const item of items) {
      const totals = this.calculateLineTotal(item);
      await this.salesRepository.createSalesOrderItem(
        {
          id: uuidv4(),
          tenant_id: tenantId,
          sales_order_id: salesOrderId,
          product_id: item.productId ?? null,
          product_variant_id: item.productVariantId ?? null,
          ordered_quantity: this.toDecimal(item.orderedQuantity),
          reserved_quantity: this.toDecimal(0),
          shipped_quantity: this.toDecimal(0),
          unit_price: this.toDecimal(item.unitPrice ?? 0),
          tax_amount: this.toDecimal(item.taxAmount ?? 0),
          discount_amount: this.toDecimal(item.discountAmount ?? 0),
          line_total: this.toDecimal(totals.total),
          notes: item.notes ?? null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        transaction
      );
    }
  }

  private async mustGetActiveCustomer(tenantId: string, customerId: string): Promise<Customer> {
    const customer = await this.salesRepository.findCustomerById(tenantId, customerId);
    if (!customer) {
      throw new AppError('Customer not found.', 404);
    }
    if (customer.status !== 'ACTIVE') {
      throw new AppError('Only active customers can be used for sales orders.', 400);
    }
    return customer;
  }

  private async resolveSalesOrderCustomerContext(
    tenantId: string,
    actorUserId: string,
    input: Pick<SalesOrderCreateInput, 'customerName' | 'selectedCustomerId' | 'saveAsCustomer' | 'customerDetails'>,
    transaction: DatabaseTransaction
  ) {
    const customerName = input.customerName.trim();
    if (!customerName) {
      throw new AppError('Customer name is required.', 400);
    }

    if (input.selectedCustomerId) {
      const customer = await this.mustGetActiveCustomer(tenantId, input.selectedCustomerId);
      return {
        customerId: customer.id,
        customerName: customer.name,
      };
    }

    if (!input.saveAsCustomer) {
      return {
        customerId: null,
        customerName,
      };
    }

    const customerId = uuidv4();
    const customerCode = await this.generateCustomerCode(tenantId, customerName, transaction);
    const details = input.customerDetails ?? {};

    await this.salesRepository.createCustomer(
      {
        id: customerId,
        tenant_id: tenantId,
        name: customerName,
        code: customerCode,
        email: details.email?.trim() || null,
        phone: details.phone?.trim() || null,
        contact_person: details.contactPerson?.trim() || null,
        tax_number: details.taxNumber?.trim() || null,
        address_line_1: details.addressLine1?.trim() || null,
        address_line_2: details.addressLine2?.trim() || null,
        city: details.city?.trim() || null,
        state: details.state?.trim() || null,
        postal_code: details.postalCode?.trim() || null,
        country: details.country?.trim() || null,
        status: 'ACTIVE',
        notes: details.notes?.trim() || null,
        created_by: actorUserId,
        updated_by: actorUserId,
        deleted_by: null,
      },
      transaction
    );

    return {
      customerId,
      customerName,
    };
  }

  private async generateCustomerCode(tenantId: string, customerName: string, transaction: DatabaseTransaction) {
    const seed =
      customerName
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '')
        .slice(0, 6) || 'CUST';

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = `${seed}-${Date.now().toString().slice(-6)}${attempt}`;
      const existing = await this.salesRepository.findCustomerByCode(tenantId, candidate, undefined, transaction);
      if (!existing) {
        return candidate;
      }
    }

    return `CUST-${uuidv4().slice(0, 8).toUpperCase()}`;
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

  private async mustGetSalesOrder(tenantId: string, salesOrderId: string): Promise<SalesOrder> {
    const order = await this.salesRepository.findSalesOrderById(tenantId, salesOrderId);
    if (!order) {
      throw new AppError('Sales order not found.', 404);
    }
    return order;
  }

  private async validateSalesItems(tenantId: string, items: SalesOrderItemInput[]) {
    for (const item of items) {
      const reference = await this.salesRepository.findSalesItemReference(tenantId, {
        productId: item.productId ?? null,
        productVariantId: item.productVariantId ?? null,
      });
      if (!reference) {
        throw new AppError('Sales order references an invalid product or variant.', 404);
      }
      if (!reference.isSellable || reference.productStatus !== 'ACTIVE') {
        throw new AppError('Only active sellable items can be added to sales orders.', 400);
      }
      if (reference.productType === 'SERVICE') {
        throw new AppError('Service products are not supported in this sales module flow.', 400);
      }
    }
  }

  private async recalculateSalesOrderStatus(
    tenantId: string,
    salesOrderId: string,
    currentStatus: SalesOrderStatus,
    transaction: Parameters<SalesRepository['findSalesOrderByIdForUpdate']>[2]
  ) {
    const items = await this.salesRepository.listSalesOrderItemsForUpdate(tenantId, salesOrderId, transaction);
    if (items.length === 0) {
      return currentStatus;
    }

    const fullyShipped = items.every((item) => Number(item.shipped_quantity) >= Number(item.ordered_quantity));
    if (fullyShipped) {
      return 'SHIPPED';
    }

    const anyShipped = items.some((item) => Number(item.shipped_quantity) > 0);
    if (anyShipped) {
      return 'PARTIALLY_SHIPPED';
    }

    const fullyReserved = items.every((item) => Number(item.reserved_quantity) >= Number(item.ordered_quantity));
    if (fullyReserved) {
      return 'RESERVED';
    }

    const anyReserved = items.some((item) => Number(item.reserved_quantity) > 0);
    if (anyReserved) {
      return 'PARTIALLY_RESERVED';
    }

    if (currentStatus === 'DRAFT' || currentStatus === 'CANCELLED') {
      return currentStatus;
    }

    return 'CONFIRMED';
  }

  private calculateLineTotal(item: SalesOrderItemInput) {
    const subtotal = item.orderedQuantity * (item.unitPrice ?? 0);
    return {
      subtotal,
      total: subtotal + (item.taxAmount ?? 0) - (item.discountAmount ?? 0),
    };
  }

  private calculateTotals(items: SalesOrderItemInput[]) {
    return items.reduce(
      (acc, item) => {
        const subtotal = item.orderedQuantity * (item.unitPrice ?? 0);
        acc.subtotal += subtotal;
        acc.tax += item.taxAmount ?? 0;
        acc.discount += item.discountAmount ?? 0;
        acc.total += subtotal + (item.taxAmount ?? 0) - (item.discountAmount ?? 0);
        return acc;
      },
      { subtotal: 0, tax: 0, discount: 0, total: 0 }
    );
  }

  private toSalesOrderSummary(order: SalesOrderListRow) {
    return {
      id: order.id,
      customerId: order.customer_id,
      customerName: order.customer_name,
      warehouseId: order.warehouse_id,
      warehouseName: order.warehouse_name,
      salesOrderNumber: order.sales_order_number,
      status: order.status,
      orderDate: order.order_date,
      expectedShipDate: order.expected_ship_date,
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

  private toSalesReservationSummary(reservation: SalesReservationListRow) {
    return {
      id: reservation.id,
      salesOrderId: reservation.sales_order_id,
      salesOrderNumber: reservation.sales_order_number,
      warehouseId: reservation.warehouse_id,
      warehouseName: reservation.warehouse_name,
      reservationNumber: reservation.reservation_number,
      reservationDate: reservation.reservation_date,
      status: reservation.status,
      notes: reservation.notes,
      createdAt: reservation.created_at,
      updatedAt: reservation.updated_at,
    };
  }

  private toSalesShipmentSummary(shipment: SalesShipmentListRow) {
    return {
      id: shipment.id,
      salesOrderId: shipment.sales_order_id,
      salesOrderNumber: shipment.sales_order_number,
      warehouseId: shipment.warehouse_id,
      warehouseName: shipment.warehouse_name,
      shipmentNumber: shipment.shipment_number,
      shipmentDate: shipment.shipment_date,
      status: shipment.status,
      notes: shipment.notes,
      createdAt: shipment.created_at,
      updatedAt: shipment.updated_at,
    };
  }

  private toDecimal(value: number) {
    return value.toFixed(4);
  }
}
