export const PAYMENT_TYPE_VALUES = ['PREPAID', 'POSTPAID', 'NOT_APPLICABLE'] as const;
export const PAYMENT_STATUS_VALUES = ['PAID', 'UNPAID', 'NOT_APPLICABLE'] as const;
export const PAYMENT_MODE_VALUES = ['UPI', 'CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'WALLET', 'NOT_APPLICABLE'] as const;

export type PaymentType = (typeof PAYMENT_TYPE_VALUES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];
export type PaymentMode = (typeof PAYMENT_MODE_VALUES)[number];
