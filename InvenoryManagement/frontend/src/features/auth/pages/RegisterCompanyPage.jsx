import { Link } from 'react-router-dom'
import { registerCompany } from '../api/authApi.js'
import { useAuthForm } from '../hooks/useAuthForm.js'
import { AuthLayout } from '../components/AuthLayout.jsx'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import { validateRegisterCompany } from '../../../shared/lib/validators.js'

export function RegisterCompanyPage() {
  const form = useAuthForm({ companyName: '', adminEmail: '', password: '' })

  async function handleSubmit(e) {
    e.preventDefault()
    const errors = validateRegisterCompany(form.values)
    form.setErrors(errors)
    form.clearFeedback()
    form.setServerDetails(null)
    if (Object.keys(errors).length) return

    try {
      form.setIsSubmitting(true)
      const res = await registerCompany({
        companyName: form.values.companyName.trim(),
        adminEmail: form.values.adminEmail.trim(),
        password: form.values.password,
      })
      form.setServerTone('success')
      form.setServerMessage(res.message)
      form.setServerDetails(res.data)
    } catch (error) {
      const { fieldErrors, summary } = parseApiValidationError(error)
      form.setErrors(c => ({ ...c, ...fieldErrors }))
      form.setServerTone('error')
      form.setServerMessage(summary ?? error.message)
    } finally {
      form.setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your workspace"
      description="Register your company to get started. This creates a tenant and your first admin account in one step."
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#111827]">Register company</h2>
        <p className="mt-1.5 text-sm text-[#6B7280]">
          Already have an account?{' '}
          <Link to="/auth/login" className="font-medium text-[#111827] hover:underline">Sign in</Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField
          label="Company name"
          name="companyName"
          placeholder="Northwind Logistics"
          value={form.values.companyName}
          onChange={form.handleChange}
          error={form.errors.companyName}
          required
        />
        <FormField
          label="Admin email"
          name="adminEmail"
          type="email"
          placeholder="admin@company.com"
          value={form.values.adminEmail}
          onChange={form.handleChange}
          error={form.errors.adminEmail}
          required
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          placeholder="Minimum 8 characters"
          value={form.values.password}
          onChange={form.handleChange}
          error={form.errors.password}
          required
        />

        <StatusAlert tone={form.serverTone} message={form.serverMessage} />

        <button
          type="submit"
          disabled={form.isSubmitting}
          className="w-full rounded-xl bg-[#22C55E] py-3 text-sm font-semibold text-white transition hover:bg-[#16A34A] disabled:opacity-60"
        >
          {form.isSubmitting ? 'Creating workspace…' : 'Create workspace'}
        </button>
      </form>

      {form.serverDetails && (
        <div className="mt-6 rounded-xl border border-[#DCFCE7] bg-[#F0FDF4] p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#15803D] mb-3">Workspace created</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Tenant ID</span>
              <span className="font-mono text-xs text-[#111827] break-all">{form.serverDetails.tenantId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Admin ID</span>
              <span className="font-mono text-xs text-[#111827] break-all">{form.serverDetails.adminUserId}</span>
            </div>
          </div>
          <Link to="/auth/login"
            className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-[#111827] py-2.5 text-sm font-semibold text-white transition hover:bg-[#1F2937]">
            Sign in to your workspace →
          </Link>
        </div>
      )}
    </AuthLayout>
  )
}
