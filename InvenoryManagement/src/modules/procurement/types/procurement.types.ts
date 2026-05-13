export type ProcurementRequisitionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ProcurementRequisition {
  id: string;
  tenant_id: string;
  requisition_number: string;
  warehouse_id: string;
  requested_by: string;
  status: ProcurementRequisitionStatus;
  required_by_date: Date | null;
  notes: string | null;
  submitted_at: Date | null;
  approved_at: Date | null;
  rejected_at: Date | null;
  cancelled_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProcurementRequisitionItem {
  id: string;
  tenant_id: string;
  procurement_requisition_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  requested_quantity: string;
  approved_quantity: string;
  estimated_unit_cost: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProcurementRequisitionItemInput {
  productId?: string;
  productVariantId?: string;
  requestedQuantity: number;
  estimatedUnitCost?: number;
  notes?: string | null;
}

export interface ProcurementRequisitionCreateInput {
  warehouseId: string;
  requiredByDate?: string | null;
  notes?: string | null;
  items: ProcurementRequisitionItemInput[];
}

export interface ProcurementRequisitionListFilters {
  status?: ProcurementRequisitionStatus;
  warehouseId?: string;
  search?: string;
  page: number;
  limit: number;
}

export interface ProcurementRequisitionListRow extends ProcurementRequisition {
  warehouse_name: string;
  requested_by_name: string;
}

export interface ProcurementRequisitionItemDetailRow extends ProcurementRequisitionItem {
  product_name: string | null;
  variant_name: string | null;
  sku: string | null;
}
