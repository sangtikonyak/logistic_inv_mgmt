import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { listCustomers } from '../api/salesApi.js'

function statusBadge(status) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-[#DCFCE7] text-[#15803D]'
    case 'INACTIVE':
      return 'bg-[#F3F4F6] text-[#374151]'
    default:
      return 'bg-[#FEE2E2] text-[#B91C1C]'
  }
}

const initialFilters = {
  search: '',
  status: '',
  sortBy: 'created_at',
  sortDir: 'DESC',
}

export function CustomerListPage() {
  const { can } = usePermissions()
  const canEdit = can('CUSTOMERS', 'CREATE') || can('CUSTOMERS', 'UPDATE')
  const [customers, setCustomers] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    listCustomers({ limit: 100, ...filters })
      .then((response) => setCustomers(response.data?.items ?? response.data ?? []))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false))
  }, [filters])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  function resetFilters() {
    setFilters(initialFilters)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#111827]">Customers</h2>
          <p className="mt-1 text-sm text-[#6B7280]">Manage your customer accounts and contact details.</p>
        </div>
        {canEdit && (
          <Link
            to="/app/sales/customers/new"
            className="inline-flex items-center rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#16A34A]"
          >
            Add Customer
          </Link>
        )}
      </div>

      <div className="grid gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Search customer, contact, city, country"
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/10"
        />
        <select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/10"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select
          name="sortBy"
          value={filters.sortBy}
          onChange={handleFilterChange}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/10"
        >
          <option value="created_at">Created At</option>
          <option value="updated_at">Updated At</option>
          <option value="name">Name</option>
          <option value="code">Code</option>
        </select>
        <select
          name="sortDir"
          value={filters.sortDir}
          onChange={handleFilterChange}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/10"
        >
          <option value="DESC">Newest First</option>
          <option value="ASC">Oldest First</option>
        </select>
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-sm font-semibold text-[#374151] transition hover:bg-white"
        >
          Reset Filters
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-[#E5E7EB] border-l-4 border-l-[#EF4444] bg-[#FFF1F2] px-4 py-3 text-sm font-medium text-[#B91C1C]">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-[#E5E7EB] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {['Code', 'Name', 'Status', 'Contact', 'Email', 'Actions'].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[#6B7280]">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[#6B7280]">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                    <td className="px-5 py-3.5 font-mono text-xs text-[#6B7280]">{customer.code}</td>
                    <td className="px-5 py-3.5 font-medium text-[#111827]">{customer.name}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(customer.status)}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#6B7280]">{customer.contactPerson || '-'}</td>
                    <td className="px-5 py-3.5 text-[#6B7280]">{customer.email || '-'}</td>
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/app/sales/customers/${customer.id}`}
                        className="rounded-md bg-[#3B82F6] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2563EB]"
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
