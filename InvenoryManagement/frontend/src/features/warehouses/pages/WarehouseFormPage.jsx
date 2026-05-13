import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { FormSelect } from '../../../shared/ui/FormSelect.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { createWarehouse, getWarehouse, updateWarehouse } from '../api/warehousesApi.js'

const warehouseStatusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' }
]

export function WarehouseFormPage() {
  const { warehouseId } = useParams()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const isEditing = Boolean(warehouseId)
  const canSubmit = isEditing ? can('WAREHOUSES', 'UPDATE') : can('WAREHOUSES', 'CREATE')

  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' })
  const [validationErrors, setValidationErrors] = useState({})

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    status: 'ACTIVE',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    latitude: '',
    longitude: '',
    isDefault: false
  })

  useEffect(() => {
    async function loadWarehouse() {
      if (!isEditing) return

      try {
        setIsLoading(true)
        const response = await getWarehouse(warehouseId)
        const wh = response.data
        if (wh) {
          setFormData({
            name: wh.name || '',
            code: wh.code || '',
            status: wh.status || 'ACTIVE',
            addressLine1: wh.addressLine1 || '',
            addressLine2: wh.addressLine2 || '',
            city: wh.city || '',
            state: wh.state || '',
            postalCode: wh.postalCode || '',
            country: wh.country || '',
            latitude: wh.latitude || '',
            longitude: wh.longitude || '',
            isDefault: wh.isDefault === 1 || wh.isDefault === true
          })
        }
      } catch (error) {
        setFeedback({ tone: 'error', message: error.message })
      } finally {
        setIsLoading(false)
      }
    }

    loadWarehouse()
  }, [warehouseId, isEditing])

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    const finalValue = type === 'checkbox' ? checked : value
    setFormData((prev) => ({ ...prev, [name]: finalValue }))
    setValidationErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) {
      setFeedback({ tone: 'error', message: 'You do not have permission to save warehouse changes.' })
      return
    }

    setValidationErrors({})
    setFeedback({ tone: 'success', message: '' })

    try {
      setIsSubmitting(true)
      const payload = { ...formData }
      
      if (payload.latitude === '') payload.latitude = null
      if (payload.longitude === '') payload.longitude = null
      if (payload.addressLine1 === '') payload.addressLine1 = null
      if (payload.addressLine2 === '') payload.addressLine2 = null
      if (payload.city === '') payload.city = null
      if (payload.state === '') payload.state = null
      if (payload.postalCode === '') payload.postalCode = null
      if (payload.country === '') payload.country = null

      if (isEditing) {
        await updateWarehouse(warehouseId, payload)
        setFeedback({ tone: 'success', message: 'Warehouse updated successfully.' })
        setTimeout(() => navigate(`/app/warehouses/${warehouseId}`), 1000)
      } else {
        const response = await createWarehouse(payload)
        setFeedback({ tone: 'success', message: 'Warehouse created successfully.' })
        setTimeout(() => navigate(`/app/warehouses/${response.data.id}`), 1000)
      }
    } catch (error) {
      if (error.errors) {
        setValidationErrors(error.errors)
        setFeedback({ tone: 'error', message: 'Please correct the validation errors.' })
      } else {
        setFeedback({ tone: 'error', message: error.message })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="text-sm text-[var(--muted)]">Loading warehouse details...</div>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <StatusAlert tone={feedback.tone} message={feedback.message} />

      <form
        onSubmit={handleSubmit}
        className="rounded-[1.5rem] border border-[var(--line)] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-10"
      >
        <div className="mb-8 border-b border-[var(--line)] pb-5">
          <p className="text-xl font-semibold text-[var(--ink)]">
            {isEditing ? 'Edit Warehouse' : 'New Warehouse'}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Enter the primary and address details for this physical location.
          </p>
          {!canSubmit ? (
            <span className="mt-3 inline-flex rounded-full bg-[var(--panel)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
              Read only
            </span>
          ) : null}
        </div>

        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2 border-b border-[var(--line)] pb-8 mb-8">
          <div className="md:col-span-2">
            <h3 className="text-md font-semibold text-[var(--ink)] mb-4">Core Details</h3>
          </div>
          
          <FormField
            label="Warehouse Name *"
            name="name"
            placeholder="e.g. Main Fulfillment Center"
            value={formData.name}
            onChange={handleChange}
            error={validationErrors.name}
            description="A descriptive name for internal use."
          />

          <FormField
            label="Warehouse Code *"
            name="code"
            placeholder="e.g. WH-MAIN-01"
            value={formData.code}
            onChange={handleChange}
            error={validationErrors.code}
            description="A unique shorthand identifier for this warehouse."
          />

          <div className="md:col-span-2 lg:col-span-1">
            <FormSelect
              label="Operational Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={warehouseStatusOptions}
              error={validationErrors.status}
            />
          </div>

          <div className="md:col-span-2 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                name="isDefault"
                checked={formData.isDefault} 
                onChange={handleChange}
                className="w-4 h-4 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span className="text-sm font-medium text-slate-700">Set as Default Warehouse</span>
            </label>
            {formData.isDefault && (
              <p className="text-xs text-[var(--accent)] mt-1 ml-6 font-medium">
                When selected, this location's address will become the default address for your company.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <h3 className="text-md font-semibold text-[var(--ink)] mb-4">Address & Location</h3>
          </div>

          <div className="md:col-span-2 lg:col-span-1">
            <FormField
              label="Address Line 1"
              name="addressLine1"
              placeholder="123 Storage Lane"
              value={formData.addressLine1}
              onChange={handleChange}
              error={validationErrors.addressLine1}
            />
          </div>

          <div className="md:col-span-2 lg:col-span-1">
            <FormField
              label="Address Line 2"
              name="addressLine2"
              placeholder="Suite 200"
              value={formData.addressLine2}
              onChange={handleChange}
              error={validationErrors.addressLine2}
            />
          </div>

          <FormField
            label="City"
            name="city"
            value={formData.city}
            onChange={handleChange}
            error={validationErrors.city}
          />
          <FormField
            label="State/Province"
            name="state"
            value={formData.state}
            onChange={handleChange}
            error={validationErrors.state}
          />
          <FormField
            label="Postal Code"
            name="postalCode"
            value={formData.postalCode}
            onChange={handleChange}
            error={validationErrors.postalCode}
          />
          <FormField
            label="Country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            error={validationErrors.country}
          />
          <FormField
            label="Latitude"
            name="latitude"
            placeholder="e.g. 40.7128"
            type="number"
            value={formData.latitude}
            onChange={handleChange}
            error={validationErrors.latitude}
          />
          <FormField
            label="Longitude"
            name="longitude"
            placeholder="e.g. -74.0060"
            type="number"
            value={formData.longitude}
            onChange={handleChange}
            error={validationErrors.longitude}
          />
        </div>

        <div className="mt-10 flex items-center justify-end gap-3 border-t border-[var(--line)] pt-8">
          <Link
            to="/app/warehouses"
            className="rounded-[1rem] bg-[var(--panel)] px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--line)]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !canSubmit}
            className="rounded-[1rem] bg-[#22C55E] px-8 py-3 text-sm font-semibold text-white hover:bg-[#16A34A] disabled:opacity-50 transition"
          >
            {isSubmitting ? 'Saving...' : 'Save Warehouse'}
          </button>
        </div>
      </form>
    </div>
  )
}
