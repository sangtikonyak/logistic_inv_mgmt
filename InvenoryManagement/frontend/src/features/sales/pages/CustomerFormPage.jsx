import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { useAuthForm } from '../../auth/hooks/useAuthForm.js'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { FormSelect } from '../../../shared/ui/FormSelect.jsx'
import { FormTextarea } from '../../../shared/ui/FormTextarea.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { createCustomer, getCustomer, updateCustomer, deleteCustomer } from '../api/salesApi.js'

function getInitial() {
  return {
    name: '', code: '', email: '', phone: '', contactPerson: '',
    taxNumber: '', addressLine1: '', addressLine2: '', city: '',
    state: '', postalCode: '', country: '', status: 'ACTIVE', notes: '',
  }
}

export function CustomerFormPage() {
  const { customerId } = useParams()
  const isEdit = Boolean(customerId)
  const navigate = useNavigate()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('CUSTOMERS', 'CREATE') || can('CUSTOMERS', 'UPDATE')
  const canDelete = can('CUSTOMERS', 'DELETE')

  const [isLoading, setIsLoading] = useState(isEdit)
  const [pageFeedback, setPageFeedback] = useState({ tone: 'success', message: '' })
  const form = useAuthForm(getInitial())

  useEffect(() => {
    if (!isEdit) return
    getCustomer(customerId)
      .then(r => {
        const c = r.data
        form.setValues({
          name: c.name || '', code: c.code || '', email: c.email || '',
          phone: c.phone || '', contactPerson: c.contactPerson || '',
          taxNumber: c.taxNumber || '', addressLine1: c.addressLine1 || '',
          addressLine2: c.addressLine2 || '', city: c.city || '',
          state: c.state || '', postalCode: c.postalCode || '',
          country: c.country || '', status: c.status || 'ACTIVE', notes: c.notes || '',
        })
      })
      .catch(e => setPageFeedback({ tone: 'error', message: e.message }))
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  function handleChange(e) {
    const { name, value } = e.target
    form.setValues(c => ({ ...c, [name]: value }))
    form.setErrors(c => ({ ...c, [name]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    form.clearFeedback()
    try {
      form.setIsSubmitting(true)
      const payload = {
        ...form.values,
        email: form.values.email || null,
        phone: form.values.phone || null,
        contactPerson: form.values.contactPerson || null,
        taxNumber: form.values.taxNumber || null,
        addressLine1: form.values.addressLine1 || null,
        addressLine2: form.values.addressLine2 || null,
        city: form.values.city || null,
        state: form.values.state || null,
        postalCode: form.values.postalCode || null,
        country: form.values.country || null,
        notes: form.values.notes || null,
      }
      if (isEdit) {
        await updateCustomer(customerId, payload)
        setPageFeedback({ tone: 'success', message: 'Customer updated successfully.' })
      } else {
        await createCustomer(payload)
        navigate('/app/sales/customers', { replace: true })
      }
    } catch (error) {
      const { fieldErrors, summary } = parseApiValidationError(error)
      form.setErrors(c => ({ ...c, ...fieldErrors }))
      form.setServerTone('error')
      form.setServerMessage(summary ?? error.message)
    } finally {
      form.setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Permanently delete this customer? This cannot be undone.')) return
    try {
      await deleteCustomer(customerId)
      navigate('/app/sales/customers', { replace: true })
    } catch (e) {
      setPageFeedback({ tone: 'error', message: e.message })
    }
  }

  if (isLoading) return <div className="p-4 text-sm text-[#6B7280]">Loading customer...</div>

  return (
    <div className="space-y-6">
      <StatusAlert tone={pageFeedback.tone} message={pageFeedback.message} />

      <section className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">{isEdit ? 'Customer Details' : 'New Customer'}</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              {isEdit ? 'Update customer records and contact information.' : 'Add a new customer to your sales network.'}
            </p>
          </div>
          {isEdit && canDelete && (
            <button onClick={handleDelete} className="rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-semibold text-white hover:bg-[#DC2626] transition">
              Delete
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Customer Name" name="name" value={form.values.name} onChange={handleChange} error={form.errors.name} required />
            <FormField label="Code" name="code" value={form.values.code} onChange={handleChange} error={form.errors.code} required />
            <FormSelect
              label="Status" name="status" value={form.values.status} onChange={handleChange} error={form.errors.status}
              options={[{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }, { label: 'Archived', value: 'ARCHIVED' }]}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Contact Person" name="contactPerson" value={form.values.contactPerson} onChange={handleChange} error={form.errors.contactPerson} />
            <FormField label="Email" name="email" type="email" value={form.values.email} onChange={handleChange} error={form.errors.email} />
            <FormField label="Phone" name="phone" value={form.values.phone} onChange={handleChange} error={form.errors.phone} />
            <div className="md:col-span-3">
              <FormField label="Tax Number / VAT" name="taxNumber" value={form.values.taxNumber} onChange={handleChange} error={form.errors.taxNumber} />
            </div>
          </div>

          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 space-y-4">
            <p className="text-sm font-semibold text-[#111827]">Address</p>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Address Line 1" name="addressLine1" value={form.values.addressLine1} onChange={handleChange} error={form.errors.addressLine1} />
              <FormField label="Address Line 2" name="addressLine2" value={form.values.addressLine2} onChange={handleChange} error={form.errors.addressLine2} />
              <FormField label="City" name="city" value={form.values.city} onChange={handleChange} error={form.errors.city} />
              <FormField label="State" name="state" value={form.values.state} onChange={handleChange} error={form.errors.state} />
              <FormField label="Postal Code" name="postalCode" value={form.values.postalCode} onChange={handleChange} error={form.errors.postalCode} />
              <FormField label="Country" name="country" value={form.values.country} onChange={handleChange} error={form.errors.country} />
            </div>
          </div>

          <FormTextarea label="Notes" name="notes" rows={3} value={form.values.notes} onChange={handleChange} error={form.errors.notes} />

          <StatusAlert tone={form.serverTone} message={form.serverMessage} />

          {canEdit ? (
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={form.isSubmitting}
                className="rounded-lg bg-[#22C55E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] disabled:opacity-60 transition">
                {form.isSubmitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create customer'}
              </button>
              <Link to="/app/sales/customers" className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] transition">
                Cancel
              </Link>
            </div>
          ) : (
            <Link to="/app/sales/customers" className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] transition">
              Back to Customers
            </Link>
          )}
        </form>
      </section>
    </div>
  )
}
