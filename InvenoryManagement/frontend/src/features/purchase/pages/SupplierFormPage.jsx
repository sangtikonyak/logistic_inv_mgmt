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
import { createSupplier, getSupplier, updateSupplier, deleteSupplier } from '../api/purchaseApi.js'

function getInitialValues() {
  return {
    name: '',
    code: '',
    email: '',
    phone: '',
    contactPerson: '',
    taxNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    status: 'ACTIVE',
    notes: '',
  }
}

export function SupplierFormPage() {
  const { supplierId } = useParams()
  const isEditMode = Boolean(supplierId)
  const navigate = useNavigate()
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('SUPPLIERS', 'CREATE') || can('SUPPLIERS', 'UPDATE')
  const canDelete = can('SUPPLIERS', 'DELETE')

  const [isLoading, setIsLoading] = useState(isEditMode)
  const form = useAuthForm(getInitialValues())
  const [pageFeedback, setPageFeedback] = useState({ tone: 'success', message: '' })

  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true)
      getSupplier(supplierId)
        .then((response) => {
          const supplier = response.data
          form.setValues({
            name: supplier.name || '',
            code: supplier.code || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            contactPerson: supplier.contactPerson || '',
            taxNumber: supplier.taxNumber || '',
            addressLine1: supplier.addressLine1 || '',
            addressLine2: supplier.addressLine2 || '',
            city: supplier.city || '',
            state: supplier.state || '',
            postalCode: supplier.postalCode || '',
            country: supplier.country || '',
            status: supplier.status || 'ACTIVE',
            notes: supplier.notes || '',
          })
        })
        .catch((error) => {
          setPageFeedback({ tone: 'error', message: error.message })
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  function handleChange(event) {
    const { name, value } = event.target
    form.setValues((current) => ({ ...current, [name]: value }))
    form.setErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
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

      if (isEditMode) {
        await updateSupplier(supplierId, payload)
        setPageFeedback({ tone: 'success', message: 'Supplier successfully updated.' })
      } else {
        await createSupplier(payload)
        navigate('/app/purchases/suppliers', { replace: true })
      }
    } catch (error) {
      const { fieldErrors, summary } = parseApiValidationError(error)
      form.setErrors((current) => ({ ...current, ...fieldErrors }))
      form.setServerTone('error')
      form.setServerMessage(summary ?? error.message)
    } finally {
      form.setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to permanently delete this supplier? This action cannot be undone.')) return
    try {
      await deleteSupplier(supplierId)
      navigate('/app/purchases/suppliers', { replace: true })
    } catch (error) {
      setPageFeedback({ tone: 'error', message: error.message })
    }
  }

  if (isLoading) {
    return <div className="p-4 text-sm text-[var(--muted)]">Loading supplier context...</div>
  }

  return (
    <div className="space-y-6">
      <StatusAlert tone={pageFeedback.tone} message={pageFeedback.message} />
      
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">{isEditMode ? 'Supplier Details' : 'Create Supplier'}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {isEditMode ? 'Update this supplier\'s records and billing addresses.' : 'Add a new vendor to your procurement network.'}
            </p>
          </div>
          {isEditMode && canDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-[1rem] bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
            >
              Delete Supplier
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FormField label="Supplier Name" name="name" value={form.values.name} onChange={handleChange} error={form.errors.name} required />
            <FormField label="Internal Code" name="code" value={form.values.code} onChange={handleChange} error={form.errors.code} required />
            <FormSelect
              label="Status"
              name="status"
              value={form.values.status}
              onChange={handleChange}
              error={form.errors.status}
              options={[
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Inactive', value: 'INACTIVE' },
                { label: 'Archived', value: 'ARCHIVED' },
              ]}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Contact Person" name="contactPerson" value={form.values.contactPerson} onChange={handleChange} error={form.errors.contactPerson} />
            <FormField label="Email" name="email" type="email" value={form.values.email} onChange={handleChange} error={form.errors.email} />
            <FormField label="Phone Number" name="phone" value={form.values.phone} onChange={handleChange} error={form.errors.phone} />
            <div className="md:col-span-3">
              <FormField label="Tax Number / VAT" name="taxNumber" value={form.values.taxNumber} onChange={handleChange} error={form.errors.taxNumber} />
            </div>
          </div>

          <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--panel)] p-4 space-y-4">
            <p className="text-sm font-semibold text-[var(--ink)]">Billing & Address Details</p>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Address Line 1" name="addressLine1" value={form.values.addressLine1} onChange={handleChange} error={form.errors.addressLine1} />
              <FormField label="Address Line 2" name="addressLine2" value={form.values.addressLine2} onChange={handleChange} error={form.errors.addressLine2} />
              <FormField label="City" name="city" value={form.values.city} onChange={handleChange} error={form.errors.city} />
              <FormField label="State/Province" name="state" value={form.values.state} onChange={handleChange} error={form.errors.state} />
              <FormField label="Postal Code" name="postalCode" value={form.values.postalCode} onChange={handleChange} error={form.errors.postalCode} />
              <FormField label="Country" name="country" value={form.values.country} onChange={handleChange} error={form.errors.country} />
            </div>
          </div>

          <FormTextarea label="Internal Notes" name="notes" rows={3} value={form.values.notes} onChange={handleChange} error={form.errors.notes} />

          <StatusAlert tone={form.serverTone} message={form.serverMessage} />

          {canEdit ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={form.isSubmitting}
                className="rounded-[1rem] bg-[#22C55E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#16A34A] disabled:opacity-60 transition"
              >
                {form.isSubmitting ? 'Saving...' : isEditMode ? 'Save changes' : 'Create supplier'}
              </button>
              <Link
                to="/app/purchases/suppliers"
                className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
              >
                Cancel
              </Link>
            </div>
          ) : (
             <Link
              to="/app/purchases/suppliers"
              className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
            >
              Back to List
            </Link>
          )}
        </form>
      </section>
    </div>
  )
}
