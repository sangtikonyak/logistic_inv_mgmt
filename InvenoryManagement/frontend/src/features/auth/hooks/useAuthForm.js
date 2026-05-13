import { useState } from 'react'

export function useAuthForm(initialValues) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [serverMessage, setServerMessage] = useState('')
  const [serverTone, setServerTone] = useState('error')
  const [serverDetails, setServerDetails] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function clearFeedback() {
    setServerMessage('')
    setServerTone('error')
  }

  return {
    values,
    setValues,
    errors,
    setErrors,
    serverMessage,
    setServerMessage,
    serverTone,
    setServerTone,
    serverDetails,
    setServerDetails,
    isSubmitting,
    setIsSubmitting,
    handleChange,
    clearFeedback,
  }
}
