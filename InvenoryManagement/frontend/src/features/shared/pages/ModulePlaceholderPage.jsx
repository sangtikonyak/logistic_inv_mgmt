export function ModulePlaceholderPage({ title, description }) {
  return (
    <section className="rounded-[2rem] border border-[var(--line)] bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <p className="font-[var(--font-body)] text-xs uppercase tracking-[0.34em] text-[var(--muted)]">
        Protected module
      </p>
      <h3 className="mt-3 font-[var(--font-body)] text-3xl text-slate-900">{title}</h3>
      <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">{description}</p>
      <div className="mt-8 rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--panel)] px-5 py-6 text-sm leading-7 text-slate-600">
        The route is already protected by the shared auth shell, so later module implementation can focus on business workflows instead of rebuilding session or navigation infrastructure.
      </div>
    </section>
  )
}
