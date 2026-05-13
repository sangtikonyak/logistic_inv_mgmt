export function AuthStatusCard({ title, items }) {
  return (
    <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-5">
      <p className="font-[var(--font-body)] text-lg">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-2xl bg-white/8 px-4 py-3 text-sm text-slate-100"
          >
            <span>{item.label}</span>
            <span className="font-semibold text-cyan-100">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
