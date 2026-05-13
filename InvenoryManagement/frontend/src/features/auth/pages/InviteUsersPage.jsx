import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { getUserPermissions, inviteUsers, listUsers, updateUserPermissions } from '../api/authApi.js'
import { useAuthForm } from '../hooks/useAuthForm.js'
import { FormSelect } from '../../../shared/ui/FormSelect.jsx'
import { FormTextarea } from '../../../shared/ui/FormTextarea.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import {
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCES,
  formatRoleLabel,
  normalizePermissions,
  usePermissions,
} from '../../../shared/lib/permissions.js'
import { validateInviteUsers } from '../../../shared/lib/validators.js'

const roleOptions = [
  { value: 'MANAGER', label: 'MANAGER' },
  { value: 'ADMIN', label: 'ADMIN' },
  { value: 'STAFF', label: 'STAFF' },
  { value: 'OPERATOR', label: 'OPERATOR' },
]

const editableActions = PERMISSION_ACTIONS.filter((action) => action !== 'ALL')

function PermissionToggle({ active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'bg-[#111827] text-white'
          : 'border border-[var(--line)] bg-white text-[var(--muted)] hover:border-[#111827] hover:text-[#111827]'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  )
}

export function InviteUsersPage() {
  const { session } = useAuth()
  const { isSuperAdmin } = usePermissions()
  const form = useAuthForm({
    emails: '',
    role: 'MANAGER',
  })

  const [users, setUsers] = useState([])
  const [usersFeedback, setUsersFeedback] = useState({ tone: 'success', message: '' })
  const [usersLoading, setUsersLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUserPermissions, setSelectedUserPermissions] = useState({})
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [permissionsSaving, setPermissionsSaving] = useState(false)
  const [permissionFeedback, setPermissionFeedback] = useState({ tone: 'success', message: '' })
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    if (!isSuperAdmin) {
      return
    }

    let cancelled = false

    async function fetchUsers() {
      try {
        setUsersLoading(true)
        setUsersFeedback({ tone: 'success', message: '' })
        const response = await listUsers()
        if (cancelled) {
          return
        }

        const nextUsers = response.data ?? []
        setUsers(nextUsers)
        setSelectedUserId((current) => {
          if (current && nextUsers.some((user) => user.id === current)) {
            return current
          }

          return nextUsers.find((user) => user.id !== session?.user?.id)?.id ?? nextUsers[0]?.id ?? ''
        })
      } catch (error) {
        if (!cancelled) {
          setUsersFeedback({ tone: 'error', message: error.message })
        }
      } finally {
        if (!cancelled) {
          setUsersLoading(false)
        }
      }
    }

    fetchUsers()

    return () => {
      cancelled = true
    }
  }, [isSuperAdmin, reloadVersion, session?.user?.id])

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUserPermissions({})
      return
    }

    let cancelled = false

    async function fetchPermissions() {
      try {
        setPermissionsLoading(true)
        setPermissionFeedback({ tone: 'success', message: '' })
        const response = await getUserPermissions(selectedUserId)
        if (!cancelled) {
          setSelectedUserPermissions(normalizePermissions(response.data?.permissions))
        }
      } catch (error) {
        if (!cancelled) {
          setPermissionFeedback({ tone: 'error', message: error.message })
        }
      } finally {
        if (!cancelled) {
          setPermissionsLoading(false)
        }
      }
    }

    fetchPermissions()

    return () => {
      cancelled = true
    }
  }, [selectedUserId])

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null
  const inviteTokens = Array.isArray(form.serverDetails) ? form.serverDetails : []
  const editableUsers = useMemo(() => users.filter((user) => user.role !== 'SUPER_ADMIN'), [users])

  if (!isSuperAdmin) {
    return <Navigate to="/app/dashboard" replace />
  }

  function togglePermission(resource, action) {
    setSelectedUserPermissions((current) => {
      const existing = new Set(current[resource] ?? [])

      if (action === 'ALL') {
        return {
          ...current,
          [resource]: existing.has('ALL') ? [] : ['ALL'],
        }
      }

      existing.delete('ALL')

      if (existing.has(action)) {
        existing.delete(action)
      } else {
        existing.add(action)
      }

      return {
        ...current,
        [resource]: Array.from(existing),
      }
    })
  }

  async function handleInviteSubmit(event) {
    event.preventDefault()
    const { errors, normalizedEmails } = validateInviteUsers(form.values)
    form.setErrors(errors)
    form.clearFeedback()
    form.setServerDetails(null)

    if (!session?.accessToken) {
      form.setServerTone('error')
      form.setServerMessage('Login first to access the protected invite endpoint.')
      return
    }

    if (Object.keys(errors).length) {
      return
    }

    try {
      form.setIsSubmitting(true)
      const response = await inviteUsers({ emails: normalizedEmails, role: form.values.role })
      form.setServerTone('success')
      form.setServerMessage(response.message)
      form.setServerDetails(response.data)
      form.setValues((current) => ({ ...current, emails: '' }))
      setReloadVersion((current) => current + 1)
    } catch (error) {
      const { fieldErrors, summary } = parseApiValidationError(error)
      form.setErrors((current) => ({ ...current, ...fieldErrors }))
      form.setServerTone('error')
      form.setServerMessage(summary ?? error.message)
    } finally {
      form.setIsSubmitting(false)
    }
  }

  async function handlePermissionsSave() {
    if (!selectedUser || selectedUser.role === 'SUPER_ADMIN') {
      return
    }

    try {
      setPermissionsSaving(true)
      const permissions = PERMISSION_RESOURCES
        .map((resource) => ({
          resource,
          actions: selectedUserPermissions[resource] ?? [],
        }))
        .filter((entry) => entry.actions.length > 0)

      const response = await updateUserPermissions(selectedUser.id, { permissions })
      const nextPermissions = normalizePermissions(response.data?.permissions)

      setSelectedUserPermissions(nextPermissions)
      setPermissionFeedback({ tone: 'success', message: 'Permissions updated successfully.' })
      setUsers((current) =>
        current.map((user) => (user.id === selectedUser.id ? { ...user, permissions: nextPermissions } : user)),
      )
    } catch (error) {
      setPermissionFeedback({ tone: 'error', message: error.message })
    } finally {
      setPermissionsSaving(false)
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <article className="space-y-6">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <p className="font-[var(--font-body)] text-xs uppercase tracking-[0.34em] text-[var(--muted)]">
            Super admin
          </p>
          <h3 className="mt-3 font-[var(--font-body)] text-3xl text-slate-900">
            Invite users and assign access
          </h3>
          <p className="mt-4 text-base leading-8 text-slate-600">
            This workspace is restricted to the tenant super admin. Use it to invite users, review the current tenant roster, and assign resource-level permissions.
          </p>

          <div className="mt-6 rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel)] p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Current session</p>
            <p className="mt-2">
              Role: <span className="font-medium">{formatRoleLabel(session?.user?.role) ?? 'Not logged in'}</span>
            </p>
            <p className="mt-1 break-all">
              Tenant: {session?.user?.tenantId ?? 'No tenant context available'}
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <p className="font-[var(--font-body)] text-xs uppercase tracking-[0.34em] text-[var(--muted)]">
            Invite users
          </p>
          <form onSubmit={handleInviteSubmit} className="mt-5 grid gap-4">
            <FormTextarea
              label="Emails"
              name="emails"
              rows={6}
              placeholder={'manager@company.com\noperator@company.com'}
              value={form.values.emails}
              onChange={form.handleChange}
              error={form.errors.emails}
            />
            <FormSelect
              label="Role"
              name="role"
              value={form.values.role}
              onChange={form.handleChange}
              error={form.errors.role}
              options={roleOptions}
            />

            <StatusAlert tone={form.serverTone} message={form.serverMessage} />

            <button
              type="submit"
              disabled={form.isSubmitting}
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {form.isSubmitting ? 'Sending invites...' : 'Invite users'}
            </button>
          </form>
        </div>

        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <p className="font-[var(--font-body)] text-xs uppercase tracking-[0.34em] text-[var(--muted)]">
            Invite output
          </p>
          {inviteTokens.length ? (
            <div className="mt-5 space-y-3">
              {inviteTokens.map((invite) => (
                <div key={invite.email} className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel)] p-4">
                  <p className="text-sm font-semibold text-slate-900">{invite.email}</p>
                  <p className="mt-2 break-all text-sm text-slate-600">{invite.inviteToken}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Successful invites will appear here with the email address and returned invite token from the backend.
            </p>
          )}
        </div>
      </article>

      <aside className="space-y-6">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-[var(--font-body)] text-xs uppercase tracking-[0.34em] text-[var(--muted)]">
                Tenant users
              </p>
              <h4 className="mt-2 text-xl font-semibold text-slate-900">User roster</h4>
            </div>
            <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
              {users.length} users
            </span>
          </div>

          <StatusAlert tone={usersFeedback.tone} message={usersFeedback.message} />

          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[var(--line)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--panel)]">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">User</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">Role</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan="3" className="px-4 py-8 text-center text-sm text-[var(--muted)]">Loading users...</td>
                  </tr>
                ) : users.length ? (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`cursor-pointer border-t border-[var(--line)] transition hover:bg-[var(--panel)] ${
                        user.id === selectedUserId ? 'bg-[var(--panel)]' : 'bg-white'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--ink)]">{user.email}</p>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{formatRoleLabel(user.role)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : user.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-[var(--panel)] text-[var(--muted)]'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-4 py-8 text-center text-sm text-[var(--muted)]">No users found for this tenant.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-[var(--font-body)] text-xs uppercase tracking-[0.34em] text-[var(--muted)]">
                Permission editor
              </p>
              <h4 className="mt-2 text-xl font-semibold text-slate-900">
                {selectedUser ? selectedUser.email : 'Select a user'}
              </h4>
              <p className="mt-1 text-sm text-slate-600">
                {selectedUser
                  ? `${formatRoleLabel(selectedUser.role)} with ${selectedUser.status.toLowerCase()} status`
                  : 'Choose a tenant user to update resource permissions.'}
              </p>
            </div>
            {selectedUser ? (
              <span className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                {selectedUser.role === 'SUPER_ADMIN' ? 'Implicit full access' : 'Explicit overrides'}
              </span>
            ) : null}
          </div>

          <StatusAlert tone={permissionFeedback.tone} message={permissionFeedback.message} />

          {!selectedUser ? (
            <p className="mt-6 text-sm text-[var(--muted)]">Select a user from the roster to view or update permissions.</p>
          ) : selectedUser.role === 'SUPER_ADMIN' ? (
            <p className="mt-6 rounded-[1rem] border border-[var(--line)] bg-[var(--panel)] px-4 py-4 text-sm text-[var(--muted)]">
              Super admin permissions are implicit and cannot be overridden.
            </p>
          ) : permissionsLoading ? (
            <p className="mt-6 text-sm text-[var(--muted)]">Loading permissions...</p>
          ) : (
            <>
              <div className="mt-6 space-y-4">
                {PERMISSION_RESOURCES.map((resource) => {
                  const actions = selectedUserPermissions[resource] ?? []

                  return (
                    <div key={resource} className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--panel)] p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[var(--ink)]">{resource}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            Toggle resource-level rights for this tenant user.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <PermissionToggle
                            active={actions.includes('ALL')}
                            disabled={permissionsSaving}
                            onClick={() => togglePermission(resource, 'ALL')}
                          >
                            ALL
                          </PermissionToggle>
                          {editableActions.map((action) => (
                            <PermissionToggle
                              key={action}
                              active={actions.includes('ALL') || actions.includes(action)}
                              disabled={permissionsSaving || actions.includes('ALL')}
                              onClick={() => togglePermission(resource, action)}
                            >
                              {action}
                            </PermissionToggle>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handlePermissionsSave}
                  disabled={permissionsSaving}
                  className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {permissionsSaving ? 'Saving permissions...' : 'Save permissions'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserPermissions(normalizePermissions(selectedUser.permissions))}
                  disabled={permissionsSaving}
                  className="rounded-full border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--panel)] disabled:opacity-60"
                >
                  Reset changes
                </button>
              </div>
            </>
          )}
        </div>

        <div className="rounded-[2rem] border border-[var(--line)] bg-[linear-gradient(160deg,#0f172a,#123456,#0f766e)] p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <p className="font-[var(--font-body)] text-xs uppercase tracking-[0.34em] text-cyan-100/75">
            Access rules
          </p>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm">
              <span>Route</span>
              <span className="font-semibold">Super admin only</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm">
              <span>Resources</span>
              <span className="font-semibold">{PERMISSION_RESOURCES.length} modules</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm">
              <span>Actions</span>
              <span className="font-semibold">CREATE / READ / UPDATE / DELETE / ALL</span>
            </div>
          </div>
        </div>
      </aside>
    </section>
  )
}
