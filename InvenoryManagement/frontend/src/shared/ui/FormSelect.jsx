export function FormSelect({ label, name, value, onChange, error, options, description, required }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-[#374151]">
      <span>
        {label}
        {required && <span className="ml-1 text-[#EF4444]">*</span>}
      </span>
      {description && <p className="text-xs text-[#6B7280]">{description}</p>}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition ${
          error
            ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/20'
            : 'border-[#E5E7EB] focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/10'
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
    </label>
  )
}
