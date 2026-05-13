import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider.jsx'
import { formatRoleLabel, usePermissions } from '../../shared/lib/permissions.js'

const navigationItems = [
  { label: 'Dashboard',  to: '/app/dashboard',  section: 'Workspace', code: 'DB' },
  {
    label: 'Products', to: '/app/products', section: 'Workspace', code: 'PR',
    children: [
      { label: 'All Products',   to: '/app/products/list',          code: 'LP' },
      { label: 'Add Product',    to: '/app/products/new',           code: 'NP' },
      { label: 'Categories',     to: '/app/products/categories',    code: 'CT' },
      { label: 'Units',          to: '/app/products/units',         code: 'UN' },
      { label: 'Custom Fields',  to: '/app/products/custom-fields', code: 'CF' },
    ],
  },
  { label: 'Warehouses', to: '/app/warehouses', section: 'Workspace', code: 'WH' },
  { label: 'Inventory',  to: '/app/inventory',  section: 'Operations', code: 'IN' },
  {
    label: 'Purchases', to: '/app/purchases', section: 'Operations', code: 'PU',
    children: [
      { label: 'Suppliers',        to: '/app/purchases/suppliers', code: 'SU' },
      { label: 'Requisitions',     to: '/app/purchases/requisitions', code: 'RQ' },
      { label: 'Purchase Orders',  to: '/app/purchases/orders',   code: 'PO' },
      { label: 'Receipts',         to: '/app/purchases/receipts', code: 'RC' },
    ],
  },
  { label: 'Sales', to: '/app/sales', section: 'Operations', code: 'SA',
    children: [
      { label: 'Sales Orders',  to: '/app/sales/orders',       code: 'SO' },
      { label: 'Reservations',  to: '/app/sales/reservations', code: 'RS' },
      { label: 'Shipments',     to: '/app/sales/shipments',    code: 'SH' },
      { label: 'Customers',     to: '/app/sales/customers',    code: 'CU' },
    ],
  },
  { label: 'Returns', to: '/app/returns', section: 'Operations', code: 'RT',
    children: [
      { label: 'Purchase Returns', to: '/app/returns/purchase', code: 'PR' },
      { label: 'Sales Returns',    to: '/app/returns/sales',    code: 'SR' },
    ],
  },
  { label: 'Reports', to: '/app/reports', section: 'Operations', code: 'RP' },
  { label: 'Replenishment', to: '/app/replenishment', section: 'Operations', code: 'RN' },
  { label: 'User Access', to: '/app/settings/users', section: 'Settings', code: 'UA', superAdminOnly: true },
]

function navLinkClass({ isActive }) {
  return `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-[#111827] text-white'
      : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
  }`
}

function subNavLinkClass({ isActive }) {
  return `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-white text-[#111827] font-medium shadow-sm'
      : 'text-[#6B7280] hover:bg-white hover:text-[#111827]'
  }`
}

export function AppShell() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { session, logout } = useAuth()
  const { isSuperAdmin } = usePermissions()

  const pageName =
    navigationItems.find((item) => location.pathname.startsWith(item.to))?.label ??
    'Workspace'

  const groupedItems = navigationItems.reduce((acc, item) => {
    if (item.superAdminOnly && !isSuperAdmin) return acc
    acc[item.section] ??= []
    acc[item.section].push(item)
    return acc
  }, {})

  function handleLogout() {
    logout()
    navigate('/auth/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827]">
      <div className="grid min-h-screen lg:grid-cols-[256px_minmax(0,1fr)]">

        {/* ── Sidebar ── */}
        <aside className="flex flex-col border-r border-[#E5E7EB] bg-white px-4 py-5 lg:sticky lg:top-0 lg:h-screen overflow-y-auto">

          {/* Logo */}
          <a href="/app/dashboard" className="flex items-center gap-3 px-2 py-2 mb-6">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111827] text-xs font-bold text-white">
              SF
            </span>
            <div>
              <p className="text-sm font-semibold text-[#111827]">StockFlow</p>
              <p className="text-[11px] text-[#9CA3AF] uppercase tracking-widest">Inventory</p>
            </div>
          </a>

          {/* Nav groups */}
          <div className="flex-1 space-y-6">
            {Object.entries(groupedItems).map(([section, items]) => (
              <div key={section}>
                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
                  {section}
                </p>
                <nav className="space-y-0.5">
                  {items.map((item) => {
                    const isParentActive =
                      location.pathname === item.to ||
                      location.pathname.startsWith(`${item.to}/`)

                    return (
                      <div key={item.to}>
                        <NavLink to={item.to} className={navLinkClass}>
                          <span className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold tracking-wide transition-colors ${
                            isParentActive ? 'bg-white/20 text-white' : 'bg-[#F3F4F6] text-[#6B7280] group-hover:bg-[#E5E7EB]'
                          }`}>
                            {item.code}
                          </span>
                          <span className="flex-1">{item.label}</span>
                        </NavLink>

                        {item.children && isParentActive && (
                          <div className="ml-3 mt-0.5 mb-1 space-y-0.5 border-l border-[#E5E7EB] pl-3">
                            {item.children.map((child) => (
                              <NavLink key={child.to} to={child.to} className={subNavLinkClass}>
                                <span className="flex h-5 w-5 items-center justify-center rounded bg-[#F3F4F6] text-[10px] font-bold text-[#6B7280]">
                                  {child.code}
                                </span>
                                <span>{child.label}</span>
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </nav>
              </div>
            ))}
          </div>

          {/* User card */}
          <div className="mt-6 border-t border-[#E5E7EB] pt-4">
            <div className="flex items-center gap-3 rounded-lg px-2 py-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111827] text-xs font-semibold text-white">
                {session?.user?.email?.slice(0, 2).toUpperCase() ?? 'US'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#111827]">
                  {session?.user?.email ?? 'Unknown user'}
                </p>
                <p className="text-xs text-[#6B7280]">
                  {formatRoleLabel(session?.user?.role) ?? 'No role'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#6B7280] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
            >
              Sign out
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="min-w-0 flex flex-col">

          {/* Topbar */}
          <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="text-xs text-[#9CA3AF]">
                  <span>StockFlow</span>
                  <span className="mx-1.5">/</span>
                  <span className="font-medium text-[#111827]">{pageName}</span>
                </div>
                <label className="hidden md:flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm text-[#9CA3AF] w-64">
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full bg-transparent outline-none placeholder:text-[#9CA3AF] text-[#111827]"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2">
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5">
                  <p className="text-[11px] text-[#9CA3AF] uppercase tracking-widest">Role</p>
                  <p className="text-xs font-semibold text-[#111827]">{formatRoleLabel(session?.user?.role) ?? '—'}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
