import { eventBus, WMS_EVENTS } from '../../../common/utils/event-bus';
import { WmsExecutionService } from '../services/wms-execution.service';
import { UnitOfWork } from '../../../database/unit-of-work';

export class WmsSubscriber {
  constructor(
    private readonly wmsService: WmsExecutionService,
    private readonly unitOfWork: UnitOfWork
  ) {}

  public init() {
    eventBus.on(WMS_EVENTS.SHIPMENT_ALLOCATED, this.handleShipmentAllocated.bind(this));
    eventBus.on(WMS_EVENTS.GOODS_RECEIVED, this.handleGoodsReceived.bind(this));
    console.log('[WMS] Subscriber initialized');
  }

  private async handleShipmentAllocated(payload: { 
    tenantId: string; 
    shipmentId: string; 
    actorUserId: string 
  }) {
    try {
      console.log(`[WMS] Processing allocation for shipment: ${payload.shipmentId}`);
      
      await this.unitOfWork.execute(async (transaction) => {
        await this.wmsService.generatePicklistForShipment(
          payload.tenantId,
          payload.shipmentId,
          payload.actorUserId,
          transaction
        );
      });
      
    } catch (error) {
      console.error(`[WMS] Failed to generate picklist for shipment ${payload.shipmentId}:`, error);
      // In a production system, we would push to a Dead Letter Queue or Retry Queue here.
    }
  }

  private async handleGoodsReceived(payload: {
    tenantId: string;
    receiptId: string;
    actorUserId: string;
  }) {
    try {
      console.log(`[WMS] Processing putaway for goods receipt: ${payload.receiptId}`);
      
      await this.unitOfWork.execute(async (transaction) => {
        await this.wmsService.generatePutawayTaskForReceipt(
          payload.tenantId,
          payload.receiptId,
          payload.actorUserId,
          transaction
        );
      });
      
    } catch (error) {
      console.error(`[WMS] Failed to generate putaway task for receipt ${payload.receiptId}:`, error);
    }
  }
}
