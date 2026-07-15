const STORAGE_KEYS = ['token', 'username', 'role']

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(normalized))
  } catch {
    return null
  }
}

export function saveSession(token) {
  const claims = decodeJwt(token)
  if (!claims) {
    throw new Error('Token inválido recibido del servidor')
  }
  localStorage.setItem('token', token)
  localStorage.setItem('username', claims.sub || '')
  localStorage.setItem('role', claims.role || '')
}

export function clearSession() {
  STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
}

// Single source of truth for "who is logged in": always re-derived from the
// JWT issued by the server, never from a client-guessed value.
export function getSession() {
  const token = localStorage.getItem('token')
  if (!token) return null

  const claims = decodeJwt(token)
  if (!claims || !claims.role) {
    clearSession()
    return null
  }

  if (claims.exp && Date.now() >= claims.exp * 1000) {
    clearSession()
    return null
  }

  return { token, username: claims.sub, role: claims.role }
}
