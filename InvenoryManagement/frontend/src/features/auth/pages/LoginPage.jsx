import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { login } from '../api/authApi.js'
import { useAuthForm } from '../hooks/useAuthForm.js'
import { AuthLayout } from '../components/AuthLayout.jsx'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import { validateLogin } from '../../../shared/lib/validators.js'

export function LoginPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const form = useAuthForm({ email: '', password: '' })

  async function handleSubmit(e) {
    e.preventDefault()
    const errors = validateLogin(form.values)
    form.setErrors(errors)
    form.clearFeedback()
    if (Object.keys(errors).length) return

    try {
      form.setIsSubmitting(true)
      const res = await login(form.values)
      auth.login(res.data)
      navigate('/app/dashboard', { replace: true })
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
      title="Welcome back"
      description="Sign in to your inventory workspace. Your session is fully secured with multi-tenant protection and encrypted storage."
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#111827]">Sign in</h2>
        <p className="mt-1.5 text-sm text-[#6B7280]">
          Don't have an account?{' '}
          <Link to="/auth/register-company" className="font-medium text-[#111827] hover:underline">
            Create one
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField
          label="Email address"
          name="email"
          type="email"
          placeholder="you@company.com"
          value={form.values.email}
          onChange={form.handleChange}
          error={form.errors.email}
          required
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          placeholder="Enter your password"
          value={form.values.password}
          onChange={form.handleChange}
          error={form.errors.password}
          required
        />

        <StatusAlert tone={form.serverTone} message={form.serverMessage} />

        <button
          type="submit"
          disabled={form.isSubmitting}
          className="w-full rounded-xl bg-[#111827] py-3 text-sm font-semibold text-white transition hover:bg-[#1F2937] disabled:opacity-60"
        >
          {form.isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap gap-4 text-sm text-[#6B7280]">
        <Link to="/auth/accept-invite" className="hover:text-[#111827] hover:underline">
          Accept an invite
        </Link>
      </div>
    </AuthLayout>
  )
}
