import { useEffect, useState } from 'react'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { useAuthForm } from '../../auth/hooks/useAuthForm.js'
import { createUnit, deleteUnit, listUnits, updateUnit } from '../api/productsApi.js'
import { createUnitInitialValues, normalizeUnitPayload, validateUnitForm } from '../lib/productForms.js'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { FormTextarea } from '../../../shared/ui/FormTextarea.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { ManagementCard } from '../components/ProductShared.jsx'

export function ProductUnitsPage() {
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('PRODUCTS', 'CREATE') || can('PRODUCTS', 'UPDATE')
  const form = useAuthForm(createUnitInitialValues())
  const [units, setUnits] = useState([])
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' })
  const [editId, setEditId] = useState(null)

  async function loadUnits() {
    const response = await listUnits()
    setUnits(response.data ?? [])
  }

  useEffect(() => {
    loadUnits().catch((error) => setFeedback({ tone: 'error', message: error.message }))
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateUnitForm(form.values)
    form.setErrors(validationErrors)
    form.clearFeedback()
    if (Object.keys(validationErrors).length) return

    try {
      form.setIsSubmitting(true)
      if (editId) {
        await updateUnit(editId, normalizeUnitPayload(form.values))
      } else {
        await createUnit(normalizeUnitPayload(form.values))
      }
      setFeedback({ tone: 'success', message: editId ? 'Unit updated successfully.' : 'Unit created successfully.' })
      setEditId(null)
      form.setValues(createUnitInitialValues())
      await loadUnits()
    } catch (error) {
      const { fieldErrors, summary } = parseApiValidationError(error)
      form.setErrors((current) => ({ ...current, ...fieldErrors }))
      form.setServerTone('error')
      form.setServerMessage(summary ?? error.message)
    } finally {
      form.setIsSubmitting(false)
    }
  }

  async function handleDelete(unitId) {
    try {
      await deleteUnit(unitId)
      setFeedback({ tone: 'success', message: 'Unit deleted successfully.' })
      await loadUnits()
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    }
  }

  return (
    <div className="space-y-6">
      <StatusAlert tone={feedback.tone} message={feedback.message} />
      <div className="grid gap-6 xl:grid-cols-2">
        <ManagementCard
          title="Unit management"
          description="Add and maintain dropdown values for product measurement and pricing."
          form={form}
          onSubmit={handleSubmit}
          submitLabel={editId ? 'Update unit' : 'Create unit'}
          onReset={() => {
            setEditId(null)
            form.setValues(createUnitInitialValues())
            form.clearFeedback()
          }}
          canManage={canEdit}
        >
          <FormField label="Unit Name" name="name" value={form.values.name} onChange={form.handleChange} error={form.errors.name} />
          <FormField label="Unit Code" name="code" value={form.values.code} onChange={form.handleChange} error={form.errors.code} />
          <FormTextarea label="Description" name="description" rows={3} value={form.values.description} onChange={form.handleChange} error={form.errors.description} />
        </ManagementCard>

        <article className="rounded-[1.5rem] border border-[var(--line)] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-semibold text-[var(--ink)]">Existing units</p>
          <div className="mt-4 space-y-3">
            {units.map((unit) => (
              <div key={unit.id} className="flex items-start justify-between gap-4 rounded-[1rem] border border-[var(--line)] bg-[var(--panel)] px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">{unit.name} ({unit.code})</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{unit.description || 'No description'}</p>
                </div>
                {canEdit ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => {
                      setEditId(unit.id)
                      form.setValues(createUnitInitialValues(unit))
                    }} className="rounded-md bg-[#3B82F6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(unit.id)} className="rounded-[0.8rem] rounded-md bg-[#EF4444] px-3 py-2 text-xs font-semibold text-white hover:bg-[#DC2626] transition">
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}
