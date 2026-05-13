import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { useAuthForm } from '../../auth/hooks/useAuthForm.js'
import {
  createCustomField,
  deleteCustomField,
  listCustomFields,
  updateCustomField,
} from '../api/productsApi.js'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { FormSelect } from '../../../shared/ui/FormSelect.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { CheckboxField, ManagementCard } from '../components/ProductShared.jsx'

const fieldTypeOptions = [
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'DATE', label: 'Date' },
  { value: 'SELECT', label: 'Select' },
  { value: 'MULTI_SELECT', label: 'Multi Select' },
]

const appliesToOptions = [
  { value: 'PRODUCT', label: 'Product' },
  { value: 'VARIANT', label: 'Variant' },
  { value: 'BOTH', label: 'Both' },
]

const fieldTypeExamples = {
  TEXT: {
    name: 'Fabric Type',
    fieldKey: 'fabric_type',
    allowedValuesText: '',
    pattern: '',
  },
  NUMBER: {
    name: 'Shelf Life (Days)',
    fieldKey: 'shelf_life_days',
    allowedValuesText: '',
    pattern: '',
  },
  BOOLEAN: {
    name: 'Fragile Item',
    fieldKey: 'fragile_item',
    allowedValuesText: '',
    pattern: '',
  },
  DATE: {
    name: 'Expiry Date',
    fieldKey: 'expiry_date',
    allowedValuesText: '',
    pattern: '',
  },
  SELECT: {
    name: 'Season',
    fieldKey: 'season',
    allowedValuesText: 'Summer, Monsoon, Winter',
    pattern: '',
  },
  MULTI_SELECT: {
    name: 'Care Instructions',
    fieldKey: 'care_instructions',
    allowedValuesText: 'Machine wash, Hand wash, Dry clean',
    pattern: '',
  },
}

function createFieldInitialValues(field) {
  return {
    name: field?.name ?? '',
    fieldKey: field?.fieldKey ?? '',
    fieldType: field?.fieldType ?? 'TEXT',
    appliesTo: field?.appliesTo ?? 'PRODUCT',
    isRequired: field?.isRequired ?? false,
    allowedValuesText: field?.allowedValues?.join(', ') ?? '',
    min: field?.validationRules?.min ?? '',
    max: field?.validationRules?.max ?? '',
    minLength: field?.validationRules?.minLength ?? '',
    maxLength: field?.validationRules?.maxLength ?? '',
    pattern: field?.validationRules?.pattern ?? '',
    sortOrder: field?.sortOrder ?? 0,
  }
}

function validateFieldForm(values) {
  const errors = {}

  if (!values.name.trim()) {
    errors.name = 'Field name is required'
  }

  if (!values.fieldKey.trim()) {
    errors.fieldKey = 'Field key is required'
  }

  if ((values.fieldType === 'SELECT' || values.fieldType === 'MULTI_SELECT') && !values.allowedValuesText.trim()) {
    errors.allowedValuesText = 'Allowed values are required for select field types'
  }

  return errors
}

function normalizeFieldPayload(values) {
  const allowedValues = values.allowedValuesText
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  const validationRules = {
    ...(values.min !== '' ? { min: Number(values.min) } : {}),
    ...(values.max !== '' ? { max: Number(values.max) } : {}),
    ...(values.minLength !== '' ? { minLength: Number(values.minLength) } : {}),
    ...(values.maxLength !== '' ? { maxLength: Number(values.maxLength) } : {}),
    ...(values.pattern.trim() ? { pattern: values.pattern.trim() } : {}),
  }

  return {
    name: values.name.trim(),
    fieldKey: values.fieldKey.trim(),
    fieldType: values.fieldType,
    appliesTo: values.appliesTo,
    isRequired: values.isRequired,
    ...(allowedValues.length ? { allowedValues } : {}),
    ...(Object.keys(validationRules).length ? { validationRules } : {}),
    sortOrder: Number(values.sortOrder || 0),
  }
}

