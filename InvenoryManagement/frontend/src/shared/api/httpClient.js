import { API_BASE_URL } from '../config/api.js'

let sessionHandlers = {
  getSession: () => null,
  onSessionUpdate: () => {},
  onSessionClear: () => {},
}

let refreshPromise = null

export function configureSessionHandlers(handlers) {
  sessionHandlers = {
    ...sessionHandlers,
    ...handlers,
  }
}

async function parseResponse(response) {
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    const error = new Error(payload?.message || 'Request failed')
    error.status = response.status
    error.data = payload?.data ?? null
    throw error
  }

  return payload
}

async function refreshTokens() {
  const activeSession = sessionHandlers.getSession()

  if (!activeSession?.refreshToken) {
    throw new Error('No refresh token available.')
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: activeSession.refreshToken,
      }),
    })
      .then(parseResponse)
      .then((payload) => {
        const nextSession = {
          ...activeSession,
          accessToken: payload.data.accessToken,
          refreshToken: payload.data.refreshToken,
        }
        sessionHandlers.onSessionUpdate(nextSession)
        return nextSession
      })
      .catch((error) => {
        sessionHandlers.onSessionClear()
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

function toNetworkError(error) {
  const networkError = new Error(
    'Unable to reach the server. This is usually a CORS or network issue. Make sure the backend is running and allows requests from the frontend origin.',
  )
  networkError.cause = error
  return networkError
}

export async function httpRequest(path, options = {}, requestConfig = {}) {
  const { auth = true, retryOnAuthFailure = true } = requestConfig
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  }

  const activeSession = sessionHandlers.getSession()

  if (auth && activeSession?.accessToken) {
    headers.Authorization = `Bearer ${activeSession.accessToken}`
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })
  } catch (error) {
    throw toNetworkError(error)
  }

  if (response.status === 401 && auth && retryOnAuthFailure && activeSession?.refreshToken) {
    await refreshTokens()
    return httpRequest(path, options, { ...requestConfig, retryOnAuthFailure: false })
  }

  return parseResponse(response)
}
