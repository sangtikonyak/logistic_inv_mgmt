export function FormTextarea({ label, name, placeholder, value, onChange, rows = 4, error }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-[#374151]">
      <span>{label}</span>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF] resize-none ${
          error
            ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/20'
            : 'border-[#E5E7EB] focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/10'
        }`}
      />
      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
    </label>
  )
}
