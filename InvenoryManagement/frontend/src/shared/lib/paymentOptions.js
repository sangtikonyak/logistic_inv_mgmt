export const paymentTypeOptions = [
  { value: 'NOT_APPLICABLE', label: 'Not Applicable' },
  { value: 'PREPAID', label: 'Prepaid' },
  { value: 'POSTPAID', label: 'Postpaid' },
]

export const paymentStatusOptions = [
  { value: 'NOT_APPLICABLE', label: 'Not Applicable' },
  { value: 'PAID', label: 'Paid' },
  { value: 'UNPAID', label: 'Unpaid' },
]

export const paymentModeOptions = [
  { value: 'NOT_APPLICABLE', label: 'Not Applicable' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'WALLET', label: 'Wallet' },
]

export function formatPaymentValue(value) {
  if (!value) return 'Not Applicable'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}
