import { useEffect, useState } from 'react'
import { listCountPlans } from '../api/inventoryApi.js'
import { format } from 'date-fns'

export function CountPlanListPage() {
  const [plans, setPlans] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  async function load() {
    try {
      setIsLoading(true)
      const r = await listCountPlans({ page: 1, limit: 50 })
      setPlans(r.data?.items ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#111827]">Inventory Count Plans</h2>
        <button className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white hover:bg-[#374151] transition">
          New Plan
        </button>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <th className="px-5 py-3 font-semibold text-[#9CA3AF] uppercase tracking-widest text-[11px]">Number</th>
              <th className="px-5 py-3 font-semibold text-[#9CA3AF] uppercase tracking-widest text-[11px]">Name</th>
              <th className="px-5 py-3 font-semibold text-[#9CA3AF] uppercase tracking-widest text-[11px]">Type</th>
              <th className="px-5 py-3 font-semibold text-[#9CA3AF] uppercase tracking-widest text-[11px]">Status</th>
              <th className="px-5 py-3 font-semibold text-[#9CA3AF] uppercase tracking-widest text-[11px]">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {isLoading && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-[#6B7280]">Loading...</td></tr>
            )}
            {!isLoading && plans.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-[#6B7280]">No count plans found.</td></tr>
            )}
            {plans.map((p) => (
              <tr key={p.id} className="hover:bg-[#F9FAFB]">
                <td className="px-5 py-4 font-medium text-[#111827]">{p.planNumber}</td>
                <td className="px-5 py-4 text-[#374151]">{p.name}</td>
                <td className="px-5 py-4 text-[#6B7280]">{p.countType}</td>
                <td className="px-5 py-4">
                  <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-[#F3F4F6] text-[#374151]">
                    {p.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-[#6B7280]">{format(new Date(p.created_at), 'PPP')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
