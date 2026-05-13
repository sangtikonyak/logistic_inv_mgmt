import { useEffect, useState } from 'react'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import { usePermissions } from '../../../shared/lib/permissions.js'
import { useAuthForm } from '../../auth/hooks/useAuthForm.js'
import { createCategory, deleteCategory, listCategories, updateCategory } from '../api/productsApi.js'
import { createCategoryInitialValues, normalizeCategoryPayload, validateCategoryForm } from '../lib/productForms.js'
import { parseApiValidationError } from '../../../shared/lib/apiErrors.js'
import { FormField } from '../../../shared/ui/FormField.jsx'
import { FormSelect } from '../../../shared/ui/FormSelect.jsx'
import { FormTextarea } from '../../../shared/ui/FormTextarea.jsx'
import { StatusAlert } from '../../../shared/ui/StatusAlert.jsx'
import { ManagementCard } from '../components/ProductShared.jsx'

export function ProductCategoriesPage() {
  const { session } = useAuth()
  const { can } = usePermissions()
  const canEdit = can('PRODUCTS', 'CREATE') || can('PRODUCTS', 'UPDATE')
  const form = useAuthForm(createCategoryInitialValues())
  const [categories, setCategories] = useState([])
  const [feedback, setFeedback] = useState({ tone: 'success', message: '' })
  const [editId, setEditId] = useState(null)
  const [modeLabel, setModeLabel] = useState('Create top-level category')
  const [expandedCategoryIds, setExpandedCategoryIds] = useState([])

  const categoryMap = new Map(categories.map((category) => [category.id, category]))
  const categoryTreeRows = buildCategoryTree(categories, expandedCategoryIds)

  useEffect(() => {
    setExpandedCategoryIds((current) => {
      const validIds = new Set(categories.map((category) => category.id))
      const preserved = current.filter((categoryId) => validIds.has(categoryId))
      const parentIds = Array.from(
        categories.reduce((set, category) => {
          if (category.parent_category_id) set.add(category.parent_category_id)
          return set
        }, new Set()),
      )

      if (!preserved.length) {
        return parentIds
      }

      return Array.from(new Set([...preserved, ...parentIds.filter((categoryId) => !preserved.includes(categoryId))]))
    })
  }, [categories])

  async function loadCategories() {
    const response = await listCategories()
    setCategories(response.data ?? [])
  }

  function toggleCategoryBranch(categoryId) {
    setExpandedCategoryIds((current) =>
      current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId],
    )
  }

  useEffect(() => {
    loadCategories().catch((error) => setFeedback({ tone: 'error', message: error.message }))
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateCategoryForm(form.values)
    form.setErrors(validationErrors)
    form.clearFeedback()
    if (Object.keys(validationErrors).length) return

    try {
      form.setIsSubmitting(true)
      if (editId) {
        await updateCategory(editId, normalizeCategoryPayload(form.values))
      } else {
        await createCategory(normalizeCategoryPayload(form.values))
      }
      setFeedback({ tone: 'success', message: editId ? 'Category updated successfully.' : 'Category created successfully.' })
      setEditId(null)
      form.setValues(createCategoryInitialValues())
      await loadCategories()
    } catch (error) {
      const { fieldErrors, summary } = parseApiValidationError(error)
      form.setErrors((current) => ({ ...current, ...fieldErrors }))
      form.setServerTone('error')
      form.setServerMessage(summary ?? error.message)
    } finally {
      form.setIsSubmitting(false)
    }
  }

  async function handleDelete(categoryId) {
    try {
      await deleteCategory(categoryId)
      setFeedback({ tone: 'success', message: 'Category deleted successfully.' })
      await loadCategories()
    } catch (error) {
      setFeedback({ tone: 'error', message: error.message })
    }
  }

  return (
    <div className="space-y-6">
      <StatusAlert tone={feedback.tone} message={feedback.message} />
      <div className="grid gap-6 xl:grid-cols-2">
        <ManagementCard
          title="Category management"
          description="Create top-level categories or add subcategories under an existing parent."
          form={form}
          onSubmit={handleSubmit}
          submitLabel={editId ? 'Update category' : 'Create category'}
          onReset={() => {
            setEditId(null)
            setModeLabel('Create top-level category')
            form.setValues(createCategoryInitialValues())
            form.clearFeedback()
          }}
          canManage={canEdit}
        >
          <div className="rounded-[1rem] border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">{modeLabel}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Leave parent empty for a top-level category. Choose a parent only when this category should sit under another one.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditId(null)
                    setModeLabel('Create top-level category')
                    form.setValues(createCategoryInitialValues())
                    form.clearFeedback()
                  }}
                  className="rounded-[0.85rem] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)]"
                >
                  Top-level
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstParent = categories.find((category) => category.id !== editId)
                    setEditId(null)
                    setModeLabel('Create child category')
                    form.setValues({
                      ...createCategoryInitialValues(),
                      parentCategoryId: firstParent?.id ?? '',
                    })
                    form.clearFeedback()
                  }}
                  className="rounded-[0.85rem] border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)]"
                >
                  Child category
                </button>
              </div>
            </div>
          </div>

          <FormField label="Category Name" name="name" value={form.values.name} onChange={form.handleChange} error={form.errors.name} />
          <FormSelect
            label="Parent Category"
            name="parentCategoryId"
            value={form.values.parentCategoryId}
            onChange={form.handleChange}
              error={form.errors.parentCategoryId}
              options={[{ value: '', label: 'No parent category' }, ...categories.filter((category) => category.id !== editId).map((category) => ({ value: category.id, label: category.name }))]}
            />
          <div className="rounded-[0.9rem] bg-[var(--panel)] px-4 py-3 text-sm text-[var(--muted)]">
            Use <span className="font-semibold text-[var(--ink)]">No parent category</span> for a main category like `Clothing` or `Electronics`.
            Choose a parent when adding a child category like `T shirt` under `Clothing`.
          </div>
          <FormTextarea label="Description" name="description" rows={3} value={form.values.description} onChange={form.handleChange} error={form.errors.description} />
        </ManagementCard>

        <article className="rounded-[1.5rem] border border-[var(--line)] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-semibold text-[var(--ink)]">Existing categories</p>
          <div className="mt-4 space-y-3">
            {categoryTreeRows.map(({ category, depth, hasChildren, isExpanded }) => (
              <div key={category.id} className="flex items-start justify-between gap-4 rounded-[1rem] border border-[var(--line)] bg-[var(--panel)] px-4 py-4">
                <div className="min-w-0 flex-1" style={{ paddingLeft: `${depth * 20}px` }}>
                  <div className="flex items-center gap-2">
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => toggleCategoryBranch(category.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] bg-white text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[#1F2937]"
                        aria-label={isExpanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? 'âˆ’' : '+'}
                      </button>
                    ) : (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                        â€¢
                      </span>
                    )}
                    {depth > 0 ? (
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                        L{depth + 1}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1F2937]">
                        Root
                      </span>
                    )}
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">{category.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {category.parent_category_id
                      ? `Child of ${categoryMap.get(category.parent_category_id)?.name ?? 'Unknown parent'}`
                      : 'Top-level category'}
                  </p>
                  {hasChildren ? (
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {isExpanded ? 'Subcategories visible' : 'Subcategories hidden'}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-[var(--muted)]">{category.description || category.slug}</p>
                </div>
                {canEdit ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => {
                      setEditId(category.id)
                      setModeLabel(`Edit ${category.name}`)
                      form.setValues(createCategoryInitialValues(category))
                    }} className="rounded-md bg-[#3B82F6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition">
                      Edit
                    </button>
                    <button type="button" onClick={() => {
                      setEditId(null)
                      setModeLabel(`Add child under ${category.name}`)
                      form.setValues({
                        ...createCategoryInitialValues(),
                        parentCategoryId: category.id,
                      })
                      form.clearFeedback()
                    }} className="rounded-md bg-[#3B82F6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition">
                      Add child
                    </button>
                    <button type="button" onClick={() => handleDelete(category.id)} className="rounded-[0.8rem] rounded-md bg-[#EF4444] px-3 py-2 text-xs font-semibold text-white hover:bg-[#DC2626] transition">
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

function buildCategoryTree(categories, expandedCategoryIds) {
  const byParent = new Map()
  const expandedSet = new Set(expandedCategoryIds)

  categories.forEach((category) => {
    const key = category.parent_category_id ?? 'root'
    const bucket = byParent.get(key) ?? []
    bucket.push(category)
    byParent.set(key, bucket)
  })

  byParent.forEach((bucket) => {
    bucket.sort((left, right) => left.name.localeCompare(right.name))
  })

  const rows = []

  function visit(parentId, depth) {
    const key = parentId ?? 'root'
    const children = byParent.get(key) ?? []

    children.forEach((category) => {
      const nestedChildren = byParent.get(category.id) ?? []
      const hasChildren = nestedChildren.length > 0
      const isExpanded = hasChildren ? expandedSet.has(category.id) : false

      rows.push({ category, depth, hasChildren, isExpanded })

      if (!hasChildren || isExpanded) {
        visit(category.id, depth + 1)
      }
    })
  }

  visit(null, 0)
  return rows
}
