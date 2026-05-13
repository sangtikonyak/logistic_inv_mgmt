import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'

const navLinks = [
  { label: 'Sign in',        to: '/auth/login' },
  { label: 'Register',       to: '/auth/register-company' },
  { label: 'Accept invite',  to: '/auth/accept-invite' },
]

export function AuthLayout({ title, description, children, sideContent }) {
  const { isAuthenticated } = useAuth()
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-[#F9FAFB]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Top bar ── */}
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111827] text-xs font-bold text-white">SF</span>
            <div>
              <p className="text-sm font-semibold text-[#111827] leading-none">StockFlow</p>
              <p className="text-[10px] text-[#9CA3AF] uppercase tracking-widest mt-0.5">Inventory</p>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  pathname === link.to
                    ? 'bg-[#F3F4F6] font-medium text-[#111827]'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && (
              <Link to="/app/dashboard"
                className="ml-2 rounded-lg bg-[#111827] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#1F2937]">
                Dashboard →
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">

          {/* Left — dark info panel */}
          <div className="rounded-2xl bg-[#111827] p-8 text-white lg:sticky lg:top-24">
            {/* Logo mark */}
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <span className="text-lg font-bold">SF</span>
            </div>

            <h1 className="text-2xl font-bold leading-snug">{title}</h1>
            <p className="mt-3 text-sm leading-7 text-[#9CA3AF]">{description}</p>

            {/* Feature pills */}
            <div className="mt-8 space-y-2.5">
              {[
                ['🔒', 'Security & Authenticator'],
                ['🏢', 'Multi-tenant isolation'],
                ['👥', 'Role-based access control'],
                ['⚡', 'Real-time inventory sync'],
              ].map(([icon, text]) => (
                <div key={text} className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
                  <span className="text-base">{icon}</span>
                  <span className="text-sm text-[#D1D5DB]">{text}</span>
                </div>
              ))}
            </div>

            {sideContent && <div className="mt-6">{sideContent}</div>}

            {/* Back to home */}
            <Link to="/" className="mt-8 flex items-center gap-2 text-xs text-[#6B7280] transition hover:text-white">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to home
            </Link>
          </div>

          {/* Right — form panel */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
