import { useEffect, useMemo, useState } from 'react'
import { getPurchaseReceipt, listPurchaseReceipts } from '../../purchase/api/purchaseApi.js'

export function ContainerTracePage() {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true)
        const receiptList = await listPurchaseReceipts({ page: 1, limit: 30 })
        const receipts = receiptList.data?.items ?? []
        const detailResponses = await Promise.all(receipts.map((r) => getPurchaseReceipt(r.id)))
        const lines = detailResponses.flatMap((response) => {
          const receipt = response.data
          return (receipt.items ?? [])
            .filter((line) => line.containerCode)
            .map((line) => ({
              receiptNumber: receipt.receiptNumber,
              receiptDate: receipt.receiptDate,
              warehouseName: receipt.warehouseName,
              supplierName: receipt.supplierName,
              containerCode: line.containerCode,
              lotNumber: line.lotNumber,
              productName: line.variantName ? `${line.productName} - ${line.variantName}` : line.productName,
              sku: line.sku,
              quantity: line.acceptedQuantity ?? line.receivedQuantity ?? 0,
            }))
        })
        setRows(lines)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.trim().toLowerCase()
    return rows.filter((r) =>
      [r.containerCode, r.lotNumber, r.productName, r.sku, r.receiptNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }, [rows, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink)]">Container Traceability</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Map each item line to its inbound box/container for downstream picking and audit.</p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search container, lot, SKU..."
          className="w-72 rounded-[0.9rem] border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none"
        />
      </div>

      {error ? <div className="rounded-[1rem] border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      <div className="overflow-x-auto rounded-[1.5rem] border border-[var(--line)] bg-white shadow-sm">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)]">
              {['Container', 'Item', 'SKU', 'Lot', 'Qty', 'Warehouse', 'Supplier', 'Receipt'].map((h) => (
                <th key={h} className="px-5 py-4 font-semibold text-[var(--muted)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-[var(--muted)]">Loading container trace...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-[var(--muted)]">No containerized receipt lines found.</td></tr>
            ) : (
              filtered.map((line, index) => (
                <tr key={`${line.containerCode}-${line.receiptNumber}-${index}`} className="border-b border-[var(--line)] last:border-b-0">
                  <td className="px-5 py-4 font-semibold text-[var(--ink)]">{line.containerCode}</td>
                  <td className="px-5 py-4 text-[var(--ink)]">{line.productName}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{line.sku || '-'}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{line.lotNumber || '-'}</td>
                  <td className="px-5 py-4 text-[var(--ink)]">{line.quantity}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{line.warehouseName}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{line.supplierName}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{line.receiptNumber}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
