import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPicklists } from '../api/warehousesApi.js'
import { format } from 'date-fns'

export function PicklistListPage() {
  const [picklists, setPicklists] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  async function load() {
    try {
      setIsLoading(true)
      const r = await listPicklists({ page: 1, limit: 50 })
      setPicklists(r.data?.items ?? [])
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
        <h2 className="text-lg font-semibold text-[#111827]">Warehouse Picklists</h2>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <th className="px-5 py-3 font-semibold text-[#9CA3AF] uppercase tracking-widest text-[11px]">Number</th>
              <th className="px-5 py-3 font-semibold text-[#9CA3AF] uppercase tracking-widest text-[11px]">Status</th>
              <th className="px-5 py-3 font-semibold text-[#9CA3AF] uppercase tracking-widest text-[11px]">Assigned To</th>
              <th className="px-5 py-3 font-semibold text-[#9CA3AF] uppercase tracking-widest text-[11px]">Created At</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {isLoading && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-[#6B7280]">Loading...</td></tr>
            )}
            {!isLoading && picklists.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-[#6B7280]">No picklists found.</td></tr>
            )}
            {picklists.map((p) => (
              <tr key={p.id} className="hover:bg-[#F9FAFB]">
                <td className="px-5 py-4 font-medium text-[#111827]">{p.picklistNumber}</td>
                <td className="px-5 py-4">
                  <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-[#F3F4F6] text-[#374151]">
                    {p.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-[#6B7280]">{p.assigned_to || 'Unassigned'}</td>
                <td className="px-5 py-4 text-[#6B7280]">{format(new Date(p.created_at), 'PPP')}</td>
                <td className="px-5 py-4 text-right">
                  <Link to={`/app/warehouses/picklists/${p.id}`} className="text-[#3B82F6] font-medium hover:underline">
                    View Tasks
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
