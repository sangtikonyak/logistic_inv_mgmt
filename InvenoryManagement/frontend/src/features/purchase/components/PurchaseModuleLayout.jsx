import { NavLink, Outlet } from 'react-router-dom'

const purchaseNavItems = [
  { label: 'Requisitions',    to: '/app/purchases/requisitions' },
  { label: 'Purchase Orders', to: '/app/purchases/orders' },
  { label: 'Receipts',        to: '/app/purchases/receipts' },
  { label: 'Suppliers',       to: '/app/purchases/suppliers' },
]

function linkClass({ isActive }) {
  return `rounded-lg px-4 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-[#111827] text-white'
      : 'border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]'
  }`
}

export function PurchaseModuleLayout() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">Purchasing</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#111827]">Supplier & Orders</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Manage suppliers, issue purchase orders, and track inbound receiving flows.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {purchaseNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>{item.label}</NavLink>
          ))}
        </nav>
      </section>
      <Outlet />
    </div>
  )
}
