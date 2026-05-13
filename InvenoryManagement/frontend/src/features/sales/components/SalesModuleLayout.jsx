import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { label: 'Sales Orders',  to: '/app/sales/orders' },
  { label: 'Reservations',  to: '/app/sales/reservations' },
  { label: 'Shipments',     to: '/app/sales/shipments' },
  { label: 'Customers',     to: '/app/sales/customers' },
]

function linkClass({ isActive }) {
  return `rounded-lg px-4 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-[#111827] text-white'
      : 'border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]'
  }`
}

export function SalesModuleLayout() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">Sales</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#111827]">Sales Workspace</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Manage customers, sales orders, reservations, and outbound shipments.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>{item.label}</NavLink>
          ))}
        </nav>
      </section>
      <Outlet />
    </div>
  )
}
