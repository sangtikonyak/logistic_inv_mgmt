import { NavLink, Outlet } from 'react-router-dom'

const replenishmentNavItems = [{ label: 'Demand Snapshots', to: '/app/replenishment/demand-snapshots' }]

function linkClass({ isActive }) {
  return `rounded-lg px-4 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-[#111827] text-white'
      : 'border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]'
  }`
}

export function ReplenishmentModuleLayout() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">Replenishment</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#111827]">Demand Planning</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Monitor demand velocity by product and warehouse, and refresh snapshot metrics on demand.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {replenishmentNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </section>
      <Outlet />
    </div>
  )
}
