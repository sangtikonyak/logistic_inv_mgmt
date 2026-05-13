import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../../common/exceptions/app-error';
import { Queryable } from '../../../database/database.types';
import { UnitOfWork } from '../../../database/unit-of-work';
import { ActivityService } from '../../activity/services/activity.service';
import { InventoryRepository } from '../../inventory/repositories/inventory.repository';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import {
  BinCreateInput,
  BinUpdateInput,
  Warehouse,
  WarehouseBin,
  WarehouseCreateInput,
  WarehouseListFilters,
  WarehouseUpdateInput,
  WarehouseZone,
  ZoneCreateInput,
  ZoneUpdateInput,
} from '../types/warehouse.types';

export class WarehouseService {
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

  async createWarehouse(tenantId: string, actorUserId: string, input: WarehouseCreateInput) {
    const existing = await this.warehouseRepository.findWarehouseByCode(tenantId, input.code);
    if (existing) {
      throw new AppError('Warehouse code already exists.', 409);
    }

    const existingCount = await this.warehouseRepository.countActiveWarehouses(tenantId);
    const shouldBeDefault = input.isDefault === true || existingCount === 0;
    const warehouseId = uuidv4();

    await this.unitOfWork.execute(async (transaction) => {
      if (shouldBeDefault) {
        await this.warehouseRepository.clearDefaultWarehouse(tenantId, transaction);
      }

      await this.warehouseRepository.createWarehouse(
        {
          id: warehouseId,
          tenant_id: tenantId,
          name: input.name,
          code: input.code,
          status: input.status,
          is_default: shouldBeDefault ? 1 : 0,
          address_line_1: input.addressLine1 ?? null,
          address_line_2: input.addressLine2 ?? null,
          city: input.city ?? null,
          state: input.state ?? null,
          postal_code: input.postalCode ?? null,
          country: input.country ?? null,
          latitude: this.toDecimalString(input.latitude),
          longitude: this.toDecimalString(input.longitude),
          created_by: actorUserId,
          updated_by: actorUserId,
          deleted_by: null,
        },
        transaction
      );
    });

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'CREATE',
      module: 'WAREHOUSE',
      description: `Created warehouse: ${input.name} (${input.code})`,
      metadata: { warehouseId, code: input.code },
    });

    const warehouse = await this.mustGetWarehouse(tenantId, warehouseId);
    return this.toWarehouseResponse(warehouse);
  }

  async updateWarehouse(
    tenantId: string,
    actorUserId: string,
    warehouseId: string,
    input: WarehouseUpdateInput
  ) {
    const existing = await this.mustGetWarehouse(tenantId, warehouseId);
    const nextCode = input.code ?? existing.code;

    const duplicate = await this.warehouseRepository.findWarehouseByCode(tenantId, nextCode, warehouseId);
    if (duplicate) {
      throw new AppError('Warehouse code already exists.', 409);
    }

    if (input.isDefault === false && existing.is_default === 1) {
      throw new AppError('Default warehouse cannot be unset directly. Set another warehouse as default instead.', 400);
    }

    const shouldBeDefault = input.isDefault ?? existing.is_default === 1;

    await this.unitOfWork.execute(async (transaction) => {
      if (shouldBeDefault) {
        await this.warehouseRepository.clearDefaultWarehouse(tenantId, transaction);
      }

      await this.warehouseRepository.updateWarehouse(
        tenantId,
        warehouseId,
        {
          name: input.name ?? existing.name,
          code: nextCode,
          status: input.status ?? existing.status,
          is_default: shouldBeDefault ? 1 : 0,
          address_line_1: input.addressLine1 === undefined ? existing.address_line_1 : input.addressLine1 ?? null,
          address_line_2: input.addressLine2 === undefined ? existing.address_line_2 : input.addressLine2 ?? null,
          city: input.city === undefined ? existing.city : input.city ?? null,
          state: input.state === undefined ? existing.state : input.state ?? null,
          postal_code: input.postalCode === undefined ? existing.postal_code : input.postalCode ?? null,
          country: input.country === undefined ? existing.country : input.country ?? null,
          latitude:
            input.latitude === undefined
              ? existing.latitude
              : this.toDecimalString(input.latitude),
          longitude:
            input.longitude === undefined
              ? existing.longitude
              : this.toDecimalString(input.longitude),
          updated_by: actorUserId,
        },
        transaction
      );
    });

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'WAREHOUSE',
      description: `Updated warehouse: ${existing.name}`,
      metadata: { warehouseId, updates: input },
    });

    return this.toWarehouseResponse(await this.mustGetWarehouse(tenantId, warehouseId));
  }

  async deleteWarehouse(tenantId: string, actorUserId: string, warehouseId: string) {
    const existing = await this.mustGetWarehouse(tenantId, warehouseId);

    if (existing.is_default === 1) {
      throw new AppError('Default warehouse cannot be deleted. Set another warehouse as default first.', 400);
    }

    const stockCount = await this.inventoryRepository.countStocksInWarehouse(tenantId, warehouseId);
    if (stockCount > 0) {
      throw new AppError('Warehouse cannot be deleted while stock exists.', 409);
    }

    await this.warehouseRepository.softDeleteWarehouse(tenantId, warehouseId, actorUserId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'DELETE',
      module: 'WAREHOUSE',
      description: `Deleted warehouse: ${existing.name}`,
      metadata: { warehouseId },
    });

    return { warehouseId };
  }

  async getWarehouseById(tenantId: string, warehouseId: string) {
    return this.toWarehouseResponse(await this.mustGetWarehouse(tenantId, warehouseId));
  }

  async listWarehouses(tenantId: string, filters: WarehouseListFilters) {
    const [items, total] = await Promise.all([
      this.warehouseRepository.listWarehouses(tenantId, filters),
      this.warehouseRepository.countWarehouses(tenantId, filters),
    ]);

    return {
      items: items.map((item) => this.toWarehouseResponse(item)),
      pagination: this.toPagination(filters.page, filters.limit, total),
    };
  }

  async setDefaultWarehouse(tenantId: string, actorUserId: string, warehouseId: string) {
    await this.mustGetWarehouse(tenantId, warehouseId);

    await this.unitOfWork.execute(async (transaction) => {
      await this.warehouseRepository.clearDefaultWarehouse(tenantId, transaction);
      await this.warehouseRepository.setDefaultWarehouse(tenantId, warehouseId, actorUserId, transaction);
    });

    return this.toWarehouseResponse(await this.mustGetWarehouse(tenantId, warehouseId));
  }

  async listZones(tenantId: string, warehouseId: string) {
    await this.mustGetWarehouse(tenantId, warehouseId);
    const zones = await this.warehouseRepository.listZonesByWarehouse(tenantId, warehouseId);
    return zones.map((zone) => this.toZoneResponse(zone));
  }

  async createZone(tenantId: string, actorUserId: string, warehouseId: string, input: ZoneCreateInput) {
    await this.mustGetWarehouse(tenantId, warehouseId);
    const duplicate = await this.warehouseRepository.findZoneByCode(tenantId, warehouseId, input.code);
    if (duplicate) {
      throw new AppError('Zone code already exists in this warehouse.', 409);
    }

    const zoneId = uuidv4();
    await this.warehouseRepository.createZone({
      id: zoneId,
      tenant_id: tenantId,
      warehouse_id: warehouseId,
      name: input.name,
      code: input.code,
      sort_order: input.sortOrder ?? 0,
      created_by: actorUserId,
      updated_by: actorUserId,
      deleted_by: null,
    });

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'CREATE',
      module: 'WAREHOUSE',
      description: `Created zone: ${input.name} (${input.code})`,
      metadata: { zoneId, code: input.code, warehouseId },
    });

    return this.toZoneResponse(await this.mustGetZone(tenantId, zoneId));
  }

  async updateZone(tenantId: string, actorUserId: string, zoneId: string, input: ZoneUpdateInput) {
    const existing = await this.mustGetZone(tenantId, zoneId);
    const nextCode = input.code ?? existing.code;
    const duplicate = await this.warehouseRepository.findZoneByCode(
      tenantId,
      existing.warehouse_id,
      nextCode,
      zoneId
    );
    if (duplicate) {
      throw new AppError('Zone code already exists in this warehouse.', 409);
    }

    await this.warehouseRepository.updateZone(tenantId, zoneId, {
      name: input.name ?? existing.name,
      code: nextCode,
      sort_order: input.sortOrder ?? existing.sort_order,
      updated_by: actorUserId,
    });

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'WAREHOUSE',
      description: `Updated zone: ${existing.name}`,
      metadata: { zoneId, updates: input },
    });

    return this.toZoneResponse(await this.mustGetZone(tenantId, zoneId));
  }

  async deleteZone(tenantId: string, actorUserId: string, zoneId: string) {
    const existing = await this.mustGetZone(tenantId, zoneId);
    const stockCount = await this.inventoryRepository.countStocksInZone(tenantId, zoneId);
    if (stockCount > 0) {
      throw new AppError('Zone cannot be deleted while stock exists.', 409);
    }

    const bins = await this.warehouseRepository.listBinsByZone(tenantId, zoneId);
    if (bins.length > 0) {
      throw new AppError('Zone cannot be deleted while active bins exist.', 409);
    }

    await this.warehouseRepository.softDeleteZone(tenantId, zoneId, actorUserId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'DELETE',
      module: 'WAREHOUSE',
      description: `Deleted zone: ${existing.name}`,
      metadata: { zoneId },
    });

    return { zoneId };
  }

  async listBins(tenantId: string, zoneId: string) {
    await this.mustGetZone(tenantId, zoneId);
    const bins = await this.warehouseRepository.listBinsByZone(tenantId, zoneId);
    return bins.map((bin) => this.toBinResponse(bin));
  }

  async createBin(tenantId: string, actorUserId: string, zoneId: string, input: BinCreateInput) {
    const zone = await this.mustGetZone(tenantId, zoneId);
    const duplicate = await this.warehouseRepository.findBinByCode(tenantId, zone.warehouse_id, input.code);
    if (duplicate) {
      throw new AppError('Bin code already exists in this warehouse.', 409);
    }

    const binId = uuidv4();
    await this.warehouseRepository.createBin({
      id: binId,
      tenant_id: tenantId,
      warehouse_id: zone.warehouse_id,
      zone_id: zoneId,
      name: input.name,
      code: input.code,
      sort_order: input.sortOrder ?? 0,
      is_pickable: input.isPickable === false ? 0 : 1,
      is_receiving: input.isReceiving ? 1 : 0,
      is_dispatch: input.isDispatch ? 1 : 0,
      created_by: actorUserId,
      updated_by: actorUserId,
      deleted_by: null,
    });

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'CREATE',
      module: 'WAREHOUSE',
      description: `Created bin: ${input.name} (${input.code})`,
      metadata: { binId, code: input.code, zoneId, warehouseId: zone.warehouse_id },
    });

    return this.toBinResponse(await this.mustGetBin(tenantId, binId));
  }

  async updateBin(tenantId: string, actorUserId: string, binId: string, input: BinUpdateInput) {
    const existing = await this.mustGetBin(tenantId, binId);
    const nextCode = input.code ?? existing.code;
    const duplicate = await this.warehouseRepository.findBinByCode(
      tenantId,
      existing.warehouse_id,
      nextCode,
      binId
    );
    if (duplicate) {
      throw new AppError('Bin code already exists in this warehouse.', 409);
    }

    await this.warehouseRepository.updateBin(tenantId, binId, {
      name: input.name ?? existing.name,
      code: nextCode,
      sort_order: input.sortOrder ?? existing.sort_order,
      is_pickable: input.isPickable === undefined ? existing.is_pickable : input.isPickable ? 1 : 0,
      is_receiving: input.isReceiving === undefined ? existing.is_receiving : input.isReceiving ? 1 : 0,
      is_dispatch: input.isDispatch === undefined ? existing.is_dispatch : input.isDispatch ? 1 : 0,
      updated_by: actorUserId,
    });

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'UPDATE',
      module: 'WAREHOUSE',
      description: `Updated bin: ${existing.name}`,
      metadata: { binId, updates: input },
    });

    return this.toBinResponse(await this.mustGetBin(tenantId, binId));
  }

  async deleteBin(tenantId: string, actorUserId: string, binId: string) {
    const existing = await this.mustGetBin(tenantId, binId);
    const stockCount = await this.inventoryRepository.countStocksInBin(tenantId, binId);
    if (stockCount > 0) {
      throw new AppError('Bin cannot be deleted while stock exists.', 409);
    }

    await this.warehouseRepository.softDeleteBin(tenantId, binId, actorUserId);

    await this.activityService.logActivity({
      tenantId,
      userId: actorUserId,
      actionType: 'DELETE',
      module: 'WAREHOUSE',
      description: `Deleted bin: ${existing.name}`,
      metadata: { binId },
    });

    return { binId };
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

  private toWarehouseResponse(warehouse: Warehouse) {
    return {
      id: warehouse.id,
      tenantId: warehouse.tenant_id,
      name: warehouse.name,
      code: warehouse.code,
      status: warehouse.status,
      isDefault: warehouse.is_default === 1,
      addressLine1: warehouse.address_line_1,
      addressLine2: warehouse.address_line_2,
      city: warehouse.city,
      state: warehouse.state,
      postalCode: warehouse.postal_code,
      country: warehouse.country,
      latitude: warehouse.latitude === null ? null : Number(warehouse.latitude),
      longitude: warehouse.longitude === null ? null : Number(warehouse.longitude),
      createdAt: warehouse.created_at,
      updatedAt: warehouse.updated_at,
    };
  }

  private toZoneResponse(zone: WarehouseZone) {
    return {
      id: zone.id,
      tenantId: zone.tenant_id,
      warehouseId: zone.warehouse_id,
      name: zone.name,
      code: zone.code,
      sortOrder: zone.sort_order,
      createdAt: zone.created_at,
      updatedAt: zone.updated_at,
    };
  }

  private toBinResponse(bin: WarehouseBin) {
    return {
      id: bin.id,
      tenantId: bin.tenant_id,
      warehouseId: bin.warehouse_id,
      zoneId: bin.zone_id,
      name: bin.name,
      code: bin.code,
      sortOrder: bin.sort_order,
      isPickable: bin.is_pickable === 1,
      isReceiving: bin.is_receiving === 1,
      isDispatch: bin.is_dispatch === 1,
      createdAt: bin.created_at,
      updatedAt: bin.updated_at,
    };
  }

  private toPagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  private toDecimalString(value: number | null | undefined) {
    return value === null || value === undefined ? null : value.toFixed(7);
  }
}
