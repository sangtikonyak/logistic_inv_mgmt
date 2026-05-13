import { httpRequest } from '../../../shared/api/httpClient.js'

export function registerCompany(payload) {
  return httpRequest('/auth/register-company', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, { auth: false })
}

export function login(payload) {
  return httpRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, { auth: false })
}

export function acceptInvite(payload) {
  return httpRequest('/auth/accept-invite', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, { auth: false })
}

export function refreshSession(payload) {
  return httpRequest('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, { auth: false, retryOnAuthFailure: false })
}

export function inviteUsers(payload) {
  return httpRequest('/auth/invite', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function listUsers() {
  return httpRequest('/auth/users')
}

export function getUserPermissions(userId) {
  return httpRequest(`/auth/users/${userId}/permissions`)
}

export function updateUserPermissions(userId, payload) {
  return httpRequest(`/auth/users/${userId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
