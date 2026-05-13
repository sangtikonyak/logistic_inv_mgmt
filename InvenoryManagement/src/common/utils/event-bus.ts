import { EventEmitter } from 'events';

/**
 * Enterprise Event Bus
 * 
 * Provides a centralized event system for the application.
 * In a distributed production environment, this would be backed by 
 * Redis (BullMQ), RabbitMQ, or Kafka.
 * 
 * For this refactor, we use a robust internal EventEmitter to 
 * decouple WMS workflows.
 */
class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    // Increase limit for enterprise-scale listeners
    this.setMaxListeners(100);
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Type-safe emit wrapper
   */
  public dispatch<T>(event: string, payload: T): boolean {
    console.log(`[EventBus] Dispatching event: ${event}`, { 
      timestamp: new Date().toISOString(),
      payload: this.sanitizePayload(payload)
    });
    return this.emit(event, payload);
  }

  private sanitizePayload(payload: any): any {
    // Prevent logging sensitive data or massive objects
    if (!payload) return payload;
    const sanitized = { ...payload };
    if (sanitized.transaction) delete sanitized.transaction;
    return sanitized;
  }
}

export const eventBus = EventBus.getInstance();

export const WMS_EVENTS = {
  SHIPMENT_ALLOCATED: 'shipment.allocated',
  SHIPMENT_PICKED: 'shipment.picked',
  SHIPMENT_PACKED: 'shipment.packed',
  SHIPMENT_DISPATCHED: 'shipment.dispatched',
  PICKLIST_COMPLETED: 'picklist.completed',
  GOODS_RECEIVED: 'goods.received',
  PUTAWAY_COMPLETED: 'putaway.completed',
};