function getFieldTypeDescription(fieldType) {
  const descriptions = {
    TEXT: 'Use for open text like fabric type, warranty note, or internal reference.',
    NUMBER: 'Use for measurable values like shelf life, pack size, or GSM.',
    BOOLEAN: 'Use for yes or no flags like fragile item or temperature controlled.',
    DATE: 'Use for values like expiry date, launch date, or inspection date.',
    SELECT: 'Use when one option must be chosen from a fixed list.',
    MULTI_SELECT: 'Use when multiple options can be chosen from a fixed list.',
  }

  return descriptions[fieldType] ?? 'Define how this custom field should capture product data.'
}

function getAppliesToDescription(appliesTo) {
  const descriptions = {
    PRODUCT: 'Shown on the main product form and product detail page.',
    VARIANT: 'Shown inside each variant block and saved per variant.',
    BOTH: 'Shown on both the main product and each variant.',
  }

  return descriptions[appliesTo] ?? 'Choose where this field should appear in the catalog workspace.'
}

export function ProductCustomFieldsPage() {
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('PRODUCTS', 'CREATE') || can('PRODUCTS', 'UPDATE')
  const form = useAuthForm(createFieldInitialValues())
  const [fields, setFields] = useState([])
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' })
  const [editId, setEditId] = useState(null)

  const isSelectType = useMemo(
    () => form.values.fieldType === 'SELECT' || form.values.fieldType === 'MULTI_SELECT',
    [form.values.fieldType],
  )
  const sampleValues = fieldTypeExamples[form.values.fieldType] ?? fieldTypeExamples.TEXT

  async function loadFields() {
    const response = await listCustomFields()
    setFields(response.data ?? [])
  }

  useEffect(() => {
    loadFields().catch((error) => setFeedback({ tone: 'error', message: error.message }))
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateFieldForm(form.values)
    form.setErrors(validationErrors)
    form.clearFeedback()
    if (Object.keys(validationErrors).length) return

    try {
      form.setIsSubmitting(true)
      const payload = normalizeFieldPayload(form.values)
      if (editId) {
        await updateCustomField(editId, payload)
      } else {
        await createCustomField(payload)
      }
      setFeedback({ tone: 'success', message: editId ? 'Custom field updated successfully.' : 'Custom field created successfully.' })
      setEditId(null)
      form.setValues(createFieldInitialValues())
      await loadFields()
    } catch (error) {
      const { fieldErrors, summary } = parseApiValidationError(error)
      form.setErrors((current) => ({ ...current, ...fieldErrors }))
      form.setServerTone('error')
      form.setServerMessage(summary ?? error.message)
    } finally {
      form.setIsSubmitting(false)
    }
  }

  async function handleDelete(definitionId) {
    try {
      await deleteCustomField(definitionId)
      setFeedback({ tone: 'success', message: 'Custom field deleted successfully.' })
      await loadFields()
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    }
  }

  return (
    <div className="space-y-6">
      <StatusAlert tone={feedback.tone} message={feedback.message} />
      <div className="rounded-[1.5rem] border border-[var(--line)] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold text-[var(--ink)]">What this is used for</p>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          Custom fields help you store extra catalog data that does not exist in the standard product form. For example,
          you can track fabric type, season, shelf life, or care instructions. These fields are used in the product add,
          edit, detail, and variant flows depending on the Applies To setting.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <ManagementCard
          title="Custom field definitions"
          description="Create reusable fields for your catalog and decide whether they belong to the main product, the variants, or both."
          form={form}
          onSubmit={handleSubmit}
          submitLabel={editId ? 'Update field' : 'Create field'}
          onReset={() => {
            setEditId(null)
            form.setValues(createFieldInitialValues())
            form.clearFeedback()
          }}
          canManage={canEdit}
        >
          <FormField
            label="Field Name"
            name="name"
            value={form.values.name}
            onChange={form.handleChange}
            error={form.errors.name}
            description="User-facing name shown in the product catalog screens. Example: Fabric Type"
            placeholder={sampleValues.name}
          />
          <FormField
            label="Field Key"
            name="fieldKey"
            value={form.values.fieldKey}
            onChange={form.handleChange}
            error={form.errors.fieldKey}
            description="Internal key used to store this field in the database and APIs. Use lowercase words with underscores."
            placeholder={sampleValues.fieldKey}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormSelect
              label="Field Type"
              name="fieldType"
              value={form.values.fieldType}
              onChange={form.handleChange}
              error={form.errors.fieldType}
              options={fieldTypeOptions}
              description={getFieldTypeDescription(form.values.fieldType)}
            />
            <FormSelect
              label="Applies To"
              name="appliesTo"
              value={form.values.appliesTo}
              onChange={form.handleChange}
              error={form.errors.appliesTo}
              options={appliesToOptions}
              description={getAppliesToDescription(form.values.appliesTo)}
            />
          </div>
          <CheckboxField label="Required field" name="isRequired" checked={form.values.isRequired} onChange={form.handleChange} disabled={!canEdit} />
          {isSelectType ? (
            <FormField
              label="Allowed Values"
              name="allowedValuesText"
              value={form.values.allowedValuesText}
              onChange={form.handleChange}
              error={form.errors.allowedValuesText}
              description="Comma-separated options that will appear in the dropdown or multi-select input."
              placeholder={sampleValues.allowedValuesText}
            />
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Min"
              name="min"
              type="number"
              value={form.values.min}
              onChange={form.handleChange}
              error={form.errors.min}
              description="Minimum numeric value or minimum selection count for multi-select."
              placeholder="1"
            />
            <FormField
              label="Max"
              name="max"
              type="number"
              value={form.values.max}
              onChange={form.handleChange}
              error={form.errors.max}
              description="Maximum numeric value or maximum selection count for multi-select."
              placeholder="10"
            />
            <FormField
              label="Min Length"
              name="minLength"
              type="number"
              value={form.values.minLength}
              onChange={form.handleChange}
              error={form.errors.minLength}
              description="Minimum character length for text-based inputs."
              placeholder="2"
            />
            <FormField
              label="Max Length"
              name="maxLength"
              type="number"
              value={form.values.maxLength}
              onChange={form.handleChange}
              error={form.errors.maxLength}
              description="Maximum character length for text-based inputs."
              placeholder="50"
            />
            <FormField
              label="Pattern"
              name="pattern"
              value={form.values.pattern}
              onChange={form.handleChange}
              error={form.errors.pattern}
              description="Optional regex for text validation. Example: only uppercase letters, numbers, and dashes."
              placeholder="^[A-Z0-9-]+$"
            />
            <FormField
              label="Sort Order"
              name="sortOrder"
              type="number"
              value={form.values.sortOrder}
              onChange={form.handleChange}
              error={form.errors.sortOrder}
              description="Lower numbers appear first in the product form and detail page."
              placeholder="0"
            />
          </div>
        </ManagementCard>

        <article className="rounded-[1.5rem] border border-[var(--line)] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-semibold text-[var(--ink)]">Existing field definitions</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Review where each field is shown and what values or rules it carries.
          </p>
          <div className="mt-4 space-y-3">
            {fields.length ? (
              fields.map((field) => (
                <div key={field.id} className="rounded-[1rem] border border-[var(--line)] bg-[var(--panel)] px-4 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">{field.name}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {field.fieldKey} | {field.fieldType} | {field.appliesTo}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{getAppliesToDescription(field.appliesTo)}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {field.allowedValues?.length ? field.allowedValues.join(', ') : 'No allowed values'}
                      </p>
                    </div>
                    {canEdit ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditId(field.id)
                            form.setValues(createFieldInitialValues(field))
                          }}
                          className="rounded-md bg-[#3B82F6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(field.id)}
                          className="rounded-[0.8rem] rounded-md bg-[#EF4444] px-3 py-2 text-xs font-semibold text-white hover:bg-[#DC2626] transition"
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1rem] border border-dashed border-[var(--line)] bg-[var(--panel)] px-4 py-4 text-sm text-[var(--muted)]">
                No custom field definitions yet.
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
