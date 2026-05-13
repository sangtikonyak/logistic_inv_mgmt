import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { listSuppliers } from '../api/purchaseApi.js'

export function SupplierListPage() {
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('SUPPLIERS', 'CREATE') || can('SUPPLIERS', 'UPDATE')
  const [suppliers, setSuppliers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchSuppliers() {
      try {
        setIsLoading(true)
        const response = await listSuppliers()
        setSuppliers(response.data?.items ?? response.data ?? [])
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSuppliers()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink)]">Manage Suppliers</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">View and manage the source vendors for your purchase orders.</p>
        </div>
        {canEdit ? (
          <Link
            to="/app/purchases/suppliers/new"
            className="inline-flex items-center justify-center rounded-[1rem] bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] transition"
          >
            Add supplier
          </Link>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-[1.5rem] border border-[var(--line)] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Code</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Name</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Status</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Contact</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Added</th>
                <th className="px-6 py-4 font-semibold text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[var(--muted)]">Loading suppliers...</td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[var(--muted)]">No suppliers found.</td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-[var(--line)] last:border-b-0 hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-[var(--ink)]">{supplier.code}</td>
                    <td className="px-6 py-4 text-[var(--ink)]">{supplier.name}</td>
                    <td className="px-6 py-4">
                      {supplier.status === 'ACTIVE' ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Active</span>
                      ) : supplier.status === 'INACTIVE' ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Inactive</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">Archived</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[var(--muted)]">
                      {supplier.contactPerson ? supplier.contactPerson : '-'}
                    </td>
                    <td className="px-6 py-4 text-[var(--muted)]">
                      {supplier.createdAt ? format(new Date(supplier.createdAt), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/app/purchases/suppliers/${supplier.id}`}
                        className="text-sm font-semibold text-[var(--accent)] hover:text-[#1F2937]"
                      >
                        {canEdit ? 'Edit' : 'View'}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
