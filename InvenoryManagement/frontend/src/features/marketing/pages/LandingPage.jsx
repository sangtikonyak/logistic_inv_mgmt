import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'

// ── Module snapshot data ─────────────────────────────────────────────────────
const modules = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    tag: 'Command Center',
    color: '#111827',
    accent: '#22C55E',
    preview: (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {[['4,821', 'On-hand'], ['18', 'Active POs'], ['07', 'Alerts'], ['94%', 'Fill rate']].map(([v, l]) => (
            <div key={l} className="rounded-lg bg-white/10 p-2.5">
              <p className="text-lg font-bold text-white">{v}</p>
              <p className="text-[10px] text-white/50 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-[10px] text-white/40 mb-2 uppercase tracking-widest">Inventory watchlist</p>
          {[['Scanner Pods', '82%', '#22C55E'], ['Transit Labels', '24%', '#F59E0B'], ['Packing Kits', '12%', '#EF4444']].map(([n, p, c]) => (
            <div key={n} className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] text-white/70 w-24 truncate">{n}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: p, background: c }} />
              </div>
              <span className="text-[10px] text-white/40">{p}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'products',
    label: 'Products',
    tag: 'Catalog',
    color: '#1e3a5f',
    accent: '#3B82F6',
    preview: (
      <div className="space-y-2">
        <div className="flex gap-2 mb-3">
          {['All Products', 'Categories', 'Units'].map(t => (
            <span key={t} className="rounded-md bg-white/10 px-2 py-1 text-[10px] text-white/70">{t}</span>
          ))}
        </div>
        {[['Hammer Pro', 'SIMPLE', 'INR 1,200', '#22C55E'], ['T-Shirt Red S', 'VARIABLE', 'INR 450', '#3B82F6'], ['Safety Kit', 'BUNDLE', 'INR 2,800', '#F59E0B']].map(([n, t, p, c]) => (
          <div key={n} className="flex items-center justify-between rounded-lg bg-white/8 px-3 py-2">
            <div>
              <p className="text-[11px] font-medium text-white">{n}</p>
              <p className="text-[10px] text-white/40">{t}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-white/70">{p}</p>
              <span className="text-[9px] rounded px-1.5 py-0.5" style={{ background: c + '30', color: c }}>ACTIVE</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'inventory',
    label: 'Inventory',
    tag: 'Stock Control',
    color: '#1a1a2e',
    accent: '#8B5CF6',
    preview: (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[['11', 'On Hand', '#22C55E'], ['0', 'Reserved', '#F59E0B'], ['11', 'Available', '#3B82F6']].map(([v, l, c]) => (
            <div key={l} className="rounded-lg bg-white/10 p-2 text-center">
              <p className="text-base font-bold" style={{ color: c }}>{v}</p>
              <p className="text-[9px] text-white/40">{l}</p>
            </div>
          ))}
        </div>
        {[['Zone Bulk Storage · Bin L1', 'Hammer Pro', '11'], ['No Zone · No Bin', 'Blue Pants 10', '1,110']].map(([loc, item, qty]) => (
          <div key={item} className="rounded-lg bg-white/8 px-3 py-2">
            <p className="text-[11px] font-medium text-white">{item}</p>
            <div className="flex justify-between mt-0.5">
              <p className="text-[10px] text-white/40">{loc}</p>
              <p className="text-[10px] text-white/60">{qty} units</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'purchases',
    label: 'Purchases',
    tag: 'Procurement',
    color: '#1c2b1c',
    accent: '#22C55E',
    preview: (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Purchase Orders</p>
          <span className="rounded-md bg-[#22C55E]/20 px-2 py-0.5 text-[10px] text-[#22C55E]">3 Active</span>
        </div>
        {[['PO-001', 'Acme Supplies', 'ISSUED', '#3B82F6'], ['PO-002', 'TechParts Ltd', 'DRAFT', '#9CA3AF'], ['PO-003', 'SafetyFirst', 'RECEIVED', '#22C55E']].map(([n, s, st, c]) => (
          <div key={n} className="flex items-center justify-between rounded-lg bg-white/8 px-3 py-2">
            <div>
              <p className="text-[11px] font-medium text-white">{n}</p>
              <p className="text-[10px] text-white/40">{s}</p>
            </div>
            <span className="text-[9px] rounded px-1.5 py-0.5" style={{ background: c + '25', color: c }}>{st}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'sales',
    label: 'Sales',
    tag: 'Orders & Shipments',
    color: '#2d1b4e',
    accent: '#A855F7',
    preview: (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[['12', 'Orders'], ['5', 'Reserved'], ['8', 'Shipped']].map(([v, l]) => (
            <div key={l} className="rounded-lg bg-white/10 p-2 text-center">
              <p className="text-base font-bold text-white">{v}</p>
              <p className="text-[9px] text-white/40">{l}</p>
            </div>
          ))}
        </div>
        {[['SO-2401', 'Ravi Kumar', 'CONFIRMED', '#3B82F6'], ['SO-2402', 'Sangti Store', 'SHIPPED', '#22C55E'], ['SO-2403', 'Walk-in', 'DRAFT', '#9CA3AF']].map(([n, c, st, col]) => (
          <div key={n} className="flex items-center justify-between rounded-lg bg-white/8 px-3 py-2">
            <div>
              <p className="text-[11px] font-medium text-white">{n}</p>
              <p className="text-[10px] text-white/40">{c}</p>
            </div>
            <span className="text-[9px] rounded px-1.5 py-0.5" style={{ background: col + '25', color: col }}>{st}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'warehouse',
    label: 'Warehouses',
    tag: 'Locations',
    color: '#1a2535',
    accent: '#F59E0B',
    preview: (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Main Warehouse</p>
          <span className="rounded-md bg-[#22C55E]/20 px-2 py-0.5 text-[10px] text-[#22C55E]">Default</span>
        </div>
        <div className="rounded-lg bg-white/8 p-3">
          <p className="text-[10px] text-white/40 mb-2">Zones</p>
          {[['Bulk Storage', '3 bins', '#F59E0B'], ['Cold Chain', '2 bins', '#3B82F6'], ['Dispatch', '4 bins', '#22C55E']].map(([z, b, c]) => (
            <div key={z} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                <span className="text-[11px] text-white/70">{z}</span>
              </div>
              <span className="text-[10px] text-white/40">{b}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
]

const features = [
  { icon: '⚡', title: 'Real-time stock', desc: 'Live movement ledger across all warehouses, zones, and bins.' },
  { icon: '🔒', title: 'Multi-tenant RBAC', desc: 'Super Admin, Manager, Admin, Staff, and Operator access with explicit permissions.' },
  { icon: '📦', title: 'Full purchase cycle', desc: 'Suppliers → POs → Receipts → Stock, all in one flow.' },
  { icon: '🚚', title: 'Sales & shipments', desc: 'Orders, reservations, and outbound shipments tracked end-to-end.' },
  { icon: '🏭', title: 'Warehouse structure', desc: 'Warehouses, zones, and bins with location-aware stock.' },
  { icon: '📊', title: 'Inventory analytics', desc: 'Movement history, transfer logs, and stock adjustment audit trail.' },
]

// ── Minimal animated counter ─────────────────────────────────────────────────
function Counter({ to, suffix = '' }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const duration = 1400
        const start = performance.now()
        function tick(now) {
          const progress = Math.min((now - start) / duration, 1)
          const ease = 1 - Math.pow(1 - progress, 3)
          setVal(Math.floor(ease * to))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [to])

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

// ── Module preview card ──────────────────────────────────────────────────────
function ModuleCard({ module, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl px-4 py-3 transition-all duration-200 ${
        isActive
          ? 'bg-[#111827] text-white shadow-lg'
          : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
      }`}
    >
      <p className={`text-xs font-semibold uppercase tracking-widest mb-0.5 ${isActive ? 'text-white/50' : 'text-[#9CA3AF]'}`}>
        {module.tag}
      </p>
      <p className="text-sm font-semibold">{module.label}</p>
    </button>
  )
}

export function LandingPage() {
  const { isAuthenticated } = useAuth()
  const [activeModule, setActiveModule] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Auto-rotate modules
  useEffect(() => {
    const id = setInterval(() => setActiveModule(i => (i + 1) % modules.length), 3500)
    return () => clearInterval(id)
  }, [])

  const mod = modules[activeModule]

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111827] text-xs font-bold text-white">SF</span>
            <span className="text-sm font-semibold text-[#111827]">StockFlow</span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {['Features', 'Modules', 'Pricing'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="text-sm text-[#6B7280] transition hover:text-[#111827]">{l}</a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link to={isAuthenticated ? '/app/dashboard' : '/auth/login'}
              className="text-sm font-medium text-[#6B7280] transition hover:text-[#111827]">
              {isAuthenticated ? 'Dashboard' : 'Sign in'}
            </Link>
            <Link to="/auth/register-company"
              className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1F2937]">
              Get started
            </Link>
          </div>

          <button className="md:hidden p-2 text-[#6B7280]" onClick={() => setMobileMenuOpen(o => !o)}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-[#E5E7EB] bg-white px-6 py-4 space-y-3 md:hidden">
            {['Features', 'Modules', 'Pricing'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)}
                className="block text-sm text-[#6B7280]">{l}</a>
            ))}
            <div className="flex gap-3 pt-2">
              <Link to={isAuthenticated ? '/app/dashboard' : '/auth/login'}
                className="flex-1 rounded-lg border border-[#E5E7EB] py-2 text-center text-sm font-medium text-[#374151]">
                {isAuthenticated ? 'Dashboard' : 'Sign in'}
              </Link>
              <Link to="/auth/register-company"
                className="flex-1 rounded-lg bg-[#111827] py-2 text-center text-sm font-semibold text-white">
                Get started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-7xl px-6 pt-20 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-1.5 text-xs font-medium text-[#6B7280] mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
            Multi-tenant inventory management platform
          </span>

          <h1 className="text-5xl font-bold tracking-tight text-[#111827] leading-tight sm:text-6xl">
            Inventory that moves<br />
            <span className="text-[#22C55E]">as fast as you do</span>
          </h1>

          <p className="mt-6 text-lg text-[#6B7280] leading-relaxed max-w-2xl mx-auto">
            StockFlow gives your team real-time visibility across warehouses, purchases, and sales — with role-aware access and a clean interface built for daily operations.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth/register-company"
              className="w-full sm:w-auto rounded-xl bg-[#111827] px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1F2937] shadow-lg shadow-black/10">
              Start for free
            </Link>
            <Link to={isAuthenticated ? '/app/dashboard' : '/auth/login'}
              className="w-full sm:w-auto rounded-xl border border-[#E5E7EB] bg-white px-8 py-3.5 text-sm font-semibold text-[#374151] transition hover:bg-[#F9FAFB]">
              {isAuthenticated ? 'Open dashboard →' : 'Sign in →'}
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-3xl mx-auto">
          {[['99.4', '%', 'Stock accuracy'], ['2', 'min', 'Avg update time'], ['6', '+', 'Core modules'], ['100', '%', 'Tenant isolated']].map(([n, s, l]) => (
            <div key={l} className="rounded-xl border border-[#E5E7EB] bg-white p-5 text-center">
              <p className="text-3xl font-bold text-[#111827]">
                <Counter to={parseFloat(n)} suffix={s} />
              </p>
              <p className="mt-1 text-xs text-[#9CA3AF]">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Module Snapshots ── */}
      <section id="modules" className="bg-white border-y border-[#E5E7EB] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF] mb-3">Platform modules</p>
            <h2 className="text-3xl font-bold text-[#111827] sm:text-4xl">Everything in one workspace</h2>
            <p className="mt-4 text-[#6B7280] max-w-xl mx-auto">
              Six integrated modules covering the full inventory lifecycle — from product catalog to outbound shipments.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            {/* Module tabs */}
            <div className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1">
              {modules.map((m, i) => (
                <ModuleCard key={m.id} module={m} isActive={i === activeModule} onClick={() => setActiveModule(i)} />
              ))}
            </div>

            {/* Preview window */}
            <div
              className="rounded-2xl p-6 min-h-[320px] transition-all duration-500"
              style={{ background: `linear-gradient(135deg, ${mod.color}, ${mod.color}dd)` }}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: mod.accent + 'aa' }}>
                    {mod.tag}
                  </p>
                  <h3 className="text-xl font-bold text-white">{mod.label}</h3>
                </div>
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-white/20" />
                  <span className="h-3 w-3 rounded-full bg-white/20" />
                  <span className="h-3 w-3 rounded-full" style={{ background: mod.accent }} />
                </div>
              </div>
              {mod.preview}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF] mb-3">Why StockFlow</p>
            <h2 className="text-3xl font-bold text-[#111827] sm:text-4xl">Built for real operations</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(f => (
              <div key={f.title}
                className="group rounded-xl border border-[#E5E7EB] bg-white p-6 transition hover:border-[#111827] hover:shadow-md">
                <span className="text-2xl">{f.icon}</span>
                <h3 className="mt-4 text-sm font-semibold text-[#111827]">{f.title}</h3>
                <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#111827] py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to take control of your inventory?
          </h2>
          <p className="mt-4 text-[#9CA3AF] text-lg">
            Set up your workspace in minutes. No credit card required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth/register-company"
              className="w-full sm:w-auto rounded-xl bg-[#22C55E] px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-[#16A34A]">
              Create your workspace
            </Link>
            <Link to={isAuthenticated ? '/app/dashboard' : '/auth/login'}
              className="w-full sm:w-auto rounded-xl border border-white/20 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
              {isAuthenticated ? 'Go to dashboard' : 'Sign in'}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E5E7EB] bg-white py-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#111827] text-[10px] font-bold text-white">SF</span>
            <span className="text-sm font-semibold text-[#111827]">StockFlow</span>
            <span className="text-xs text-[#9CA3AF]">© 2025</span>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-[#6B7280]">
            {['Features', 'Modules'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="transition hover:text-[#111827]">{l}</a>
            ))}
            <Link to={isAuthenticated ? '/app/dashboard' : '/auth/login'} className="transition hover:text-[#111827]">
              {isAuthenticated ? 'Dashboard' : 'Sign in'}
            </Link>
            <Link to="/auth/register-company" className="font-medium text-[#111827] transition hover:text-[#22C55E]">
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
