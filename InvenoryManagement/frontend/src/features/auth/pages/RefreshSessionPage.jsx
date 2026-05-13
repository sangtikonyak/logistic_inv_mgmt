import { refreshSession } from '../api/authApi.js'
import { useAuthForm } from '../hooks/useAuthForm.js'
import { AuthLayout } from '../components/AuthLayout.jsx'
import { AuthStatusCard } from '../components/AuthStatusCard.jsx'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { clearSession, loadSession, saveSession } from '../../../shared/lib/session.js'
import { mapApiErrors } from '../../../shared/lib/apiErrors.js'
import { validateRefresh } from '../../../shared/lib/validators.js'

export function RefreshSessionPage() {
  const session = loadSession()
  const form = useAuthForm({
    refreshToken: session?.refreshToken ?? '',
  })

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateRefresh(form.values)
    form.setErrors(validationErrors)
    form.setServerMessage('')
    form.setServerDetails(null)

    if (Object.keys(validationErrors).length) {
      return
    }

    try {
      form.setIsSubmitting(true)
      const response = await refreshSession({
        refreshToken: form.values.refreshToken.trim(),
      })

      if (session?.user) {
        saveSession({
          ...session,
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        })
      }

      form.setServerMessage(response.message)
      form.setServerDetails(response.data)
    } catch (error) {
      form.setErrors((current) => ({ ...current, ...mapApiErrors(error) }))
      form.setServerMessage(error.message)
    } finally {
      form.setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Refresh API"
      title="Renew expired access with a valid refresh token."
      description="This screen targets POST /api/v1/auth/refresh. It can reuse the refresh token stored after login and writes the new token pair back to local storage."
      sideContent={
        <AuthStatusCard
          title="Token refresh flow"
          items={[
            { label: 'Input', value: 'refreshToken' },
            { label: 'Backend check', value: 'active user only' },
            { label: 'Output', value: 'new token pair' },
          ]}
        />
      }
    >
      <div>
        <p className="font-[var(--font-body)] text-xs uppercase tracking-[0.32em] text-[var(--muted)]">
          Refresh Session
        </p>
        <h2 className="mt-3 font-[var(--font-body)] text-3xl text-slate-900">
          Rotate session tokens
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Use this utility screen to test the refresh endpoint directly. If a session exists, the saved refresh token is loaded automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
        <FormField
          label="Refresh Token"
          name="refreshToken"
          placeholder="Paste your refresh token"
          value={form.values.refreshToken}
          onChange={form.handleChange}
          error={form.errors.refreshToken}
        />

        {form.serverMessage ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {form.serverMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={form.isSubmitting}
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {form.isSubmitting ? 'Refreshing...' : 'Refresh Token'}
          </button>
          <button
            type="button"
            onClick={() => {
              clearSession()
              form.setServerMessage('Saved session cleared from local storage.')
              form.setServerDetails(null)
              form.setValues({ refreshToken: '' })
            }}
            className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Clear Saved Session
          </button>
        </div>
      </form>

      {form.serverDetails ? (
        <div className="mt-8 rounded-[1.75rem] border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Refreshed Tokens</p>
          <p className="mt-3 break-all text-sm text-slate-700">
            Access Token: {form.serverDetails.accessToken}
          </p>
          <p className="mt-3 break-all text-sm text-slate-700">
            Refresh Token: {form.serverDetails.refreshToken}
          </p>
        </div>
      ) : null}
    </AuthLayout>
  )
}
