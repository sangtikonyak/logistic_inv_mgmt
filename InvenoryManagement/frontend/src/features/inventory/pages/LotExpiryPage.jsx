import { useEffect, useMemo, useState } from 'react'
import { listPurchaseReceipts, getPurchaseReceipt } from '../../purchase/api/purchaseApi.js'

function daysUntil(dateValue) {
  if (!dateValue) return null
  const today = new Date()
  const target = new Date(dateValue)
  const ms = target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export function LotExpiryPage() {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [thresholdDays, setThresholdDays] = useState(30)

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true)
        const receiptList = await listPurchaseReceipts({ page: 1, limit: 25, status: 'POSTED' })
        const receipts = receiptList.data?.items ?? []
        const detailResponses = await Promise.all(receipts.map((r) => getPurchaseReceipt(r.id)))
        const lines = detailResponses.flatMap((response) => {
          const receipt = response.data
          return (receipt.items ?? []).map((line) => ({
            receiptNumber: receipt.receiptNumber,
            receiptDate: receipt.receiptDate,
            productName: line.variantName ? `${line.productName} - ${line.variantName}` : line.productName,
            sku: line.sku,
            lotNumber: line.lotNumber,
            expiryDate: line.expiryDate,
            acceptedQuantity: line.acceptedQuantity ?? line.receivedQuantity ?? 0,
            containerCode: line.containerCode,
          }))
        })
        setRows(lines.filter((line) => line.lotNumber || line.expiryDate))
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((line) => {
      const d = daysUntil(line.expiryDate)
      return d !== null && d <= thresholdDays
    })
  }, [rows, thresholdDays])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink)]">Lot Expiry Control</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Track expiring lots from posted receipts and prioritize FEFO dispatch.</p>
        </div>
        <label className="flex items-center gap-2 rounded-[0.9rem] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--muted)]">
          Horizon (days)
          <input type="number" value={thresholdDays} onChange={(e) => setThresholdDays(Number(e.target.value || 0))} className="w-16 rounded border border-[var(--line)] px-2 py-1 text-sm text-[var(--ink)] outline-none" />
        </label>
      </div>

      {error ? <div className="rounded-[1rem] border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      <div className="overflow-x-auto rounded-[1.5rem] border border-[var(--line)] bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)]">
              {['Item', 'SKU', 'Lot', 'Expiry', 'Days Left', 'Qty', 'Container', 'Receipt'].map((h) => (
                <th key={h} className="px-5 py-4 font-semibold text-[var(--muted)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-[var(--muted)]">Loading expiry data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-[var(--muted)]">No lots expiring in selected horizon.</td></tr>
            ) : (
              filtered.map((line, index) => {
                const d = daysUntil(line.expiryDate)
                return (
                  <tr key={`${line.receiptNumber}-${line.lotNumber}-${index}`} className="border-b border-[var(--line)] last:border-b-0">
                    <td className="px-5 py-4 font-medium text-[var(--ink)]">{line.productName}</td>
                    <td className="px-5 py-4 text-[var(--muted)]">{line.sku || '-'}</td>
                    <td className="px-5 py-4 text-[var(--ink)]">{line.lotNumber || '-'}</td>
                    <td className="px-5 py-4 text-[var(--ink)]">{line.expiryDate ? new Date(line.expiryDate).toLocaleDateString() : '-'}</td>
                    <td className={`px-5 py-4 font-semibold ${d <= 0 ? 'text-rose-700' : d <= 7 ? 'text-amber-700' : 'text-[var(--ink)]'}`}>{d ?? '-'}</td>
                    <td className="px-5 py-4 text-[var(--ink)]">{line.acceptedQuantity}</td>
                    <td className="px-5 py-4 text-[var(--muted)]">{line.containerCode || '-'}</td>
                    <td className="px-5 py-4 text-[var(--muted)]">{line.receiptNumber}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
