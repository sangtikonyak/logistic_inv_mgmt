import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'

export function CheckboxField({ label, name, checked, onChange, disabled = false }) {
  return (
    <label className="flex items-center gap-3 rounded-[1rem] border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm text-[var(--ink)]">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)]"
      />
      <span>{label}</span>
    </label>
  )
}

export function ToggleList({ items, selectedIds, onToggle, disabled }) {
  return (
    <div className="grid gap-2">
      {items.length ? (
        items.map((item) => {
          const active = selectedIds.includes(item.id)

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              disabled={disabled}
              className={`flex items-start justify-between rounded-[1rem] border px-4 py-3 text-left transition ${
                active
                  ? 'border-[var(--accent)] bg-[#F3F4F6] text-[#1F2937]'
                  : 'border-[var(--line)] bg-white text-[var(--muted)]'
              }`}
            >
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="mt-1 text-xs">
                  {item.description || item.code || item.slug || 'No secondary details'}
                </p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                {active ? 'Added' : 'Add'}
              </span>
            </button>
          )
        })
      ) : (
        <div className="rounded-[1rem] border border-dashed border-[var(--line)] bg-[var(--panel)] px-4 py-4 text-sm text-[var(--muted)]">
          Nothing available yet.
        </div>
      )}
    </div>
  )
}

export function ManagementCard({
  title,
  description,
  form,
  onSubmit,
  submitLabel,
  onReset,
  canManage,
  children,
}) {
  return (
    <article className="rounded-[1.5rem] border border-[var(--line)] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        </div>
        {!canManage ? (
          <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
            Read only
          </span>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        {children}
        <StatusAlert tone={form.serverTone} message={form.serverMessage} />
        <div className="flex flex-wrap gap-3">
          {canManage ? (
            <button
              type="submit"
              disabled={form.isSubmitting}
              className="rounded-[1rem] bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] transition disabled:opacity-60"
            >
              {form.isSubmitting ? 'Saving...' : submitLabel}
            </button>
          ) : null}
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="rounded-[1rem] border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
            >
              Reset
            </button>
          ) : null}
        </div>
      </form>
    </article>
  )
}

export function SummaryCards({ productsCount, categoriesCount, unitsCount }) {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-[1.2rem] border border-[var(--line)] bg-white px-4 py-4 shadow-[0_10px_25px_rgba(15,23,42,0.04)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">Products</p>
        <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{productsCount}</p>
      </div>
      <div className="rounded-[1.2rem] border border-[var(--line)] bg-white px-4 py-4 shadow-[0_10px_25px_rgba(15,23,42,0.04)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">Categories</p>
        <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{categoriesCount}</p>
      </div>
      <div className="rounded-[1.2rem] border border-[var(--line)] bg-white px-4 py-4 shadow-[0_10px_25px_rgba(15,23,42,0.04)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">Units</p>
        <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{unitsCount}</p>
      </div>
    </section>
  )
}
