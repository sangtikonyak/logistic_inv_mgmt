/**
 * Toast/alert component aligned to the design system.
 * tone: 'success' | 'error' | 'warning' | 'info'
 *
 * message can be:
 *   - a plain string
 *   - a multi-line string with bullet lines starting with "• "
 */
const toneStyles = {
  success: {
    shell: 'border-l-4 border-l-[#22C55E] border border-[#E5E7EB] bg-[#F0FDF4] text-[#15803D]',
    label: 'Success',
  },
  error: {
    shell: 'border-l-4 border-l-[#EF4444] border border-[#E5E7EB] bg-[#FFF1F2] text-[#B91C1C]',
    label: 'Error',
  },
  warning: {
    shell: 'border-l-4 border-l-[#F59E0B] border border-[#E5E7EB] bg-[#FFFBEB] text-[#92400E]',
    label: 'Warning',
  },
  info: {
    shell: 'border-l-4 border-l-[#3B82F6] border border-[#E5E7EB] bg-[#EFF6FF] text-[#1D4ED8]',
    label: 'Info',
  },
}

export function StatusAlert({ tone = 'error', message }) {
  if (!message) return null

  const styles = toneStyles[tone] ?? toneStyles.error
  const lines = String(message).split('\n').filter(Boolean)
  const isList = lines.length > 1

  return (
    <div className={`rounded-lg px-4 py-3 text-sm ${styles.shell}`} role="alert" aria-live="polite">
      {isList ? (
        <>
          <p className="font-semibold mb-1.5">{styles.label}: Please fix the following issues</p>
          <ul className="space-y-0.5 pl-1">
            {lines.map((line, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{line.replace(/^•\s*/, '')}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <span><span className="font-semibold">{styles.label}:</span> {message}</span>
      )}
    </div>
  )
}
