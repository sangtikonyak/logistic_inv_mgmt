import { Link, useSearchParams } from 'react-router-dom'
import { acceptInvite } from '../api/authApi.js'
import { useAuthForm } from '../hooks/useAuthForm.js'
import { AuthLayout } from '../components/AuthLayout.jsx'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import { validateAcceptInvite } from '../../../shared/lib/validators.js'

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const form = useAuthForm({
    token: searchParams.get('token') ?? '',
    password: '',
  })

  async function handleSubmit(e) {
    e.preventDefault()
    const errors = validateAcceptInvite(form.values)
    form.setErrors(errors)
    form.clearFeedback()
    if (Object.keys(errors).length) return

    try {
      form.setIsSubmitting(true)
      const res = await acceptInvite({
        token: form.values.token.trim(),
        password: form.values.password,
      })
      form.setServerTone('success')
      form.setServerMessage(res.message)
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
      title="You've been invited"
      description="Set a password to activate your account and join your team's inventory workspace."
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#111827]">Accept invite</h2>
        <p className="mt-1.5 text-sm text-[#6B7280]">
          Already activated?{' '}
          <Link to="/auth/login" className="font-medium text-[#111827] hover:underline">Sign in</Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField
          label="Invite token"
          name="token"
          placeholder="Paste your invite token"
          value={form.values.token}
          onChange={form.handleChange}
          error={form.errors.token}
          description={form.values.token ? 'Token pre-filled from your invite link.' : undefined}
          required
        />
        <FormField
          label="New password"
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
          className="w-full rounded-xl bg-[#111827] py-3 text-sm font-semibold text-white transition hover:bg-[#1F2937] disabled:opacity-60"
        >
          {form.isSubmitting ? 'Activating…' : 'Activate account'}
        </button>
      </form>

      {form.serverMessage && form.serverTone === 'success' && (
        <div className="mt-6">
          <Link to="/auth/login"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#22C55E] py-3 text-sm font-semibold text-white transition hover:bg-[#16A34A]">
            Sign in to your workspace →
          </Link>
        </div>
      )}
    </AuthLayout>
  )
}
