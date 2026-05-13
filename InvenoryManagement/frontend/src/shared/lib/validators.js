const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmail(value) {
  return EMAIL_REGEX.test(value.trim())
}

export function validateRegisterCompany(values) {
  const errors = {}

  if (values.companyName.trim().length < 2) {
    errors.companyName = 'Company name is too short'
  } else if (values.companyName.trim().length > 100) {
    errors.companyName = 'Company name must be 100 characters or less'
  }

  if (!isEmail(values.adminEmail)) {
    errors.adminEmail = 'Invalid email address'
  }

  if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long'
  }

  return errors
}

export function validateLogin(values) {
  const errors = {}

  if (!isEmail(values.email)) {
    errors.email = 'Invalid email address'
  }

  if (!values.password.trim()) {
    errors.password = 'Password is required'
  }

  return errors
}

export function validateAcceptInvite(values) {
  const errors = {}

  if (!values.token.trim()) {
    errors.token = 'Invite token is required'
  }

  if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long'
  }

  return errors
}

export function validateRefresh(values) {
  const errors = {}

  if (!values.refreshToken.trim()) {
    errors.refreshToken = 'Refresh token is required'
  }

  return errors
}

export function validateInviteUsers(values) {
  const errors = {}
  const emails = values.emails
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (!emails.length) {
    errors.emails = 'At least one email is required'
  } else if (emails.some((email) => !isEmail(email))) {
    errors.emails = 'Each invited email must be valid'
  }

  if (!['MANAGER', 'ADMIN', 'STAFF', 'OPERATOR'].includes(values.role)) {
    errors.role = 'Role must be MANAGER, ADMIN, STAFF, or OPERATOR'
  }

  return {
    errors,
    normalizedEmails: emails,
  }
}
